import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { ModelPreviewRenderer } from './ModelPreviewRenderer';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */

// --- Event System Polyfill ---
const eventRegistry = new Map<any, Record<string, any[]>>();

/**
 * Adds an event listener to the target
 * @param target - The event target
 * @param type - The event type
 * @param listener - The event listener
 */
function addListener(target: any, type: string, listener: any) {
    let targetListeners = eventRegistry.get(target);
    if (!targetListeners) {
        targetListeners = {};
        eventRegistry.set(target, targetListeners);
    }
    if (!targetListeners[type]) targetListeners[type] = [];
    if (!targetListeners[type].includes(listener)) {
        targetListeners[type].push(listener);
    }
}

/**
 * Removes an event listener from the target
 * @param target - The event target
 * @param type - The event type
 * @param listener - The event listener
 */
function removeListener(target: any, type: string, listener: any) {
    const targetListeners = eventRegistry.get(target);
    if (targetListeners && targetListeners[type]) {
        const idx = targetListeners[type].indexOf(listener);
        if (idx !== -1) targetListeners[type].splice(idx, 1);
    }
}

/**
 * Dispatches an event with bubbling support (Target -> Document -> Window)
 * @param target - The event target
 * @param event - The event object
 * @returns boolean
 */
function dispatchEventPolyfill(target: any, event: any) {
    // Simple bubbling: Target -> OwnerDocument -> Window (self)
    const chain = [target];
    if (target.ownerDocument) chain.push(target.ownerDocument);
    if (target.ownerDocument !== self) chain.push(self);

    for (const obj of chain) {
        const targetListeners = eventRegistry.get(obj);
        // Ensure array exists before spreading
        const listenersList = targetListeners ? targetListeners[event.type] : undefined;
        
        if (listenersList) {
            const listeners = [...listenersList];
            for (const l of listeners) {
                if (typeof l === 'function') {
                    l.call(obj, event);
                } else if (l && typeof l.handleEvent === 'function') {
                    l.handleEvent(event);
                }
            }
        }
        if (event.cancelBubble) break;
    }
    return true;
}

// Polyfills for Worker Environment
self.window = self;

// Patch self/window addEventListener
const originalAdd = self.addEventListener;
const originalRemove = self.removeEventListener;

self.addEventListener = (type: string, listener: any, options?: any) => {
    addListener(self, type, listener);
};
self.removeEventListener = (type: string, listener: any, options?: any) => {
    removeListener(self, type, listener);
};

self.document = {
    createElement: (_name: string) => {
        void _name;
        // Return a dummy element that supports events
        const el = {
            style: {},
            nodeType: 1,
            setAttribute: () => { },
            addEventListener: (t: string, l: any) => addListener(el, t, l),
            removeEventListener: (t: string, l: any) => removeListener(el, t, l),
        } as unknown as any;
        return el;
    },
    createElementNS: (_ns: string, _name: string) => {
        void _ns;
        void _name;
        const el = {
            style: {},
            nodeType: 1,
            setAttribute: () => { },
            addEventListener: (t: string, l: any) => addListener(el, t, l),
            removeEventListener: (t: string, l: any) => removeListener(el, t, l),
        } as unknown as any;
        return el;
    },
    body: {
        appendChild: <T extends Node>(node: T) => node,
        removeChild: <T extends Node>(child: T) => child,
    } as unknown as any,
    documentElement: {
        style: {} as unknown as any,
    } as unknown as any,
    addEventListener: (type: string, listener: any) => addListener(self.document, type, listener),
    removeEventListener: (type: string, listener: any) => removeListener(self.document, type, listener),
} as unknown as any;

let renderer: ModelPreviewRenderer | undefined;

self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'init': {
            const { canvas, width, height, pixelRatio } = payload;
            const offscreenCanvas = canvas as unknown as AnyCanvas;

            // Polyfill canvas properties
            if (!offscreenCanvas.style) {
                offscreenCanvas.style = { width, height, cursor: 'default' };
            }
            // Polyfill dimensions for OrbitControls calculations
            if (!(offscreenCanvas as any).clientWidth) {
                (offscreenCanvas as any).clientWidth = width;
            }
            if (!(offscreenCanvas as any).clientHeight) {
                (offscreenCanvas as any).clientHeight = height;
            }
            if (!(offscreenCanvas as any).getBoundingClientRect) {
                (offscreenCanvas as any).getBoundingClientRect = () => {
                    const currentWidth =
                        (offscreenCanvas as any).clientWidth ??
                        (offscreenCanvas as any).width ??
                        width;
                    const currentHeight =
                        (offscreenCanvas as any).clientHeight ??
                        (offscreenCanvas as any).height ??
                        height;
                    return {
                        left: 0,
                        top: 0,
                        width: currentWidth,
                        height: currentHeight,
                        right: currentWidth,
                        bottom: currentHeight,
                    };
                };
            }

            if (!offscreenCanvas.ownerDocument) {
                offscreenCanvas.ownerDocument = self.document;
            }
            if (!offscreenCanvas.getRootNode) {
                offscreenCanvas.getRootNode = () => offscreenCanvas;
            }
            // Polyfill pointer capture for OrbitControls
            if (!(offscreenCanvas as any).setPointerCapture) {
                (offscreenCanvas as any).setPointerCapture = () => { };
            }
            if (!(offscreenCanvas as any).releasePointerCapture) {
                (offscreenCanvas as any).releasePointerCapture = () => { };
            }

            // Hook into our event system
            offscreenCanvas.addEventListener = (type: string, listener: any) => {
                addListener(offscreenCanvas, type, listener);
            };
            offscreenCanvas.removeEventListener = (type: string, listener: any) => {
                removeListener(offscreenCanvas, type, listener);
            };
            (offscreenCanvas as any).dispatchEvent = (event: any) => {
                return dispatchEventPolyfill(offscreenCanvas, event);
            };

            renderer = new ModelPreviewRenderer(canvas, width as number, height as number, pixelRatio as number);
            await renderer.init();
            break;
        }

        case 'updateModel': {
            if (!renderer) return;

            const loader = new GLTFLoader();
            try {
                // We use the full payload now, relying on patched ImageLoader
                loader.parse(
                    payload as ArrayBuffer, // ArrayBuffer
                    '',      // path
                    (gltf) => {
                        renderer?.updateModel(gltf.scene);
                    },
                    (error) => {
                         const payloadType = payload ? payload.constructor?.name ?? typeof payload : typeof payload;
                         const sizeInfo =
                             payload instanceof ArrayBuffer
                                 ? `, byteLength=${payload.byteLength}`
                                 : '';
                         console.error(
                             `Worker: Failed to parse GLB (payloadType=${payloadType}${sizeInfo})`,
                             error,
                         );
                    },
                );
            } catch (err) {
                const payloadType = payload ? payload.constructor?.name ?? typeof payload : typeof payload;
                const sizeInfo =
                    payload instanceof ArrayBuffer
                        ? `, byteLength=${payload.byteLength}`
                        : '';
                console.error(
                    `Worker: Failed to parse model (payloadType=${payloadType}${sizeInfo})`,
                    err,
                );
            }
            break;
        }

        case 'resize': {
            if (!renderer) return;
            const { width, height } = payload;
            renderer.setSize(width as number, height as number);
            break;
        }

        case 'dispose': {
            renderer?.dispose();
            renderer = undefined;
            break;
        }

        case 'event': {
            if (!renderer) return;
            const { eventCopy } = payload;
            
            eventCopy.preventDefault = () => {};
            eventCopy.stopPropagation = () => { eventCopy.cancelBubble = true; };
            
            // Fix target to be the canvas
            eventCopy.target = renderer.renderer.domElement; 
            
            // Dispatch with bubbling
            (renderer.renderer.domElement as any).dispatchEvent(eventCopy);
            break;
        }
    }
};

// Types helper
type AnyCanvas = {
    style: any;
    ownerDocument: any;
    getRootNode: () => any;
    addEventListener: any;
    removeEventListener: any;
    dispatchEvent: any;
};
