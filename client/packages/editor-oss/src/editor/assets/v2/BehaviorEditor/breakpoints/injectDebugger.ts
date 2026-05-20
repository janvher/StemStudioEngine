/**
 * Runtime debugger injection utility
 * Injects debugger statements at breakpoint lines when behaviors execute in debug mode
 */

/**
 * Injects debugger statements at specified line numbers
 * This is called at runtime when behavior code is about to execute
 *
 * @param code - The original source code
 * @param breakpointLines - Set of line numbers (1-indexed) where breakpoints are set
 * @returns Modified code with debugger statements injected
 */
export function injectDebuggerStatements(
    code: string,
    breakpointLines: Set<number>,
): string {
    if (breakpointLines.size === 0) {
        return code;
    }

    const lines = code.split("\n");
    const sortedBreakpoints = Array.from(breakpointLines).sort((a, b) => b - a);

    // Process in reverse order to avoid line number shifting issues
    sortedBreakpoints.forEach(lineNumber => {
        const index = lineNumber - 1; // Convert to 0-indexed
        if (index >= 0 && index < lines.length) {
            // Preserve indentation of the original line
            const originalLine = lines[index] ?? "";
            const indentMatch = originalLine.match(/^(\s*)/);
            const indent = indentMatch ? indentMatch[1] : "";

            // Insert debugger statement before the line
            lines[index] = `${indent}debugger; /* breakpoint */ ${originalLine.trimStart()}`;
        }
    });

    return lines.join("\n");
}

/**
 * Removes any previously injected debugger statements
 * Useful for cleaning up code before saving or displaying
 *
 * @param code - Code that may contain injected debugger statements
 * @returns Clean code without injected debugger statements
 */
export function removeInjectedDebuggers(code: string): string {
    // Remove lines that match our injection pattern
    return code.replace(/^(\s*)debugger; \/\* breakpoint \*\/ /gm, "$1");
}

/**
 * Check if code has any injected debugger statements
 *
 * @param code - The code to check
 * @returns true if code contains injected debugger statements
 */
export function hasInjectedDebuggers(code: string): boolean {
    return /debugger; \/\* breakpoint \*\//.test(code);
}
