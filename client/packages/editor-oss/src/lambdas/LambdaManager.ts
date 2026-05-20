import { Object3D } from "three";

import { ComponentDataPool } from "./ComponentDataPool";
import type {
    Lambda,
    LambdaAttributeChangeOptions,
    LambdaAttributeChangeResult,
    LambdaConfig,
    LambdaConstructor,
    LambdaOptions,
} from "./Lambda";
import { unwrapLambda } from "./Lambda";
import { LambdaBase } from "./LambdaBase";
import { lambdaProfiler } from "./LambdaProfiler";
import type { LambdaQueryDescriptor } from "./LambdaQueryRegistry";
import { LambdaQueryRegistry } from "./LambdaQueryRegistry";
import { LambdaScheduler } from "./LambdaScheduler";
import type GameManager from "@stem/editor-oss/behaviors/game/GameManager";
import type { FrameContext } from "@stem/editor-oss/scheduler/types";
import FusedPhysicsLambda, { FUSABLE_LAMBDA_IDS, FUSED_PHYSICS_ID } from "./packs/fusedPhysics/FusedPhysicsLambda";

interface AttributeChangeRequest {
    target: Lambda;
    key: string;
    value: any;
    requester: Lambda | null;
    resolve: (result: LambdaAttributeChangeResult) => void;
}

export class LambdaManager {
    private lambdaClasses: Map<string, LambdaConstructor> = new Map();
    private lambdaConfigs: Map<string, LambdaConfig> = new Map();
    private instances: Map<string, Lambda> = new Map();
    // Reverse lookup: Object3D -> Set of instance IDs it belongs to
    private objectLambdaMap: Map<Object3D, Set<string>> = new Map();
    private game: GameManager;
    public scheduler: LambdaScheduler;
    /** Cached dependency waves — invalidated on instance add/remove */
    private _cachedWaves: Lambda[][] | null = null;
    /** Whether fixed-rate update adapters are active (set by LambdaSystemAdapter each frame) */
    public fixedUpdatesEnabled: boolean = true;
    private queryRegistry = new LambdaQueryRegistry();
    /** Singleton fused physics instance (created on demand) */
    private fusedPhysicsInstance: FusedPhysicsLambda | null = null;
    /** Tracks objects migrated to fused instance: "originalInstanceId:targetUUID" → fusedInstanceId */
    private fusedObjectRedirects: Map<string, string> = new Map();
    private attributeChangeQueue: AttributeChangeRequest[] = [];

    constructor(game: GameManager) {
        this.game = game;
        this.scheduler = new LambdaScheduler();
    }

    // --- Type registration (during scene load) ---

    registerLambdaClass(id: string, config: LambdaConfig, cls: LambdaConstructor): void {
        if (this.lambdaClasses.has(id)) {
            console.error(`[LambdaManager] Lambda type "${id}" already registered`);
            return;
        }
        console.log(`[LambdaManager] Registering lambda class: "${id}"`);
        this.lambdaClasses.set(id, cls);
        this.lambdaConfigs.set(id, config);
    }

    unregisterLambdaClass(id: string): void {
        this.lambdaClasses.delete(id);
        this.lambdaConfigs.delete(id);
    }

    hasLambdaClass(id: string): boolean {
        return this.lambdaClasses.has(id);
    }

    // --- Instance lifecycle ---

    async createInstance(lambdaId: string, options?: LambdaOptions): Promise<Lambda | null> {
        const cls = this.lambdaClasses.get(lambdaId);
        if (!cls) {
            console.error(`[LambdaManager] Lambda class "${lambdaId}" not found`);
            return null;
        }

        console.log(`[LambdaManager] Creating instance of "${lambdaId}" (uuid: will be assigned)`);
        const instance = new cls(lambdaId, options || {});

        try {
            await Promise.resolve(instance.init(this.game));
            this.instances.set(instance.uuid, instance);
            this._cachedWaves = null; // invalidate wave cache
            console.log(`[LambdaManager] Instance created: "${lambdaId}" (uuid: ${instance.uuid})`);
            return instance;
        } catch (error) {
            console.error(`[LambdaManager] Failed to init lambda "${lambdaId}":`, error);
            try {
                instance.dispose();
            } catch {
                // swallow disposal errors during cleanup
            }
            return null;
        }
    }

    destroyInstance(instanceId: string): void {
        const instance = this.instances.get(instanceId);
        if (!instance) return;

        for (const obj of Array.from(instance.registeredObjects.keys())) {
            this.deregisterObject(instanceId, obj);
        }

        try {
            instance.dispose();
        } catch (error) {
            console.error(`[LambdaManager] Error disposing lambda "${instanceId}":`, error);
        }
        this.instances.delete(instanceId);
        this._cachedWaves = null; // invalidate wave cache
    }

    destroyInstancesByType(lambdaId: string): void {
        for (const instance of this.getInstancesByType(lambdaId)) {
            this.destroyInstance(instance.uuid);
        }
    }

    getInstance(instanceId: string): Lambda | null {
        return this.instances.get(instanceId) ?? null;
    }

    getInstancesByType(lambdaId: string): Lambda[] {
        return Array.from(this.instances.values()).filter(i => i.id === lambdaId);
    }

    getAllInstances(): Lambda[] {
        return Array.from(this.instances.values());
    }

    getConfig(lambdaId: string): LambdaConfig | null {
        return this.lambdaConfigs.get(lambdaId) ?? null;
    }

    getAllConfigs(): LambdaConfig[] {
        return Array.from(this.lambdaConfigs.values());
    }

    updateConfig(lambdaId: string, config: LambdaConfig): void {
        this.lambdaConfigs.set(lambdaId, config);
        this._cachedWaves = null;
    }

    requestAttributeChange(
        target: Lambda,
        key: string,
        value: any,
        requester: Lambda | null,
        options?: LambdaAttributeChangeOptions,
    ): Promise<LambdaAttributeChangeResult> | LambdaAttributeChangeResult {
        const actualTarget = unwrapLambda(target);
        const actualRequester = unwrapLambda(requester);

        if (!actualTarget) {
            return {
                accepted: false,
                key,
                value: undefined,
                previousValue: undefined,
            };
        }

        if (options?.sync) {
            return this.processAttributeChange(actualTarget, key, value, actualRequester);
        }

        return new Promise<LambdaAttributeChangeResult>(resolve => {
            this.attributeChangeQueue.push({
                target: actualTarget,
                key,
                value,
                requester: actualRequester,
                resolve,
            });
        });
    }

    async reloadLambdaClass(id: string, config: LambdaConfig, cls: LambdaConstructor): Promise<void> {
        const existingInstances = this.getInstancesByType(id);
        const snapshots = existingInstances.map(instance => ({
            uuid: instance.uuid,
            attributes: {...instance.attributes},
            registrations: Array.from(instance.registeredObjects.entries()).map(([target, data]) => ({
                target,
                data: Object.fromEntries(
                    Object.entries(data).filter(([key]) => key !== "_isCritical"),
                ),
            })),
        }));

        for (const instance of existingInstances) {
            this.destroyInstance(instance.uuid);
        }

        this.lambdaClasses.set(id, cls);
        this.lambdaConfigs.set(id, config);
        this._cachedWaves = null;

        for (const snapshot of snapshots) {
            const instance = await this.createInstance(id, {
                uuid: snapshot.uuid,
                attributes: {...snapshot.attributes},
            });
            if (!instance) continue;

            for (const registration of snapshot.registrations) {
                this.registerObject(instance.uuid, registration.target, {...registration.data});
            }
        }
    }

    // --- Object registration (called from behaviors or editor) ---

    registerObject(instanceId: string, target: Object3D, componentData?: Record<string, any>): boolean {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            console.error(`[LambdaManager] Instance "${instanceId}" not found`);
            return false;
        }

        const defaults = this.getDefaultComponentData(instance.id);
        const data = componentData ?? ComponentDataPool.acquire(instance.id, defaults);

        try {
            (instance as LambdaBase)._registerObject(target, data);
        } catch (error) {
            console.error(`[LambdaManager] Error registering object with "${instanceId}":`, error);
            return false;
        }

        // Update reverse lookup
        if (!this.objectLambdaMap.has(target)) {
            this.objectLambdaMap.set(target, new Set());
        }
        this.objectLambdaMap.get(target)!.add(instanceId);
        this.refreshObjectArchetype(target);

        // Auto-fuse: if object now has 2+ physics lambdas, migrate to fused instance
        if (FUSABLE_LAMBDA_IDS.has(instance.id)) {
            this.tryFuseObject(target);
        }

        return true;
    }

    deregisterObject(instanceId: string, target: Object3D): void {
        // Check if this object was migrated to the fused instance
        const redirectKey = `${instanceId}:${target.uuid}`;
        const fusedId = this.fusedObjectRedirects.get(redirectKey);
        if (fusedId) {
            const fused = this.instances.get(fusedId);
            if (fused) {
                try {
                    (fused as LambdaBase)._deregisterObject(target);
                } catch (error) {
                    console.error(`[LambdaManager] Error deregistering from fused "${fusedId}":`, error);
                }
                this.objectLambdaMap.get(target)?.delete(fusedId);
            }
            this.fusedObjectRedirects.delete(redirectKey);
            this.refreshObjectArchetype(target);
            return;
        }

        const instance = this.instances.get(instanceId);
        if (!instance) return;

        try {
            (instance as LambdaBase)._deregisterObject(target);
        } catch (error) {
            console.error(`[LambdaManager] Error deregistering from "${instanceId}":`, error);
        }
        this.objectLambdaMap.get(target)?.delete(instanceId);
        this.refreshObjectArchetype(target);
    }

    deregisterObjectFromAll(target: Object3D): void {
        const instanceIds = this.objectLambdaMap.get(target);
        if (!instanceIds) return;

        for (const id of Array.from(instanceIds)) {
            this.deregisterObject(id, target);
        }
        this.objectLambdaMap.delete(target);
        this.queryRegistry.removeObject(target);
    }

    // --- Query ---

    getObjectLambdas(target: Object3D): Lambda[] {
        const ids = this.objectLambdaMap.get(target);
        if (!ids) return [];
        return Array.from(ids)
            .map(id => this.instances.get(id)!)
            .filter(Boolean);
    }

    /**
     * Cross-lambda query: find objects matching a combination of lambda types
     * @param descriptor
     */
    query(descriptor: LambdaQueryDescriptor): Object3D[] {
        return this.queryRegistry.query(descriptor);
    }

    /**
     * Sets component data on the effective instance for a target object.
     * Handles fusion redirects: if the object was migrated to the fused instance,
     * the data is forwarded there instead of the original instance.
     * @param instanceId
     * @param target
     * @param key
     * @param value
     */
    setObjectComponentData(instanceId: string, target: Object3D, key: string, value: any): void {
        const redirectKey = `${instanceId}:${target.uuid}`;
        const fusedId = this.fusedObjectRedirects.get(redirectKey);
        const effectiveInstance = fusedId
            ? this.instances.get(fusedId)
            : this.instances.get(instanceId);
        effectiveInstance?.setComponentData(target, key, value);
    }

    private processAttributeChange(
        target: Lambda,
        key: string,
        value: any,
        requester: Lambda | null,
    ): LambdaAttributeChangeResult {
        const oldValue = target.attributes[key];
        const accepted = target.onAttributeChangeRequested?.(key, value, oldValue, requester) !== false;

        if (accepted) {
            target.attributes[key] = value;
            this.updateLambdaInstanceAttributes(target);
            target.onAttributeChanged?.(key, value, oldValue);
            try {
                target.onAttributesUpdated?.();
            } catch (error) {
                console.error(`[LambdaManager] Error during lambda onAttributesUpdated for "${target.id}":`, error);
            }
        }

        return {accepted, key, value: accepted ? value : oldValue, previousValue: oldValue};
    }

    private processAttributeChangeQueue(): void {
        while (this.attributeChangeQueue.length > 0) {
            const req = this.attributeChangeQueue.shift()!;
            req.resolve(this.processAttributeChange(req.target, req.key, req.value, req.requester));
        }
    }

    private updateLambdaInstanceAttributes(target: Lambda): void {
        const userData = this.game.scene?.userData as
            | {
                  lambdaInstances?: Array<{instanceId: string; attributes: Record<string, any>}>;
                  projectLambdaInstances?: Array<{instanceId: string; attributes: Record<string, any>}>;
              }
            | undefined;
        if (!userData) return;

        const nextAttributes = {...target.attributes};
        const updateEntries = (entries?: Array<{instanceId: string; attributes: Record<string, any>}>) => {
            const entry = entries?.find(item => item.instanceId === target.uuid);
            if (entry) {
                entry.attributes = nextAttributes;
            }
        };

        updateEntries(userData.lambdaInstances);
        updateEntries(userData.projectLambdaInstances);
    }

    // --- Send events to lambdas associated with an object ---

    sendEventToObjectLambdas(target: Object3D, event: string, eventData?: any): void {
        const lambdas = this.getObjectLambdas(target);
        for (const lambda of lambdas) {
            try {
                const result: any = lambda.onEvent(event, eventData);
                if (result instanceof Promise) {
                    void result.catch(error => {
                        console.error(`[LambdaManager] Error during onEvent for lambda "${lambda.id}":`, error);
                    });
                }
            } catch (error) {
                console.error(`[LambdaManager] Error during onEvent for lambda "${lambda.id}":`, error);
            }
        }
    }

    // --- Per-frame update ---

    /**
     * Call apply() on every live instance, organized by dependency waves
     * @param deltaTime
     * @param context
     */
    update(deltaTime: number, context?: FrameContext): void {
        if (this.instances.size === 0) {
            this.processAttributeChangeQueue();
            return;
        }

        this.scheduler.beginFrame(context);
        const waves = this.buildWaves();
        const deadline = context?.frameDeadline ?? Infinity;
        let processed = 0;
        for (const wave of waves) {
            for (const instance of wave) {
                lambdaProfiler.beginMeasure(instance.uuid);
                try {
                    instance.apply(deltaTime);
                } catch (error) {
                    console.error(`[LambdaManager] Error in apply for lambda "${instance.id}":`, error);
                }
                lambdaProfiler.endMeasure(instance.uuid, instance.id, instance.entityCount);

                processed++;
                if ((processed & 7) === 7 && performance.now() >= deadline) {
                    this.processAttributeChangeQueue();
                    return;
                }
            }
        }
        this.processAttributeChangeQueue();
    }

    /**
     * Fixed-timestep update for lambdas that implement fixedUpdate().
     * Used by FixedLambdaSystemAdapter.
     * @param fixedDeltaTime
     * @param context
     */
    fixedUpdate(fixedDeltaTime: number, context?: FrameContext): void {
        if (this.instances.size === 0) {
            this.processAttributeChangeQueue();
            return;
        }
        const deadline = context?.frameDeadline ?? Infinity;
        let processed = 0;
        for (const instance of this.instances.values()) {
            lambdaProfiler.beginMeasure(instance.uuid);
            try {
                (instance as LambdaBase).fixedApply(fixedDeltaTime);
            } catch (error) {
                console.error(`[LambdaManager] Error in fixedUpdate for lambda "${instance.id}":`, error);
            }
            lambdaProfiler.endMeasure(instance.uuid, instance.id, instance.entityCount);

            processed++;
            if ((processed & 7) === 7 && performance.now() >= deadline) {
                this.processAttributeChangeQueue();
                return;
            }
        }
        this.processAttributeChangeQueue();
    }

    /**
     * Read-only view of the current dependency waves, for debugging / inspector UIs.
     * Do not mutate the returned arrays.
     * @returns Waves in execution order — instances within wave[i] run before wave[i+1].
     */
    getWaves(): readonly Lambda[][] {
        return this.buildWaves();
    }

    /**
     * Builds parallel execution waves from lambda instance read/write declarations.
     * Lambdas within the same wave have no overlapping write→read dependencies.
     * Falls back to single wave when no read/write metadata is declared.
     */
    private buildWaves(): Lambda[][] {
        if (this._cachedWaves !== null) return this._cachedWaves;
        const all = Array.from(this.instances.values());
        if (all.length <= 1) {
            this._cachedWaves = [all];
            return this._cachedWaves;
        }

        // Build write→read edges between lambda instances
        const writeSets = new Map<string, Set<string>>(); // uuid → written components
        const readSets = new Map<string, Set<string>>();  // uuid → read components
        for (const inst of all) {
            const config = this.lambdaConfigs.get(inst.id);
            const schemaKeys = config?.componentSchema ? Object.keys(config.componentSchema) : [];
            writeSets.set(inst.uuid, new Set(config?.writeComponents ?? schemaKeys));
            readSets.set(inst.uuid, new Set(config?.readComponents ?? schemaKeys));
        }

        // Compute in-degree: edge A→B if A writes something B reads
        const adj = new Map<string, Set<string>>();
        const inDegree = new Map<string, number>();
        for (const inst of all) {
            adj.set(inst.uuid, new Set());
            inDegree.set(inst.uuid, 0);
        }
        for (const a of all) {
            for (const b of all) {
                if (a.uuid === b.uuid) continue;
                const aWrites = writeSets.get(a.uuid)!;
                const bReads = readSets.get(b.uuid)!;
                const bWrites = writeSets.get(b.uuid)!;
                // Edge A→B if A writes something B reads, BUT skip if B also
                // writes the same component (mutual read/write = peers,
                // resolved by registration order to avoid cycles).
                let hasEdge = false;
                for (const w of aWrites) {
                    if (bReads.has(w) && !bWrites.has(w)) {
                        hasEdge = true;
                        break;
                    }
                }
                if (hasEdge) {
                    adj.get(a.uuid)!.add(b.uuid);
                    inDegree.set(b.uuid, (inDegree.get(b.uuid) ?? 0) + 1);
                }
            }
        }

        // BFS by layer
        const uuidToInstance = new Map(all.map(i => [i.uuid, i]));
        const waves: Lambda[][] = [];
        let frontier = all.filter(i => inDegree.get(i.uuid) === 0);
        while (frontier.length > 0) {
            waves.push(frontier);
            const next: Lambda[] = [];
            for (const inst of frontier) {
                for (const nid of adj.get(inst.uuid) ?? []) {
                    const deg = inDegree.get(nid)! - 1;
                    inDegree.set(nid, deg);
                    if (deg === 0) next.push(uuidToInstance.get(nid)!);
                }
            }
            frontier = next;
        }

        // Detect unscheduled lambdas (stuck in dependency cycle)
        const scheduled = waves.flat();
        if (scheduled.length < all.length) {
            const missing = all.filter(i => !scheduled.includes(i));
            console.warn(
                `[LambdaManager] ${missing.length} lambda(s) stuck in dependency cycle, appending to last wave:`,
                missing.map(i => i.id).join(", "),
            );
            // Append stuck lambdas to a final wave so they still execute
            waves.push(missing);
        }

        this._cachedWaves = waves;
        return waves;
    }

    // --- Cleanup ---

    /** Destroy all instances but keep registered lambda classes/configs for reuse between play cycles */
    dispose(): void {
        const instanceIds = Array.from(this.instances.keys());
        for (const id of instanceIds) {
            this.destroyInstance(id);
        }
        this._cachedWaves = null;
        this.fusedPhysicsInstance = null;
        this.fusedObjectRedirects.clear();
        this.objectLambdaMap.clear();
        this.queryRegistry.clearArchetypes();
        this.scheduler.dispose();
        ComponentDataPool.dispose();
        lambdaProfiler.dispose();
    }

    /** Full teardown - clears everything including registered classes */
    fullDispose(): void {
        this.dispose();
        this.lambdaClasses.clear();
        this.lambdaConfigs.clear();
        this.queryRegistry.dispose();
    }

    /** Access profiler for debugging — call lambdaManager.profiler to inspect */
    get profiler() {
        return lambdaProfiler;
    }

    // --- Helpers ---

    private refreshObjectArchetype(target: Object3D): void {
        const instanceIds = this.objectLambdaMap.get(target);
        if (!instanceIds || instanceIds.size === 0) {
            this.queryRegistry.removeObject(target);
            return;
        }
        const typeIds = new Set<string>();
        for (const iid of instanceIds) {
            const inst = this.instances.get(iid);
            if (inst) typeIds.add(inst.id);
        }
        this.queryRegistry.setArchetype(target, typeIds);
    }

    private getDefaultComponentData(lambdaId: string): Record<string, any> {
        const config = this.lambdaConfigs.get(lambdaId);
        if (!config?.componentSchema) return {};

        const defaults: Record<string, any> = {};
        for (const [key, schema] of Object.entries(config.componentSchema)) {
            if (schema && typeof schema === "object" && "default" in schema) {
                defaults[key] = (schema as { default: any }).default;
            }
        }
        return defaults;
    }

    // --- Physics fusion ---

    /**
     * If an object is registered with 2+ fusable physics lambdas,
     * migrate it to the single-pass FusedPhysicsLambda and deregister
     * from the individual instances.
     * @param target
     */
    private tryFuseObject(target: Object3D): void {
        const instanceIds = this.objectLambdaMap.get(target);
        if (!instanceIds || instanceIds.size < 2) return;

        // Collect physics instances for this object
        const physicsEntries: { id: string; instanceId: string; data: Record<string, any> }[] = [];
        for (const iid of instanceIds) {
            const inst = this.instances.get(iid);
            if (!inst || !FUSABLE_LAMBDA_IDS.has(inst.id)) continue;
            const data = inst.getComponentData(target);
            if (data) {
                physicsEntries.push({ id: inst.id, instanceId: iid, data });
            }
        }

        if (physicsEntries.length < 2) return;

        // Already fused?
        if (this.fusedPhysicsInstance && instanceIds.has(this.fusedPhysicsInstance.uuid)) return;

        // Merge component data from all physics lambdas (later entries override earlier)
        const merged: Record<string, any> = {};
        for (const entry of physicsEntries) {
            for (const [k, v] of Object.entries(entry.data)) {
                if (k === "_isCritical") continue;
                merged[k] = v;
            }
        }

        // Merge attributes from individual instances for gravity values
        const mergedAttrs: Record<string, any> = {};
        for (const entry of physicsEntries) {
            const inst = this.instances.get(entry.instanceId);
            if (inst) {
                Object.assign(mergedAttrs, inst.attributes);
            }
        }

        // Get or create the fused instance
        const fused = this.getOrCreateFusedInstance(mergedAttrs);
        if (!fused) return;

        // Deregister from individual physics instances and record redirects
        for (const entry of physicsEntries) {
            (this.instances.get(entry.instanceId) as LambdaBase)?._deregisterObject(target);
            instanceIds.delete(entry.instanceId);
            // Record redirect so external code using the original instanceId gets forwarded
            this.fusedObjectRedirects.set(`${entry.instanceId}:${target.uuid}`, fused.uuid);
        }

        // Register with fused instance
        (fused as LambdaBase)._registerObject(target, merged);
        instanceIds.add(fused.uuid);
        this.refreshObjectArchetype(target);
    }

    private getOrCreateFusedInstance(attributes: Record<string, any>): FusedPhysicsLambda | null {
        if (this.fusedPhysicsInstance) return this.fusedPhysicsInstance;

        try {
            const fused = new FusedPhysicsLambda(FUSED_PHYSICS_ID, { attributes });
            void fused.init(this.game);
            this.instances.set(fused.uuid, fused);
            this.fusedPhysicsInstance = fused;
            console.log(`[LambdaManager] Created fused physics instance (uuid: ${fused.uuid})`);
            return fused;
        } catch (error) {
            console.error("[LambdaManager] Failed to create fused physics instance:", error);
            return null;
        }
    }
}
