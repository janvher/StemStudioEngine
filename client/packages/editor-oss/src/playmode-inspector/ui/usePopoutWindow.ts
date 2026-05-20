import {useEffect, useState} from "react";

type PopoutHandle = {
    win: Window;
    container: HTMLElement;
};

/**
 * Open a separate browser window and return a stable container element inside it.
 * Caller renders into the container via createPortal. The hook handles:
 *   - cloning the parent document's <style>/<link> tags so styled-components work,
 *   - keeping the popout in sync if the user closes it externally,
 *   - cleaning up the window when `enabled` flips off or the host unmounts.
 * @param enabled
 * @param title
 * @param onExternalClose
 */
export const usePopoutWindow = (
    enabled: boolean,
    title: string,
    onExternalClose: () => void,
): PopoutHandle | null => {
    const [handle, setHandle] = useState<PopoutHandle | null>(null);

    useEffect(() => {
        if (!enabled) {
            setHandle(null);
            return;
        }

        const win = window.open(
            "",
            "_blank",
            "width=560,height=720,menubar=no,toolbar=no,location=no,status=no",
        );
        if (!win) {
            console.warn("[Playmode Inspector] Popout blocked by browser");
            onExternalClose();
            return;
        }

        win.document.title = title;
        // Match the inspector's dark backdrop.
        win.document.documentElement.style.background = "#121212";
        win.document.body.style.margin = "0";
        win.document.body.style.background = "#121212";
        win.document.body.style.color = "#ddd";
        win.document.body.style.fontFamily = '"Roboto", sans-serif';

        // Mirror parent <style>/<link rel=stylesheet> nodes so styled-components
        // rules and global CSS resolve in the popout. Live-clone styled-components'
        // dynamic stylesheets too — they update via injected <style> tags so we
        // re-clone on a brief interval (cheap, runs only while the popout is open).
        const cloneSheets = () => {
            const head = win.document.head;
            head.querySelectorAll("[data-popout-sheet]").forEach(el => el.remove());
            const sources = document.querySelectorAll<HTMLStyleElement | HTMLLinkElement>(
                'style, link[rel="stylesheet"]',
            );
            sources.forEach(src => {
                const clone = src.cloneNode(true) as HTMLElement;
                clone.setAttribute("data-popout-sheet", "");
                head.appendChild(clone);
            });
        };
        cloneSheets();
        const sheetTimer = win.setInterval(cloneSheets, 1000);

        const container = win.document.createElement("div");
        container.id = "playmode-inspector-popout-root";
        win.document.body.appendChild(container);

        const beforeUnload = () => {
            onExternalClose();
        };
        win.addEventListener("beforeunload", beforeUnload);

        setHandle({win, container});

        return () => {
            win.clearInterval(sheetTimer);
            win.removeEventListener("beforeunload", beforeUnload);
            try {
                win.close();
            } catch {
                /* noop */
            }
            setHandle(null);
        };
    }, [enabled, title, onExternalClose]);

    return handle;
};
