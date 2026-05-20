import {getPosition} from "./domTools";

interface AnimateScrollConfig {
    toX?: number;
    toY?: number; 
    offsetX?: number;
    offsetY?: number;
    duration?: number;
    callback?: () => void;
    element?: HTMLElement;
    toElement?: HTMLElement;
}

/**
 *
 * @param newConfig
 */
function animatedScroll(newConfig: AnimateScrollConfig) {
    return new Promise<void>(resolve => {
        const defaults = {
            element: document.body,
            duration: 300,
            offsetX: 0,
            offsetY: 0,
        };
        const config = {...defaults, ...newConfig};

        const {element, duration} = config;
        const toElementPos = config.toElement ? getPosition(config.toElement) : {x: 0, y: 0};
        
        // Could cache these values to avoid recalculating each frame
        const initialX = element === document.body ? window.pageXOffset : element.scrollLeft;
        const initialY = element === document.body ? window.pageYOffset : element.scrollTop;
        
        // Potential issue: toX/toY could be 0 which evaluates to falsy
        // Should explicitly check for undefined/null instead
        const toX = (config.toX ?? toElementPos.x) + config.offsetX; 
        const toY = (config.toY ?? toElementPos.y) + config.offsetY;

        // Optimization: Could pre-calculate these values outside animation loop
        const baseX = toX ? (initialX + toX) * 0.5 : initialX;
        const baseY = toY ? (initialY + toY) * 0.5 : initialY;
        const differenceX = initialX - baseX;
        const differenceY = initialY - baseY;
        const startTime = performance.now();

        /**
         *
         */
        function step() {
            let normalizedTime = (performance.now() - startTime) / duration;

            if (normalizedTime > 1) {
                normalizedTime = 1;
            }

            // Optimization: Could cache Math.PI and reuse
            const normalizedTimeCos = Math.cos(normalizedTime * Math.PI);
            const scrollToX = baseX + differenceX * normalizedTimeCos;
            const scrollToY = baseY + differenceY * normalizedTimeCos;

            if (element === document.body) {
                window.scrollTo(scrollToX, scrollToY);
            } else {
                element.scrollLeft = scrollToX;
                element.scrollTop = scrollToY;
            }

            if (normalizedTime < 1) {
                // Potential memory leak: Should cancel animation frame on component unmount
                window.requestAnimationFrame(step);
            } else {
                resolve();
                // Callback could throw error and prevent resolve
                // Should wrap in try/catch
                if (config.callback) {
                    config.callback();
                }
            }
        }

        window.requestAnimationFrame(step);
    });
}

export {animatedScroll};
