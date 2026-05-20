import {Object3D, PerspectiveCamera, Raycaster, Vector2, WebGLRenderer} from "three";
import {WebGPURenderer} from "three/webgpu";

type ClickableObject = Object3D & { onClick?: (event: PointerEvent) => void };
type HoverableObject = Object3D & {
    hover?: unknown;
    onHoverChange?: (arg: boolean) => void;
    onClick?: (event: PointerEvent) => void;
};

export const UIKitPointerEventsDispatcher = (() => {
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    let canvas: HTMLCanvasElement | null, camera: PerspectiveCamera | null, rootScene: Object3D | null;
    let hoveredObject: HoverableObject | null = null;

    // Custom click handling state
    const downPointer = new Vector2();
    let isDown = false;
    let downTime = 0;

    const updatePointer = (event: PointerEvent) => {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        pointer.x = (event.clientX - rect.left) / rect.width * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerMove = (event: PointerEvent) => {
        updatePointer(event);
    };

    const onPointerDown = (event: PointerEvent) => {
        isDown = true;
        downTime = performance.now();
        updatePointer(event);
        downPointer.copy(pointer);
    };

    const onPointerUp = (event: PointerEvent) => {
        if (!isDown) return;
        isDown = false;
        updatePointer(event);

        const dist = downPointer.distanceTo(pointer);
        const timeDiff = performance.now() - downTime;

        // Thresholds: movement < 0.05 units, duration < 500ms
        if (dist < 0.05 && timeDiff < 500) {
            performClick(event);
        }
    };

    const performClick = (event: PointerEvent) => {
        if (!raycaster || !camera || !rootScene) return;
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(rootScene.children, true);

        for (const hit of intersects) {
            let obj: ClickableObject = hit.object;
            while (obj && obj.onClick) {
                if (obj.onClick) {
                    obj.onClick(event);
                    return;
                }
                obj = obj.parent as ClickableObject;
                if (obj === rootScene || !obj) break;
            }
        }
    };

    return {
        initialize(renderer: WebGPURenderer | WebGLRenderer, cam: PerspectiveCamera, scene: Object3D) {
            rootScene = scene;
            canvas = renderer.domElement;
            camera = cam;
            canvas.addEventListener('pointermove', onPointerMove, true);
            canvas.addEventListener('pointerdown', onPointerDown, true);
            // Listen on window to catch release even if outside canvas or propagation stopped
            window.addEventListener('pointerup', onPointerUp, true);
        },
        update() {
            if (!raycaster || !camera || !rootScene) return;

            raycaster.setFromCamera(pointer, camera);
            const intersects = raycaster.intersectObjects(rootScene.children, true);

            let hit: HoverableObject | null = null;
            if (intersects.length > 0) {
                for (const h of intersects) {
                    let obj: HoverableObject | null = h.object as HoverableObject;
                    while (obj) {
                        if (obj.hover || obj.onHoverChange || obj.onClick) {
                            hit = obj;
                            break;
                        }
                        obj = obj.parent as HoverableObject | null;
                        if (obj === rootScene || !obj) break;
                    }
                    if (hit) break;
                }
            }

            if (hoveredObject !== hit) {
                if (hoveredObject) {
                    if (hoveredObject.onHoverChange) hoveredObject.onHoverChange(false);
                    if (hoveredObject.dispatchEvent) { // @ts-expect-error - synthetic pointer event shape is not in the typed dispatchEvent signature
                        hoveredObject.dispatchEvent({ type: 'pointerout', target: hoveredObject });
                    }
                }

                hoveredObject = hit;

                if (hoveredObject) {
                    if (hoveredObject.onHoverChange) hoveredObject.onHoverChange(true);
                    if (hoveredObject.dispatchEvent) { // @ts-expect-error - synthetic pointer event shape is not in the typed dispatchEvent signature
                        hoveredObject.dispatchEvent({ type: 'pointerover', target: hoveredObject });
                    }
                }
            }
        },
        destroy() {
            if (canvas) {
                canvas.removeEventListener('pointermove', onPointerMove, true);
                canvas.removeEventListener('pointerdown', onPointerDown, true);
            }
            window.removeEventListener('pointerup', onPointerUp, true);
            canvas = null;
            camera = null;
            rootScene = null;
            hoveredObject = null;
        },
    };
})();
