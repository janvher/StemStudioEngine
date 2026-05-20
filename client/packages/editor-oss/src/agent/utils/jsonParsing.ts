/**
 * Generic JSON-parsing helpers used by tool-output handlers and similar
 * machinery that has to extract one or more JSON objects from a string
 * payload (usually streamed LLM output that may include markdown code
 * fences or multiple objects).
 *
 * Kept generic so any CopilotProvider can consume it.
 */

/**
 * Strip markdown code fences from text, preserving the content inside.
 * Handles ```json, ```jsonrpc, ```, and similar patterns.
 */
export function stripMarkdownCodeFences(text: string): string {
    return text.replace(/```(?:json|jsonrpc)?\s*\n?/g, "");
}

/**
 * Split multiple concatenated JSON objects into an array of individual
 * JSON strings.
 *
 * @param text Text containing one or more JSON objects (possibly
 * concatenated without separators, possibly with surrounding text).
 * @returns Array of individual JSON object strings.
 */
export function splitJsonObjects(text: string): string[] {
    const result: string[] = [];
    let depth = 0;
    let currentStart = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (escapeNext) {
            escapeNext = false;
            continue;
        }

        if (char === "\\" && inString) {
            escapeNext = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (!inString) {
            if (char === "{") {
                if (depth === 0) {
                    currentStart = i;
                }
                depth++;
            } else if (char === "}") {
                depth--;
                if (depth === 0) {
                    const jsonText = text.substring(currentStart, i + 1).trim();
                    if (jsonText) {
                        result.push(jsonText);
                    }
                }
            }
        }
    }

    if (result.length === 0 && text.trim().startsWith("{")) {
        return [text.trim()];
    }

    return result;
}

/**
 * Trim string after the last closing brace.
 */
export function trimAfterLastBrace(str: string): string {
    const lastBraceIndex = str.lastIndexOf("}");
    if (lastBraceIndex === -1) {
        return "";
    }
    return str.substring(0, lastBraceIndex + 1);
}
