import {ALIAS_MAP, SORTED_ALIAS_KEYS, SUPPORTED_RAW_COMMANDS} from "./aliases";
import {parseParams, tokenize} from "./parameterParser";

export interface ParsedCommand {
    command: string;
    params: Record<string, unknown>;
    raw: string;
    isBuiltin: boolean;
}

/** Commands handled by the terminal itself rather than CommandsRegistry */
const BUILTIN_COMMANDS = new Set(["help", "clear", "history", "exit", "exec", "save", "import", "export", "dump", "require", "check", "test"]);

/** Primitive types valid for `add <type>` shorthand */
const PRIMITIVE_TYPES = new Set([
    "box",
    "sphere",
    "cylinder",
    "cone",
    "plane",
    "torus",
    "torusknot",
    "triangle",
    "capsule",
    "icosahedron",
    "octahedron",
    "dodecahedron",
    "ring",
]);

/**
 * Stateless parser that converts terminal input into a ParsedCommand.
 *
 * Supports:
 *   - Shorthand syntax:  `add box position=1,2,3 color=#ff0000`
 *   - Raw syntax:        `create_primitive type=box position={x:1,y:1,z:1}`
 *   - Built-in commands: `help`, `clear`, `exit`, etc.
 */
export class ScriptCommandParser {
    /**
     * Parse a single line of terminal input.
     * @param input
     */
    static parse(input: string): ParsedCommand {
        const trimmed = input.trim();
        if (!trimmed) {
            return {command: "", params: {}, raw: input, isBuiltin: false};
        }

        const tokens = tokenize(trimmed);
        const firstToken = tokens[0]!.toLowerCase();

        // 1. Check for built-in commands
        if (BUILTIN_COMMANDS.has(firstToken)) {
            return {
                command: firstToken,
                params: ScriptCommandParser.parseBuiltinArgs(firstToken, tokens.slice(1)),
                raw: trimmed,
                isBuiltin: true,
            };
        }

        // 2. Try matching against alias map (longest prefix first)
        for (const aliasKey of SORTED_ALIAS_KEYS) {
            const aliasTokens = aliasKey.split(" ");
            const inputLower = tokens.slice(0, aliasTokens.length).map(t => t.toLowerCase());

            if (aliasTokens.length <= tokens.length && aliasTokens.every((t, i) => t === inputLower[i])) {
                const alias = ALIAS_MAP[aliasKey]!;
                const remainingTokens = tokens.slice(aliasTokens.length);

                // Extract target if alias expects one and there's a bare token
                const params = ScriptCommandParser.extractTargetAndParams(remainingTokens, alias.targetParam);

                // Merge static params
                if (alias.staticParams) {
                    Object.assign(params, alias.staticParams);
                }

                return {
                    command: alias.command,
                    params,
                    raw: trimmed,
                    isBuiltin: false,
                };
            }
        }

        // 3. Special case: `add <type>` → create_primitive
        if (firstToken === "add" && tokens.length >= 2) {
            const typeName = tokens[1]!.toLowerCase();
            if (PRIMITIVE_TYPES.has(typeName)) {
                const remainingTokens = tokens.slice(2);
                const params = parseParams(remainingTokens);
                params.type = typeName;
                return {
                    command: "create_primitive",
                    params,
                    raw: trimmed,
                    isBuiltin: false,
                };
            }
        }

        // 4. Raw command name pass-through (e.g., `create_primitive type=box`)
        const rawCommandName = firstToken;
        const remainingTokens = tokens.slice(1);
        const params = parseParams(remainingTokens);

        return {
            command: rawCommandName,
            params,
            raw: trimmed,
            isBuiltin: false,
        };
    }

    /**
     * Extract a target param from remaining tokens, then parse the rest as params.
     * @param tokens
     * @param targetParam
     */
    private static extractTargetAndParams(
        tokens: string[],
        targetParam?: string,
    ): Record<string, unknown> {
        if (!targetParam || tokens.length === 0) {
            return parseParams(tokens);
        }

        // The first non-flag, non-key=value token is the target
        const firstToken = tokens[0]!;
        const isParam = firstToken.startsWith("--") || firstToken.includes("=");

        if (isParam) {
            return parseParams(tokens);
        }

        // Strip surrounding quotes from target
        let targetValue = firstToken;
        if (
            (targetValue.startsWith('"') && targetValue.endsWith('"')) ||
            (targetValue.startsWith("'") && targetValue.endsWith("'"))
        ) {
            targetValue = targetValue.slice(1, -1);
        }

        const params = parseParams(tokens.slice(1));
        params[targetParam] = targetValue;
        return params;
    }

    /**
     * Parse arguments for built-in commands.
     * @param command
     * @param tokens
     */
    private static parseBuiltinArgs(command: string, tokens: string[]): Record<string, unknown> {
        switch (command) {
            case "help":
                // help [topic]
                return tokens.length > 0 ? {topic: tokens.join(" ")} : {};
            case "exec":
                // exec [path]
                return tokens.length > 0 ? {path: tokens.join(" ")} : {};
            case "check": {
                // check | check exec | check buffer
                if (tokens.length === 0) return {};
                const mode = tokens[0]!.toLowerCase();
                if (mode === "exec" || mode === "buffer") {
                    return {mode, ...parseParams(tokens.slice(1))};
                }
                return {mode, path: tokens.join(" ")};
            }
            case "test": {
                // test | test script
                if (tokens.length === 0) return {};
                const mode = tokens[0]!.toLowerCase();
                return {mode, ...parseParams(tokens.slice(1))};
            }
            case "save":
                // save [path]
                return tokens.length > 0 ? {path: tokens.join(" ")} : {};
            case "import": {
                // import <type> <name> [filepath] ["comment"]
                // Also supports named params: import <type> name=X filepath=Y comment=Z
                if (tokens.length === 0) return {};
                const importParams: Record<string, unknown> = {type: tokens[0]!.toLowerCase()};
                const rest = tokens.slice(1);
                if (rest.length === 0) return importParams;

                // Named parameter style: any token has name=, filepath=, or comment=
                const hasNamedParams = rest.some(t => /^(name|filepath|comment)=/.test(t));
                if (hasNamedParams) {
                    const named = parseParams(rest);
                    if (named.name) importParams.name = named.name;
                    if (named.filepath) importParams.filepath = named.filepath;
                    if (named.comment) importParams.message = named.comment;
                    return importParams;
                }

                // Positional: import <type> <name>|"<name>" [filepath|"filepath"] ["comment"]
                let tok = rest[0]!;
                if ((tok.startsWith('"') && tok.endsWith('"')) || (tok.startsWith("'") && tok.endsWith("'"))) {
                    tok = tok.slice(1, -1);
                }
                importParams.name = tok;

                if (rest.length > 1) {
                    const second = rest[1]!;
                    const isQuoted = (second.startsWith('"') && second.endsWith('"')) || (second.startsWith("'") && second.endsWith("'"));
                    const secondVal = isQuoted ? second.slice(1, -1) : second;

                    // Unquoted → filepath; Quoted with file extension → filepath; Quoted without → comment
                    const isFilepath = !isQuoted || /\.\w{2,5}$/.test(secondVal);

                    if (isFilepath) {
                        importParams.filepath = secondVal;
                        if (rest.length > 2) {
                            let msg = rest.slice(2).join(" ");
                            if ((msg.startsWith('"') && msg.endsWith('"')) || (msg.startsWith("'") && msg.endsWith("'"))) {
                                msg = msg.slice(1, -1);
                            }
                            importParams.message = msg;
                        }
                    } else {
                        // Quoted without file extension → comment
                        importParams.message = secondVal;
                    }
                }
                return importParams;
            }
            case "export":
            case "dump": {
                if (tokens.length === 0) {
                    return {};
                }

                const target = tokens[0]!.toLowerCase();
                const rest = target === "scene" ? tokens.slice(1) : tokens;
                const named = parseParams(rest);
                const firstBareToken = rest[0];

                if (firstBareToken && !firstBareToken.includes("=") && !firstBareToken.startsWith("--")) {
                    let name = firstBareToken;
                    if ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith("'") && name.endsWith("'"))) {
                        name = name.slice(1, -1);
                    }
                    named.name = name;
                }

                return {
                    target,
                    ...named,
                };
            }
            case "require": {
                // require proxy alias="..." destination="..." [comment="..."]
                if (tokens.length === 0) return {};
                const subcommand = tokens[0]!.toLowerCase();
                const named = parseParams(tokens.slice(1));
                return {subcommand, ...named};
            }
            default:
                return {};
        }
    }

    /**
     * Get command suggestions for auto-complete.
     * @param partial
     */
    static getSuggestions(partial: string): string[] {
        const lower = partial.toLowerCase().trim();
        if (!lower) return [];

        const suggestions = new Set<string>();

        // Match built-in commands
        for (const cmd of BUILTIN_COMMANDS) {
            if (cmd.startsWith(lower)) {
                suggestions.add(cmd);
            }
        }

        // Match alias keys
        for (const key of SORTED_ALIAS_KEYS) {
            if (key.startsWith(lower)) {
                suggestions.add(key);
            }
        }

        // Match primitive types after "add "
        if (lower.startsWith("add ")) {
            const typePartial = lower.slice(4);
            for (const type of PRIMITIVE_TYPES) {
                if (type.toLowerCase().startsWith(typePartial)) {
                    suggestions.add(`add ${type}`);
                }
            }
        }

        // Match raw CommandsRegistry names so every supported command is discoverable.
        for (const command of SUPPORTED_RAW_COMMANDS) {
            if (command.startsWith(lower)) {
                suggestions.add(command);
            }
        }

        return Array.from(suggestions);
    }
}
