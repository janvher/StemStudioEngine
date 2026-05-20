import {MathUtils, Object3D, QuaternionLike, Vector3, Vector3Like} from "three";

import {
    BoxData,
    CapsuleData,
    CollisionBehavior,
    CollisionRegistration,
    CollisionShape,
    CommonData,
    ConcaveHullData,
    ConvexHullData,
    IDispatcher,
    IPlayerOptions,
    ModelData,
    SphereData,
    TerrainData,
    CollisionFlag,
    VehicleData,
    VehicleInput,
    VehicleOptions,
    VehicleSpec,
} from "../common/types";
import {BatchObjectUpdate, BatchUpdateEvent, PHYSICS_EVENTS} from "../common/events";
import PhysicsBase from "../PhysicsBase";
import type {PreloadedPhysicsWorker} from "../PhysicsEngineFactory";
import {SceneLoadProfiler} from "@stem/editor-oss/utils/SceneLoadProfiler";

export default class PhysicsProxy extends PhysicsBase {
    /** Maximum simulate dt the worker is allowed to consume in one step. Surplus is dropped → physics goes slow-mo under sustained load instead of letting the message queue grow. */
    private static readonly MAX_DT = 0.1;

    private workerHandler: Worker | null = null;
    private workerReady = false;
    public otsShiftVector: Vector3;

    private speedAdjustment = new Vector3();

    private pingCallbacks = new Map<string, (value: void) => void>();

    private objectUpdates: Record<string, BatchObjectUpdate> = {};

    private shapeUuids = new Set<string>();
    private velocityCache = new Map<string, Vector3Like>();
    /** Maps vehicleUuid -> visual object UUIDs registered in dynamicObjects */
    private vehicleVisualUuids = new Map<string, string[]>();

    // True between posting SIMULATE and receiving SIMULATE_DONE. While busy, atomic events
    // queue locally and per-uuid latest-wins state coalesces; we don't grow the worker's queue.
    private workerBusy = false;
    private pendingSimulateDt = 0;
    private pendingAtomic: Array<any> = [];

    // Per-uuid latest-wins buffers for high-frequency events. Flushed once per simulate().
    private pendingPlayerMoves = new Map<string, { direction: Vector3Like; jump: boolean }>();
    private pendingVehicleMoves = new Map<string, VehicleInput>();
    private pendingPlayerGravity = new Map<string, Vector3Like>();
    private pendingPlayerPosition = new Map<string, Vector3Like>();
    private pendingLinearVelocity = new Map<string, Vector3Like>();
    private pendingAngularVelocity = new Map<string, Vector3Like>();
    private pendingLinearDamping = new Map<string, number>();
    private pendingAngularDamping = new Map<string, number>();
    private pendingCollisionBehavior = new Map<string, CollisionBehavior>();

    private clampCount = 0;
    private lastClampLogAt = 0;

    constructor(
        private readonly dispatcher: IDispatcher,
        private readonly gravity: number,
        private readonly preloaded: PreloadedPhysicsWorker,
    ) {
        super(false, true, false);
        this.workerHandler = null;
        this.workerReady = false;
        this.otsShiftVector = new Vector3(0, 0, 0);
    }

    // API
    start(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Adopt the worker handed over by `PhysicsEngineFactory.takeWorker`.
            // It already received START and is loading (or has loaded) its
            // engine WASM; we just attach handlers and wait for READY.
            this.workerHandler = this.preloaded.worker;
            this.workerHandler.onmessage = this.handleWorkerMessages;
            this.workerHandler.onerror = (error) => {
                console.error("Physics worker error:", error);
                reject(new Error(`Physics worker crashed: ${error.message}`));
            };
            this.workerHandler.onmessageerror = (error) => {
                console.error("Physics worker message error:", error);
            };
            console.log("Physics worker adopted");
            this.preloaded.onReady(() => {
                if (!this.workerReady) {
                    this.workerReady = true;
                    this.dispatcher.onReady();
                }
                resolve();
            });
        });
    }

    terminate() {
        // Worker is going away; bypass back-pressure.
        this.workerHandler?.postMessage({event: PHYSICS_EVENTS.TERMINATE});
        this.workerHandler?.terminate();
    }

    simulate(deltaTime: number) {
        if (this.workerBusy) {
            this.pendingSimulateDt = Math.min(this.pendingSimulateDt + deltaTime, PhysicsProxy.MAX_DT);
            return;
        }

        this.flushLatestWins();

        const batchUpdate: BatchUpdateEvent = {
            event: PHYSICS_EVENTS.BATCH.UPDATE,
            objects: this.objectUpdates,
        };
        this.workerHandler?.postMessage(batchUpdate);
        this.objectUpdates = {};

        let dt = this.pendingSimulateDt + deltaTime;
        if (dt > PhysicsProxy.MAX_DT) {
            dt = PhysicsProxy.MAX_DT;
            this.clampCount++;
        }
        this.pendingSimulateDt = 0;

        this.workerHandler?.postMessage({event: PHYSICS_EVENTS.SIMULATE, deltaTime: dt});
        this.workerBusy = true;

        this.maybeLogClamp();
    }

    pause() {
        this.postAtomic({event: PHYSICS_EVENTS.PAUSE});
    }

    resume() {
        this.postAtomic({event: PHYSICS_EVENTS.RESUME});
    }

    ping(): Promise<void> {
        return new Promise<void>((resolve) => {
            const pingId = MathUtils.generateUUID();
            this.pingCallbacks.set(pingId, resolve);
            this.postAtomic({event: PHYSICS_EVENTS.PING, id: pingId});
        });
    }

    getGravity(): number {
        return this.gravity;
    }

    addFixedJoint(collisionEnabled: boolean, uuidA: string, uuidB: string, vec3PivotB: Vector3, vec4RotationB: QuaternionLike): void {
        this.postAtomic({
            event: PHYSICS_EVENTS.ADD.CONSTRAINT.FIXED,
            collisionEnabled,
            uuidA,
            uuidB,
            vec3PivotB,
            vec4RotationB
        });
    }

    addHingeJoint(collisionEnabled: boolean, uuidA: string, uuidB: string,
                  hingeAxis: Vector3Like, relPos: Vector3Like, relRotation: QuaternionLike,
                  angularLimitEnabled: boolean, angularLimit: Vector3Like,
                  motorEnabled: boolean, motorSpeed: number, motorTorque: number): void {
        this.postAtomic({
            event: PHYSICS_EVENTS.ADD.CONSTRAINT.HINGE,
            collisionEnabled,
            uuidA,
            uuidB,
            hingeAxis,
            relPos,
            relRotation,
            angularLimitEnabled,
            angularLimit,
            motorEnabled,
            motorSpeed,
            motorTorque
        });
    }

    addPoint2PointJoint(collisionEnabled: boolean, uuidA: string, vec3PivotA: Vector3, uuidB: string, vec3PivotB: Vector3): void {
        this.postAtomic({
            event: PHYSICS_EVENTS.ADD.CONSTRAINT.P2P,
            collisionEnabled,
            uuidA,
            uuidB,
            vec3PivotA,
            vec3PivotB
        });
    }

    removeJoint(uuidA: string, uuidB: string): void {
        this.postAtomic({
            event: PHYSICS_EVENTS.REMOVE.CONSTRAINT,
            uuidA,
            uuidB
        });
    }

    setAngularVelocity(uuid: string, velocity: Vector3) {
        this.pendingAngularVelocity.set(uuid, {x: velocity.x, y: velocity.y, z: velocity.z});
    }

    setLinearVelocity(uuid: string, velocity: Vector3) {
        this.pendingLinearVelocity.set(uuid, {x: velocity.x, y: velocity.y, z: velocity.z});
    }

    applyCentralImpulse(uuid: string, impulse: Vector3) {
        this.postAtomic({
            event: PHYSICS_EVENTS.APPLY.CENTRAL_IMPULSE,
            uuid,
            x: impulse.x,
            y: impulse.y,
            z: impulse.z,
        });
    }

    setOrigin(uuid: string, position: Vector3Like) {
        let update = this.objectUpdates[uuid];
        if (!update) {
            update = { position: null, quaternion: null, scale: null };
            this.objectUpdates[uuid] = update;
        }

        update.position = { x: position.x, y: position.y, z: position.z };
    }

    setRotation(uuid: string, quaternion: QuaternionLike) {
        let update = this.objectUpdates[uuid];
        if (!update) {
            update = { position: null, quaternion: null, scale: null };
            this.objectUpdates[uuid] = update;
        }

        update.quaternion = { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w };
    }

    setScale(uuid: string, scale: Vector3Like): void {
        let update = this.objectUpdates[uuid];
        if (!update) {
            update = { position: null, quaternion: null, scale: null };
            this.objectUpdates[uuid] = update;
        }

        update.scale = { x: scale.x, y: scale.y, z: scale.z };
    }

    setPlayerGravity(uuid: string, gravity: Vector3Like) {
        if (!uuid || uuid === "") {
            console.warn("PhysicsProxy: setPlayerGravity called with empty UUID, ignoring");
            return;
        }
        this.pendingPlayerGravity.set(uuid, {x: gravity.x, y: gravity.y, z: gravity.z});
    }

    setPlayerPosition(uuid: string, position: Vector3): void {
        if (!uuid || uuid === "") {
            console.warn("PhysicsProxy: setPlayerPosition called with empty UUID, ignoring");
            return;
        }
        this.pendingPlayerPosition.set(uuid, {x: position.x, y: position.y, z: position.z});
    }

    private addObjectAndPostEvent<DataT extends CommonData>(object: Object3D, event: string, data: DataT) {
        data.collision_flag = super.addObject(data.uuid, data.mass, data.collision_flag!, object);
        this.postAtomic({event, ...data});
    }

    addShape(uuid: string, collisionShape: CollisionShape) {
        this.postAtomic({
            event: PHYSICS_EVENTS.ADD.SHAPE,
            uuid,
            shape: collisionShape,
        });
        this.shapeUuids.add(uuid);
    }

    removeShape(uuid: string) {
        this.postAtomic({
            event: PHYSICS_EVENTS.REMOVE.SHAPE,
            uuid,
        });
        this.shapeUuids.delete(uuid);
    }

    hasShape(uuid: string): boolean {
        return this.shapeUuids.has(uuid);
    }

    setRigidBodyShape(/* uuid: string, newShapeUuid: string */): void {
        console.warn("PhysicsProxy.setRigidBodyShape: not implemented");
    }

    addBody(object: Object3D, shapeUuid: string, data: CommonData): void {
        data.collision_flag = super.addObject(data.uuid, data.mass, data.collision_flag!, object);
        this.addObjectAndPostEvent(object, PHYSICS_EVENTS.ADD.BODY, {...data, shapeUuid});
    }

    addBox(object: Object3D, data: BoxData) {
        this.addObjectAndPostEvent(object, PHYSICS_EVENTS.ADD.BOX, data);
    }

    addSphere(object: Object3D, data: SphereData) {
        this.addObjectAndPostEvent(object, PHYSICS_EVENTS.ADD.SPHERE, data);
    }

    addConcaveHull(object: Object3D, data: ConcaveHullData) {
        this.addObjectAndPostEvent(object, PHYSICS_EVENTS.ADD.CONCAVEHULL, data);
    }

    addConvexHull(object: Object3D, data: ConvexHullData) {
        this.addObjectAndPostEvent(object, PHYSICS_EVENTS.ADD.CONVEXHULL, data);
    }

    addCapsuleShape(object: Object3D, data: CapsuleData) {
        this.addObjectAndPostEvent(object, PHYSICS_EVENTS.ADD.CAPSULE, data);
    }

    addModel(object: Object3D, data: ModelData) {
        this.addObjectAndPostEvent(object, PHYSICS_EVENTS.ADD.MODEL, data);
    }

    addTerrain(object: Object3D, data: TerrainData) {
        this.addObjectAndPostEvent(object, PHYSICS_EVENTS.ADD.TERRAIN, data);
    }

    remove(uuid: string) {
        this.dropPendingFor(uuid);
        this.postAtomic({event: PHYSICS_EVENTS.REMOVE.RIGID_BODY, uuid});
        super.removeObject(uuid);
    }

    removePrefab(uuid: string): void {
        this.remove(uuid);
    }

    //character / player

    addPlayerObject(uuid: string, useController: boolean, options?: IPlayerOptions): Promise<Object3D | null> {
        if (!uuid || uuid === "") {
            console.warn("PhysicsProxy: addPlayerObject called with empty UUID, ignoring");
            return Promise.resolve(null);
        }
        this.postAtomic({
            event: PHYSICS_EVENTS.PLAYER.ADD,
            uuid,
            useController,
            options,
        });
        return Promise.resolve(null);
    }

    removePlayerObject(uuid: string): void {
        if (!uuid || uuid === "") {
            console.warn("PhysicsProxy: removePlayerObject called with empty UUID, ignoring");
            return;
        }
        this.dropPendingFor(uuid);
        this.postAtomic({event: PHYSICS_EVENTS.PLAYER.REMOVE, uuid});
    }

    movePlayerObject(uuid: string, walkDirection: Vector3, jump: boolean): void {
        if (!uuid || uuid === "") {
            console.warn("PhysicsProxy: movePlayerObject called with empty UUID, ignoring");
            return;
        }
        this.pendingPlayerMoves.set(uuid, {
            direction: {
                x: walkDirection.x + this.speedAdjustment.x,
                y: walkDirection.y + this.speedAdjustment.y,
                z: walkDirection.z + this.speedAdjustment.z,
            },
            jump,
        });
    }

    addVehicleObject(vehicleUuid: string, spec: VehicleSpec, options: VehicleOptions): Promise<void> {
        // Register visual meshes locally so BODY.UPDATE events can find them
        const visualUuids: string[] = [];
        if (spec.chassisObject) {
            this.addObject(spec.chassisObjectUuid, 1, CollisionFlag.DYNAMIC, spec.chassisObject);
            visualUuids.push(spec.chassisObjectUuid);
        }
        for (const wheel of spec.wheels) {
            if (wheel.wheelObject && wheel.wheelObjectUuid) {
                this.addObject(wheel.wheelObjectUuid, 1, CollisionFlag.DYNAMIC, wheel.wheelObject);
                visualUuids.push(wheel.wheelObjectUuid);
            }
        }
        if (visualUuids.length > 0) {
            this.vehicleVisualUuids.set(vehicleUuid, visualUuids);
        }

        // Strip non-serializable Object3D refs before posting to worker
        const serializableSpec: VehicleData = {
            chassisObjectUuid: spec.chassisObjectUuid,
            chassis: spec.chassis,
            wheels: spec.wheels.map(({ name, isFront, radius, width, connection, wheelObjectUuid }) => ({
                name, isFront, radius, width, connection, wheelObjectUuid,
            })),
        };
        this.postAtomic({
            event: PHYSICS_EVENTS.VEHICLE.ADD,
            uuid: vehicleUuid,
            spec: serializableSpec,
            options,
        });
        return Promise.resolve();
    }

    removeVehicleObject(vehicleUuid: string): void {
        const visualUuids = this.vehicleVisualUuids.get(vehicleUuid);
        if (visualUuids) {
            for (const uuid of visualUuids) {
                this.removeObject(uuid);
            }
            this.vehicleVisualUuids.delete(vehicleUuid);
        }
        this.dropPendingFor(vehicleUuid);
        this.postAtomic({
            event: PHYSICS_EVENTS.VEHICLE.REMOVE,
            uuid: vehicleUuid,
        });
    }

    moveVehicleObject(vehicleUuid: string, input: VehicleInput): void {
        this.pendingVehicleMoves.set(vehicleUuid, input);
    }

    setPlayerSpeedAdjustment(uuid: string, speedAdjustment: Vector3) {
        this.speedAdjustment = speedAdjustment;
    }

    addOtsShiftVector(otsShiftVector: Vector3) {
        this.otsShiftVector = otsShiftVector;
    }

    applyImpulseToRigidBody (uuid: string, impulse: Vector3, relativePosition: Vector3) {
        if (!uuid || uuid === "") {
            console.warn("PhysicsProxy: applyImpulse called with empty UUID, ignoring");
            return;
        }
        this.postAtomic({
            event: PHYSICS_EVENTS.APPLY.IMPULSE_TO_RIGIDBODY,
            uuid,
            impulse: { x: impulse.x, y: impulse.y, z: impulse.z },
            relativePosition: { x: relativePosition.x, y: relativePosition.y, z: relativePosition.z },
        });
    }

    applyImpulseToPlayer(uuid: string, impulse: Vector3) {
        if (!uuid || uuid === "") {
            console.warn("PhysicsProxy: applyImpulseToPlayer called with empty UUID, ignoring");
            return;
        }
        this.postAtomic({
            event: PHYSICS_EVENTS.PLAYER.APPLY_IMPULSE,
            uuid,
            impulse: {x: impulse.x, y: impulse.y, z: impulse.z},
        });
    }

    setCurrentAnimation(/* uuid: string, animation: string */): void {
        //noop
    }

    //collisions

    addCollidableObject(uuid: string): void {
        this.postAtomic({event: PHYSICS_EVENTS.COLLISION.ADD.OBJECT, uuid});
    }

    removeCollidableObject(uuid: string): void {
        this.postAtomic({event: PHYSICS_EVENTS.COLLISION.REMOVE.OBJECT, uuid});
    }

    detectCollisionsForObject(uuid: string, registration: CollisionRegistration, enable: boolean): void {
        this.postAtomic({
            event: PHYSICS_EVENTS.COLLISION.DETECT,
            uuid,
            registration: registration.id,
            type: registration.type,
            enable,
        });
    }

    setCollisionBehavior(uuid: string, behavior: CollisionBehavior): void {
        this.pendingCollisionBehavior.set(uuid, behavior);
    }

    getLinearVelocity(uuid: string): Vector3Like | null {
        return this.velocityCache.get(uuid) || null;
    }

    getAngularVelocity(_uuid: string): Vector3Like | null {
        // Angular velocity is not available in the worker path (not in motionState)
        return null;
    }

    setLinearDamping(uuid: string, damping: number): void {
        this.pendingLinearDamping.set(uuid, damping);
    }

    setAngularDamping(uuid: string, damping: number): void {
        this.pendingAngularDamping.set(uuid, damping);
    }

    //end of API

    /**
     * Post an atomic (non-coalescible, ordered) event. Buffers if the worker is mid-simulate;
     * otherwise posts immediately so non-busy workers see no extra latency.
     */
    private postAtomic(message: any): void {
        if (this.workerBusy) {
            this.pendingAtomic.push(message);
        } else {
            this.workerHandler?.postMessage(message);
        }
    }

    /**
     * Drop any pending per-uuid latest-wins state. Called when an object is removed so we
     * don't post stale velocity/move state for an object the worker no longer knows about.
     */
    private dropPendingFor(uuid: string): void {
        this.pendingPlayerMoves.delete(uuid);
        this.pendingVehicleMoves.delete(uuid);
        this.pendingPlayerGravity.delete(uuid);
        this.pendingPlayerPosition.delete(uuid);
        this.pendingLinearVelocity.delete(uuid);
        this.pendingAngularVelocity.delete(uuid);
        this.pendingLinearDamping.delete(uuid);
        this.pendingAngularDamping.delete(uuid);
        this.pendingCollisionBehavior.delete(uuid);
        delete this.objectUpdates[uuid];
    }

    private flushLatestWins(): void {
        for (const [uuid, {direction, jump}] of this.pendingPlayerMoves) {
            this.workerHandler?.postMessage({
                event: PHYSICS_EVENTS.PLAYER.MOVE,
                uuid,
                direction,
                jump,
            });
        }
        this.pendingPlayerMoves.clear();

        for (const [uuid, input] of this.pendingVehicleMoves) {
            this.workerHandler?.postMessage({
                event: PHYSICS_EVENTS.VEHICLE.MOVE,
                uuid,
                input,
            });
        }
        this.pendingVehicleMoves.clear();

        for (const [uuid, gravity] of this.pendingPlayerGravity) {
            this.workerHandler?.postMessage({
                event: PHYSICS_EVENTS.PLAYER.SET_GRAVITY,
                uuid,
                x: gravity.x,
                y: gravity.y,
                z: gravity.z,
            });
        }
        this.pendingPlayerGravity.clear();

        for (const [uuid, position] of this.pendingPlayerPosition) {
            this.workerHandler?.postMessage({
                event: PHYSICS_EVENTS.PLAYER.SET_POSITION,
                uuid,
                position: {x: position.x, y: position.y, z: position.z},
            });
        }
        this.pendingPlayerPosition.clear();

        for (const [uuid, velocity] of this.pendingLinearVelocity) {
            this.workerHandler?.postMessage({
                event: PHYSICS_EVENTS.SET.LINEAR_VELOCITY,
                uuid,
                x: velocity.x,
                y: velocity.y,
                z: velocity.z,
            });
        }
        this.pendingLinearVelocity.clear();

        for (const [uuid, velocity] of this.pendingAngularVelocity) {
            this.workerHandler?.postMessage({
                event: PHYSICS_EVENTS.SET.ANGULAR_VELOCITY,
                uuid,
                x: velocity.x,
                y: velocity.y,
                z: velocity.z,
            });
        }
        this.pendingAngularVelocity.clear();

        for (const [uuid, value] of this.pendingLinearDamping) {
            this.workerHandler?.postMessage({
                event: PHYSICS_EVENTS.SET.LINEAR_DAMPING,
                uuid,
                value,
            });
        }
        this.pendingLinearDamping.clear();

        for (const [uuid, value] of this.pendingAngularDamping) {
            this.workerHandler?.postMessage({
                event: PHYSICS_EVENTS.SET.ANGULAR_DAMPING,
                uuid,
                value,
            });
        }
        this.pendingAngularDamping.clear();

        for (const [uuid, behavior] of this.pendingCollisionBehavior) {
            this.workerHandler?.postMessage({
                event: PHYSICS_EVENTS.SET.COLLISION_BEHAVIOR,
                uuid,
                behavior,
            });
        }
        this.pendingCollisionBehavior.clear();
    }

    private flushPendingAtomic(): void {
        for (const message of this.pendingAtomic) {
            this.workerHandler?.postMessage(message);
        }
        this.pendingAtomic.length = 0;
    }

    /** Reports MAX_DT clamp events at most once a second. Clamps mean the engine can't keep
     *  up with real-time and physics is running in slow-motion — actionable signal. */
    private maybeLogClamp(): void {
        if (this.clampCount === 0) return;
        const now = Date.now();
        if (now - this.lastClampLogAt > 1000) {
            console.warn(`PhysicsProxy: simulate dt clamped to ${PhysicsProxy.MAX_DT * 1000}ms ${this.clampCount}× (last 1s) — engine cannot keep up with real-time`);
            this.clampCount = 0;
            this.lastClampLogAt = now;
        }
    }

    private handleWorkerMessages = (msg: MessageEvent) => {
        let {data} = msg;
        switch (data.event) {
            case PHYSICS_EVENTS.READY:
                this.workerReady = true;
                this.dispatcher.onReady();
                break;
            case PHYSICS_EVENTS.SIMULATE_DONE:
                this.workerBusy = false;
                this.flushPendingAtomic();
                break;
            case PHYSICS_EVENTS.BODY.UPDATE: {
                const {uuid, position, quaternion, scale, motionState, dt} = data;
                if (motionState?.linearVelocity) {
                    this.velocityCache.set(uuid, motionState.linearVelocity);
                }
                this.dispatcher.onBodyUpdate(uuid, position, quaternion, scale, dt, motionState);
                break;
            }
            case PHYSICS_EVENTS.PONG: {
                const {id, stats} = data as {id: string; stats?: Record<string, {count: number; totalMs: number}>};
                if (stats) {
                    for (const [event, stat] of Object.entries(stats)) {
                        // Bucket name: shorten "physics:add:box" → "workerEvent-add:box"
                        const short = event.replace(/^physics:/, "");
                        SceneLoadProfiler.accumulate(`workerEvent-${short}`, stat.totalMs, stat.count);
                    }
                }
                const callback = this.pingCallbacks.get(id);
                if (callback) {
                    callback();
                    this.pingCallbacks.delete(id);
                } else {
                    console.warn("PONG received but no callback set");
                }
                break;
            }
            case PHYSICS_EVENTS.COLLISION.DETECTED: {
                const {uuid, listenerId} = data;
                this.dispatcher.onCollision(uuid, listenerId);
                break;
            }
            default:
                //console.warn("Unsupported event from worker: ", data.event);
                break;
        }
    };

    initDebug(): Object3D {
        return undefined as unknown as Object3D;
    }
}
