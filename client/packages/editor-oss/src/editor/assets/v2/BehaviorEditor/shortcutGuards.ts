const isPrimaryModifier = (event: KeyboardEvent): boolean => event.metaKey || event.ctrlKey;

const getKey = (event: KeyboardEvent): string => event.key.toLowerCase();

/**
 * Returns true for shortcuts that should stay inside Monaco/editor workflow
 * instead of triggering browser-level actions.
 * @param event
 */
export const shouldGuardEditorShortcut = (event: KeyboardEvent): boolean => {
    const key = getKey(event);

    // Alt-based editor shortcuts
    if (!isPrimaryModifier(event)) {
        if (event.altKey && !event.shiftKey && key === "j") return true;
        if (event.altKey && event.shiftKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) return true;
        return false;
    }

    // Ctrl/Cmd + ...
    if (!event.shiftKey && !event.altKey) {
        return ["s", "d", "y", "f", "r", "g", "w", "/", "."].includes(key);
    }

    // Ctrl/Cmd + Shift + ...
    if (event.shiftKey && !event.altKey) {
        return ["w", "/", "j", "-", "="].includes(key);
    }

    // Ctrl/Cmd + Alt + ...
    if (!event.shiftKey && event.altKey) {
        return key === "l";
    }

    // Ctrl/Cmd + Shift + Alt + ...
    if (event.shiftKey && event.altKey) {
        return key === "j";
    }

    return false;
};

export const isEventInsideMonaco = (event: KeyboardEvent): boolean => {
    const target = event.target;
    if (!target || typeof (target as Element).closest !== "function") return false;
    return Boolean((target as Element).closest(".monaco-editor"));
};
