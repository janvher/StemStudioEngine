import { Object3D, Vector3 } from 'three';
import { QuaternionLike, Vector3Like } from 'three/webgpu';

import { COLLISION_TYPE } from '@stem/editor-oss/types/editor';
import { CommonData, CollisionShape, IPlayerOptions, CollisionRegistration, CollisionFlag, IDispatcher, CollisionBehavior, VehicleInput, VehicleOptions, VehicleSpec } from './common/types';
import PhysicsBase from './PhysicsBase';
import { CollisionEvent, PhysicsEngine, RigidBodyType, supportsJoints, supportsVehicles } from './PhysicsEngine';

const DEFAULT_PLAYER_GRAVITY = -10.0;
const DEFAULT_PLAYER_JUMP_HEIGHT = 1.0;
const DEFAULT_PLAYER_MAX_SLOPE = 60; // degrees
const DEFAULT_PLAYER_STEP_HEIGHT = 0.5;

/** Converts player speed (units/s) × massRatio into impulse magnitude (~1.5% of speed). */
const PUSH_SPEED_TO_IMPULSE = 0.015;
/** Minimum impulse — ensures a perceptible push. */
const PUSH_IMPULSE_MIN = 0.01;
/** Maximum impulse — prevents objects flying away. */
const PUSH_IMPULSE_MAX = 0.12;
/** Minimum player speed (units/s) to trigger any push. */
const PUSH_MIN_PLAYER_SPEED = 0.05;
/** How much contactDamping reduces impulse (at most 50% reduction when damping=1). */
const PUSH_DAMPING_FACTOR = 0.5;
/** Near-zero epsilon for direction vector length checks. */
const PUSH_DIRECTION_EPSILON = 0.000001;
/** Minimum friction before applying off-center spin impulse. */
const PUSH_FRICTION_THRESHOLD = 0.01;

const RIGID_BODY_TYPE_MAP = {
    [CollisionFlag.DYNAMIC]: RigidBodyType.Dynamic,
    [CollisionFlag.STATIC]: RigidBodyType.Static,
    [CollisionFlag.KINEMATIC]: RigidBodyType.Kinematic,
} as const;

interface Player {
    gravity: number;
    jumpSpeed: number;
    isJumping: boolean;
    pushObjects: boolean;
    pushImpulse: number;
    pushVerticalScale: number;
    readonly walkVelocity: { x: number; y: number; z: number; };
}

interface VehicleVisualData {
    chassisVisualUuid: string;
    wheelVisualUuids: string[];
}

interface ContactPair {
    uuid1: string;
    uuid2: string;
}

/**
 * Adapts a `PhysicsEngine` implementation to the legacy `PhysicsBase` /
 * `IPhysics` interface that the rest of the codebase was built against.
 *
 * `PhysicsBase` / `IPhysics` is the older surface. It bundles many concerns
 * into one interface: rigid bodies, character controllers, players (with
 * jump/push/walk/gravity state), vehicles, joints, collision listeners,
 * substepping, debug drawing, multiplayer-specific state (`isMultiplayer`,
 * `addOtsShiftVector`, `setCurrentAnimation`) — all adjacent to the raw
 * physics primitives. It also carries a number of rough edges:
 *
 * - Deprecated methods still in the contract (`addModel`, `addTerrain`,
 *   `setScale`).
 * - Three.js `Object3D` references leak through the API, coupling physics
 *   to the scene graph instead of pure data.
 * - Internal caches exposed as public methods (`getDynamicBodyObject`,
 *   `getKinematicBodyObjects`).
 * - Results come back out-of-band via an `IDispatcher` rather than as
 *   return values, which makes control flow hard to follow and test.
 * - Naming drift (`addCapsuleShape` vs. `addBox`/`addSphere`; `setOrigin`
 *   instead of `setPosition`; `shapeUuuid` typo in `addBody`).
 * - No-op defaults on the base (`kickNearbyObjects`) that quietly hide
 *   unimplemented contracts.
 *
 * The newer `PhysicsEngine` interface is deliberately smaller and
 * data-oriented: add/remove bodies and shapes, set/get transforms and
 * velocities, step. No players, no collision registrations, no Three.js
 * objects, no dispatcher — just primitive operations with plain data in
 * and out.
 *
 * This class is the bridge between the two. It owns everything that lives
 * above the primitive layer: player state (gravity, jump, vertical
 * velocity, push impulses), substepping and the time accumulator,
 * collision-listener routing, and dispatcher fan-out. Engine
 * implementations (Ammo, Rapier, Jolt, PhysX) stay focused on primitives;
 * behavior that is genuinely cross-engine lives here.
 *
 * Call sites: `PhysicsEngineFactory.createLegacyPhysicsAdapter` is the
 * canonical entry point. Used by `PhysicsWorker` and `PlayerPhysics2`.
 */
export class LegacyPhysicsAdapter extends PhysicsBase {
    private timeAccumulator = 0;
    private subStepDuration = 1 / 60;
    private maxSubSteps = 4;

    private readonly playerSpeedAdjustment = { x: 0, y: 0, z: 0 };

    private readonly players = new Map<string, Player>();

    private readonly collisionListeners = new Map<string, CollisionRegistration[]>();
    private readonly collidableUuids = new Set<string>();

    /** A map of all current contact pairs (key is `uuid1-uuid2`) */
    private readonly contactPairs = new Map<string, ContactPair>();

    private readonly vehicleVisualData = new Map<string, VehicleVisualData>();

    constructor(private readonly engine: PhysicsEngine, private readonly dispatcher: IDispatcher) {
        super(false, false, true); // isMultiplayer, isWorker, isLocal
    }

    getGravity(): number {
        return this.engine.getGravity();
    }

    start(): Promise<void> {
        this.dispatcher.onReady();
        return Promise.resolve();
    }

    terminate(): void {
        this.engine.dispose();
        this.players.clear();
        this.collisionListeners.clear();
        this.collidableUuids.clear();
        this.contactPairs.clear();
        this.vehicleVisualData.clear();
    }

    simulate(deltaTime: number): void {
        const onCollision = this.handleCollision.bind(this);
        this.timeAccumulator += deltaTime;
        this.engine.stepDuration = this.subStepDuration;

        for (let i = 0; i < this.maxSubSteps && this.timeAccumulator >= this.subStepDuration; i++) {
            this.engine.simulate(onCollision);

            for (const uuid of this.players.keys()) {
                this.simulatePlayerPostStep(uuid);
            }

            this.pruneContactPairs();
            this.dispatchCollisionEvents();
            this.timeAccumulator -= this.subStepDuration;
        }

        // Keep the accumulator in the range [0, subStepDuration * maxSubSteps].
        this.timeAccumulator %= this.subStepDuration * this.maxSubSteps;

        for (const uuid of this.engine.rigidBodyUuids()) {
            if (this.engine.getRigidBodyType(uuid) !== RigidBodyType.Dynamic) {
                continue;
            }

            const position = this.engine.getRigidBodyPosition(uuid) || { x: 0, y: 0, z: 0 };
            const roation = this.engine.getRigidBodyRotation(uuid) || { x: 0, y: 0, z: 0, w: 1 };
            const scale = { x: 1, y: 1, z: 1 }; // TODO: handle scale
            const linVel = this.engine.getRigidBodyLinearVelocity(uuid);
            const motionState = linVel ? { linearVelocity: linVel, onGround: false } : undefined;
            this.dispatcher.onBodyUpdate(uuid, position, roation, scale, deltaTime, motionState);
        }

        for (const uuid of this.engine.characterControllerUuids()) {
            const player = this.players.get(uuid);
            const position = this.engine.getCharacterControllerPosition(uuid) || { x: 0, y: 0, z: 0 };
            const roation = this.engine.getCharacterControllerRotation(uuid) || { x: 0, y: 0, z: 0, w: 1 };
            const linearVelocity = this.engine.getCharacterControllerLinearVelocity(uuid) || { x: 0, y: 0, z: 0 };
            const onGround = this.engine.isCharacterControllerOnGround(uuid) || false;
            const scale = { x: 1, y: 1, z: 1 }; // TODO: handle scale
            this.dispatcher.onBodyUpdate(uuid, position, roation, scale, deltaTime, { linearVelocity, onGround: onGround && !player?.isJumping });
        }

        if (supportsVehicles(this.engine)) {
            const vehiclePhysics = this.engine;
            for (const vehicleUuid of vehiclePhysics.vehicleUuids()) {
                const visualData = this.vehicleVisualData.get(vehicleUuid);
                if (!visualData) continue;

                const chassisPos = vehiclePhysics.getVehicleChassisPosition(vehicleUuid);
                const chassisRot = vehiclePhysics.getVehicleChassisRotation(vehicleUuid);
                if (chassisPos && chassisRot) {
                    this.dispatcher.onBodyUpdate(visualData.chassisVisualUuid, chassisPos, chassisRot, { x: 1, y: 1, z: 1 }, deltaTime);
                }

                const wheelCount = vehiclePhysics.getVehicleWheelCount(vehicleUuid);
                for (let i = 0; i < wheelCount; i++) {
                    const wheelUuid = visualData.wheelVisualUuids[i];
                    if (!wheelUuid) continue;
                    const wt = vehiclePhysics.getVehicleWheelTransform(vehicleUuid, i);
                    if (wt) {
                        this.dispatcher.onBodyUpdate(wheelUuid, wt.position, wt.rotation, { x: 1, y: 1, z: 1 }, deltaTime);
                    }
                }
            }
        }
    }

    pause(): void {
        this.engine.pause();
    }

    resume(): void {
        this.engine.resume();
    }

    initDebug(): Object3D | null {
        return (this.engine as any).initDebug?.() ?? null;
    }

    ping(): Promise<void> {
        return Promise.resolve();
    }

    addBody(object: Object3D, shapeUuuid: string, data: CommonData): void {
        const options = {
            mass: data.mass,
            friction: data.friction,
            restitution: data.restitution,
            linearDamping: data.damping?.linear,
            angularDamping: data.damping?.angular,
            position: data.position,
            quaternion: data.quaternion,
        };

        const collisionFlag = this.getCollisionFlag(data.mass, data.collision_flag || CollisionFlag.DYNAMIC);
        const rigidBodyType = RIGID_BODY_TYPE_MAP[collisionFlag]!;

        this.engine.addRigidBody(data.uuid, shapeUuuid, rigidBodyType, options);
        this.engine.setRigidBodyPosition(data.uuid, data.position);
        this.engine.setRigidBodyRotation(data.uuid, data.quaternion);

        // Apply non-unity scale
        if (data.scale && (data.scale.x !== 1 || data.scale.y !== 1 || data.scale.z !== 1)) {
            this.engine.setRigidBodyScale(data.uuid, data.scale);
        }

        if (data.rotationLock) {
            this.engine.setRigidBodyRotationLock(data.uuid, data.rotationLock);
        }

        super.addObject(data.uuid, data.mass, collisionFlag, object);
    }

    addModel(/* object: Object3D, data: ModelData */): void {
        throw new Error('Method not implemented.');
    }

    addTerrain(/* object: Object3D, data: TerrainData */): void {
        throw new Error('Method not implemented.');
    }

    remove(uuid: string): void {
        // TODO: what about character controllers?
        this.engine.removeRigidBody(uuid);
        super.removeObject(uuid);
    }

    removePrefab(uuid: string): void {
        this.remove(uuid);
    }

    addShape(uuid: string, collisionShape: CollisionShape): void {
        this.engine.addShape(uuid, collisionShape);
    }

    removeShape(uuid: string): void {
        this.engine.removeShape(uuid);
    }

    hasShape(uuid: string): boolean {
        return this.engine.hasShape(uuid);
    }

    setRigidBodyShape(uuid: string, newShapeUuid: string): void {
        this.engine.setRigidBodyShape(uuid, newShapeUuid);
    }

    applyImpulseToRigidBody(uuid: string, impulse: Vector3Like, relativePosition: Vector3Like): void {
        this.engine.applyImpulseToRigidBody(uuid, impulse, relativePosition);
    }

    applyCentralImpulse(uuid: string, impulse: Vector3): void {
        this.engine.applyImpulseToRigidBody(uuid, impulse);
    }

    setOrigin(uuid: string, position: Vector3Like): void {
        if (this.engine.hasRigidBody(uuid)) {
            this.engine.setRigidBodyPosition(uuid, position);
        } else if (this.engine.hasCharacterController(uuid)) {
            this.engine.setCharacterControllerPosition(uuid, position);
        }
    }

    setRotation(uuid: string, quaternion: QuaternionLike): void {
        if (this.engine.hasRigidBody(uuid)) {
            this.engine.setRigidBodyRotation(uuid, quaternion);
        } else if (this.engine.hasCharacterController(uuid)) {
            this.engine.setCharacterControllerRotation(uuid, quaternion);
        }
    }

    setScale(uuid: string, scale: Vector3Like): void {
        this.engine.setRigidBodyScale(uuid, scale);
    }

    setAngularVelocity(uuid: string, velocity: Vector3) {
        this.engine.setRigidBodyAngularVelocity(uuid, velocity);
    }

    setLinearVelocity(uuid: string, velocity: Vector3): void {
        this.engine.setRigidBodyLinearVelocity(uuid, velocity);
    }

    getLinearVelocity(uuid: string): Vector3Like | null {
        return this.engine.getRigidBodyLinearVelocity(uuid);
    }

    getAngularVelocity(uuid: string): Vector3Like | null {
        return this.engine.getRigidBodyAngularVelocity(uuid);
    }

    setLinearDamping(uuid: string, damping: number): void {
        this.engine.setRigidBodyLinearDamping(uuid, damping);
    }

    setAngularDamping(uuid: string, damping: number): void {
        this.engine.setRigidBodyAngularDamping(uuid, damping);
    }

    addPlayerObject(uuid: string, useController: boolean, options?: IPlayerOptions): Promise<Object3D | null> {
        const shapeUuid = this.engine.getRigidBodyShapeUuid(uuid);
        if (!shapeUuid) {
            console.warn("addPlayerObject: failed to find player shape", uuid);
            return Promise.reject(new Error("Failed to find player shape"));
        }

        // Get the current rigid body position and rotation
        const position = this.engine.getRigidBodyPosition(uuid) || { x: 0, y: 0, z: 0 };
        const rotation = this.engine.getRigidBodyRotation(uuid) || { x: 0, y: 0, z: 0, w: 1 };

        // TODO: handle collider scale

        this.engine.addCharacterController(uuid, shapeUuid);
        this.engine.setCharacterControllerPosition(uuid, position);
        this.engine.setCharacterControllerRotation(uuid, rotation);

        const gravity = options?.playerGravity ?? this.engine.getGravity() ?? DEFAULT_PLAYER_GRAVITY;
        const maxSlope = options?.maxSlope ?? DEFAULT_PLAYER_MAX_SLOPE;
        const stepHeight = options?.stepHeight ?? DEFAULT_PLAYER_STEP_HEIGHT;
        this.engine.setCharacterControllerMaxSlope(uuid, maxSlope * Math.PI / 180);
        this.engine.setCharacterControllerStepHeight(uuid, stepHeight);
        this.engine.setCharacterControllerGravity(uuid, { x: 0, y: gravity, z: 0 });

        // Calculate jump speed based on jump height and gravity
        const jumpHeight = options?.jumpHeight ?? DEFAULT_PLAYER_JUMP_HEIGHT;
        const jumpSpeed = Math.sqrt(2 * Math.abs(gravity) * jumpHeight);

        this.engine.removeRigidBody(uuid);

        this.players.set(uuid, {
            gravity,
            jumpSpeed,
            isJumping: false,
            pushObjects: options?.pushObjects ?? true,
            pushImpulse: Math.max(0, options?.pushImpulse ?? 1),
            pushVerticalScale: options?.pushVerticalScale ?? 0,
            walkVelocity: { x: 0, y: 0, z: 0 },
        });

        return Promise.resolve(null);
    }

    removePlayerObject(uuid: string): void {
        this.engine.removeCharacterController(uuid);
        this.players.delete(uuid);
    }

    movePlayerObject(uuid: string, walkDirection: Vector3, jump: boolean): void {
        const player = this.players.get(uuid);
        if (!player) {
            console.warn("movePlayerObject: failed to find player", uuid);
            return;
        }

        const deltaTime = 1.0 / 60.0;
        // Fold platform carry (from setPlayerSpeedAdjustment) into the
        // velocity we hand to the engine. Matches AmmoPhysics.ts's
        // walkDirection + speedAdjustment pattern — no separate
        // engine-side platform channel.
        player.walkVelocity.x = (walkDirection.x + this.playerSpeedAdjustment.x) / deltaTime;
        player.walkVelocity.y = (walkDirection.y + this.playerSpeedAdjustment.y) / deltaTime;
        player.walkVelocity.z = (walkDirection.z + this.playerSpeedAdjustment.z) / deltaTime;

        this.engine.setCharacterControllerWalkVelocity(uuid, player.walkVelocity);

        if (jump && !player.isJumping) {
            const accepted = this.engine.jumpCharacterController(uuid, player.jumpSpeed);
            if (accepted) {
                player.isJumping = true;
            }
        }
    }

    setPlayerGravity(uuid: string, acceleration: Vector3Like): void {
        const player = this.players.get(uuid);
        if (!player) {
            console.warn("setPlayerGravity: failed to find player", uuid);
            return;
        }

        // TODO: Currently only the Y component is used
        player.gravity = acceleration.y;
        this.engine.setCharacterControllerGravity(uuid, { x: 0, y: acceleration.y, z: 0 });
    }

    setPlayerPosition(uuid: string, position: Vector3): void {
        this.engine.setCharacterControllerPosition(uuid, position);
    }

    setPlayerSpeedAdjustment(uuid: string, speedAdjustment: Vector3): void {
        // Stash the adjustment; movePlayerObject folds it into the next
        // velocity it hands to the engine. `uuid` is currently ignored —
        // the adjustment applies globally, matching legacy behavior.
        this.playerSpeedAdjustment.x = speedAdjustment.x;
        this.playerSpeedAdjustment.y = speedAdjustment.y;
        this.playerSpeedAdjustment.z = speedAdjustment.z;
    }

    applyImpulseToPlayer(uuid: string, impulse: Vector3): void {
        if (!this.players.has(uuid)) {
            console.warn("applyImpulseToPlayer: failed to find player", uuid);
            return;
        }

        this.engine.applyImpulseToCharacterController(uuid, impulse);
    }

    addVehicleObject(vehicleUuid: string, spec: VehicleSpec, options: VehicleOptions): Promise<void> {
        if (!supportsVehicles(this.engine)) {
            console.warn("LegacyPhysicsAdapter.addVehicleObject: engine does not support vehicles");
            return Promise.resolve();
        }

        // VehicleSpec extends VehicleData, so it's assignable to the
        // engine's addVehicle parameter; the engine only sees the
        // pure-data fields.
        this.engine.addVehicle(vehicleUuid, spec, options);

        // Track visual objects for transform dispatch
        if (spec.chassisObject) {
            super.addObject(spec.chassisObjectUuid, 1, CollisionFlag.DYNAMIC, spec.chassisObject);
        }
        for (const wheel of spec.wheels) {
            if (wheel.wheelObject && wheel.wheelObjectUuid) {
                super.addObject(wheel.wheelObjectUuid, 1, CollisionFlag.DYNAMIC, wheel.wheelObject);
            }
        }

        this.vehicleVisualData.set(vehicleUuid, {
            chassisVisualUuid: spec.chassisObjectUuid,
            wheelVisualUuids: spec.wheels.map(w => w.wheelObjectUuid ?? ""),
        });

        return Promise.resolve();
    }

    removeVehicleObject(vehicleUuid: string): void {
        const visualData = this.vehicleVisualData.get(vehicleUuid);
        if (visualData) {
            super.removeObject(visualData.chassisVisualUuid);
            for (const wheelUuid of visualData.wheelVisualUuids) {
                if (wheelUuid) super.removeObject(wheelUuid);
            }
            this.vehicleVisualData.delete(vehicleUuid);
        }

        if (supportsVehicles(this.engine)) {
            this.engine.removeVehicle(vehicleUuid);
        }
    }

    moveVehicleObject(vehicleUuid: string, input: VehicleInput): void {
        if (supportsVehicles(this.engine)) {
            this.engine.setVehicleInput(vehicleUuid, input);
        }
    }

    addCollidableObject(uuid: string): void {
        this.collidableUuids.add(uuid);
    }

    removeCollidableObject(uuid: string): void {
        this.collidableUuids.delete(uuid);
    }

    detectCollisionsForObject(uuid: string, listener: CollisionRegistration, enable: boolean): void {
        if (enable) {
            let arr = this.collisionListeners.get(uuid);
            if (!arr) {
                arr = [];
                this.collisionListeners.set(uuid, arr);
            }
            arr.push(listener);
        } else {
            let arr = this.collisionListeners.get(uuid);
            if (arr) {
                if (listener.id) {
                    arr = arr.filter(l => l.id !== listener.id);
                    this.collisionListeners.set(uuid, arr);
                } else {
                    this.collisionListeners.delete(uuid);
                }
            }
        }
    }

    setCollisionBehavior(uuid: string, behavior: CollisionBehavior): void {
        if (this.engine.hasRigidBody(uuid)) {
            this.engine.setRigidBodyCollisionBehavior(uuid, behavior);
        } else if (this.engine.hasCharacterController(uuid)) {
            this.engine.setCharacterControllerCollisionBehavior(uuid, behavior);
        }
    }

    setCurrentAnimation(/* uuid: string, animation: string */): void {
        // Not implemented
    }

    addOtsShiftVector(): void {
        // Not implemented
    }

    addFixedJoint(
        collisionEnabled: boolean,
        uuidA: string,
        uuidB: string,
        vec3PivotB: Vector3,
        vec4RotationB: QuaternionLike,
    ): void {
        if (!supportsJoints(this.engine)) {
            this.warnJointsUnsupported('addFixedJoint');
            return;
        }
        this.engine.addFixedJoint({
            collisionEnabled,
            uuidA,
            uuidB,
            pivotB: vec3PivotB,
            rotationB: vec4RotationB,
        });
    }

    addHingeJoint(
        collisionEnabled: boolean,
        uuidA: string,
        uuidB: string,
        hingeAxis: Vector3Like,
        relPos: Vector3Like,
        relRotation: QuaternionLike,
        angularLimitEnabled: boolean,
        angularLimit: Vector3Like,
        motorEnabled: boolean,
        motorSpeed: number,
        motorTorque: number,
    ): void {
        if (!supportsJoints(this.engine)) {
            this.warnJointsUnsupported('addHingeJoint');
            return;
        }
        this.engine.addHingeJoint({
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
            motorTorque,
        });
    }

    addPoint2PointJoint(
        collisionEnabled: boolean,
        uuidA: string,
        vec3PivotA: Vector3,
        uuidB: string,
        vec3PivotB: Vector3,
    ): void {
        if (!supportsJoints(this.engine)) {
            this.warnJointsUnsupported('addPoint2PointJoint');
            return;
        }
        this.engine.addPointToPointJoint({
            collisionEnabled,
            uuidA,
            pivotA: vec3PivotA,
            uuidB,
            pivotB: vec3PivotB,
        });
    }

    removeJoint(uuidA: string, uuidB: string): void {
        if (!supportsJoints(this.engine)) {
            this.warnJointsUnsupported('removeJoint');
            return;
        }
        this.engine.removeJoint(uuidA, uuidB);
    }

    private jointsUnsupportedWarned = false;
    private warnJointsUnsupported(method: string): void {
        if (this.jointsUnsupportedWarned) return;
        this.jointsUnsupportedWarned = true;
        console.warn(`LegacyPhysicsAdapter.${method}: engine does not implement JointPhysics — joint calls will be ignored.`);
    }

    private dispatchCollisionEvents(): void {
        for (const { uuid1, uuid2 } of this.contactPairs.values()) {
            this.dispatchCollision(uuid1, uuid2);
        }
    }

    private dispatchCollision(uuid1: string, uuid2: string): void {
        const passes = [
            {
                sourceUuuid: uuid1,
                targetUuid: uuid2,
            },
            {
                sourceUuuid: uuid2,
                targetUuid: uuid1,
            },
        ];

        for (const { sourceUuuid, targetUuid } of passes) {
            const listeners = this.collisionListeners.get(sourceUuuid);
            if (!listeners?.length) {
                continue;
            }

            for (const listener of listeners) {
                switch (listener.type) {
                    case COLLISION_TYPE.WITH_PLAYER:
                        if (!this.players.has(targetUuid)) {
                            continue;
                        }
                        break;
                    
                    case COLLISION_TYPE.WITH_COLLIDABLE_OBJECTS:
                        if (!this.collidableUuids.has(targetUuid)) {
                            continue;
                        }
                        break;
                }

                this.dispatcher.onCollision(sourceUuuid, listener.id);
            }
        }
    }

    private handleCollision(event: CollisionEvent): void {
        const { uuid1, uuid2, started } = event;
        const key = uuid1 <= uuid2 ? `${uuid1}-${uuid2}` : `${uuid2}-${uuid1}`;
        if (started) {
            this.contactPairs.set(key, { uuid1, uuid2 });
            this.applyCharacterPushImpulse(event);
        } else {
            this.contactPairs.delete(key);
        }
    }

    private applyCharacterPushImpulse(event: CollisionEvent): void {
        let characterUuid: string | null = null;
        let rigidBodyUuid: string | null = null;

        if (event.type1 === "characterController" && event.type2 === "rigidBody") {
            characterUuid = event.uuid1;
            rigidBodyUuid = event.uuid2;
        } else if (event.type2 === "characterController" && event.type1 === "rigidBody") {
            characterUuid = event.uuid2;
            rigidBodyUuid = event.uuid1;
        }

        if (!characterUuid || !rigidBodyUuid) {
            return;
        }

        const player = this.players.get(characterUuid);
        if (!player?.pushObjects) {
            return;
        }

        if (this.engine.getRigidBodyType(rigidBodyUuid) !== RigidBodyType.Dynamic) {
            return;
        }

        const playerSpeed = Math.hypot(player.walkVelocity.x, player.walkVelocity.z);
        if (playerSpeed < PUSH_MIN_PLAYER_SPEED) {
            return;
        }

        const rigidBodyPosition = this.engine.getRigidBodyPosition(rigidBodyUuid);
        if (!rigidBodyPosition) {
            return;
        }

        // PRIMARY: player's walk velocity direction
        const pushDirection = new Vector3(player.walkVelocity.x, 0, player.walkVelocity.z);

        // FALLBACK: center-to-center
        if (pushDirection.lengthSq() < PUSH_DIRECTION_EPSILON) {
            const playerPosition = this.engine.getCharacterControllerPosition(characterUuid);
            if (!playerPosition) {
                return;
            }
            pushDirection.set(
                rigidBodyPosition.x - playerPosition.x, 0,
                rigidBodyPosition.z - playerPosition.z,
            );
            if (pushDirection.lengthSq() < PUSH_DIRECTION_EPSILON) {
                return;
            }
        }

        pushDirection.normalize();

        // Relative velocity: don't push objects already moving away
        const targetVel = this.engine.getRigidBodyLinearVelocity(rigidBodyUuid);
        const relSpeed = targetVel
            ? playerSpeed - (targetVel.x * pushDirection.x + targetVel.z * pushDirection.z)
            : playerSpeed;
        if (relSpeed <= 0) {
            return;
        }

        // Read material properties from the target object's userData
        const targetObject = this.getDynamicBodyObject(rigidBodyUuid);
        const physicsData = targetObject?.userData?.physics;
        const friction = Math.max(0, Math.min(1, Number(physicsData?.friction) || 0.5));
        const restitution = Math.max(0, Math.min(1, Number(physicsData?.restitution) || 0.5));
        const contactDamping = Math.max(0, Math.min(1, Number(physicsData?.contactDamping) || 0.2));

        const playerMass = this.getObjectMass(characterUuid);
        const rigidBodyMass = this.getObjectMass(rigidBodyUuid);
        const massRatio = playerMass / Math.max(playerMass + rigidBodyMass, 0.0001);
        const pushImpulseScale = Math.max(0, player.pushImpulse);
        const baseMagnitude = Math.min(PUSH_IMPULSE_MAX, Math.max(PUSH_IMPULSE_MIN, relSpeed * massRatio * PUSH_SPEED_TO_IMPULSE)) * pushImpulseScale;

        // Material damping reduces overall impulse
        const magnitude = baseMagnitude * (1 - contactDamping * PUSH_DAMPING_FACTOR);
        if (magnitude <= 0) {
            return;
        }

        // Bounce from contact normal, scaled by restitution + character vertical scale
        const contactNormal = event.contactNormal;
        const bounceY = contactNormal ? contactNormal.y * magnitude * (restitution + player.pushVerticalScale) : 0;

        const impulse = {
            x: pushDirection.x * magnitude,
            y: bounceY,
            z: pushDirection.z * magnitude,
        };

        // Friction-scaled spin: interpolate between center and contact point
        const contactPoint = event.contactPoint;
        if (contactPoint && friction > PUSH_FRICTION_THRESHOLD) {
            // For Rapier, applyImpulseAtPoint accepts a world-space point
            const worldPoint = {
                x: rigidBodyPosition.x + (contactPoint.x - rigidBodyPosition.x) * friction,
                y: rigidBodyPosition.y + (contactPoint.y - rigidBodyPosition.y) * friction,
                z: rigidBodyPosition.z + (contactPoint.z - rigidBodyPosition.z) * friction,
            };
            this.engine.applyImpulseToRigidBody(rigidBodyUuid, impulse, worldPoint);
        } else {
            this.engine.applyImpulseToRigidBody(rigidBodyUuid, impulse);
        }
    }

    private getObjectMass(uuid: string): number {
        const object = this.getDynamicBodyObject(uuid);
        const rawMass = Number(object?.userData?.physics?.mass);
        return Number.isFinite(rawMass) && rawMass > 0 ? rawMass : 1;
    }

    private pruneContactPairs() {
        // Prune contact pairs where one or both objects have been removed
        for (const [key, { uuid1, uuid2 }] of this.contactPairs) {
            const exists1 = this.engine.hasRigidBody(uuid1) || this.engine.hasCharacterController(uuid1);
            const exists2 = this.engine.hasRigidBody(uuid2) || this.engine.hasCharacterController(uuid2);
            if (!exists1 || !exists2) {
                this.contactPairs.delete(key);
            }
        }
    }

    private simulatePlayerPostStep(uuid: string): void {
        const player = this.players.get(uuid);
        if (!player) {
            console.warn("simulatePlayerPostStep: failed to find player", uuid);
            return;
        }

        // Clear the animation-side jumping flag once the engine reports
        // the character is back on the ground. The engine owns the
        // vertical-velocity state now; we just mirror the landing
        // transition so the dispatcher can gate onGround reporting.
        if (player.isJumping && this.engine.isCharacterControllerOnGround(uuid)) {
            player.isJumping = false;
        }
    }
}
