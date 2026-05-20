/**
 * ScriptExecutor — Runs multi-line .stemscript files sequentially.
 *
 * Features:
 * - Lines starting with # are comments (ignored)
 * - Empty lines are ignored
 * - Commands executed sequentially, top-to-bottom
 * - On error: log error, continue to next command (non-fatal)
 * - Progress reporting via callback
 */

import {IMPORT_TYPES, getExtensionsForType} from "./importHandler";
import {ScriptCommandParser, ParsedCommand} from "./ScriptCommandParser";

export interface ScriptLine {
    lineNumber: number;
    raw: string;
    parsed: ParsedCommand | null;
    isComment: boolean;
    isEmpty: boolean;
}

export interface ScriptExecutionResult {
    totalLines: number;
    executedCommands: number;
    successCount: number;
    failCount: number;
    results: ScriptLineResult[];
}

export interface ScriptLineResult {
    lineNumber: number;
    command: string;
    success: boolean;
    output?: string;
    error?: string;
}

export type CommandExecutorFn = (command: string, params: Record<string, unknown>) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
}>;

export type ProgressCallback = (current: number, total: number, line: string) => void;

export interface ImportRequest {
    /** Zero-based index of this import among all imports in the script */
    index: number;
    /** Import type (e.g. "model", "behavior") */
    type: string;
    /** Name to assign to the imported asset/object in the scene */
    name?: string;
    /** Optional suggested file path for auto-resolution from a folder */
    filepath?: string;
    /** Optional URL to fetch the asset blob from (export-mode bundles). */
    url?: string;
    /** Optional user-facing message from the import command */
    message?: string;
    /** File extensions accepted for this type */
    extensions: string[];
}

export interface ProxyRequirement {
    alias: string;
    destination: string;
    comment?: string;
}

/** Handler for builtin commands that should execute during script mode (e.g. import). */
export type BuiltinExecutorFn = (command: string, params: Record<string, unknown>) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
}>;

export class ScriptExecutor {
    /**
     * Parse a .stemscript file into individual lines.
     * @param content
     */
    static parseScript(content: string): ScriptLine[] {
        const rawLines = content.split("\n");
        return rawLines.map((raw, index) => {
            const trimmed = raw.trim();
            const isComment = trimmed.startsWith("#");
            const isEmpty = trimmed === "";

            let parsed: ParsedCommand | null = null;
            if (!isComment && !isEmpty) {
                parsed = ScriptCommandParser.parse(trimmed);
            }

            return {
                lineNumber: index + 1,
                raw,
                parsed,
                isComment,
                isEmpty,
            };
        });
    }

    /**
     * Pre-scan a script for import commands and return structured requests.
     * Used to show a batch dialog before execution begins.
     * @param content
     */
    static extractImports(content: string): ImportRequest[] {
        const lines = ScriptExecutor.parseScript(content);
        const imports: ImportRequest[] = [];
        for (const line of lines) {
            if (!line.parsed || !line.parsed.isBuiltin || line.parsed.command !== "import") continue;
            const type = line.parsed.params.type as string | undefined;
            if (!type || !IMPORT_TYPES[type]) continue;
            imports.push({
                index: imports.length,
                type,
                name: line.parsed.params.name as string | undefined,
                filepath: line.parsed.params.filepath as string | undefined,
                url: line.parsed.params.url as string | undefined,
                message: line.parsed.params.message as string | undefined,
                extensions: getExtensionsForType(type),
            });
        }
        return imports;
    }

    /**
     * Pre-scan a script for `require proxy` commands and return structured requirements.
     * Used to show informational toasts before execution begins.
     * @param content
     */
    static extractProxyRequirements(content: string): ProxyRequirement[] {
        const lines = ScriptExecutor.parseScript(content);
        const requirements: ProxyRequirement[] = [];
        for (const line of lines) {
            if (!line.parsed || !line.parsed.isBuiltin || line.parsed.command !== "require") continue;
            const params = line.parsed.params;
            if ((params.subcommand as string) !== "proxy") continue;
            const alias = params.alias as string | undefined;
            const destination = params.destination as string | undefined;
            if (!alias || !destination) continue;
            requirements.push({
                alias,
                destination,
                comment: params.comment as string | undefined,
            });
        }
        return requirements;
    }

    /** Builtins that are always skipped during script execution. */
    private static readonly SKIP_BUILTINS = new Set(["help", "clear", "history", "exit", "export", "dump", "require", "check", "test"]);

    /**
     * Execute a parsed script sequentially.
     * Skips comments and empty lines.
     * Continues on errors (non-fatal).
     * @param content
     * @param executeCommand
     * @param onProgress
     * @param executeBuiltin
     */
    static async execute(
        content: string,
        executeCommand: CommandExecutorFn,
        onProgress?: ProgressCallback,
        executeBuiltin?: BuiltinExecutorFn,
    ): Promise<ScriptExecutionResult> {
        const lines = ScriptExecutor.parseScript(content);
        const executableLines = lines.filter(l => !l.isComment && !l.isEmpty && l.parsed);
        const results: ScriptLineResult[] = [];
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < executableLines.length; i++) {
            const line = executableLines[i]!;
            const parsed = line.parsed!;

            onProgress?.(i + 1, executableLines.length, parsed.raw);

            if (parsed.isBuiltin) {
                // Skip builtins that don't make sense in script mode
                if (ScriptExecutor.SKIP_BUILTINS.has(parsed.command) || !executeBuiltin) {
                    results.push({
                        lineNumber: line.lineNumber,
                        command: parsed.command,
                        success: true,
                        output: `Skipped built-in command: ${parsed.command}`,
                    });
                    successCount++;
                    continue;
                }

                // Execute builtins that should run in script mode (e.g. import)
                try {
                    const result = await executeBuiltin(parsed.command, parsed.params);
                    if (result.success) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                    results.push({
                        lineNumber: line.lineNumber,
                        command: parsed.raw,
                        success: result.success,
                        output: result.message,
                        error: result.error,
                    });
                } catch (err) {
                    failCount++;
                    results.push({
                        lineNumber: line.lineNumber,
                        command: parsed.raw,
                        success: false,
                        error: (err instanceof Error ? err.message : "") || "Unexpected error",
                    });
                }
                continue;
            }

            try {
                const result = await executeCommand(parsed.command, parsed.params);
                if (result.success) {
                    successCount++;
                    results.push({
                        lineNumber: line.lineNumber,
                        command: parsed.raw,
                        success: true,
                        output: result.message,
                    });
                } else {
                    failCount++;
                    results.push({
                        lineNumber: line.lineNumber,
                        command: parsed.raw,
                        success: false,
                        error: result.error || result.message || "Unknown error",
                    });
                }
            } catch (err: any) {
                failCount++;
                results.push({
                    lineNumber: line.lineNumber,
                    command: parsed.raw,
                    success: false,
                    error: err.message || "Unexpected error",
                });
            }
        }

        return {
            totalLines: lines.length,
            executedCommands: executableLines.length,
            successCount,
            failCount,
            results,
        };
    }
}
