const editorShellPatterns = [
    /^\/create\/project(?:\/.*)?$/,
    /^\/stem-editor\/[^/]+$/,
];

const playShellPatterns = [
    /^\/play(?:\/[^/]+)?\/?$/,
];

const shouldBootEditorShell = editorShellPatterns.some(pattern => pattern.test(window.location.pathname));
const shouldBootPlayShell = playShellPatterns.some(pattern => pattern.test(window.location.pathname));

if (shouldBootPlayShell) {
    void import("./play.index");
} else if (shouldBootEditorShell) {
    void import("./editor.index");
} else {
    void import("./public.index");
}
