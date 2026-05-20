import {useCallback, useEffect, useRef, useState} from "react";

export interface PopoutWindowState {
    isOpen: boolean;
    popoutContainer: HTMLDivElement | null;
    popoutWindow: Window | null;
    open: (title?: string) => void;
    close: () => void;
    focus: () => void;
}

/**
 * Open a popup window synchronously (must be called from a user-gesture
 * handler such as a click callback so the browser does not block it).
 * Returns the Window on success, or null if the browser blocked it.
 */
export function openPopupWindow(title?: string): Window | null {
    const width = Math.round(window.screen.availWidth * 0.8);
    const height = Math.round(window.screen.availHeight * 0.8);
    const left = Math.round((window.screen.availWidth - width) / 2);
    const top = Math.round((window.screen.availHeight - height) / 2);

    const popup = window.open(
        "",
        "stemstudio_code_editor",
        `popup,width=${width},height=${height},left=${left},top=${top},location=no,toolbar=no,menubar=no,status=no`,
    );

    if (!popup) {
        console.warn("[openPopupWindow] Popup blocked by browser");
        return null;
    }

    popup.document.title = title || "Code Editor";
    popup.document.body.style.margin = "0";
    popup.document.body.style.padding = "0";
    popup.document.body.style.background = "#09090b";
    popup.document.body.style.overflow = "hidden";

    return popup;
}

/** True on desktops/laptops. False on iPad, phones, tablets. */
export const isDesktopDevice = (): boolean => {
    // iPadOS 13+ masquerades as macOS — detect via touch points
    const isIPad = navigator.maxTouchPoints > 0 && /Macintosh/.test(navigator.userAgent);
    return (
        window.matchMedia("(pointer: fine) and (min-width: 1024px)").matches &&
        !isIPad
    );
};

/**
 * Manages a popup browser window lifecycle.
 * - `open(title?)` opens a blank popup, copies styles from the host document,
 *   and creates a container `<div>` for React portals.
 * - `close()` tears the popup down.
 * - `focus()` brings the popup to the front.
 * - Automatically closes the popup when the main window unloads.
 * - Calls `onClose` when the popup is closed by the user or programmatically.
 * @param onClose
 */
export function usePopoutWindow(onClose?: () => void, initialWindow?: Window | null): PopoutWindowState {
    const [isOpen, setIsOpen] = useState(false);
    const popoutRef = useRef<Window | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const onCloseRef = useRef(onClose);
    const styleSyncCleanupRef = useRef<(() => void) | null>(null);
    const adoptedRef = useRef(false);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    const setupPopup = useCallback((popup: Window) => {
        // Keep runtime styles in sync (styled-components/Monaco injected styles)
        // so popout editors preserve cursor, widgets, and layout styles.
        const headEl = popup.document.head;
        const syncStyles = () => {
            headEl
                .querySelectorAll('[data-popout-style-copy="true"]')
                .forEach(node => node.remove());

            document.querySelectorAll('link[rel="stylesheet"], style').forEach(node => {
                let clone: HTMLLinkElement | HTMLStyleElement;
                if (node instanceof HTMLStyleElement) {
                    clone = popup.document.createElement("style");
                    try {
                        const rules = node.sheet ? Array.from(node.sheet.cssRules, r => r.cssText).join("\n") : "";
                        clone.textContent = rules || node.textContent || "";
                    } catch {
                        clone.textContent = node.textContent || "";
                    }
                } else {
                    clone = node.cloneNode(true) as HTMLLinkElement;
                }
                clone.setAttribute("data-popout-style-copy", "true");
                headEl.appendChild(clone);
            });
        };

        syncStyles();

        let rafId = 0;
        const scheduleSync = () => {
            if (rafId) return;
            rafId = window.requestAnimationFrame(() => {
                rafId = 0;
                if (!popup.closed) {
                    syncStyles();
                }
            });
        };

        const observer = new MutationObserver(scheduleSync);
        observer.observe(document.head, {
            childList: true,
            subtree: true,
            characterData: true,
        });
        styleSyncCleanupRef.current = () => {
            observer.disconnect();
            if (rafId) {
                window.cancelAnimationFrame(rafId);
                rafId = 0;
            }
        };

        // Create portal container
        const container = popup.document.createElement("div");
        container.id = "popout-root";
        container.style.width = "100vw";
        container.style.height = "100vh";
        popup.document.body.appendChild(container);

        popoutRef.current = popup;
        containerRef.current = container;
        setIsOpen(true);

        // Listen for popup close
        popup.addEventListener("beforeunload", () => {
            styleSyncCleanupRef.current?.();
            styleSyncCleanupRef.current = null;
            popoutRef.current = null;
            containerRef.current = null;
            setIsOpen(false);
            onCloseRef.current?.();
        });
    }, []);

    // Adopt a pre-opened window (opened synchronously in click handler)
    useEffect(() => {
        if (initialWindow && !initialWindow.closed && !adoptedRef.current) {
            adoptedRef.current = true;
            setupPopup(initialWindow);
        }
    }, [initialWindow, setupPopup]);

    const close = useCallback(() => {
        styleSyncCleanupRef.current?.();
        styleSyncCleanupRef.current = null;
        if (popoutRef.current && !popoutRef.current.closed) {
            popoutRef.current.close();
        }
        popoutRef.current = null;
        containerRef.current = null;
        setIsOpen(false);
    }, []);

    const focus = useCallback(() => {
        if (popoutRef.current && !popoutRef.current.closed) {
            popoutRef.current.focus();
        }
    }, []);

    const open = useCallback((title?: string) => {
        if (popoutRef.current && !popoutRef.current.closed) {
            popoutRef.current.focus();
            return;
        }

        const popup = openPopupWindow(title);
        if (!popup) return;

        setupPopup(popup);
    }, [setupPopup]);

    // Close popup when main window unloads
    useEffect(() => {
        const handleUnload = () => {
            styleSyncCleanupRef.current?.();
            styleSyncCleanupRef.current = null;
            if (popoutRef.current && !popoutRef.current.closed) {
                popoutRef.current.close();
            }
        };
        window.addEventListener("beforeunload", handleUnload);
        return () => {
            window.removeEventListener("beforeunload", handleUnload);
            handleUnload();
        };
    }, []);

    return {
        isOpen,
        popoutContainer: containerRef.current,
        popoutWindow: popoutRef.current,
        open,
        close,
        focus,
    };
}
