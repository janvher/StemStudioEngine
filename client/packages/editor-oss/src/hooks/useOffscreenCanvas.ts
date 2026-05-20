import { useEffect, useLayoutEffect, useRef } from 'react';

export type OffscreenWorkerConfig = {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    containerRef: React.RefObject<HTMLElement | null>;
    worker: React.RefObject<Worker | undefined>;
    enabled?: boolean; 
    onInit?: (worker: Worker, offscreen: OffscreenCanvas, width: number, height: number, pixelRatio: number) => void;
    onFallback?: (canvas: HTMLCanvasElement, width: number, height: number, pixelRatio: number) => void;
    onDispose?: () => void;
};

export const useOffscreenCanvas = ({
    canvasRef,
    containerRef,
    workerFactory, 
    enabled = true,
}: Omit<OffscreenWorkerConfig, 'worker'> & { workerFactory: () => Worker }) => {
    
    const workerRef = useRef<Worker | undefined>(undefined);
    const workerCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const isOffscreen = useRef(false);
    const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const eventCleanupRef = useRef<(() => void) | undefined>(undefined);

    useLayoutEffect(() => {
        if (cleanupTimerRef.current) {
            clearTimeout(cleanupTimerRef.current);
            cleanupTimerRef.current = undefined;
        }

        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const width = container.offsetWidth || 100;
        const height = container.offsetHeight || 100;

        if (workerRef.current && (workerCanvasRef.current !== canvas || !enabled)) {
            if (eventCleanupRef.current) {
                eventCleanupRef.current();
                eventCleanupRef.current = undefined;
            }
            workerRef.current.terminate();
            workerRef.current = undefined;
            workerCanvasRef.current = null;
            isOffscreen.current = false;
        }

        if (workerRef.current) return;

        const supportsOffscreen = enabled && 'OffscreenCanvas' in window && 'transferControlToOffscreen' in canvas;

        if (supportsOffscreen) {
            isOffscreen.current = true;
            const offscreen = canvas.transferControlToOffscreen() as Transferable;
            workerCanvasRef.current = canvas;
            
            const w = workerFactory();
            
            w.postMessage({
                type: 'init',
                payload: {
                    canvas: offscreen,
                    width,
                    height,
                    pixelRatio: window.devicePixelRatio,
                },
            }, [offscreen]);

            workerRef.current = w;

            const eventNames = ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'contextmenu', 'keydown', 'keyup'];
            const handleEvent = (e: Event) => {
                const eventCopy: Record<string, unknown> = {
                   type: e.type,
                };
                if (e instanceof MouseEvent || window.PointerEvent && e instanceof PointerEvent) {
                    const me = e;
                    eventCopy.clientX = me.clientX;
                    eventCopy.clientY = me.clientY;
                    eventCopy.button = me.button;
                    eventCopy.buttons = me.buttons;
                    eventCopy.ctrlKey = me.ctrlKey;
                    eventCopy.shiftKey = me.shiftKey;
                    eventCopy.altKey = me.altKey;
                    eventCopy.metaKey = me.metaKey;
                    
                    if (window.PointerEvent && e instanceof PointerEvent) {
                        const pe = e;
                        eventCopy.pointerId = pe.pointerId;
                        eventCopy.pointerType = pe.pointerType;
                        eventCopy.isPrimary = pe.isPrimary;
                    }
                }
                
                if (e instanceof WheelEvent) {
                    eventCopy.deltaX = e.deltaX;
                    eventCopy.deltaY = e.deltaY;
                    eventCopy.deltaMode = e.deltaMode;
                }

                if (e instanceof KeyboardEvent) {
                    eventCopy.key = e.key;
                    eventCopy.code = e.code;
                    eventCopy.location = e.location;
                    eventCopy.ctrlKey = e.ctrlKey;
                    eventCopy.shiftKey = e.shiftKey;
                    eventCopy.altKey = e.altKey;
                    eventCopy.metaKey = e.metaKey;
                    eventCopy.repeat = e.repeat;
                }

                w.postMessage({
                    type: 'event',
                    payload: { eventCopy },
                });
                
                if (e.cancelable) e.preventDefault(); 
            };
            
            eventNames.forEach(name => {
                canvas.addEventListener(name, handleEvent, { passive: false });
            });

            eventCleanupRef.current = () => {
                eventNames.forEach(name => {
                    canvas.removeEventListener(name, handleEvent);
                });
            };
            
        } else {
            isOffscreen.current = false;
        }

        return () => {
            cleanupTimerRef.current = setTimeout(() => {
                if (eventCleanupRef.current) {
                    eventCleanupRef.current();
                    eventCleanupRef.current = undefined;
                }
                if (workerRef.current) {
                    workerRef.current.postMessage({ type: 'dispose' });
                    workerRef.current.terminate();
                    workerRef.current = undefined;
                    workerCanvasRef.current = null;
                    isOffscreen.current = false;
                }
            }, 100);
        };
    }, [canvasRef, containerRef, enabled, workerFactory]); // Dependencies

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (isOffscreen.current && workerRef.current) {
                    workerRef.current.postMessage({
                        type: 'resize',
                        payload: { width, height },
                    });
                }
            }
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [containerRef]);

    return {
        worker: workerRef.current,
        isOffscreen: isOffscreen.current,
        isOffscreenRef: isOffscreen,
    };
};
