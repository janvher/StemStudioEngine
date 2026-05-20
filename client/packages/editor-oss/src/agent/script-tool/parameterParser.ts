/**
 * Parameter parsing utilities for the script-tool terminal.
 *
 * Handles the following value formats:
 *   key=value          — simple string/number
 *   key=1,2,3          — vector3 {x,y,z}
 *   key={x:1,y:2,z:3}  — explicit object notation
 *   key="quoted string" — string with spaces
 *   --key value         — flag-style
 *   key=true|false      — boolean
 */

const VECTOR_KEYS = new Set(["position", "rotation", "scale", "size"]);

/**
 *
 * @param value
 */
function stripSurroundingQuotes(value: string): string {
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }

    return value;
}

/**
 * Try to parse a value string into its typed representation.
 * @param value
 * @param key
 */
export function parseValue(value: string, key?: string): unknown {
    // Boolean
    if (value === "true") return true;
    if (value === "false") return false;

    // Object literal: {x:1,y:2,z:3} or {"key":"value"}
    if (value.startsWith("{") && value.endsWith("}")) {
        return parseObjectLiteral(value);
    }

    // Array literal: [1,2,3]
    if (value.startsWith("[") && value.endsWith("]")) {
        try {
            // Convert to valid JSON by wrapping bare keys
            return JSON.parse(normalizeJsonLike(value));
        } catch {
            return value;
        }
    }

    // Comma-separated numbers → vector3 (only for known keys)
    if (key && VECTOR_KEYS.has(key)) {
        const parts = value.split(",");
        if (parts.length === 3 && parts.every(p => !isNaN(Number(p.trim())))) {
            return {x: Number(parts[0]!.trim()), y: Number(parts[1]!.trim()), z: Number(parts[2]!.trim())};
        }
    }

    // Number
    if (!isNaN(Number(value)) && value.trim() !== "") {
        return Number(value);
    }

    return value;
}

/**
 * Parse {x:1,y:2,z:3} style object notation (not strict JSON).
 * @param str
 */
function parseObjectLiteral(str: string): Record<string, unknown> {
    try {
        return JSON.parse(normalizeJsonLike(str));
    } catch {
        // Fallback: attempt simple key:value parsing
        const inner = str.slice(1, -1).trim();
        const result: Record<string, unknown> = {};
        // Match key:value pairs, allowing quoted strings as values
        const pairRegex = /(\w+)\s*:\s*("(?:[^"\\]|\\.)*"|[^,}]+)/g;
        let match;
        while ((match = pairRegex.exec(inner)) !== null) {
            const k = match[1]!;
            let v = match[2]!.trim();
            // Strip quotes
            if (v.startsWith('"') && v.endsWith('"')) {
                v = v.slice(1, -1);
            }
            result[k] = parseValue(v);
        }
        return result;
    }
}

/**
 * Convert JS-like object/array notation to valid JSON.
 * Wraps unquoted keys in double quotes, handles single-quoted values.
 * @param str
 */
function normalizeJsonLike(str: string): string {
    // Replace single quotes with double quotes
    let s = str.replace(/'/g, '"');
    // Wrap unquoted keys: word followed by :
    s = s.replace(/(\{|,)\s*(\w+)\s*:/g, '$1"$2":');
    return s;
}

/**
 * Tokenize an input string into tokens, respecting quoted strings and braces/brackets.
 * Returns an array of tokens.
 * @param input
 */
export function tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let inQuote: string | null = null;
    let braceDepth = 0;
    let bracketDepth = 0;

    for (let i = 0; i < input.length; i++) {
        const char = input[i]!;

        // Handle quotes
        if (inQuote) {
            current += char;
            if (char === inQuote && input[i - 1] !== "\\") {
                inQuote = null;
            }
            continue;
        }

        if (char === '"' || char === "'") {
            inQuote = char;
            current += char;
            continue;
        }

        // Handle braces
        if (char === "{") {
            braceDepth++;
            current += char;
            continue;
        }
        if (char === "}") {
            braceDepth--;
            current += char;
            continue;
        }

        // Handle brackets
        if (char === "[") {
            bracketDepth++;
            current += char;
            continue;
        }
        if (char === "]") {
            bracketDepth--;
            current += char;
            continue;
        }

        // Space outside of quotes/braces/brackets: token boundary
        if (char === " " && braceDepth === 0 && bracketDepth === 0) {
            if (current.length > 0) {
                tokens.push(current);
                current = "";
            }
            continue;
        }

        current += char;
    }

    if (current.length > 0) {
        tokens.push(current);
    }

    return tokens;
}

/**
 * Parse a list of tokens into a params object.
 * Supports both `key=value` and `--key value` styles.
 * @param tokens
 */
export function parseParams(tokens: string[]): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]!;

        // Flag style: --key value
        if (token.startsWith("--")) {
            const key = token.slice(2);
            const nextToken = tokens[i + 1];
            if (nextToken && !nextToken.startsWith("--") && !nextToken.includes("=")) {
                params[key] = parseValue(stripSurroundingQuotes(nextToken), key);
                i++;
            } else {
                params[key] = true;
            }
            continue;
        }

        // Key=value style
        const eqIndex = token.indexOf("=");
        if (eqIndex > 0) {
            const key = token.slice(0, eqIndex);
            const value = stripSurroundingQuotes(token.slice(eqIndex + 1));
            params[key] = parseValue(value, key);
            continue;
        }

        // Bare token — skip (these are handled by the command parser as target/type)
    }

    return params;
}
