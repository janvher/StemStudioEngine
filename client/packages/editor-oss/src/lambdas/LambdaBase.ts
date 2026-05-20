import { MathUtils, Object3D } from "three";

import { ComponentDataPool } from "./ComponentDataPool";
import type {
    Lambda,
    LambdaAttributeChangeOptions,
    LambdaAttributeChangeResult,
    LambdaComponentData,
    LambdaOptions,
} from "./Lambda";
import type GameManager from "@stem/editor-oss/behaviors/game/GameManager";

interface PendingOp {
    type: "add" | "remove";
    target: Object3D;
    data?: Record<string, any>;
}

export class LambdaBase implements Lambda {
    readonly id: string;
    readonly uuid: string;
    readonly attributes: Record<string, any>;

    protected _registeredObjects: Map<Object3D, Record<string, any>> = new Map();
    protected _game: GameManager | null = null;
    protected _isApplying: boolean = false;
    protected _pendingOps: PendingOp[] = [];
    private _debugLogged: boolean = false;

    // Track which lambdas have been warned about missing fixedUpdate (to avoid spamming console)
    private static _fixedUpdateWarnings = new Set<string>();

    constructor(id: string, options: LambdaOptions) {
        this.id = id;
        this.uuid = options.uuid || MathUtils.generateUUID();
        this.attributes = options.attributes || {};
    }

    get registeredObjects(): ReadonlyMap<Object3D, Record<string, any>> {
        return this._registeredObjects;
    }

    get entityCount(): number {
        return this._registeredObjects.size;
    }

    // Lifecycle - override in subclass
    init(game: GameManager): void | Promise<void> {
        this._game = game;
    }

    dispose(): void {
        this._registeredObjects.clear();
        this._pendingOps = [];
    }

    apply(deltaTime?: number): void {
        this._isApplying = true;
        try {
            if (import.meta.env.DEV && !this._debugLogged && this._registeredObjects.size > 0) {
                this._debugLogged = true;
                console.log(`[LambdaBase] apply "${this.id}" — objects: ${this._registeredObjects.size}`);
            }
            this.update(deltaTime);
        } finally {
            this._isApplying = false;
            this._processPendingOps();
        }
    }

    /**
     * Generator version of apply() for time-sliced execution.
     * Subclasses (e.g. SoALambdaBase) can override to yield mid-iteration.
     * Default: runs update() synchronously then yields once.
     * @param deltaTime
     */
    *applySliced(deltaTime?: number): Generator {
        this._isApplying = true;
        try {
            // Fallback: when fixed updates are off and the lambda only implements fixedUpdate
            // (no custom update), call fixedUpdate so the creator's logic still runs.
            const fixedEnabled = this._game?.lambdaManager?.fixedUpdatesEnabled ?? true;
            if (!fixedEnabled
                && typeof this.fixedUpdate === "function"
                && this.update === LambdaBase.prototype.update) {
                this.fixedUpdate(deltaTime ?? 0);
            } else {
                this.update(deltaTime);
            }
        } finally {
            this._isApplying = false;
            this._processPendingOps();
        }
        yield;
    }

    /**
     * Generator wrapper for fixedUpdate with time-slicing support.
     * Retained for direct tests and lambdas that yield internally.
     * Skips if fixedUpdate() is not implemented (with warning).
     * @param fixedDeltaTime
     */
    *fixedApplySliced(fixedDeltaTime: number): Generator {
        this._isApplying = true;
        try {
            if (typeof this.fixedUpdate === "function") {
                this.fixedUpdate(fixedDeltaTime);
            } else if (!LambdaBase._fixedUpdateWarnings.has(this.id)) {
                const configName = this._game?.lambdaManager?.getConfig(this.id)?.name;
                const label = configName ? `"${configName}" (${this.id.slice(0, 8)})` : `"${this.id}"`;

                console.warn(
                    `[Lambda] ${label} does not implement fixedUpdate(). ` +
                    `Skipping in FIXED_UPDATE stage. For fixed-rate logic, implement fixedUpdate().`,
                );
                LambdaBase._fixedUpdateWarnings.add(this.id);
            }
        } finally {
            this._isApplying = false;
            this._processPendingOps();
        }
        yield;
    }

    /**
     * Non-generator wrapper for fixedUpdate — same logic as fixedApplySliced()
     * but without generator/yield overhead.
     * @param fixedDeltaTime
     */
    fixedApply(fixedDeltaTime: number): void {
        this._isApplying = true;
        try {
            if (typeof this.fixedUpdate === "function") {
                this.fixedUpdate(fixedDeltaTime);
            } else if (!LambdaBase._fixedUpdateWarnings.has(this.id)) {
                const configName = this._game?.lambdaManager?.getConfig(this.id)?.name;
                const label = configName ? `"${configName}" (${this.id.slice(0, 8)})` : `"${this.id}"`;
                console.warn(
                    `[Lambda] ${label} does not implement fixedUpdate(). ` +
                    `Skipping in FIXED_UPDATE stage. For fixed-rate logic, implement fixedUpdate().`,
                );
                LambdaBase._fixedUpdateWarnings.add(this.id);
            }
        } finally {
            this._isApplying = false;
            this._processPendingOps();
        }
    }

    /**
     * Override this in subclasses for fixed timestep physics-dependent logic.
     * Called at a consistent rate (e.g., 60Hz) determined by quality settings.
     */
    fixedUpdate?(fixedDeltaTime: number): void;

    // Optimized iteration helper
    protected processObjects(
        deltaTime: number,
        callback: (object: Object3D, data: Record<string, any>, effectiveDeltaTime: number) => void,
        isCritical: boolean = false,
    ): void {
        // If not initialized yet
        if (!this._game || !this._game.lambdaManager) {
            for (const [object, data] of this._registeredObjects) {
                try {
                    callback(object, data, deltaTime);
                } catch (e) {
                    console.error(`[LambdaBase] Error processing object in ${this.id}:`, e);
                }
            }
            return;
        }

        const scheduler = this._game.lambdaManager.scheduler;
        const camera = this._game.camera;

        // Fallback checks
        if (!camera) {
            for (const [object, data] of this._registeredObjects) {
                try {
                    callback(object, data, deltaTime);
                } catch (e) {
                    console.error(`[LambdaBase] Error processing object in ${this.id}:`, e);
                }
            }
            return;
        }

        const deadline = scheduler.frameDeadline ?? Infinity;
        const BUDGET_CHECK_INTERVAL = 64;

        let index = 0;
        for (const [object, data] of this._registeredObjects) {
            // Early exit if frame deadline exceeded
            if (index > 0 && index % BUDGET_CHECK_INTERVAL === 0) {
                if (performance.now() >= deadline) break;
            }

            // Use cached criticality (set at registration time) instead of per-frame scan
            const componentCritical = data._isCritical ?? false;
            const effectiveCritical = isCritical || componentCritical;

            const multiplier = scheduler.shouldProcess(object, camera, index, effectiveCritical);

            if (multiplier > 0) {
                try {
                    callback(object, data, deltaTime * multiplier);

                    // Explicitly update matrix since matrixAutoUpdate is disabled
                    object.updateMatrix();

                    // Sync instanced mesh GPU matrix after position/rotation/scale changes
                    if (object.userData.instanceData && this._game?.instancer) {
                        this._game.instancer.updateInstancePosition(object);
                    }
                } catch (e) {
                    console.error(`[LambdaBase] Error processing object in ${this.id}:`, e);
                }
            }
            index++;
        }
    }

    // Override this in subclasses instead of apply()
    update(deltaTime?: number): void {
        // Subclass should override and iterate this._registeredObjects
    }

    onObjectAdded(target: Object3D, componentData: Record<string, any>): void { }

    onObjectRemoved(target: Object3D): void { }

    onAttributesUpdated(): void {}

    onAttributeChangeRequested(key: string, newValue: any, oldValue: any, requester: Lambda | null): boolean {
        return true;
    }

    onAttributeChanged(key: string, newValue: any, oldValue: any): void {}

    onEvent(msg: string, data: any): void | Promise<void> | Generator { }

    // Component data access (miniplex-style direct access)
    getComponentData(target: Object3D): Record<string, any> | null {
        return this._registeredObjects.get(target) ?? null;
    }

    setComponentData(target: Object3D, key: string, value: any): void {
        const data = this._registeredObjects.get(target);
        if (!data) return;
        const oldValue = data[key];
        if (oldValue === value) return;
        data[key] = value;
        try {
            this.onSet?.(target, key, value, oldValue);
        } catch (error) {
            console.error(`[LambdaBase] Error in onSet for "${this.id}":`, error);
        }
    }

    onSet?(target: Object3D, key: string, newValue: any, oldValue: any): void;

    requestAttributeChange(
        key: string,
        value: any,
        options?: LambdaAttributeChangeOptions,
    ): Promise<LambdaAttributeChangeResult> | LambdaAttributeChangeResult {
        if (!this._game?.lambdaManager) {
            return {
                accepted: false,
                key,
                value: this.attributes[key],
                previousValue: this.attributes[key],
            };
        }

        return this._game.lambdaManager.requestAttributeChange(this, key, value, null, options);
    }

    /**
     * Checks if this object has isCritical set on its lambda component.
     * Fallback chain: component.isCritical → lambda config isCritical → false
     * @param object
     */
    protected getComponentCriticality(object: Object3D): boolean {
        const components = object.userData?.lambdaComponents as LambdaComponentData[] | undefined;
        if (!components) return false;

        // Find the component for this lambda instance
        const component = components.find(c => c.instanceId === this.uuid);
        if (component?.isCritical !== undefined) {
            return component.isCritical;
        }

        // Fallback to lambda config default (if available via game manager)
        const config = this._game?.lambdaManager?.getConfig?.(this.id);
        return config?.isCritical ?? false;
    }

    // Internal: register with command queue safety
    _registerObject(target: Object3D, componentData: Record<string, any>): void {
        if (this._isApplying) {
            this._pendingOps.push({ type: "add", target, data: componentData });
            return;
        }
        // Reclassify static objects: re-enable matrix updates when a lambda is attached
        if (target.userData._isSceneStatic) {
            target.matrixWorldAutoUpdate = true;
            delete target.userData._isSceneStatic;
        }
        // Cache criticality at registration to avoid per-frame Array.find() scans
        componentData._isCritical = this.getComponentCriticality(target);
        // Disable auto matrix recalculation — we call updateMatrix() explicitly after transforms change
        // Use ref count so matrixAutoUpdate is only restored when ALL lambdas deregister
        const regCount = (target.userData._lambdaRegCount ?? 0) + 1;
        target.userData._lambdaRegCount = regCount;
        target.matrixAutoUpdate = false;
        this._registeredObjects.set(target, componentData);
        this.onObjectAdded(target, componentData);
    }

    // Internal: deregister with command queue safety
    _deregisterObject(target: Object3D): void {
        if (this._isApplying) {
            this._pendingOps.push({ type: "remove", target });
            return;
        }
        const data = this._registeredObjects.get(target);
        if (data) {
            ComponentDataPool.release(this.id, data);
            this._registeredObjects.delete(target);
            // Only restore matrixAutoUpdate when no lambdas manage this object
            const regCount = Math.max(0, (target.userData._lambdaRegCount ?? 1) - 1);
            target.userData._lambdaRegCount = regCount;
            if (regCount === 0) {
                target.matrixAutoUpdate = true;
            }
            this.onObjectRemoved(target);
        }
    }

    // Process pending operations after apply() completes
    _processPendingOps(): void {
        const ops = [...this._pendingOps];
        this._pendingOps = [];
        for (const op of ops) {
            if (op.type === "add") {
                this._registerObject(op.target, op.data!);
            } else {
                this._deregisterObject(op.target);
            }
        }
    }
}
