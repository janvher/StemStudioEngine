import {WebGLRenderer, Raycaster, Camera, Scene, Vector2, Object3D} from "three";
import {WebGPURenderer} from "three/webgpu";

import {DetectDevice} from "./DetectDevice";
import {GPUPicker} from "../assets/js/gpupicker/gpupicker";
import {QualityManager} from "../core/quality/QualityManager";

export enum PickerType {
    CLICK = "click",
    HOVER = "hover",
}

type ObjectPickerCallback = (origin: Object3D | undefined | null, object: Object3D | undefined | null) => void;

export interface IObjectPicker {
    on(type: string, callback: ObjectPickerCallback): void;
    off(type: string, callback: ObjectPickerCallback): void;
    clear(): void;
    dispose(): void;
    update(): void;
    pickObject(type: string, x: number, y: number): void;
    updateRenderer(renderer: WebGLRenderer | WebGPURenderer): void;
}

class ObjectPicker implements IObjectPicker {
    private scene: Scene;
    private camera: Camera;
    private renderer: WebGLRenderer | WebGPURenderer;
    private gpuPicker: GPUPicker | null = null;
    private raycaster: Raycaster = new Raycaster(); // WebGL fallback
    private pickingInProgress = false;
    private callbacks: Map<string, Set<ObjectPickerCallback>> = new Map();
    viewPortRect: DOMRect;
    //move state
    private pointerMoved: boolean = false;
    private pointerClicked: boolean = false;
    private pointerX: number = 0;
    private pointerY: number = 0;
    private pointerEventsSupported = window.PointerEvent !== undefined;
    private eventListeners: Array<{type: string; handler: EventListenerOrEventListenerObject}> = [];

    constructor(
        renderer: WebGLRenderer | WebGPURenderer,
        scene: Scene,
        camera: Camera,
        viewPortRect: DOMRect,
        pickDistance: number = 1,
    ) {
        this.gpuPicker = new GPUPicker(renderer, scene, camera, pickDistance);
        this.scene = scene;
        this.camera = camera;
        this.viewPortRect = viewPortRect;
        this.renderer = renderer;

        // Type guard for WebGPU
        const isWebGPURenderer = (r: unknown): r is WebGPURenderer =>
            typeof r === "object" &&
            r !== null &&
            "isWebGPURenderer" in r &&
            (r as {isWebGPURenderer?: unknown}).isWebGPURenderer === true;

        if (isWebGPURenderer(renderer)) {
            try {
                this.gpuPicker = new GPUPicker(renderer, scene, camera, pickDistance);
            } catch {
                this.gpuPicker = null; // fallback will be used
            }
        }

        this.callbacks.set(PickerType.CLICK, new Set());
        this.callbacks.set(PickerType.HOVER, new Set());
        this.initMouseEventListeners();
    }

    public on(type: string, callback: ObjectPickerCallback) {
        if (!this.callbacks.has(type)) {
            this.callbacks.set(type, new Set());
        }
        this.callbacks.get(type)?.add(callback);
    }

    public off(type: string, callback: ObjectPickerCallback) {
        this.callbacks.get(type)?.delete(callback);
    }

    public clear() {
        this.callbacks.clear();
    }

    public dispose() {
        this.eventListeners.forEach(({type, handler}) => {
            document.removeEventListener(type, handler);
        });
        this.eventListeners = [];
    }

    public updateRenderer(renderer: WebGLRenderer | WebGPURenderer) {
        this.renderer = renderer;

        // Preserve the current pick size/distance, if any, before recreating the GPUPicker.
        const previousPickDistance = this.gpuPicker ? this.gpuPicker.pickSize : undefined;

        this.gpuPicker?.dispose();
        try {
            this.gpuPicker = new GPUPicker(renderer, this.scene, this.camera);
            if (previousPickDistance !== undefined && this.gpuPicker) {
                this.gpuPicker.pickSize = previousPickDistance;
            }
        } catch {
            this.gpuPicker = null;
        }
    }

    private getMousePosition(x: number, y: number) {
        return {x: x - this.viewPortRect.left, y: Math.max(y - this.viewPortRect.top, 0)};
    }

    private initMouseEventListeners() {
        if (this.pointerEventsSupported) {
            this._addEventListener("pointermove", this.pointerMoveHandler as EventListener);
            this._addEventListener("pointerup", this.pointerUpHandler as EventListener);
        } else {
            this._addEventListener("mousemove", this.fallbackMouseMoveHandler as EventListener);
            this._addEventListener("mouseup", this.fallbackMouseUpHandler as EventListener);
            this._addEventListener("touchmove", this.fallbackTouchMoveHandler as EventListener);
            this._addEventListener("touchend", this.fallbackTouchEndHandler as EventListener);
        }
    }

    private _addEventListener(
        type: string,
        handler: EventListenerOrEventListenerObject,
        options?: AddEventListenerOptions,
    ) {
        document.addEventListener(type, handler as EventListener, options);
        this.eventListeners.push({type, handler: handler});
    }

    private pointerMoveHandler = (event: PointerEvent) => {
        this.pointerMoved = true;
        this.pointerX = event.clientX;
        this.pointerY = event.clientY;
    };

    private pointerUpHandler = (event: PointerEvent) => {
        // TODO: consider setting maximum distance/delay to consider it a click
        this.pointerClicked = true;
        this.pointerX = event.clientX;
        this.pointerY = event.clientY;
    };

    private fallbackMouseMoveHandler = (event: MouseEvent) => {
        this.pointerMoved = true;
        this.pointerX = event.clientX;
        this.pointerY = event.clientY;
    };

    private fallbackMouseUpHandler = (event: MouseEvent) => {
        this.pointerClicked = true;
        this.pointerX = event.clientX;
        this.pointerY = event.clientY;
    };

    private fallbackTouchMoveHandler = (event: TouchEvent) => {
        if (event.touches.length > 0) {
            const touch = event.touches[0]!;
            this.pointerMoved = true;
            this.pointerX = touch.clientX;
            this.pointerY = touch.clientY;
        }
    };

    private fallbackTouchEndHandler = (event: TouchEvent) => {
        if (event.changedTouches.length > 0) {
            const touch = event.changedTouches[0]!;
            this.pointerClicked = true;
            this.pointerX = touch.clientX;
            this.pointerY = touch.clientY;
        }
    };

    public update() {
        if (this.pickingInProgress) return;

        const hoverCallbacks = this.callbacks.get(PickerType.HOVER);
        const clickCallbacks = this.callbacks.get(PickerType.CLICK);

        if (this.pointerClicked) {
            this.pointerClicked = false;
            const x = this.pointerX;
            const y = this.pointerY;
            this._doPick(PickerType.CLICK, x, y, resultObj => {
                // For click we also update hover callbacks with the same object
                if (resultObj) {
                    this.callCallbacks(clickCallbacks, resultObj);
                    this.callCallbacks(hoverCallbacks, resultObj);
                }
            });
        } else if (hoverCallbacks && hoverCallbacks.size > 0 && this.pointerMoved) {
            this.pointerMoved = false;
            this._doPick(PickerType.HOVER, this.pointerX, this.pointerY, resultObj => {
                if (resultObj) this.callCallbacks(hoverCallbacks, resultObj);
            });
        }
    }

    public pickObject(type: string, x: number, y: number) {
        this._doPick(type, x, y, origin => {
            if (!origin) return;
            this.callbacks.get(type)?.forEach(cb => cb(origin, this.getSceneObject(origin)));
        });
    }

    private _doPick(type: string, x: number, y: number, done: (origin: Object3D | null) => void) {
        const mousePos = this.getMousePosition(x, y);

        // GPU path
        if (this.gpuPicker) {
            const qualityManager = QualityManager.getInstance();
            const pixelRatio =
                Math.max(
                    1,
                    Math.min(
                        3,
                        (window.devicePixelRatio || 1) *
                            (qualityManager.getCurrentSettings().rendering.pixelRatio || 1),
                    ),
                ) * (DetectDevice.isMobile() ? 0.75 : 1);
            this.pickingInProgress = true;
            Promise.resolve(this.gpuPicker.pick(mousePos.x * pixelRatio, mousePos.y * pixelRatio, undefined))
                .then((objId: number) => {
                    if (objId) {
                        const origin = this.scene.getObjectById(objId) || null;
                        done(origin);
                    } else {
                        done(null);
                    }
                })
                .catch(() => done(null))
                .finally(() => {
                    this.pickingInProgress = false;
                });
            return;
        }

        // WebGL fallback using Raycaster
        const ndcX = mousePos.x / this.viewPortRect.width * 2 - 1;
        const ndcY = -(mousePos.y / this.viewPortRect.height) * 2 + 1;
        const pointer = new Vector2(ndcX, ndcY);
        this.raycaster.setFromCamera(pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        const hit = intersects.find(i => i.object?.userData?.isSelectable !== false);
        done(hit ? hit.object : null);
    }

    private callCallbacks(callbacks: Set<ObjectPickerCallback> | undefined, origin: Object3D | undefined | null) {
        if (callbacks && callbacks.size > 0 && origin) {
            const sceneObj = this.getSceneObject(origin);
            callbacks.forEach(callback => callback(origin, sceneObj));
        }
    }

    private getSceneObject(obj: Object3D | undefined | null): Object3D | null {
        let ret: Object3D | undefined | null = obj;
        while (ret) {
            if (ret.parent && ret.parent.type === "Scene") {
                return ret;
            } else {
                ret = ret.parent;
            }
        }
        return null;
    }

    public setPickDistance(distance: number) {
        if (this.gpuPicker) {
            this.gpuPicker.pickSize = distance;
        }
    }
}

export default ObjectPicker;
