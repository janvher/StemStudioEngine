/**
 * Utilities for handling debugger statements in behavior scripts
 */

/**
 * Removes all debugger statements from JavaScript code string
 * Simple implementation that removes obvious debugger statements
 * @param code The JavaScript code to filter
 * @returns The code with debugger statements removed
 */
export function removeDebuggerStatements(code: string): string {
    // Remove standalone debugger statements (most common case in behaviors)
    let result = code.replace(/^\s*debugger\s*;?\s*$/gm, '');

    // Remove simple inline debugger statements (basic case)
    // This is a conservative approach - it's better to miss some edge cases than break valid code
    result = result.replace(/\bdebugger\s*;/g, ';');
    result = result.replace(/\bdebugger\s+/g, ' ');

    return result;
}

/**
 * Counts the number of debugger statements in code
 * @param code The JavaScript code to analyze
 * @returns The number of debugger statements found
 */
export function countDebuggerStatements(code: string): number {
    const debuggerRegex = /\bdebugger\s*;?/g;
    const matches = code.match(debuggerRegex);
    return matches ? matches.length : 0;
}

/**
 * Checks if production mode is enabled and debugger filtering should be applied
 * @param gameSettings The game settings object
 * @param gameSettings.productionMode
 * @returns True if debugger statements should be filtered out
 */
export function shouldFilterDebuggers(gameSettings?: { productionMode?: boolean }): boolean {
    return gameSettings?.productionMode === true;
}