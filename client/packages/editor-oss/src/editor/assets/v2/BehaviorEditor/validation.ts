/**
 * Strip comments from a single line, respecting block-comment state.
 * @param line
 * @param inBlock
 */
function stripComments(line: string, inBlock: boolean): {cleaned: string; inBlock: boolean} {
    let s = line;

    if (inBlock) {
        const endIdx = s.indexOf("*/");
        if (endIdx === -1) return {cleaned: "", inBlock: true};
        s = s.substring(endIdx + 2);
        inBlock = false;
    }

    // Remove inline block comments (/* ... */ on same line)
    s = s.replace(/\/\*.*?\*\//g, "");

    // Check for block comment that starts but doesn't end on this line
    const blockStart = s.indexOf("/*");
    if (blockStart !== -1) {
        s = s.substring(0, blockStart);
        inBlock = true;
    }

    // Remove single-line comments
    const lineComment = s.indexOf("//");
    if (lineComment !== -1) {
        s = s.substring(0, lineComment);
    }

    return {cleaned: s, inBlock};
}

export const noSelfAssign = (lines: string[], markers: any[], monaco: any) => {
    let inBlock = false;

    lines.forEach((line, index) => {
        const result = stripComments(line, inBlock);
        inBlock = result.inBlock;

        const cleaned = result.cleaned.trim();
        if (!cleaned.includes("self = ")) return;

        const isDeclaration =
            cleaned.startsWith("const self") ||
            cleaned.startsWith("let self") ||
            cleaned.startsWith("var self");

        if (!isDeclaration) {
            const startIndex = line.indexOf("self = ");
            const rightSide = line.substring(startIndex + "self = ".length).trim();

            const endIndex = startIndex + "self = ".length + rightSide.length;

            markers.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: index + 1,
                startColumn: startIndex + 1,
                endLineNumber: index + 1,
                endColumn: endIndex + 1,
                message: "Avoid assigning a value to global 'self'. Declare 'self' using 'const', 'let', or 'var'.",
            });
        }
    });
};
