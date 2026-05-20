import {useEffect} from "react";

interface UseEscapeDismissOptions {
    onEscape: () => void;
    enabled?: boolean;
    ownerWindow?: Window | null;
}

/**
 * Adds an Escape key handler scoped to the provided window.
 * @param root0
 * @param root0.onEscape
 * @param root0.enabled
 * @param root0.ownerWindow
 */
export const useEscapeDismiss = ({onEscape, enabled = true, ownerWindow}: UseEscapeDismissOptions) => {
    useEffect(() => {
        if (!enabled) {
            return;
        }

        const targetWindow = ownerWindow ?? window;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onEscape();
            }
        };

        targetWindow.addEventListener("keydown", handleKeyDown);
        return () => targetWindow.removeEventListener("keydown", handleKeyDown);
    }, [enabled, onEscape, ownerWindow]);
};
