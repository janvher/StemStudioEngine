/**
 * IntelliJ / WebStorm keybindings for Monaco editor.
 * Maps common JetBrains keyboard shortcuts to their Monaco equivalents.
 *
 * Returns an array of disposables so the caller can clean up on unmount.
 */

type MonacoType = any;
type EditorType = any;
type DisposableType = { dispose: () => void };

/**
 *
 * @param monaco
 * @param editor
 */
export function registerIntellijKeybindings(
    monaco: MonacoType,
    editor: EditorType,
): DisposableType[] {
    const { KeyMod, KeyCode } = monaco;
    const disposables: DisposableType[] = [];

    const bind = (
        keybinding: number,
        actionId: string,
        label: string,
    ) => {
        const d = editor.addAction({
            id: `intellij.${actionId}`,
            label: `IntelliJ: ${label}`,
            keybindings: [keybinding],
            run: (ed: EditorType) => {
                ed.trigger("intellij", actionId, null);
            },
        });
        if (d) disposables.push(d);
    };

    // -- Duplicate line: Ctrl+D / Cmd+D --
    bind(
        KeyMod.CtrlCmd | KeyCode.KeyD,
        "editor.action.copyLinesDownAction",
        "Duplicate Line",
    );

    // -- Delete line: Ctrl+Y / Cmd+Y --
    // (IntelliJ uses Ctrl+Y to delete line, not redo)
    disposables.push(
        editor.addAction({
            id: "intellij.deleteLine",
            label: "IntelliJ: Delete Line",
            keybindings: [KeyMod.CtrlCmd | KeyCode.KeyY],
            run: (ed: EditorType) => {
                ed.trigger("intellij", "editor.action.deleteLines", null);
            },
        }),
    );

    // -- Move line up: Alt+Shift+Up --
    bind(
        KeyMod.Alt | KeyMod.Shift | KeyCode.UpArrow,
        "editor.action.moveLinesUpAction",
        "Move Line Up",
    );

    // -- Move line down: Alt+Shift+Down --
    bind(
        KeyMod.Alt | KeyMod.Shift | KeyCode.DownArrow,
        "editor.action.moveLinesDownAction",
        "Move Line Down",
    );

    // -- Comment line: Ctrl+/ / Cmd+/ --
    bind(
        KeyMod.CtrlCmd | KeyCode.Slash,
        "editor.action.commentLine",
        "Toggle Line Comment",
    );

    // -- Block comment: Ctrl+Shift+/ / Cmd+Shift+/ --
    bind(
        KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Slash,
        "editor.action.blockComment",
        "Toggle Block Comment",
    );

    // -- Reformat code: Ctrl+Alt+L / Cmd+Alt+L --
    bind(
        KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KeyL,
        "editor.action.formatDocument",
        "Reformat Code",
    );

    // -- Go to line: Ctrl+G / Cmd+G --
    bind(
        KeyMod.CtrlCmd | KeyCode.KeyG,
        "editor.action.gotoLine",
        "Go to Line",
    );

    // -- Find: Ctrl+F / Cmd+F -- (already default, but ensure consistency)
    bind(
        KeyMod.CtrlCmd | KeyCode.KeyF,
        "actions.find",
        "Find",
    );

    // -- Replace: Ctrl+R / Cmd+R (IntelliJ) instead of Ctrl+H --
    bind(
        KeyMod.CtrlCmd | KeyCode.KeyR,
        "editor.action.startFindReplaceAction",
        "Replace",
    );

    // -- Replace (alternate): Cmd+Shift+R / Ctrl+Shift+R --
    // Prevents the browser hard-refresh and opens find-replace instead.
    bind(
        KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyR,
        "editor.action.startFindReplaceAction",
        "Replace (Shift)",
    );

    // -- Select all occurrences: Ctrl+Shift+Alt+J / Cmd+Shift+Alt+J --
    // (IntelliJ "Select All Occurrences")
    disposables.push(
        editor.addAction({
            id: "intellij.selectAllOccurrences",
            label: "IntelliJ: Select All Occurrences",
            keybindings: [
                KeyMod.CtrlCmd | KeyMod.Shift | KeyMod.Alt | KeyCode.KeyJ,
            ],
            run: (ed: EditorType) => {
                ed.trigger("intellij", "editor.action.selectHighlights", null);
            },
        }),
    );

    // -- Add selection to next occurrence: Alt+J --
    // (IntelliJ "Add Selection for Next Occurrence")
    disposables.push(
        editor.addAction({
            id: "intellij.addNextOccurrence",
            label: "IntelliJ: Add Selection for Next Occurrence",
            keybindings: [KeyMod.Alt | KeyCode.KeyJ],
            run: (ed: EditorType) => {
                ed.trigger("intellij", "editor.action.addSelectionToNextFindMatch", null);
            },
        }),
    );

    // -- Expand selection: Shift + Alt + Right --
    bind(
        KeyMod.Alt | KeyMod.Shift | KeyCode.RightArrow,
        "editor.action.smartSelect.expand",
        "Expand Selection",
    );

    // -- Shrink selection: Shift + Alt + Left --
    bind(
        KeyMod.Alt | KeyMod.Shift | KeyCode.LeftArrow,
        "editor.action.smartSelect.shrink",
        "Shrink Selection",
    );

    // -- Toggle fold: Ctrl+. / Cmd+. (IntelliJ uses Ctrl+Numpad+/-, this is a close equivalent) --
    bind(
        KeyMod.CtrlCmd | KeyCode.Period,
        "editor.toggleFold",
        "Toggle Fold",
    );

    // -- Fold all: Ctrl+Shift+- / Cmd+Shift+- --
    bind(
        KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Minus,
        "editor.foldAll",
        "Fold All",
    );

    // -- Unfold all: Ctrl+Shift+= / Cmd+Shift+= --
    bind(
        KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Equal,
        "editor.unfoldAll",
        "Unfold All",
    );

    // -- Join lines: Ctrl+Shift+J / Cmd+Shift+J --
    bind(
        KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyJ,
        "editor.action.joinLines",
        "Join Lines",
    );

    return disposables;
}
