import {useEffect, useState} from "react";
import screenfull from "screenfull";

import {DetectDevice} from "../utils/DetectDevice";

/**
 *
 */
export function useFullscreen() {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (!screenfull.isEnabled || !DetectDevice.isMobile()) return;

        const onChange = () => setIsFullscreen(screenfull.isFullscreen);
        screenfull.on("change", onChange);

        return () => {
            screenfull.off("change", onChange);
        };
    }, []);

    /**
     *
     */
    function enterFullscreen() {
        if (screenfull.isEnabled && DetectDevice.isMobile()) {
            screenfull.request();
        }
    }

    /**
     *
     */
    function exitFullscreen() {
        if (screenfull.isEnabled && screenfull.isFullscreen) {
            screenfull.exit();
        }
    }

    return {isFullscreen, enterFullscreen, exitFullscreen};
}
