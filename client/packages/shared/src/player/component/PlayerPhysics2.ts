import {Object3D, Quaternion, Scene, Vector3} from "three";
import {QuaternionLike, Vector3Like} from "three/webgpu";

import PlayerComponent from "./PlayerComponent";
import PlayerLoadMask from "./PlayerLoadMask";
import EngineRuntime from "../../EngineRuntime";
import {IMultiplayerState} from "../../behaviors/state/IMultiplayerState";
import {GAME_GRAVITY_DEFAULT} from "../../constants/game";
import global from "../../global";
import MultiplayerProxy from "../../multiplayer/MultiplayerProxy";
import { processInBatches } from "../../physics/common/processInBatches";
import {CollisionType} from "../../physics/common/physicsConfig";
import {
    CollisionBehavior,
    CollisionData,
    CollisionFlag,
    ICollisionSource,
    IDispatcher,
    IPhysics,
    ObjectMotionState,
    PhysicsEngineType,
} from "../../physics/common/types";
import {PhysicsEngineFactory} from "../../physics/PhysicsEngineFactory";
import {shouldUsePhysicsWorker} from "../../physics/preloadPhysics";
import {PhysicsUtil} from "../../physics/PhysicsUtil";
import {PhysicsWrapper} from "../../physics/simple/PhysicsWrapper";
import {setGeometryWorkerPoolSize} from "../../physics/worker/GeometryComputePool";
import { recordFrameRuntimeTrace } from "../../scheduler/debug/frameRuntimeTrace.js";
import {DiscordController} from "../../userManagement/playerProfile/game-service-controllers";
import {DetectDevice} from "../../utils/DetectDevice";
import {getObjectTemplateFromScene} from "../../utils/ObjectUtils";
import {SceneLoadProfiler} from "../../utils/SceneLoadProfiler";

type UpdateData = {
    receivedAtPerf: number;
    uuid: string;
    position: Vector3Like;
    rotation: QuaternionLike;
    scale: Vector3Like;
    stepDurationMs: number;
    motionState?: ObjectMotionState;
};

type ExtrapolationBlendSource = {
    previous: UpdateData;
    current: UpdateData;
};

type UpdatesData = {
    previous: UpdateData | null;
    current: UpdateData | null;
    blendSource: ExtrapolationBlendSource | null;
};

type UpdateApplySummary = {
    appliedCount: number;
    interpolatedCount: number;
    oldestPendingAgeMs: number | null;
    newestPendingAgeMs: number | null;
    maxInterpolationProgress: number | null;
};

type PhysicsTraceSnapshot = {
    schedulerDriven: boolean;
    pendingUpdates: number;
    bodyUpdatesSinceLastApply: number;
    lastDeltaTimeMs: number;
    lastAppliedCount: number;
    lastInterpolatedCount: number;
    lastPendingBeforeApply: number;
    lastOldestPendingAgeMs: number | null;
    lastNewestPendingAgeMs: number | null;
    lastMaxInterpolationProgress: number | null;
    lastBodyUpdateAgeMs: number | null;
    lastAppliedAgeMs: number | null;
    stepCounter: number;
};

export default class PlayerPhysics2 extends PlayerComponent implements ICollisionSource {
    private static readonly USE_ASYNC_PHYSICS_LOADING = true;
    // Device-adaptive: fewer workers on mobile to reduce memory pressure from parallel geometry computation.
    private static readonly MAX_GEOMETRY_WORKERS = DetectDevice.isMobile() ? 2 : Math.min(8, Math.max(4, navigator.hardwareConcurrency || 4));
    private static readonly LOAD_CONCURRENCY = 8;
    
    private isMultiplayer = false;
    private useMultiplayerPhysicsEngine: boolean = false;
    private maxMultiplayerClientsPerRoom = 4;
    private useWorker: boolean;
    private physics: IPhysics | null;
    private scene!: Scene;
    private updates = new Map<string, UpdatesData>();
    private positionAuxA = new Vector3();
    private positionAuxB = new Vector3();
    private positionAuxC = new Vector3();
    private scaleAuxA = new Vector3();
    private scaleAuxB = new Vector3();
    private scaleAuxC = new Vector3();
    private quaternionAuxA = new Quaternion();
    private quaternionAuxB = new Quaternion();
    private quaternionAuxC = new Quaternion();
    private quaternionAuxD = new Quaternion();
    private collisionListener?: (collision: CollisionData) => void;
    private mask: PlayerLoadMask;
    private qualityUpdateRateHz: number | null = null;
    private qualitySubsteps = 1;
    private qualityMaxStepsPerFrame = 3;
    private physicsAccumulator = 0;
    private schedulerDriven = false;
    private extrapolationEnabled = true;
    private traceBodyUpdatesSinceLastApply = 0;
    private traceLastBodyUpdatePerfTime: number | null = null;
    private traceLastAppliedPerfTime: number | null = null;
    private traceStepCounter = 0;
    private traceSnapshot: PhysicsTraceSnapshot = {
        schedulerDriven: false,
        pendingUpdates: 0,
        bodyUpdatesSinceLastApply: 0,
        lastDeltaTimeMs: 0,
        lastAppliedCount: 0,
        lastInterpolatedCount: 0,
        lastPendingBeforeApply: 0,
        lastOldestPendingAgeMs: null,
        lastNewestPendingAgeMs: null,
        lastMaxInterpolationProgress: null,
        lastBodyUpdateAgeMs: null,
        lastAppliedAgeMs: null,
        stepCounter: 0,
    };

    multiplayerState: IMultiplayerState | null = null;

    constructor(engine: EngineRuntime) {
        super(engine);
        this.mask = new PlayerLoadMask(engine);
        this.useWorker =
            typeof Worker !== "undefined" &&
            !global.app?.debug &&
            !(DiscordController.isInDiscord() && process.env.NODE_ENV !== "production");
        this.physics = null;
        //FIXME: move to a separate PhysicsUtils class
        this.app.addPhysicsObject = (target: Object3D) => {
            this.scene.add(target);
            this.addObject(target);
        };
        this.app.removePhysicsObject = (target: Object3D) => {
            this.scene.remove(target);
            if (PhysicsUtil.isPhysicsEnabled(target)) {
                this.physics?.remove(target.uuid);
            }
        };
        this.app.removePhysicsObjectBody = (target: Object3D) => {
            if (PhysicsUtil.isPhysicsEnabled(target)) {
                this.physics?.remove(target.uuid);
            }
        };
        this.app.addPhysicsObjectBody = (target: Object3D) => {
            if (PhysicsUtil.isPhysicsEnabled(target)) {
                this.addObject(target);
            }
        };
    }

    create(
        sceneId: string,
        scene: Scene,
        isMultiplayer: boolean,
        maxMultiplayerClientsPerRoom: number,
    ): Promise<IPhysics> {
        this.scene = scene;
        this.isMultiplayer = isMultiplayer;
        this.useMultiplayerPhysicsEngine = false;
        this.maxMultiplayerClientsPerRoom = maxMultiplayerClientsPerRoom;
        return new Promise((resolve, reject) => {
            this.initPhysicsAndAddObjects(sceneId, scene)
                .then(physics => {
                    resolve(physics);
                })
                .catch(reject);
        });
    }

    /**
     * Apply launch-time physics quality settings.
     * Used across legacy and scheduler runtime modes.
     * @param updateRateHz
     * @param substeps
     * @param maxStepsPerFrame
     * @param schedulerDriven When true the FrameOrchestrator owns the fixed-step
     *   accumulator so PlayerPhysics2.update() runs a single simulateStep per call
     *   instead of its own inner accumulator.
     * @param enableExtrapolation When false render-time extrapolation and
     *   extrapolation handoff blending are disabled.
     */
    configureQuality(updateRateHz: number, substeps: number, maxStepsPerFrame: number, schedulerDriven = false, enableExtrapolation = true): void {
        this.qualityUpdateRateHz = Number.isFinite(updateRateHz) && updateRateHz > 0 ? updateRateHz : null;
        this.qualitySubsteps = Math.max(1, Math.floor(substeps || 1));
        this.qualityMaxStepsPerFrame = Math.max(1, Math.floor(maxStepsPerFrame || 3));
        this.physicsAccumulator = 0;
        this.schedulerDriven = schedulerDriven;
        this.extrapolationEnabled = enableExtrapolation;
        this.traceSnapshot.schedulerDriven = schedulerDriven;
    }

    //ICollisionSource impl

    addCollisionListener(listener: (collision: CollisionData) => void) {
        this.collisionListener = listener;
    }

    //end of ICollisionSource impl

    async addObjects(): Promise<void> {
        await this.addObjectsFromScene();
        if (!this.useWorker) {
            const debugMesh = this.physics?.initDebug();
            if (debugMesh) {
                this.scene.add(debugMesh);
            }
        }
    }

    addPhysicsObject(target: Object3D) {
        this.scene.add(target);
        void this.addObject(target);
    }

    // Device-adaptive: smaller batches on mobile reduce peak memory during physics init.
    private static readonly BATCH_SIZE = DetectDevice.isMobile() ? 25 : 50;

    async addObjectsFromScene(): Promise<void> {
        SceneLoadProfiler.begin("physicsCollect");
        const objectsToAdd = this.collectPhysicsObjects();
        SceneLoadProfiler.end("physicsCollect");
        if (objectsToAdd.length === 0) return;

        if (PlayerPhysics2.USE_ASYNC_PHYSICS_LOADING) {
            setGeometryWorkerPoolSize(PlayerPhysics2.MAX_GEOMETRY_WORKERS);
        }

        console.log(`📦 Loading ${objectsToAdd.length} physics objects...`);
        const startTime = performance.now();

        SceneLoadProfiler.begin("physicsBatches");
        await this.processObjectsInBatches(objectsToAdd, startTime);
        SceneLoadProfiler.end("physicsBatches");

        this.logCompletionStats(objectsToAdd.length, startTime);
    }

    private collectPhysicsObjects(): Object3D[] {
        const objects: Object3D[] = [];
        this.scene.traverse(obj => {
            const config = PhysicsUtil.getPhysicsConfig(obj);
            if (config?.enabled && config.type === "rigidBody") {
                objects.push(obj);
            }
        });

        // Sort by distance to camera so near objects get physics first.
        // Pre-compute distances to avoid repeated getWorldPosition in sort.
        const cameraPos = this.app.camera.position;
        const tmpVec = new Vector3();
        const distances = new Map<Object3D, number>();
        for (const obj of objects) {
            obj.getWorldPosition(tmpVec);
            distances.set(obj, tmpVec.distanceToSquared(cameraPos));
        }
        objects.sort((a, b) => distances.get(a)! - distances.get(b)!);

        return objects;
    }

    private async processObjectsInBatches(objects: Object3D[], startTime: number): Promise<void> {
        const useAsync = PlayerPhysics2.USE_ASYNC_PHYSICS_LOADING;
        const addMethod = useAsync ? (obj: Object3D) => this.addObject(obj) : (obj: Object3D) => this.addObjectSync(obj);
        const icon = useAsync ? '⚡' : '🐌';
        await processInBatches({
            items: objects,
            batchSize: PlayerPhysics2.BATCH_SIZE,
            concurrency: PlayerPhysics2.LOAD_CONCURRENCY,
            processItem: addMethod,
            onBatchComplete: (loaded, total) => {
                const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
                console.log(`${icon} Progress: ${loaded}/${total} (${elapsed}s)`);
                this.app.loadingManager?.updateStageProgress(loaded / total);
            },
            yieldBetweenBatches: true,
        });
    }

    private logCompletionStats(count: number, startTime: number): void {
        const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);
        const avgTime = ((performance.now() - startTime) / count).toFixed(2);
        
        console.log(`✅ Physics Loading Complete!`);
        console.log(`   Total objects: ${count}`);
        console.log(`   Total time: ${totalTime}s`);
        console.log(`   Avg per object: ${avgTime}ms`);
    }

    addPhysicsObjectBody(target: Object3D) {
        if (PhysicsUtil.isPhysicsEnabled(target)) {
            void this.addObject(target);
        }
    }

    removePhysicsObjectBody(target: Object3D) {
        if (PhysicsUtil.isPhysicsEnabled(target)) {
            this.physics?.remove(target.uuid);
        }
    }

    async addObject(object: Object3D): Promise<void> {
        const physicsConfig = PhysicsUtil.getPhysicsConfig(object);
        if (!physicsConfig?.enabled || physicsConfig.type !== "rigidBody") {
            return;
        }
        if (this.useMultiplayerPhysicsEngine) {
            //just add objects to the local update cache
            if (physicsConfig.ctype === CollisionType.Dynamic || physicsConfig.ctype === CollisionType.Kinematic) {
                const collisionFlag =
                    physicsConfig.ctype === CollisionType.Dynamic ? CollisionFlag.DYNAMIC : CollisionFlag.KINEMATIC;
                this.physics?.addObject(object.uuid, physicsConfig.mass, collisionFlag, object);
            }
        } else {
            object.updateMatrixWorld(true);
            const objectTemplate = getObjectTemplateFromScene(object, this.scene);
            await PhysicsUtil.addObjectShapeToPhysics(object, this.physics, objectTemplate);
        }
    }

    async addObjectSync(object: Object3D): Promise<void> {
        const physicsConfig = PhysicsUtil.getPhysicsConfig(object);
        if (!physicsConfig?.enabled || physicsConfig.type !== "rigidBody") {
            return;
        }
        if (this.useMultiplayerPhysicsEngine) {
            //just add objects to the local update cache
            if (physicsConfig.ctype === CollisionType.Dynamic || physicsConfig.ctype === CollisionType.Kinematic) {
                const collisionFlag =
                    physicsConfig.ctype === CollisionType.Dynamic ? CollisionFlag.DYNAMIC : CollisionFlag.KINEMATIC;
                this.physics?.addObject(object.uuid, physicsConfig.mass, collisionFlag, object);
            }
        } else {
            object.updateMatrixWorld(true);
            const objectTemplate = getObjectTemplateFromScene(object, this.scene);
            // Use SYNC version for comparison
            await PhysicsUtil.addObjectShapeToPhysics(object, this.physics, objectTemplate, false);
        }
    }

    removeObject(object: Object3D) {
        this.physics?.remove(object.uuid);
    }

    /** @deprecated */
    updateObjectCollisionShape(/* object: Object3D */) {}

    setCollisionBehavior(object: Object3D, behavior: CollisionBehavior) {
        this.physics?.setCollisionBehavior(object.uuid, behavior);
    }

    initPhysicsAndAddObjects(sceneId: string, scene: Scene): Promise<IPhysics> {
        const dispatcher: IDispatcher = {
            onReady: () => {
                console.log("PlayerPhysics2: physics engine is ready !");
            },
            onBodyUpdate: (uuid, position, rotation, scale, dt, motionState) => {
                this.pushUpdateData(uuid, position, rotation, scale, dt, motionState);
            },
            onCollision: (uuid: string, listenerId: string) => {
                if (this.collisionListener) this.collisionListener({uuid, listenerId});
            },
        };

        return new Promise<IPhysics>((resolve, reject) => {
            this.mask.show();
            SceneLoadProfiler.begin("physicsInit");
            this.initPhysics(sceneId, scene, dispatcher)
                .then(async physics => {
                    SceneLoadProfiler.end("physicsInit");
                    this.physics = physics;
                    SceneLoadProfiler.begin("physicsAddObjects");
                    await this.addObjects();
                    SceneLoadProfiler.end("physicsAddObjects");
                    SceneLoadProfiler.begin("physicsPing");
                    physics
                        .ping()
                        .then(() => {
                            SceneLoadProfiler.end("physicsPing");
                            // wait for completion
                            console.log(
                                "PlayerPhysics2: ping completed: mp=" +
                                    this.isMultiplayer +
                                    " server_phys=" +
                                    this.useMultiplayerPhysicsEngine,
                            );
                            if (this.isMultiplayer && !this.useMultiplayerPhysicsEngine) {
                                const physicsWrapper = new PhysicsWrapper(
                                    physics,
                                    this.app.userId,
                                    sceneId,
                                    this.scene,
                                    this.maxMultiplayerClientsPerRoom,
                                    dispatcher,
                                );
                                physicsWrapper
                                    .start()
                                    .then(() => {
                                        console.log("MultiplayerClient: started !");
                                        this.mask.hide();
                                        this.multiplayerState = (physicsWrapper as unknown as PhysicsWrapper).mpClient;
                                        //replace physics with the wrapper
                                        this.physics = physicsWrapper;
                                        resolve(physicsWrapper);
                                    })
                                    .catch(e => {
                                        console.error("MultiplayerClient: failed to start !", e);
                                        this.mask.hide();
                                        reject(e);
                                    });
                            } else {
                                this.mask.hide();
                                resolve(physics);
                            }
                        })
                        .catch(reject);
                })
                .catch(reject);
        });
    }

    async initPhysics(sceneId: string, scene: Scene, dispatcher: IDispatcher): Promise<IPhysics> {
        let gravity = GAME_GRAVITY_DEFAULT;
        if (scene.userData.physics?.gravity !== undefined) {
            // Gravity is now stored in userData.physics
            gravity = Number(scene.userData.physics.gravity);
        } else if (scene.userData.game?.gravity !== undefined) {
            // Gravity was previously stored in userData.game
            gravity = Number(scene.userData.game.gravity);
        }

        let engineType = PhysicsEngineType.Ammo;
        if (Object.values(PhysicsEngineType).includes(scene.userData.physics?.engine)) {
            engineType = scene.userData.physics.engine as PhysicsEngineType;
        }

        try {
            let physics: IPhysics;
            if (this.isMultiplayer && this.useMultiplayerPhysicsEngine) {
                physics = new MultiplayerProxy(sceneId, scene, dispatcher, gravity);
            } else if (shouldUsePhysicsWorker()) {
                SceneLoadProfiler.begin("physicsTakeWorker");
                const [module, preloadedWorker] = await Promise.all([
                    import("../../physics/worker/PhysicsProxy"),
                    PhysicsEngineFactory.takeWorker(engineType, gravity),
                ]);
                SceneLoadProfiler.end("physicsTakeWorker");
                physics = new module.default(dispatcher, gravity, preloadedWorker);
            } else {
                SceneLoadProfiler.begin("physicsTakeWorker");
                physics = await PhysicsEngineFactory.createLegacyPhysicsAdapter(engineType, dispatcher, {gravity});
                SceneLoadProfiler.end("physicsTakeWorker");
            }

            SceneLoadProfiler.begin("physicsStart");
            await physics.start();
            SceneLoadProfiler.end("physicsStart");
            console.log("PlayerPhysics2: physics engine started", physics.constructor.name, engineType);
            return physics;
        } catch (err) {
            console.error("PlayerPhysics2: physics engine failed to start", err);
            throw err;
        } finally {
            this.mask.hide();
        }
    }

    update(deltaTime: number) {
        const physics = this.physics;
        const stepNow = performance.now();
        const pendingBeforeApply = this.getPendingUpdateCount();
        const shouldInterpolateDynamicObjects = this.isMultiplayer || this.useWorker;
        this.syncKinematicBodies();
        let applySummary: UpdateApplySummary;
        if (this.isMultiplayer) {
            if (this.useMultiplayerPhysicsEngine) {
                // Interpolate dynamic objects
                applySummary = this.updateObjects(true, stepNow);
            } else {
                this.multiplayerState?.update(deltaTime); //update remote objects
                applySummary = this.updateObjects(true, stepNow); //update local objects
            }
        } else {
            applySummary = this.updateObjects(shouldInterpolateDynamicObjects, stepNow);
        }

        if (!physics) {
            this.updateTraceSnapshot(stepNow, deltaTime, pendingBeforeApply, applySummary);
            return;
        }

        // When the FrameOrchestrator owns the fixed-step accumulator it already
        // calls update() once per fixed step — just run simulateStep directly.
        if (this.schedulerDriven) {
            this.simulateStep(deltaTime);
            this.updateTraceSnapshot(stepNow, deltaTime, pendingBeforeApply, applySummary);
            return;
        }

        if (this.qualityUpdateRateHz && this.qualityUpdateRateHz > 0) {
            const fixedStep = 1 / this.qualityUpdateRateHz;
            this.physicsAccumulator += deltaTime;

            let steps = 0;
            while (this.physicsAccumulator >= fixedStep && steps < this.qualityMaxStepsPerFrame) {
                this.simulateStep(fixedStep);
                this.physicsAccumulator -= fixedStep;
                steps++;
            }

            this.physicsAccumulator = Math.min(this.physicsAccumulator, fixedStep);
            this.updateTraceSnapshot(stepNow, deltaTime, pendingBeforeApply, applySummary);
            return;
        }

        this.simulateStep(deltaTime);
        this.updateTraceSnapshot(stepNow, deltaTime, pendingBeforeApply, applySummary);
    }

    private syncKinematicBodies(): void {
        const physics = this.physics;
        if (!physics) return;

        physics.getKinematicBodyObjects().forEach((object, uuid) => {
            PhysicsUtil.calculatePhysicsPositionFromObject(
                object,
                this.positionAuxA,
                this.quaternionAuxA,
                this.scaleAuxA,
            );
            physics.setOrigin(uuid, this.positionAuxA);
            physics.setRotation(uuid, this.quaternionAuxA);
            // TODO: remove because setScale() is deprecated
            physics.setScale(uuid, this.scaleAuxA);
        });
    }

    private simulateStep(deltaTime: number): void {
        const physics = this.physics;
        if (!physics) return;

        if (this.qualitySubsteps <= 1) {
            physics.simulate(deltaTime);
            return;
        }

        const step = deltaTime / this.qualitySubsteps;
        for (let i = 0; i < this.qualitySubsteps; i++) {
            physics.simulate(step);
        }
    }

    private pushUpdateData(
        uuid: string,
        position: Vector3Like,
        rotation: QuaternionLike,
        scale: Vector3Like,
        dt: number,
        motionState: ObjectMotionState | undefined,
    ) {
        let currentUpdate = this.updates.get(uuid);

        if (!currentUpdate) {
            currentUpdate = {
                previous: null,
                current: null,
                blendSource: null,
            };
        }

        const receivedAtPerf = performance.now();
        const previousStepDurationMs = currentUpdate.current?.stepDurationMs ?? currentUpdate.previous?.stepDurationMs ?? 0;
        const stepDurationMs = Number.isFinite(dt) && dt > 0 ? dt * 1000 : previousStepDurationMs;

        if (currentUpdate.current) {
            currentUpdate.blendSource = this.createExtrapolationBlendSource(currentUpdate);
            currentUpdate.previous = this.createPreviousUpdateForIncomingSample(currentUpdate, receivedAtPerf);
        } else {
            currentUpdate.blendSource = null;
        }

        currentUpdate.current = {
            receivedAtPerf,
            uuid,
            position,
            rotation,
            scale,
            stepDurationMs,
            motionState,
        };

        this.updates.set(uuid, currentUpdate);
        this.traceBodyUpdatesSinceLastApply++;
        this.traceLastBodyUpdatePerfTime = receivedAtPerf;
    }

    private createExtrapolationBlendSource(data: UpdatesData): ExtrapolationBlendSource | null {
        if (!this.extrapolationEnabled) {
            return null;
        }

        const previous = data.previous;
        const current = data.current;

        if (!previous || !current) {
            return null;
        }

        return {previous, current};
    }

    private createPreviousUpdateForIncomingSample(data: UpdatesData, receivedAtPerf: number): UpdateData {
        const previous = data.previous;
        const current = data.current!;

        if (!previous || !this.extrapolationEnabled) {
            return current;
        }

        const stepDurationMs = current.stepDurationMs > 0 ? current.stepDurationMs : previous.stepDurationMs;
        const progressAtReceive = this.getUpdateProgressAtTime(previous, current, receivedAtPerf);

        if (progressAtReceive <= 1) {
            return current;
        }

        this.interpolateObjectPositionAndRotationInto(previous, current, progressAtReceive);

        return {
            receivedAtPerf,
            uuid: current.uuid,
            position: {
                x: this.positionAuxA.x,
                y: this.positionAuxA.y,
                z: this.positionAuxA.z,
            },
            rotation: {
                x: this.quaternionAuxA.x,
                y: this.quaternionAuxA.y,
                z: this.quaternionAuxA.z,
                w: this.quaternionAuxA.w,
            },
            scale: {
                x: this.scaleAuxA.x,
                y: this.scaleAuxA.y,
                z: this.scaleAuxA.z,
            },
            stepDurationMs,
            motionState: current.motionState,
        };
    }

    private getUpdateProgressAtTime(previous: UpdateData, current: UpdateData, frameNow: number): number {
        const stepDurationMs = current.stepDurationMs > 0 ? current.stepDurationMs : previous.stepDurationMs;
        return stepDurationMs > 0 ? Math.max(0, frameNow - current.receivedAtPerf) / stepDurationMs : 1;
    }

    private updateObject(object: Object3D, {current}: UpdatesData) {
        if (!current) {
            return;
        }

        PhysicsUtil.updateObjectTransformFromPhysics(object, current.position, current.rotation, current.scale);

        this.updateMotionState(object, current);
    }

    private updateObjectWithInterpolation(object: Object3D, data: UpdatesData, frameNow = performance.now()): number {
        const previous = (data.previous || data.current)!;
        const current = (data.current || data.previous)!;
        const progress = this.getUpdateProgressAtTime(previous, current, frameNow);

        this.interpolateObjectPositionAndRotation(object, data, progress, frameNow);
        this.updateMotionState(object, current);

        if (data.blendSource && progress >= 1.01) {
            data.blendSource = null;
        }

        return progress;
    }

    private updateMotionState(object: Object3D, updateData: UpdateData) {
        if (!updateData || !updateData.motionState) {
            return;
        }

        object.userData.motionState = updateData.motionState;
    }

    /**
     * Computes the order in which physics objects should be updated to ensure
     * parents are processed before children.
     * 
     * @remarks
     * This implementation walks up from each object to find ancestor
     * dependencies rather than traversing the entire scene. This is based on
     * the assumption that physics objects make up a small portion of the scene
     * and that they typically have a small number of ancestors.
     * 
     * @param updateUuids List of physics object UUIDs
     * @returns List of physics object UUIDs in update order
     */
    private computeUpdateOrder(updateUuids: string[]): string[] {
        // Build dependency graph: uuid -> nearest ancestor uuid also in updates
        const dependsOn = new Map<string, string | null>();

        for (const uuid of updateUuids) {
            const object = this.physics?.getDynamicBodyObject(uuid);
            if (!object) continue;

            // Walk up to find nearest ancestor that's also being updated
            let ancestor = object.parent;
            let parentPhysicsUuid: string | null = null;
            while (ancestor) {
                if (this.updates.has(ancestor.uuid)) {
                    parentPhysicsUuid = ancestor.uuid;
                    break;
                }
                ancestor = ancestor.parent;
            }
            dependsOn.set(uuid, parentPhysicsUuid);
        }

        // Topological sort: parents before children
        const updateOrder: string[] = [];
        const visited = new Set<string>();

        const visit = (uuid: string) => {
            if (visited.has(uuid)) return;
            const parent = dependsOn.get(uuid);
            if (parent) visit(parent);
            visited.add(uuid);
            updateOrder.push(uuid);
        };

        for (const uuid of updateUuids) {
            visit(uuid);
        }

        return updateOrder;
    }

    private getPendingUpdateCount(): number {
        let count = 0;
        this.updates.forEach(data => {
            if (data.current) {
                count++;
            }
        });

        return count;
    }

    private updateObjects(interpolateDynamicObjects = false, frameNow = performance.now()): UpdateApplySummary {
        const updateOrder = this.computeUpdateOrder([...this.updates.keys()]);
        const retainedUpdates = interpolateDynamicObjects ? new Map<string, UpdatesData>() : null;
        let appliedCount = 0;
        let interpolatedCount = 0;
        let oldestPendingAgeMs: number | null = null;
        let newestPendingAgeMs: number | null = null;
        let maxInterpolationProgress: number | null = null;

        updateOrder.forEach((uuid) => {
            const data = this.updates.get(uuid)!;
            const dynamicObject = this.physics?.getDynamicBodyObject(uuid);
            const receivedAtPerf = data.current?.receivedAtPerf ?? null;
            if (receivedAtPerf !== null) {
                const ageMs = Math.max(0, frameNow - receivedAtPerf);
                oldestPendingAgeMs = oldestPendingAgeMs === null ? ageMs : Math.max(oldestPendingAgeMs, ageMs);
                newestPendingAgeMs = newestPendingAgeMs === null ? ageMs : Math.min(newestPendingAgeMs, ageMs);
            }
            if (dynamicObject) {
                if (interpolateDynamicObjects) {
                    const progress = this.updateObjectWithInterpolation(dynamicObject, data, frameNow);
                    interpolatedCount++;
                    maxInterpolationProgress = maxInterpolationProgress === null
                        ? progress
                        : Math.max(maxInterpolationProgress, progress);
                } else {
                    this.updateObject(dynamicObject, data);
                }
                appliedCount++;
            }

            if (retainedUpdates && dynamicObject && (data.current || data.previous)) {
                retainedUpdates.set(uuid, data);
            }
        });

        if (retainedUpdates) {
            this.updates = retainedUpdates;
        } else {
            this.updates.clear();
        }
        if (appliedCount > 0) {
            this.traceLastAppliedPerfTime = frameNow;
        }

        return {
            appliedCount,
            interpolatedCount,
            oldestPendingAgeMs,
            newestPendingAgeMs,
            maxInterpolationProgress,
        };
    }

    getTraceSnapshot(frameNow = performance.now()): PhysicsTraceSnapshot {
        return {
            ...this.traceSnapshot,
            pendingUpdates: this.getPendingUpdateCount(),
            bodyUpdatesSinceLastApply: this.traceBodyUpdatesSinceLastApply,
            lastBodyUpdateAgeMs: this.traceLastBodyUpdatePerfTime === null ? null : Math.max(0, frameNow - this.traceLastBodyUpdatePerfTime),
            lastAppliedAgeMs: this.traceLastAppliedPerfTime === null ? null : Math.max(0, frameNow - this.traceLastAppliedPerfTime),
        };
    }

    private updateTraceSnapshot(
        stepNow: number,
        deltaTime: number,
        pendingBeforeApply: number,
        applySummary: UpdateApplySummary,
    ): void {
        this.traceStepCounter++;
        this.traceSnapshot = {
            schedulerDriven: this.schedulerDriven,
            pendingUpdates: this.getPendingUpdateCount(),
            bodyUpdatesSinceLastApply: this.traceBodyUpdatesSinceLastApply,
            lastDeltaTimeMs: deltaTime * 1000,
            lastAppliedCount: applySummary.appliedCount,
            lastInterpolatedCount: applySummary.interpolatedCount,
            lastPendingBeforeApply: pendingBeforeApply,
            lastOldestPendingAgeMs: applySummary.oldestPendingAgeMs,
            lastNewestPendingAgeMs: applySummary.newestPendingAgeMs,
            lastMaxInterpolationProgress: applySummary.maxInterpolationProgress,
            lastBodyUpdateAgeMs: this.traceLastBodyUpdatePerfTime === null ? null : Math.max(0, stepNow - this.traceLastBodyUpdatePerfTime),
            lastAppliedAgeMs: this.traceLastAppliedPerfTime === null ? null : Math.max(0, stepNow - this.traceLastAppliedPerfTime),
            stepCounter: this.traceStepCounter,
        };

        recordFrameRuntimeTrace({
            kind: "physics-step",
            schedulerDriven: this.schedulerDriven,
            deltaTimeMs: deltaTime * 1000,
            pendingBeforeApply,
            pendingAfterApply: this.getPendingUpdateCount(),
            appliedCount: applySummary.appliedCount,
            interpolatedCount: applySummary.interpolatedCount,
            oldestPendingAgeMs: applySummary.oldestPendingAgeMs,
            newestPendingAgeMs: applySummary.newestPendingAgeMs,
            maxInterpolationProgress: applySummary.maxInterpolationProgress,
            bodyUpdatesSinceLastApply: this.traceBodyUpdatesSinceLastApply,
            lastBodyUpdateAgeMs: this.traceSnapshot.lastBodyUpdateAgeMs,
            lastAppliedAgeMs: this.traceSnapshot.lastAppliedAgeMs,
            stepCounter: this.traceStepCounter,
            kinematicBodyCount: this.physics?.getKinematicBodyObjects().size ?? 0,
        });

        this.traceBodyUpdatesSinceLastApply = 0;
    }

    private interpolateObjectPositionAndRotation(
        object: Object3D,
        data: UpdatesData,
        progress: number,
        frameNow: number,
    ) {
        const previous = (data.previous || data.current)!;
        const current = (data.current || data.previous)!;

        if (this.extrapolationEnabled && data.blendSource && progress < 1.01) {
            const blendProgress = Math.min(progress / 1.01, 1);
            const blendWeight = blendProgress * blendProgress * (3 - 2 * blendProgress);
            const extrapolatedProgress = this.getUpdateProgressAtTime(data.blendSource.previous, data.blendSource.current, frameNow);

            this.interpolateObjectPositionAndRotationInto(data.blendSource.previous, data.blendSource.current, extrapolatedProgress);
            this.positionAuxC.copy(this.positionAuxA);
            this.quaternionAuxD.copy(this.quaternionAuxA);
            this.scaleAuxB.copy(this.scaleAuxA);

            this.interpolateObjectPositionAndRotationInto(previous, current, progress);
            this.positionAuxB.copy(this.positionAuxA);
            this.quaternionAuxB.copy(this.quaternionAuxA);
            this.scaleAuxC.copy(this.scaleAuxA);

            this.positionAuxA.copy(this.positionAuxC).lerp(this.positionAuxB, blendWeight);
            this.quaternionAuxA.copy(this.quaternionAuxD).slerp(this.quaternionAuxB, blendWeight);
            this.scaleAuxA.copy(this.scaleAuxB).lerp(this.scaleAuxC, blendWeight);
        } else {
            this.interpolateObjectPositionAndRotationInto(previous, current, progress);
        }

        PhysicsUtil.updateObjectTransformFromPhysics(object, this.positionAuxA, this.quaternionAuxA, this.scaleAuxA);
    }

    private interpolateObjectPositionAndRotationInto(
        previous: UpdateData,
        current: UpdateData,
        progress: number,
    ) {
        const stepDurationMs = current.stepDurationMs > 0 ? current.stepDurationMs : previous.stepDurationMs;
        const interpolationProgress = Math.min(progress, 1);
        const extrapolationTimeSeconds = this.extrapolationEnabled
            ? Math.max(0, progress - 1) * stepDurationMs / 1000
            : 0;

        this.positionAuxA.copy(previous.position).lerp(current.position, interpolationProgress);

        if (extrapolationTimeSeconds > 0) {
            if (current.motionState?.linearVelocity) {
                this.positionAuxB.copy(current.motionState.linearVelocity);
            } else if (stepDurationMs > 0) {
                this.positionAuxB.set(
                    current.position.x - previous.position.x,
                    current.position.y - previous.position.y,
                    current.position.z - previous.position.z,
                ).multiplyScalar(1000 / stepDurationMs);
            } else {
                this.positionAuxB.set(0, 0, 0);
            }

            this.positionAuxA.addScaledVector(this.positionAuxB, extrapolationTimeSeconds);
        }

        this.quaternionAuxB.copy(current.rotation);
        // slerp doesn't work with non quaternion objects
        this.quaternionAuxA.copy(previous.rotation).slerp(this.quaternionAuxB, interpolationProgress);

        if (extrapolationTimeSeconds > 0 && current.motionState?.angularVelocity) {
            this.positionAuxB.copy(current.motionState.angularVelocity);
            const angularSpeed = this.positionAuxB.length();

            if (angularSpeed > 0) {
                this.positionAuxB.multiplyScalar(1 / angularSpeed);
                this.quaternionAuxC.setFromAxisAngle(this.positionAuxB, angularSpeed * extrapolationTimeSeconds);
                this.quaternionAuxA.premultiply(this.quaternionAuxC).normalize();
            }
        }

        this.scaleAuxA.copy(previous.scale).lerp(current.scale, interpolationProgress);
    }

    pause() {
        this.physics?.pause();
    }

    resume() {
        if (this.physics?.resume) {
            this.physics?.resume();
        }
    }

    dispose() {
        this.physics?.terminate();
    }
}
