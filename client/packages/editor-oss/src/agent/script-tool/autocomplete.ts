import {
    CommandHelp,
    getCommandHelpByRegistryCommand,
    getCommandHelpDefinition,
    getCommandHelpTopics,
} from "./helpData";
import {parseParams, tokenize} from "./parameterParser";

export interface ParameterAutocompleteResult {
    suggestions: string[];
    replaceMode: "append" | "replace-token";
}

/**
 *
 * @param token
 */
function isParamToken(token: string): boolean {
    return token.startsWith("--") || token.includes("=");
}

/**
 *
 * @param tokens
 * @param trailingSpace
 */
function getCurrentToken(tokens: string[], trailingSpace: boolean): string {
    if (tokens.length === 0 || trailingSpace) {
        return "";
    }

    return tokens[tokens.length - 1] || "";
}

/**
 *
 * @param tokens
 */
function resolveCommandHelp(tokens: string[]): {topic: string; help: CommandHelp; consumedTokens: number} | null {
    const lowerTokens = tokens.map(token => token.toLowerCase());

    let bestMatch: {topic: string; help: CommandHelp; consumedTokens: number} | null = null;

    for (const topic of getCommandHelpTopics()) {
        const topicTokens = topic.split(" ");
        if (topicTokens.length > lowerTokens.length) {
            continue;
        }

        const matches = topicTokens.every((token, index) => token === lowerTokens[index]);
        if (!matches) {
            continue;
        }

        const help = getCommandHelpDefinition(topic);
        if (!help) {
            continue;
        }

        if (!bestMatch || topicTokens.length > bestMatch.consumedTokens) {
            bestMatch = {topic, help, consumedTokens: topicTokens.length};
        }
    }

    if (bestMatch) {
        return bestMatch;
    }

    const registryMatch = getCommandHelpByRegistryCommand(lowerTokens[0] || "");
    if (!registryMatch) {
        return null;
    }

    return {
        topic: registryMatch.topic,
        help: registryMatch.help,
        consumedTokens: 1,
    };
}

/**
 *
 * @param paramName
 * @param currentToken
 */
function buildSuggestionToken(paramName: string, currentToken: string): string {
    if (currentToken.startsWith("--")) {
        return `--${paramName}`;
    }

    return `${paramName}=`;
}

/**
 *
 * @param currentToken
 */
function getCurrentParamKey(currentToken: string): string {
    if (currentToken.startsWith("--")) {
        return currentToken.slice(2).toLowerCase();
    }

    const eqIndex = currentToken.indexOf("=");
    if (eqIndex >= 0) {
        return currentToken.slice(0, eqIndex).toLowerCase();
    }

    return "";
}

/**
 *
 * @param input
 */
export function getParameterSuggestions(input: string): ParameterAutocompleteResult | null {
    const trimmedLeft = input.trimStart();
    if (!trimmedLeft) {
        return null;
    }

    const trailingSpace = /\s$/.test(input);
    const tokens = tokenize(trimmedLeft);
    const commandMatch = resolveCommandHelp(tokens);

    if (!commandMatch) {
        return null;
    }

    const remainingTokens = tokens.slice(commandMatch.consumedTokens);
    const currentToken = getCurrentToken(remainingTokens, trailingSpace);
    const firstRemainingToken = remainingTokens[0] || "";
    const parsedParams = parseParams(remainingTokens);
    const targetRequired = commandMatch.help.params.some(param => param.name === "<target>");
    const targetProvided =
        (!targetRequired)
        || (typeof parsedParams.target === "string" && parsedParams.target.length > 0)
        || (firstRemainingToken.length > 0 && !isParamToken(firstRemainingToken));

    if (targetRequired && !targetProvided) {
        return null;
    }

    if (currentToken && !isParamToken(currentToken)) {
        return null;
    }

    const currentParamKey = getCurrentParamKey(currentToken);
    const usedParamNames = new Set(
        Object.keys(parsedParams)
            .map(name => name.toLowerCase())
            .filter(name => name !== currentParamKey),
    );

    const suggestions = commandMatch.help.params
        .filter(param => param.name !== "<target>")
        .filter(param => !usedParamNames.has(param.name.toLowerCase()))
        .map((param, index) => ({
            param,
            index,
            suggestion: buildSuggestionToken(param.name, currentToken),
        }))
        .filter(({param, suggestion}) => {
            if (!currentToken) {
                return true;
            }

            if (currentToken.startsWith("--")) {
                return `--${param.name}`.toLowerCase().startsWith(currentToken.toLowerCase());
            }

            if (currentToken.includes("=")) {
                return param.name.toLowerCase().startsWith(currentParamKey);
            }

            return suggestion.toLowerCase().startsWith(currentToken.toLowerCase());
        })
        .sort((a, b) => {
            if (a.param.required !== b.param.required) {
                return a.param.required ? -1 : 1;
            }
            return a.index - b.index;
        })
        .map(({suggestion}) => suggestion)
        .slice(0, 8);

    if (suggestions.length === 0) {
        return null;
    }

    return {
        suggestions,
        replaceMode: currentToken ? "replace-token" : "append",
    };
}

/**
 *
 * @param input
 * @param suggestion
 * @param replaceMode
 */
export function applyParameterSuggestion(
    input: string,
    suggestion: string,
    replaceMode: ParameterAutocompleteResult["replaceMode"],
): string {
    const needsTrailingSpace = suggestion.startsWith("--");

    if (replaceMode === "append" || /\s$/.test(input)) {
        return `${input}${suggestion}${needsTrailingSpace ? " " : ""}`;
    }

    const lastSpaceIndex = input.search(/\S+\s*$/);
    const prefix = lastSpaceIndex > 0 ? input.slice(0, lastSpaceIndex) : "";
    return `${prefix}${suggestion}${needsTrailingSpace ? " " : ""}`;
}
