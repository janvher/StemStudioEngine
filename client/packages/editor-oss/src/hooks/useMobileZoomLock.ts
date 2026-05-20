import {useEffect} from "react";

import {DetectDevice} from "../utils/DetectDevice";

/**
 *
 * @param isPlayMode
 */
export function useMobileZoomLock(isPlayMode: boolean) {
    useEffect(() => {
        if (!isPlayMode || !DetectDevice.isMobile()) return;

        const viewportMeta = (document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null) || document.createElement("meta");
        viewportMeta.name = "viewport";
        viewportMeta.content =
            "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";
        if (!viewportMeta.parentNode) document.head.appendChild(viewportMeta);

        const preventZoom = (e: TouchEvent) => {
            if (e.touches.length > 1) e.preventDefault();
        };
        let lastTouchEnd = 0;
        const preventDoubleTap = (e: TouchEvent) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) e.preventDefault();
            lastTouchEnd = now;
        };

        document.addEventListener("touchstart", preventZoom, {passive: false});
        document.addEventListener("touchend", preventDoubleTap, {passive: false});
        // gesture events may not exist everywhere, guard them:
        const onGesture = (e: Event) => e.preventDefault();
        document.addEventListener("gesturestart", onGesture);

        return () => {
            document.removeEventListener("touchstart", preventZoom);
            document.removeEventListener("touchend", preventDoubleTap);
            document.removeEventListener("gesturestart", onGesture);
        };
    }, [isPlayMode]);
}
