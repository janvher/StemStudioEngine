import {Object3D} from "three";
import {QuaternionLike, Vector3Like} from "three/webgpu";

import {
    BodyShapeType,
    CollisionBehavior,
    CollisionShape,
    ConcaveHullShape,
    ConvexHullShape,
    FixedJointOptions,
    HeightfieldShape,
    HingeJointOptions,
    PointToPointJointOptions,
    VehicleData,
    VehicleInput,
    VehicleOptions,
} from "../common/types";
import {
    CollisionCallback,
    DEFAULT_RIGID_BODY_COLLISION_GROUP,
    DEFAULT_RIGID_BODY_COLLISION_MASK,
    DEFAULT_STEP_DURATION,
    JointPhysics,
    PhysicsEngine,
    RigidBodyOptions,
    RigidBodyType,
    VehiclePhysics,
} from "../PhysicsEngine";
import {JoltModule} from "./jolt";

type ShapeEntry = {
    shape: any;
    staticOnly: boolean;
    refCount: number;
    removeWhenUnused: boolean;
};

type RigidBodyEntry = {
    bodyId: any;
    type: RigidBodyType;
    shapeUuid: string;
    collisionBehavior: CollisionBehavior;
    collisionGroup: number;
};

type ControllerEntry = {
    character: any;
    shapeUuid: string;
    walkVelocity: {x: number; y: number; z: number};
    onGround: boolean;
    collisionBehavior: CollisionBehavior;

    // Engine-owned vertical velocity (gravity + jump + impulse).
    // walkVelocity carries any caller-supplied motion (including
    // platform carry via its y component).
    gravity: number;
    internalVerticalVelocity: number;
    isJumping: boolean;
};

type VehicleEntry = {
    spec: VehicleData;
    options: VehicleOptions;
    input: VehicleInput;
    bodyId: any;
    ownsBody: boolean;
    bodyShape: any | null;
    bodyBaseShape: any | null;
    constraint: any;
    controller: any;
    collisionTester: any;
    stepListener: any;
    wheelSettings: any;
    wheelSettingItems: any[];
    controllerSettings: any;
    differential: any;
    constraintSettings: any;
    wheelCount: number;
};

type JoltCollisionEvent = {
    bodyId1: number;
    bodyId2: number;
    started: boolean;
};

const OBJECT_LAYER_STATIC = 0;
const OBJECT_LAYER_MOVING = 1;
const NUM_OBJECT_LAYERS = 2;
const NUM_BP_LAYERS = 2;

const RIGID_BODY_TYPE_TO_MOTION_TYPE = {
    [RigidBodyType.Static]: "EMotionType_Static",
    [RigidBodyType.Kinematic]: "EMotionType_Kinematic",
    [RigidBodyType.Dynamic]: "EMotionType_Dynamic",
} as const;

const RIGID_BODY_TYPE_TO_OBJECT_LAYER = {
    [RigidBodyType.Static]: OBJECT_LAYER_STATIC,
    [RigidBodyType.Kinematic]: OBJECT_LAYER_MOVING,
    [RigidBodyType.Dynamic]: OBJECT_LAYER_MOVING,
} as const;

const ROTATION_DOF_BITS = {
    x: "EAllowedDOFs_RotationX",
    y: "EAllowedDOFs_RotationY",
    z: "EAllowedDOFs_RotationZ",
} as const;

export class JoltPhysicsEngine implements PhysicsEngine, VehiclePhysics, JointPhysics {
    stepDuration = DEFAULT_STEP_DURATION;

    private readonly rigidBodies = new Map<string, RigidBodyEntry>();
    private readonly rigidBodyIdsToUuids = new Map<number, string>();
    private readonly collisionObjectToShapeMap = new Map<string, string>();
    private readonly controllers = new Map<string, ControllerEntry>();
    private readonly vehicles = new Map<string, VehicleEntry>();
    private readonly shapeCache = new Map<string, ShapeEntry>();
    private readonly pendingCollisionEvents: JoltCollisionEvent[] = [];
    private readonly jointMap = new Map<string, any>();
    private collisionDisableWarned = false;

    private readonly joltInterface: any;
    private readonly physicsSystem: any;
    private readonly bodyInterface: any;

    private readonly broadPhaseLayerInterface: any;
    private readonly objectLayerPairFilter: any;
    private readonly objectVsBroadPhaseLayerFilter: any;

    private readonly dynamicBroadPhaseLayerFilter: any;
    private readonly dynamicObjectLayerFilter: any;
    private readonly bodyFilter: any;
    private readonly shapeFilter: any;

    private readonly extendedUpdateSettings: any;
    private readonly contactListener: any;
    private readonly groupFilter: any;

    private paused = false;
    private corrupted = false;

    // Cached JS-side gravity. Reading it back from the Jolt physics system
    // round-trips through Float32 (e.g. -9.81 → -9.8100004196167); callers
    // expect the original value, so we keep our own copy.
    private gravity: number;

    constructor(
        readonly jolt: JoltModule,
        gravity: number,
    ) {
        this.gravity = gravity;
        this.objectLayerPairFilter = new this.jolt.ObjectLayerPairFilterTable(NUM_OBJECT_LAYERS);
        for (let i = 0; i < NUM_OBJECT_LAYERS; i++) {
            for (let k = 0; k < NUM_OBJECT_LAYERS; k++) {
                this.objectLayerPairFilter.EnableCollision(i, k);
            }
        }

        this.broadPhaseLayerInterface = new this.jolt.BroadPhaseLayerInterfaceTable(NUM_OBJECT_LAYERS, NUM_BP_LAYERS);
        this.broadPhaseLayerInterface.MapObjectToBroadPhaseLayer(
            OBJECT_LAYER_STATIC,
            new this.jolt.BroadPhaseLayer(OBJECT_LAYER_STATIC),
        );
        this.broadPhaseLayerInterface.MapObjectToBroadPhaseLayer(
            OBJECT_LAYER_MOVING,
            new this.jolt.BroadPhaseLayer(OBJECT_LAYER_MOVING),
        );

        this.objectVsBroadPhaseLayerFilter = new this.jolt.ObjectVsBroadPhaseLayerFilterTable(
            this.broadPhaseLayerInterface,
            NUM_BP_LAYERS,
            this.objectLayerPairFilter,
            NUM_OBJECT_LAYERS,
        );

        const settings = new this.jolt.JoltSettings();
        settings.mMaxBodies = 20480;
        settings.mMaxBodyPairs = 20480;
        settings.mMaxContactConstraints = 2048;
        settings.mBroadPhaseLayerInterface = this.broadPhaseLayerInterface;
        settings.mObjectLayerPairFilter = this.objectLayerPairFilter;
        settings.mObjectVsBroadPhaseLayerFilter = this.objectVsBroadPhaseLayerFilter;

        this.joltInterface = new this.jolt.JoltInterface(settings);
        this.physicsSystem = this.joltInterface.GetPhysicsSystem();
        this.bodyInterface = this.physicsSystem.GetBodyInterface();

        const gravityVec = new this.jolt.Vec3(0, gravity, 0);
        this.physicsSystem.SetGravity(gravityVec);
        this.jolt.destroy(gravityVec);

        this.dynamicBroadPhaseLayerFilter = new this.jolt.DefaultBroadPhaseLayerFilter(
            this.objectVsBroadPhaseLayerFilter,
            OBJECT_LAYER_MOVING,
        );
        this.dynamicObjectLayerFilter = new this.jolt.DefaultObjectLayerFilter(
            this.objectLayerPairFilter,
            OBJECT_LAYER_MOVING,
        );
        this.bodyFilter = new this.jolt.BodyFilter();
        this.shapeFilter = new this.jolt.ShapeFilter();

        this.extendedUpdateSettings = new this.jolt.ExtendedUpdateSettings();

        this.groupFilter = new this.jolt.GroupFilterTable(32);
        for (let i = 0; i < 32; i++) {
            for (let k = 0; k < 32; k++) {
                this.groupFilter.EnableCollision(i, k);
            }
        }

        this.contactListener = new this.jolt.ContactListenerJS();
        this.contactListener.OnContactValidate = () => this.jolt.ValidateResult_AcceptAllContactsForThisBodyPair;
        this.contactListener.OnContactAdded = (inBody1: number, inBody2: number) => {
            this.pushCollisionEvent(inBody1, inBody2, true);
        };
        this.contactListener.OnContactPersisted = () => {};
        this.contactListener.OnContactRemoved = (inSubShapePair: number) => {
            try {
                const pair = this.jolt.wrapPointer(inSubShapePair, this.jolt.SubShapeIDPair);
                const body1 = pair.GetBody1ID();
                const body2 = pair.GetBody2ID();
                this.pendingCollisionEvents.push({
                    bodyId1: body1.GetIndexAndSequenceNumber(),
                    bodyId2: body2.GetIndexAndSequenceNumber(),
                    started: false,
                });
            } catch {
                // Ignore malformed callback payloads.
            }
        };
        this.physicsSystem.SetContactListener(this.contactListener);

        this.jolt.destroy(settings);
    }

    dispose(): void {
        this.rigidBodies.clear();
        this.rigidBodyIdsToUuids.clear();
        this.collisionObjectToShapeMap.clear();

        for (const joint of this.jointMap.values()) {
            try { this.physicsSystem.RemoveConstraint(joint); } catch { /* already removed */ }
            try { joint.Release?.(); } catch { /* already released */ }
        }
        this.jointMap.clear();

        for (const controller of this.controllers.values()) {
            this.jolt.destroy(controller.character);
        }
        this.controllers.clear();

        for (const vehicleUuid of this.vehicles.keys()) {
            this.removeVehicle(vehicleUuid);
        }

        for (const shapeEntry of this.shapeCache.values()) {
            try {
                shapeEntry.shape?.Release?.();
            } catch { /* already released */ }
            try {
                this.jolt.destroy(shapeEntry.shape);
            } catch { /* already destroyed */ }
        }
        this.shapeCache.clear();

        this.jolt.destroy(this.extendedUpdateSettings);
        this.jolt.destroy(this.dynamicBroadPhaseLayerFilter);
        this.jolt.destroy(this.dynamicObjectLayerFilter);
        this.jolt.destroy(this.bodyFilter);
        this.jolt.destroy(this.shapeFilter);

        this.jolt.destroy(this.contactListener);

        this.jolt.destroy(this.groupFilter);
        this.jolt.destroy(this.joltInterface);
        this.jolt.destroy(this.objectVsBroadPhaseLayerFilter);
        this.jolt.destroy(this.objectLayerPairFilter);
        this.jolt.destroy(this.broadPhaseLayerInterface);
    }

    getGravity(): number {
        return this.gravity;
    }

    /**
     * Tears down all bodies, controllers, vehicles, and shapes in the engine
     * without destroying the JoltInterface itself, then re-applies the given
     * gravity and resets transient flags. Intended for test suites that share
     * a single engine across cases — destroying the JoltInterface corrupts
     * the shared WASM heap, but per-body destroys are safe.
     *
     * @param gravity - Gravity value to apply after the reset.
     */
    resetForTest(gravity: number): void {
        try {
            for (const uuid of Array.from(this.vehicleUuids())) {
                this.removeVehicle(uuid);
            }
            for (const uuid of Array.from(this.characterControllerUuids())) {
                this.removeCharacterController(uuid);
            }
            for (const uuid of Array.from(this.rigidBodyUuids())) {
                this.removeRigidBody(uuid);
            }
            // Force-release any shapes the per-body removes left behind (e.g. shapes
            // added directly via addShape with no body attached, or with stuck refcounts).
            for (const uuid of Array.from(this.shapeCache.keys())) {
                const entry = this.shapeCache.get(uuid);
                if (!entry) continue;
                entry.refCount = 0;
                this.removeShape(uuid);
            }
            this.pendingCollisionEvents.length = 0;
            this.paused = false;
            this.corrupted = false;
            this.stepDuration = DEFAULT_STEP_DURATION;

            const gravityVec = new this.jolt.Vec3(0, gravity, 0);
            this.physicsSystem.SetGravity(gravityVec);
            this.jolt.destroy(gravityVec);
            this.gravity = gravity;
        } catch (e) {
            console.warn("Jolt: resetForTest failed, engine WASM state may be corrupted", e);
        }
    }

    simulate(onCollision?: CollisionCallback): void {
        if (this.paused || this.corrupted) {
            return;
        }

        for (const vehicle of this.vehicles.values()) {
            this.applyVehicleInput(vehicle);
        }

        try {
            this.joltInterface.Step(this.stepDuration, 1);
        } catch (e) {
            console.error("Jolt: Step crashed, pausing physics", e);
            this.paused = true;
            return;
        }

        const gravity = this.physicsSystem.GetGravity();
        for (const controller of this.controllers.values()) {
            controller.internalVerticalVelocity += controller.gravity * this.stepDuration;

            const effectiveX = controller.walkVelocity.x;
            const effectiveY = controller.walkVelocity.y + controller.internalVerticalVelocity;
            const effectiveZ = controller.walkVelocity.z;

            // Capture pre-step Y so we can diff actual vertical motion
            // and reconcile internalVerticalVelocity if Jolt clamped our
            // requested movement (e.g., hit a ceiling while jumping).
            const prePos = controller.character.GetPosition();
            const preY = prePos.GetY();

            const velocity = new this.jolt.Vec3(effectiveX, effectiveY, effectiveZ);
            controller.character.SetLinearVelocity(velocity);
            controller.character.ExtendedUpdate(
                this.stepDuration,
                gravity,
                this.extendedUpdateSettings,
                this.dynamicBroadPhaseLayerFilter,
                this.dynamicObjectLayerFilter,
                this.bodyFilter,
                this.shapeFilter,
                this.joltInterface.GetTempAllocator(),
            );

            const groundState = controller.character.GetGroundState();
            controller.onGround = groundState === this.jolt.EGroundState_OnGround;

            const postPos = controller.character.GetPosition();
            const actualVy = (postPos.GetY() - preY) / this.stepDuration;
            const actualInternalVy = actualVy - controller.walkVelocity.y;
            if (controller.internalVerticalVelocity > actualInternalVy) {
                controller.internalVerticalVelocity = actualInternalVy;
            }

            // Reset engine-owned vertical velocity on landing.
            if (controller.onGround && controller.internalVerticalVelocity <= 0) {
                controller.internalVerticalVelocity = 0;
                controller.isJumping = false;
            }

            this.jolt.destroy(velocity);
        }

        if (onCollision && this.pendingCollisionEvents.length > 0) {
            const emitted = new Set<string>();
            for (const event of this.pendingCollisionEvents) {
                const uuid1 = this.rigidBodyIdsToUuids.get(event.bodyId1);
                const uuid2 = this.rigidBodyIdsToUuids.get(event.bodyId2);
                if (!uuid1 || !uuid2) {
                    continue;
                }

                const body1 = this.rigidBodies.get(uuid1);
                const body2 = this.rigidBodies.get(uuid2);
                if (!body1 || !body2) {
                    continue;
                }

                const eventKey = `${uuid1}|${uuid2}|${event.started ? "1" : "0"}`;
                if (emitted.has(eventKey)) {
                    continue;
                }
                emitted.add(eventKey);

                onCollision({
                    type1: "rigidBody",
                    uuid1,
                    group1: body1.collisionGroup,
                    type2: "rigidBody",
                    uuid2,
                    group2: body2.collisionGroup,
                    started: event.started,
                });
            }
        }

        this.pendingCollisionEvents.length = 0;
    }

    pause(): void {
        this.paused = true;
    }

    resume(): void {
        this.paused = false;
    }

    addRigidBody(uuid: string, shapeUuid: string, type: RigidBodyType, options?: RigidBodyOptions): void {
        if (this.corrupted || this.rigidBodies.has(uuid)) {
            return;
        }

        const shapeEntry = this.shapeCache.get(shapeUuid);
        if (!shapeEntry) {
            if (shapeUuid.startsWith("terrain-hf-")) {
                console.warn(`[Jolt:addRigidBody] heightfield shape not found: ${shapeUuid} (shape was likely not created)`);
            }
            return;
        }

        // Some shapes (e.g. mesh/concave) are static-only in Jolt.
        // If such a shape is requested as dynamic/kinematic, force static
        // to avoid undefined behavior in body creation.
        const effectiveType = shapeEntry.staticOnly ? RigidBodyType.Static : type;

        const motionType = this.jolt[RIGID_BODY_TYPE_TO_MOTION_TYPE[effectiveType]];
        const objectLayer = RIGID_BODY_TYPE_TO_OBJECT_LAYER[effectiveType];

        const pos = options?.position;
        const rot = options?.quaternion;
        const position = new this.jolt.RVec3(pos?.x ?? 0, pos?.y ?? 0, pos?.z ?? 0);
        const rotation = new this.jolt.Quat(rot?.x ?? 0, rot?.y ?? 0, rot?.z ?? 0, rot?.w ?? 1);
        const settings = new this.jolt.BodyCreationSettings(
            shapeEntry.shape,
            position,
            rotation,
            motionType,
            objectLayer,
        );

        settings.mFriction = options?.friction ?? 0.5;
        settings.mRestitution = options?.restitution ?? 0.5;
        settings.mLinearDamping = options?.linearDamping ?? 0;
        settings.mAngularDamping = options?.angularDamping ?? 0;

        const mass = options?.mass ?? 0;
        if (type === RigidBodyType.Dynamic && mass > 0) {
            settings.mMassPropertiesOverride.mMass = mass;
            settings.mOverrideMassProperties = this.jolt.EOverrideMassProperties_CalculateInertia;
        }

        const collisionGroup = options?.collisionGroup ?? DEFAULT_RIGID_BODY_COLLISION_GROUP;
        const collisionMask = options?.collisionMask ?? DEFAULT_RIGID_BODY_COLLISION_MASK;
        // Wiring collisionMask (default 0xFFFF) into CollisionGroup.subGroupID
        // falls outside our 32-subgroup GroupFilterTable and makes Jolt reject
        // every contact pair. Only attach mCollisionGroup when the caller wants
        // non-default filtering; the default (collide with everything) leaves
        // mCollisionGroup unset. Our API's group+bitmask semantics don't map
        // cleanly onto Jolt's groupID+subGroupID+GroupFilter anyway — proper
        // mask-based filtering probably needs per-mask object layers, not
        // CollisionGroup.
        if (collisionGroup !== DEFAULT_RIGID_BODY_COLLISION_GROUP || collisionMask !== DEFAULT_RIGID_BODY_COLLISION_MASK) {
            const group = new this.jolt.CollisionGroup(this.groupFilter, collisionGroup, collisionMask);
            settings.mCollisionGroup = group;
        }

        const activationMode =
            effectiveType === RigidBodyType.Static
                ? this.jolt.EActivation_DontActivate
                : this.jolt.EActivation_Activate;

        let body: any;
        try {
            body = this.bodyInterface.CreateBody(settings);
        } catch (e) {
            this.jolt.destroy(settings);
            this.jolt.destroy(rotation);
            this.jolt.destroy(position);
            console.warn("Jolt: CreateBody crashed for", uuid, e);
            return;
        }
        this.jolt.destroy(settings);
        this.jolt.destroy(rotation);
        this.jolt.destroy(position);

        if (!body || body.GetID().GetIndexAndSequenceNumber() === 0xffffffff) {
            console.warn("Jolt: failed to create body for", uuid, "(max bodies reached?)");
            return;
        }

        const bodyId = body.GetID();
        this.bodyInterface.AddBody(bodyId, activationMode);

        const idNumber = bodyId.GetIndexAndSequenceNumber();
        this.rigidBodies.set(uuid, {
            bodyId,
            type: effectiveType,
            shapeUuid,
            collisionBehavior: CollisionBehavior.Regular,
            collisionGroup,
        });
        this.rigidBodyIdsToUuids.set(idNumber, uuid);
        this.collisionObjectToShapeMap.set(uuid, shapeUuid);
        shapeEntry.refCount++;
    }

    removeRigidBody(uuid: string): void {
        const entry = this.rigidBodies.get(uuid);
        if (!entry) {
            return;
        }

        const idNumber = entry.bodyId.GetIndexAndSequenceNumber();

        if (!this.corrupted && idNumber !== 0xffffffff) {
            try {
                const lockInterface = this.physicsSystem.GetBodyLockInterfaceNoLock();
                const body = lockInterface.TryGetBody(entry.bodyId);
                if (body) {
                    if (this.bodyInterface.IsAdded(entry.bodyId)) {
                        this.bodyInterface.RemoveBody(entry.bodyId);
                    }
                    this.bodyInterface.DestroyBody(entry.bodyId);
                }
            } catch (e) {
                console.error("Jolt: WASM corrupted during body destruction", uuid, e);
                this.corrupted = true;
            }
        }

        if (!this.corrupted) {
            try {
                this.releaseShape(entry.shapeUuid);
            } catch (e) {
                console.error("Jolt: WASM corrupted during shape release", uuid, e);
                this.corrupted = true;
            }
        }

        this.rigidBodyIdsToUuids.delete(idNumber);
        this.collisionObjectToShapeMap.delete(uuid);
        this.rigidBodies.delete(uuid);
    }

    hasRigidBody(uuid: string): boolean {
        return this.rigidBodies.has(uuid) || this.vehicles.has(uuid);
    }

    private getBodyId(uuid: string): any | null {
        const entry = this.rigidBodies.get(uuid);
        if (entry) {
            return entry.bodyId;
        }
        const vehicle = this.vehicles.get(uuid);
        if (vehicle) {
            return vehicle.bodyId;
        }
        return null;
    }

    *rigidBodyUuids(): IterableIterator<string> {
        for (const uuid of this.rigidBodies.keys()) {
            yield uuid;
        }
    }

    applyImpulseToRigidBody(uuid: string, impulse: Vector3Like, relativePosition?: Vector3Like): void {
        const bodyId = this.getBodyId(uuid);
        if (!bodyId) {
            return;
        }

        const impulseVec = new this.jolt.Vec3(impulse.x, impulse.y, impulse.z);
        if (relativePosition) {
            const p = new this.jolt.RVec3(relativePosition.x, relativePosition.y, relativePosition.z);
            this.bodyInterface.AddImpulse(bodyId, impulseVec, p);
            this.jolt.destroy(p);
        } else {
            this.bodyInterface.AddImpulse(bodyId, impulseVec);
        }
        this.jolt.destroy(impulseVec);
    }

    getRigidBodyLinearVelocity(uuid: string): Vector3Like | null {
        const bodyId = this.getBodyId(uuid);
        if (!bodyId) {
            return null;
        }
        const v = this.bodyInterface.GetLinearVelocity(bodyId);
        return {x: v.GetX(), y: v.GetY(), z: v.GetZ()};
    }

    getRigidBodyAngularVelocity(uuid: string): Vector3Like | null {
        const bodyId = this.getBodyId(uuid);
        if (!bodyId) {
            return null;
        }
        const v = this.bodyInterface.GetAngularVelocity(bodyId);
        return {x: v.GetX(), y: v.GetY(), z: v.GetZ()};
    }

    getRigidBodyPosition(uuid: string): Vector3Like | null {
        const bodyId = this.getBodyId(uuid);
        if (!bodyId) {
            return null;
        }
        const p = this.bodyInterface.GetPosition(bodyId);
        return {x: p.GetX(), y: p.GetY(), z: p.GetZ()};
    }

    getRigidBodyRotation(uuid: string): QuaternionLike | null {
        const bodyId = this.getBodyId(uuid);
        if (!bodyId) {
            return null;
        }
        const q = this.bodyInterface.GetRotation(bodyId);
        return {x: q.GetX(), y: q.GetY(), z: q.GetZ(), w: q.GetW()};
    }

    getRigidBodyShapeUuid(uuid: string): string | null {
        return this.collisionObjectToShapeMap.get(uuid) ?? null;
    }

    getRigidBodyType(uuid: string): RigidBodyType | null {
        return this.rigidBodies.get(uuid)?.type ?? null;
    }

    setRigidBodyCollisionBehavior(uuid: string, behavior: CollisionBehavior): void {
        const bodyId = this.getBodyId(uuid);
        if (!bodyId) {
            return;
        }
        if (this.rigidBodies.has(uuid)) {
            this.rigidBodies.get(uuid)!.collisionBehavior = behavior;
        }
        this.bodyInterface.SetIsSensor(bodyId, behavior === CollisionBehavior.Ghost);
    }

    setRigidBodyCollisionMasks(uuid: string, collisionGroup: number, collisionMask: number): void {
        const bodyId = this.getBodyId(uuid);
        if (!bodyId) {
            return;
        }

        const group = new this.jolt.CollisionGroup(this.groupFilter, collisionGroup, collisionMask);
        this.bodyInterface.SetCollisionGroup(bodyId, group);
        if (this.rigidBodies.has(uuid)) {
            this.rigidBodies.get(uuid)!.collisionGroup = collisionGroup;
        }
        this.jolt.destroy(group);
    }

    setRigidBodyAngularVelocity(uuid: string, velocity: Vector3Like): void {
        const bodyId = this.getBodyId(uuid);
        if (!bodyId) {
            return;
        }
        const v = new this.jolt.Vec3(velocity.x, velocity.y, velocity.z);
        this.bodyInterface.SetAngularVelocity(bodyId, v);
        this.jolt.destroy(v);
    }

    setRigidBodyLinearVelocity(uuid: string, velocity: Vector3Like): void {
        const bodyId = this.getBodyId(uuid);
        if (!bodyId) {
            return;
        }
        const v = new this.jolt.Vec3(velocity.x, velocity.y, velocity.z);
        this.bodyInterface.SetLinearVelocity(bodyId, v);
        this.jolt.destroy(v);
    }

    setRigidBodyPosition(uuid: string, position: Vector3Like): void {
        const bodyId = this.getBodyId(uuid);
        if (!bodyId) {
            return;
        }
        const p = new this.jolt.RVec3(position.x, position.y, position.z);
        this.bodyInterface.SetPosition(bodyId, p, this.jolt.EActivation_Activate);
        this.jolt.destroy(p);
    }

    setRigidBodyRotation(uuid: string, quaternion: QuaternionLike): void {
        const bodyId = this.getBodyId(uuid);
        if (!bodyId) {
            return;
        }
        const q = new this.jolt.Quat(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        this.bodyInterface.SetRotation(bodyId, q, this.jolt.EActivation_Activate);
        this.jolt.destroy(q);
    }

    setRigidBodyLinearDamping(uuid: string, damping: number): void {
        const bodyId = this.getBodyId(uuid);
        if (!bodyId) {
            return;
        }
        const body = this.getBody(bodyId);
        if (body) {
            body.GetMotionProperties().SetLinearDamping(damping);
        }
    }

    setRigidBodyAngularDamping(uuid: string, damping: number): void {
        const bodyId = this.getBodyId(uuid);
        if (!bodyId) {
            return;
        }
        const body = this.getBody(bodyId);
        if (body) {
            body.GetMotionProperties().SetAngularDamping(damping);
        }
    }

    setRigidBodyRotationLock(uuid: string, lock: {x: boolean; y: boolean; z: boolean}): void {
        const bodyId = this.getBodyId(uuid);
        if (!bodyId) {
            return;
        }
        let dofs = this.jolt.EAllowedDOFs_All;
        if (lock.x) dofs &= ~this.jolt[ROTATION_DOF_BITS.x];
        if (lock.y) dofs &= ~this.jolt[ROTATION_DOF_BITS.y];
        if (lock.z) dofs &= ~this.jolt[ROTATION_DOF_BITS.z];

        const body = this.getBody(bodyId);
        if (body) {
            const settings = body.GetBodyCreationSettings();
            body.GetMotionProperties().SetMassProperties(dofs, settings.mMassPropertiesOverride);
            this.jolt.destroy(settings);
        }
    }

    setRigidBodyScale(uuid: string, scale: Vector3Like): void {
        const entry = this.rigidBodies.get(uuid);
        if (!entry) {
            return;
        }
        const currentShape = this.bodyInterface.GetShape(entry.bodyId);
        const scaleVec = new this.jolt.Vec3(scale.x, scale.y, scale.z);
        const scaledShape = new this.jolt.ScaledShape(currentShape, scaleVec);
        this.bodyInterface.SetShape(entry.bodyId, scaledShape, true, this.jolt.EActivation_Activate);
        this.jolt.destroy(scaleVec);
    }

    setRigidBodyShape(uuid: string, newShapeUuid: string): void {
        const entry = this.rigidBodies.get(uuid);
        const shapeEntry = this.shapeCache.get(newShapeUuid);
        if (!entry || !shapeEntry) {
            return;
        }

        this.bodyInterface.SetShape(entry.bodyId, shapeEntry.shape, true, this.jolt.EActivation_Activate);
        this.releaseShape(entry.shapeUuid);
        shapeEntry.refCount++;
        entry.shapeUuid = newShapeUuid;
        this.collisionObjectToShapeMap.set(uuid, newShapeUuid);
    }

    addShape(uuid: string, collisionShape: CollisionShape): void {
        if (this.shapeCache.has(uuid)) {
            return;
        }

        const shape = this.createShape(collisionShape);
        if (!shape) {
            return;
        }

        this.shapeCache.set(uuid, {
            shape,
            staticOnly: collisionShape.type === BodyShapeType.CONCAVE_HULL || collisionShape.type === BodyShapeType.HEIGHTFIELD,
            refCount: 0,
            removeWhenUnused: false,
        });
    }

    removeShape(uuid: string): void {
        const shapeEntry = this.shapeCache.get(uuid);
        if (!shapeEntry) {
            return;
        }

        if (shapeEntry.refCount > 0) {
            shapeEntry.removeWhenUnused = true;
            return;
        }

        try {
            // Release decrements refcount; when it hits 0, Jolt frees internally.
            // Do NOT call jolt.destroy() after Release — it's a double-free.
            shapeEntry.shape.Release?.();
        } catch (e) {
            console.warn("Jolt: failed to release shape", uuid, e);
        }
        this.shapeCache.delete(uuid);
    }

    hasShape(uuid: string): boolean {
        return this.shapeCache.has(uuid);
    }

    addCharacterController(uuid: string, shapeUuid: string): void {
        if (this.controllers.has(uuid)) {
            return;
        }

        const shapeEntry = this.shapeCache.get(shapeUuid);
        if (!shapeEntry) {
            return;
        }

        const settings = new this.jolt.CharacterVirtualSettings();
        settings.mShape = shapeEntry.shape;
        settings.mInnerBodyShape = shapeEntry.shape;
        settings.mInnerBodyLayer = OBJECT_LAYER_MOVING;

        const pos = new this.jolt.RVec3(0, 0, 0);
        const rot = new this.jolt.Quat(0, 0, 0, 1);
        const character = new this.jolt.CharacterVirtual(settings, pos, rot, this.physicsSystem);

        this.controllers.set(uuid, {
            character,
            shapeUuid,
            walkVelocity: {x: 0, y: 0, z: 0},
            onGround: false,
            collisionBehavior: CollisionBehavior.Regular,
            gravity: this.getGravity(),
            internalVerticalVelocity: 0,
            isJumping: false,
        });

        shapeEntry.refCount++;

        this.jolt.destroy(rot);
        this.jolt.destroy(pos);
        this.jolt.destroy(settings);
    }

    removeCharacterController(uuid: string): void {
        const entry = this.controllers.get(uuid);
        if (!entry) {
            return;
        }

        this.releaseShape(entry.shapeUuid);
        this.jolt.destroy(entry.character);
        this.controllers.delete(uuid);
    }

    hasCharacterController(uuid: string): boolean {
        return this.controllers.has(uuid);
    }

    *characterControllerUuids(): IterableIterator<string> {
        for (const uuid of this.controllers.keys()) {
            yield uuid;
        }
    }

    getCharacterControllerLinearVelocity(uuid: string): Vector3Like | null {
        const entry = this.controllers.get(uuid);
        if (!entry) {
            return null;
        }
        const v = entry.character.GetLinearVelocity();
        return {x: v.GetX(), y: v.GetY(), z: v.GetZ()};
    }

    getCharacterControllerPosition(uuid: string): Vector3Like | null {
        const entry = this.controllers.get(uuid);
        if (!entry) {
            return null;
        }
        const p = entry.character.GetPosition();
        return {x: p.GetX(), y: p.GetY(), z: p.GetZ()};
    }

    getCharacterControllerRotation(uuid: string): QuaternionLike | null {
        const entry = this.controllers.get(uuid);
        if (!entry) {
            return null;
        }
        const q = entry.character.GetRotation();
        return {x: q.GetX(), y: q.GetY(), z: q.GetZ(), w: q.GetW()};
    }

    isCharacterControllerOnGround(uuid: string): boolean {
        return this.controllers.get(uuid)?.onGround ?? false;
    }

    setCharacterControllerCollisionBehavior(uuid: string, behavior: CollisionBehavior): void {
        const entry = this.controllers.get(uuid);
        if (!entry) {
            return;
        }
        entry.collisionBehavior = behavior;
    }

    setCharacterControllerMaxSlope(uuid: string, maxSlope: number): void {
        const entry = this.controllers.get(uuid);
        if (!entry) {
            return;
        }
        entry.character.SetMaxSlopeAngle(maxSlope);
    }

    setCharacterControllerPosition(uuid: string, position: Vector3Like): void {
        const entry = this.controllers.get(uuid);
        if (!entry) {
            return;
        }
        const p = new this.jolt.RVec3(position.x, position.y, position.z);
        entry.character.SetPosition(p);
        this.jolt.destroy(p);
    }

    setCharacterControllerRotation(uuid: string, quaternion: QuaternionLike): void {
        const entry = this.controllers.get(uuid);
        if (!entry) {
            return;
        }
        const q = new this.jolt.Quat(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        entry.character.SetRotation(q);
        this.jolt.destroy(q);
    }

    setCharacterControllerStepHeight(_uuid: string, stepHeight: number): void {
        const stepUp = new this.jolt.Vec3(0, stepHeight, 0);
        this.extendedUpdateSettings.mWalkStairsStepUp = stepUp;
    }

    setCharacterControllerGravity(uuid: string, gravity: Vector3Like): void {
        const entry = this.controllers.get(uuid);
        if (!entry) return;
        entry.gravity = gravity.y;
    }

    setCharacterControllerWalkVelocity(uuid: string, velocity: Vector3Like): void {
        const entry = this.controllers.get(uuid);
        if (!entry) return;
        entry.walkVelocity.x = velocity.x;
        entry.walkVelocity.y = velocity.y;
        entry.walkVelocity.z = velocity.z;
    }

    jumpCharacterController(uuid: string, jumpSpeed: number): boolean {
        const entry = this.controllers.get(uuid);
        if (!entry) return false;
        if (!entry.onGround || entry.isJumping) return false;
        entry.internalVerticalVelocity += jumpSpeed;
        entry.isJumping = true;
        return true;
    }

    applyImpulseToCharacterController(uuid: string, impulse: Vector3Like): void {
        const entry = this.controllers.get(uuid);
        if (!entry) return;
        entry.internalVerticalVelocity += impulse.y;
    }

    addVehicle(vehicleUuid: string, spec: VehicleData, options: VehicleOptions): void {
        if (this.vehicles.has(vehicleUuid)) {
            return;
        }
        if (!spec.wheels.length) {
            return;
        }

        let chassisBodyId: any;
        let ownsBody = false;
        let bodyShape: any | null = null;
        let bodyBaseShape: any | null = null;

        const chassisEntry = this.rigidBodies.get(spec.chassisObjectUuid);
        if (chassisEntry) {
            chassisBodyId = chassisEntry.bodyId;
        } else {
            const halfExtents = spec.chassis.halfExtents;
            const centerOffset = spec.chassis.centerOffset;
            const initial = spec.chassis.initialTransform;

            const halfExtentVec = new this.jolt.Vec3(
                Math.max(0.1, halfExtents.x),
                Math.max(0.05, halfExtents.y),
                Math.max(0.1, halfExtents.z),
            );
            bodyBaseShape = new this.jolt.BoxShape(halfExtentVec);
            this.jolt.destroy(halfExtentVec);

            if (centerOffset.x !== 0 || centerOffset.y !== 0 || centerOffset.z !== 0) {
                const offset = new this.jolt.Vec3(centerOffset.x, centerOffset.y, centerOffset.z);
                bodyShape = new this.jolt.OffsetCenterOfMassShape(bodyBaseShape, offset);
                this.jolt.destroy(offset);
            } else {
                bodyShape = bodyBaseShape;
            }

            const position = new this.jolt.RVec3(initial.position.x, initial.position.y, initial.position.z);
            const rotation = new this.jolt.Quat(
                initial.quaternion.x,
                initial.quaternion.y,
                initial.quaternion.z,
                initial.quaternion.w,
            );
            const settings = new this.jolt.BodyCreationSettings(
                bodyShape,
                position,
                rotation,
                this.jolt.EMotionType_Dynamic,
                OBJECT_LAYER_MOVING,
            );

            settings.mLinearDamping = 0;
            settings.mAngularDamping = 0;
            settings.mFriction = 0.8;
            settings.mMassPropertiesOverride.mMass = Math.max(1, options.mass ?? 800);
            settings.mOverrideMassProperties = this.jolt.EOverrideMassProperties_CalculateInertia;

            chassisBodyId = this.bodyInterface.CreateAndAddBody(settings, this.jolt.EActivation_Activate);
            ownsBody = true;

            this.jolt.destroy(settings);
            this.jolt.destroy(rotation);
            this.jolt.destroy(position);
        }

        const chassisBody = this.getBody(chassisBodyId);
        if (!chassisBody) {
            if (ownsBody) {
                if (this.bodyInterface.IsAdded(chassisBodyId)) {
                    this.bodyInterface.RemoveBody(chassisBodyId);
                }
                this.bodyInterface.DestroyBody(chassisBodyId);
                if (bodyShape && bodyShape !== bodyBaseShape) {
                    bodyShape.Release?.();
                    this.jolt.destroy(bodyShape);
                }
                bodyBaseShape?.Release?.();
                if (bodyBaseShape) {
                    this.jolt.destroy(bodyBaseShape);
                }
            }
            return;
        }

        const wheelSettings = new this.jolt.ArrayWheelSettings();
        const maxSteerAngle = options.maxSteerAngle ?? 0.5;
        const suspensionRestLength = Math.max(0.01, options.suspensionRestLength ?? 0.6);
        const minSuspensionLength = Math.max(0, suspensionRestLength * 0.2);
        const maxSuspensionLength = Math.max(minSuspensionLength + 0.01, suspensionRestLength * 2.0);

        for (let i = 0; i < spec.wheels.length; i++) {
            const wheel = spec.wheels[i]!;
            const ws = new this.jolt.WheelSettingsWV();

            ws.mPosition = new this.jolt.Vec3(wheel.connection.x, wheel.connection.y, wheel.connection.z);
            ws.mSuspensionDirection = new this.jolt.Vec3(0, -1, 0);
            ws.mSteeringAxis = new this.jolt.Vec3(0, 1, 0);
            ws.mWheelUp = new this.jolt.Vec3(0, 1, 0);
            ws.mWheelForward = new this.jolt.Vec3(0, 0, 1);
            ws.mRadius = Math.max(0.05, wheel.radius);
            ws.mWidth = Math.max(0.05, wheel.width);

            ws.mSuspensionMinLength = minSuspensionLength;
            ws.mSuspensionMaxLength = maxSuspensionLength;
            ws.mSuspensionPreloadLength = suspensionRestLength;

            ws.mSuspensionSpring.mFrequency = Math.max(0.1, options.suspensionStiffness ?? 2);
            ws.mSuspensionSpring.mDamping = Math.max(0, options.suspensionDamping ?? 0.5);

            ws.mMaxSteerAngle = wheel.isFront ? maxSteerAngle : 0;
            ws.mMaxBrakeTorque = Math.max(0, options.maxBrakeForce ?? 0);
            ws.mMaxHandBrakeTorque = wheel.isFront ? 0 : Math.max(0, options.maxBrakeForce ?? 0);
            ws.mAngularDamping = Math.max(0, options.suspensionCompression ?? 0.5);
            ws.mInertia = Math.max(0.05, (options.mass ?? 800) * wheel.radius * wheel.radius * 0.015);

            ws.mLongitudinalFriction.Clear();
            ws.mLateralFriction.Clear();
            ws.mLongitudinalFriction.AddPoint(0, Math.max(0.1, options.wheelFriction ?? 1.2));
            ws.mLongitudinalFriction.AddPoint(1, Math.max(0.1, options.wheelFriction ?? 1.2));
            ws.mLateralFriction.AddPoint(0, Math.max(0.1, options.wheelFriction ?? 1.2));
            ws.mLateralFriction.AddPoint(1, Math.max(0.1, options.wheelFriction ?? 1.2));

            wheelSettings.push_back(ws);
        }

        const controllerSettings = new this.jolt.WheeledVehicleControllerSettings();
        controllerSettings.mEngine.mMaxTorque = Math.max(1, options.maxEngineForce ?? 0);
        controllerSettings.mTransmission.mMode = this.jolt.ETransmissionMode_Auto;
        controllerSettings.mTransmission.mGearRatios.clear();
        controllerSettings.mTransmission.mGearRatios.push_back(3.2);
        controllerSettings.mTransmission.mGearRatios.push_back(2.1);
        controllerSettings.mTransmission.mGearRatios.push_back(1.4);
        controllerSettings.mTransmission.mGearRatios.push_back(1.0);
        controllerSettings.mTransmission.mReverseGearRatios.clear();
        controllerSettings.mTransmission.mReverseGearRatios.push_back(-3.0);

        const differential = new this.jolt.VehicleDifferentialSettings();
        differential.mLeftWheel = 0;
        differential.mRightWheel = spec.wheels.length > 1 ? 1 : 0;
        differential.mDifferentialRatio = 1;
        differential.mLeftRightSplit = 0.5;
        differential.mLimitedSlipRatio = 1.4;
        differential.mEngineTorqueRatio = 1;
        controllerSettings.mDifferentials.push_back(differential);

        const constraintSettings = new this.jolt.VehicleConstraintSettings();
        constraintSettings.mUp = new this.jolt.Vec3(0, 1, 0);
        constraintSettings.mForward = new this.jolt.Vec3(0, 0, 1);
        constraintSettings.mMaxPitchRollAngle = Math.max(0.05, Math.PI * 0.5 * (1 - (options.rollInfluence ?? 0.1)));
        constraintSettings.mWheels = wheelSettings;
        constraintSettings.mController = controllerSettings;

        const constraint = new this.jolt.VehicleConstraint(chassisBody, constraintSettings);
        const collisionTester = new this.jolt.VehicleCollisionTesterRay(OBJECT_LAYER_STATIC);
        constraint.SetVehicleCollisionTester(collisionTester);
        this.physicsSystem.AddConstraint(constraint);

        const stepListener = new this.jolt.VehicleConstraintStepListener(constraint);
        this.physicsSystem.AddStepListener(stepListener);

        const controller = this.jolt.castObject(constraint.GetController(), this.jolt.WheeledVehicleController);

        this.vehicles.set(vehicleUuid, {
            spec,
            options,
            input: {throttle: 0, steer: 0, brake: 0},
            bodyId: chassisBodyId,
            ownsBody,
            bodyShape,
            bodyBaseShape,
            constraint,
            controller,
            collisionTester,
            stepListener,
            wheelSettings,
            wheelSettingItems: Array.from({length: spec.wheels.length}, (_, i) => wheelSettings.at(i)),
            controllerSettings,
            differential,
            constraintSettings,
            wheelCount: spec.wheels.length,
        });
    }

    removeVehicle(vehicleUuid: string): void {
        const vehicle = this.vehicles.get(vehicleUuid);
        if (!vehicle) {
            return;
        }

        this.physicsSystem.RemoveStepListener(vehicle.stepListener);
        this.jolt.destroy(vehicle.stepListener);

        // Refcounted Jolt objects (Constraint / ConstraintSettings / WheelSettings /
        // CollisionTester / Shape) free internally when their refcount reaches zero.
        // Calling jolt.destroy() on them double-frees and corrupts the WASM heap.
        this.physicsSystem.RemoveConstraint(vehicle.constraint);
        vehicle.constraint.Release?.();

        vehicle.collisionTester.Release?.();

        vehicle.constraintSettings.Release?.();
        for (const wheelSetting of vehicle.wheelSettingItems) {
            wheelSetting.Release?.();
        }
        // ArrayWheelSettings, WheeledVehicleControllerSettings, and
        // VehicleDifferentialSettings are not refcounted — destroy them directly.
        this.jolt.destroy(vehicle.wheelSettings);
        this.jolt.destroy(vehicle.controllerSettings);
        this.jolt.destroy(vehicle.differential);

        if (vehicle.ownsBody) {
            if (this.bodyInterface.IsAdded(vehicle.bodyId)) {
                this.bodyInterface.RemoveBody(vehicle.bodyId);
            }
            this.bodyInterface.DestroyBody(vehicle.bodyId);

            if (vehicle.bodyShape && vehicle.bodyShape !== vehicle.bodyBaseShape) {
                vehicle.bodyShape.Release?.();
            }
            vehicle.bodyBaseShape?.Release?.();
        }

        this.vehicles.delete(vehicleUuid);
    }

    hasVehicle(vehicleUuid: string): boolean {
        return this.vehicles.has(vehicleUuid);
    }

    *vehicleUuids(): IterableIterator<string> {
        for (const uuid of this.vehicles.keys()) {
            yield uuid;
        }
    }

    setVehicleInput(vehicleUuid: string, input: VehicleInput): void {
        const vehicle = this.vehicles.get(vehicleUuid);
        if (!vehicle) {
            return;
        }
        vehicle.input = input;
        this.applyVehicleInput(vehicle);
    }

    getVehicleChassisPosition(vehicleUuid: string): Vector3Like | null {
        const vehicle = this.vehicles.get(vehicleUuid);
        if (!vehicle) {
            return null;
        }
        const p = this.bodyInterface.GetPosition(vehicle.bodyId);
        return {x: p.GetX(), y: p.GetY(), z: p.GetZ()};
    }

    getVehicleChassisRotation(vehicleUuid: string): QuaternionLike | null {
        const vehicle = this.vehicles.get(vehicleUuid);
        if (!vehicle) {
            return null;
        }
        const q = this.bodyInterface.GetRotation(vehicle.bodyId);
        return {x: q.GetX(), y: q.GetY(), z: q.GetZ(), w: q.GetW()};
    }

    getVehicleWheelTransform(
        vehicleUuid: string,
        wheelIndex: number,
    ): {position: Vector3Like; rotation: QuaternionLike} | null {
        const vehicle = this.vehicles.get(vehicleUuid);
        if (!vehicle || wheelIndex < 0 || wheelIndex >= vehicle.wheelCount) {
            return null;
        }

        const wheelRight = new this.jolt.Vec3(1, 0, 0);
        const wheelUp = new this.jolt.Vec3(0, 1, 0);
        const transform = vehicle.constraint.GetWheelWorldTransform(wheelIndex, wheelRight, wheelUp);

        const p = transform.GetTranslation();
        const q = transform.GetQuaternion();

        const result = {
            position: {x: p.GetX(), y: p.GetY(), z: p.GetZ()},
            rotation: {x: q.GetX(), y: q.GetY(), z: q.GetZ(), w: q.GetW()},
        };

        this.jolt.destroy(transform);
        this.jolt.destroy(wheelUp);
        this.jolt.destroy(wheelRight);

        return result;
    }

    getVehicleWheelCount(vehicleUuid: string): number {
        const vehicle = this.vehicles.get(vehicleUuid);
        return vehicle?.wheelCount ?? 0;
    }

    initDebug(): Object3D | null {
        return null;
    }

    private getBody(bodyId: any): any | null {
        const body = this.physicsSystem.GetBodyLockInterfaceNoLock?.().TryGetBody?.(bodyId);
        return body ?? null;
    }

    private pushCollisionEvent(inBodyPtr1: number, inBodyPtr2: number, started: boolean): void {
        try {
            const body1 = this.jolt.wrapPointer(inBodyPtr1, this.jolt.Body);
            const body2 = this.jolt.wrapPointer(inBodyPtr2, this.jolt.Body);
            const bodyId1 = body1.GetID().GetIndexAndSequenceNumber();
            const bodyId2 = body2.GetID().GetIndexAndSequenceNumber();
            this.pendingCollisionEvents.push({bodyId1, bodyId2, started});
        } catch {
            // Ignore malformed callback payloads.
        }
    }

    private createShape(collisionShape: CollisionShape): any | null {
        switch (collisionShape.type) {
            case BodyShapeType.BOX: {
                const halfExtent = new this.jolt.Vec3(
                    collisionShape.width / 2,
                    collisionShape.height / 2,
                    collisionShape.length / 2,
                );
                const shape = new this.jolt.BoxShape(halfExtent);
                this.jolt.destroy(halfExtent);
                return shape;
            }
            case BodyShapeType.SPHERE:
                return new this.jolt.SphereShape(collisionShape.radius);
            case BodyShapeType.CAPSULE:
                return new this.jolt.CapsuleShape(collisionShape.height / 2, collisionShape.radius);
            case BodyShapeType.CONVEX_HULL:
                return this.createConvexHullShape(collisionShape);
            case BodyShapeType.CONCAVE_HULL:
                return this.createConcaveHullShape(collisionShape);
            case BodyShapeType.HEIGHTFIELD:
                return this.createHeightFieldShape(collisionShape);
            default:
                return null;
        }
    }

    private createConvexHullShape(collisionShape: ConvexHullShape): any | null {
        const settings = new this.jolt.ConvexHullShapeSettings();
        const points = settings.mPoints;
        const vertices = collisionShape.vertices;
        for (let i = 0; i < vertices.length; i += 3) {
            const p = new this.jolt.Vec3(vertices[i] ?? 0, vertices[i + 1] ?? 0, vertices[i + 2] ?? 0);
            points.push_back(p);
            this.jolt.destroy(p);
        }

        const result = settings.Create();
        if (!result.IsValid()) {
            this.jolt.destroy(result);
            this.jolt.destroy(settings);
            return null;
        }

        const shape = result.Get();
        shape.AddRef?.();
        this.jolt.destroy(result);
        this.jolt.destroy(settings);
        return shape;
    }

    private createConcaveHullShape(collisionShape: ConcaveHullShape): any | null {
        // Memory guard: skip shape creation when WASM heap is nearly full
        // to prevent "memory access out of bounds" crashes.
        try {
            const freeMemory = (this.jolt as any).sGetFreeMemory?.();
            if (typeof freeMemory === "number" && freeMemory < 8 * 1024 * 1024) {
                console.warn("Jolt: skipping concave hull shape — WASM free memory below 8MB:", freeMemory);
                return null;
            }
        } catch { /* sGetFreeMemory may not exist in all builds */ }

        // Use the indexed-vertex MeshShapeSettings overload to avoid allocating
        // a Triangle + 3 Vec3 per face on the WASM heap (which caused OOM on
        // terrain with many chunks).
        const vertexList = new this.jolt.VertexList();
        const indexedTriangles = new this.jolt.IndexedTriangleList();
        const materials = new this.jolt.PhysicsMaterialList();

        let vertexOffset = 0;
        for (let meshIndex = 0; meshIndex < collisionShape.vertices.length; meshIndex++) {
            const meshVertices = collisionShape.vertices[meshIndex] ?? [];
            const meshIndices = collisionShape.indexes[meshIndex] ?? [];
            const numVerts = Math.floor(meshVertices.length / 3);

            // Push vertices as Float3
            vertexList.reserve(vertexList.size() + numVerts);
            const f3 = new this.jolt.Float3(0, 0, 0);
            for (let v = 0; v < numVerts; v++) {
                const base = v * 3;
                f3.x = meshVertices[base] ?? 0;
                f3.y = meshVertices[base + 1] ?? 0;
                f3.z = meshVertices[base + 2] ?? 0;
                vertexList.push_back(f3);
            }
            this.jolt.destroy(f3);

            // Push indexed triangles using the constructor overload
            const numTris = Math.floor(meshIndices.length / 3);
            indexedTriangles.reserve(indexedTriangles.size() + numTris);
            for (let i = 0; i < numTris; i++) {
                const base = i * 3;
                const tri = new this.jolt.IndexedTriangle(
                    (meshIndices[base] ?? 0) + vertexOffset,
                    (meshIndices[base + 1] ?? 0) + vertexOffset,
                    (meshIndices[base + 2] ?? 0) + vertexOffset,
                    0, // materialIndex
                );
                indexedTriangles.push_back(tri);
                this.jolt.destroy(tri);
            }

            vertexOffset += numVerts;
        }

        const settings = new this.jolt.MeshShapeSettings(vertexList, indexedTriangles, materials);
        const result = settings.Create();
        if (!result.IsValid()) {
            this.jolt.destroy(result);
            this.jolt.destroy(settings);
            this.jolt.destroy(vertexList);
            this.jolt.destroy(indexedTriangles);
            this.jolt.destroy(materials);
            return null;
        }

        const shape = result.Get();
        shape.AddRef?.();
        this.jolt.destroy(result);
        this.jolt.destroy(settings);
        this.jolt.destroy(vertexList);
        this.jolt.destroy(indexedTriangles);
        this.jolt.destroy(materials);
        return shape;
    }

    private createHeightFieldShape(collisionShape: HeightfieldShape): any | null {
        const { sampleCount, heightSamples, offset, scale } = collisionShape;

        // Validate power-of-2 + 1 (Jolt requirement)
        const isPow2Plus1 = Number.isInteger(sampleCount) && sampleCount >= 3 && ((sampleCount - 1) & (sampleCount - 2)) === 0;
        if (!isPow2Plus1 || heightSamples.length !== sampleCount * sampleCount) {
            console.warn(`[Jolt] invalid heightfield: sampleCount=${sampleCount} samples=${heightSamples.length}`);
            return null;
        }

        // Memory guard: skip when WASM heap is nearly full.
        try {
            const freeMemory = (this.jolt as any).sGetFreeMemory?.();
            if (typeof freeMemory === "number" && freeMemory < 8 * 1024 * 1024) {
                console.warn("[Jolt] skipping heightfield — WASM free memory below 8MB");
                return null;
            }
        } catch { /* sGetFreeMemory may not exist in all builds */ }

        const settings = new this.jolt.HeightFieldShapeSettings();
        settings.mSampleCount = sampleCount;

        // Emscripten: getter returns a copy, so create new array and assign back.
        const samples = new this.jolt.ArrayFloat();
        samples.reserve(heightSamples.length);
        for (let i = 0; i < heightSamples.length; i++) {
            samples.push_back(heightSamples[i]!);
        }
        settings.mHeightSamples = samples;

        // Vec3 property assignments are owned by settings — do NOT destroy them separately.
        settings.mOffset = new this.jolt.Vec3(offset.x, offset.y, offset.z);
        settings.mScale = new this.jolt.Vec3(scale.x, scale.y, scale.z);

        let result: any;
        try {
            result = settings.Create();
        } catch (e) {
            console.warn("[Jolt] heightfield Create() failed", e);
            this.jolt.destroy(settings);
            return null;
        }

        if (!result.IsValid()) {
            try {
                const err = result.GetError();
                console.warn("[Jolt] heightfield invalid:", err?.c_str?.() ?? err);
            } catch { /* ignore */ }
            this.jolt.destroy(result);
            this.jolt.destroy(settings);
            return null;
        }

        const shape = result.Get();
        shape.AddRef?.();
        this.jolt.destroy(result);
        this.jolt.destroy(settings);
        return shape;
    }

    private releaseShape(shapeUuid: string): void {
        const shapeEntry = this.shapeCache.get(shapeUuid);
        if (!shapeEntry) {
            return;
        }

        shapeEntry.refCount = Math.max(0, shapeEntry.refCount - 1);
        if (shapeEntry.refCount === 0 && shapeEntry.removeWhenUnused) {
            try {
                shapeEntry.shape.Release?.();
            } catch (e) {
                console.warn("Jolt: failed to release shape", shapeUuid, e);
            }
            this.shapeCache.delete(shapeUuid);
        }
    }

    private applyVehicleInput(vehicle: VehicleEntry): void {
        const throttle = this.applyDeadzone(vehicle.input.throttle, vehicle.options.throttleDeadzone);
        const steer = this.applyDeadzone(vehicle.input.steer, vehicle.options.steerDeadzone);
        const brake = Math.max(0, Math.min(1, vehicle.input.brake));
        const handBrake = brake > 0.95 ? brake : 0;

        vehicle.controller.SetDriverInput(
            Math.max(-1, Math.min(1, throttle)),
            Math.max(-1, Math.min(1, steer)),
            brake,
            handBrake,
        );
    }

    private applyDeadzone(value: number, deadzone?: number): number {
        if (!deadzone || deadzone <= 0) {
            return value;
        }
        return Math.abs(value) < deadzone ? 0 : value;
    }

    // ========================================================================
    // Joint methods (Jolt constraints)
    // ========================================================================

    addFixedJoint(options: FixedJointOptions): void {
        const { collisionEnabled, uuidA, uuidB } = options;
        const bodyA = this.getBodyByUuid(uuidA);
        const bodyB = this.getBodyByUuid(uuidB);
        if (!bodyA || !bodyB) {
            console.warn("JoltPhysicsEngine.addFixedJoint: rigid body not found", uuidA, uuidB);
            return;
        }

        // World position of the joint anchor (A's origin). Jolt's
        // FixedConstraint in WorldSpace derives both body frames from
        // this anchor, so options.pivotB / options.rotationB are
        // implicit in each body's current world transform.
        const anchorWorld = bodyA.GetPosition();
        const ax = anchorWorld.GetX(), ay = anchorWorld.GetY(), az = anchorWorld.GetZ();

        const settings: any = new this.jolt.FixedConstraintSettings();
        settings.mSpace = this.jolt.EConstraintSpace_WorldSpace;
        const point1 = new this.jolt.Vec3(ax, ay, az);
        settings.mPoint1 = point1;
        settings.mPoint2 = point1;

        const constraint = settings.Create(bodyA, bodyB);
        this.jolt.destroy(settings);
        this.jolt.destroy(point1);

        this.physicsSystem.AddConstraint(constraint);
        this.jointMap.set(this.getJointKey(uuidA, uuidB), constraint);

        if (!collisionEnabled) this.warnCollisionDisableUnsupported();
    }

    addHingeJoint(options: HingeJointOptions): void {
        const {
            collisionEnabled, uuidA, uuidB,
            hingeAxis,
            angularLimitEnabled, angularLimit,
            motorEnabled, motorSpeed, motorTorque,
        } = options;
        const bodyA = this.getBodyByUuid(uuidA);
        const bodyB = this.getBodyByUuid(uuidB);
        if (!bodyA || !bodyB) {
            console.warn("JoltPhysicsEngine.addHingeJoint: rigid body not found", uuidA, uuidB);
            return;
        }

        const anchorWorld = bodyA.GetPosition();
        const ax = anchorWorld.GetX(), ay = anchorWorld.GetY(), az = anchorWorld.GetZ();

        // Hinge axis in world space = bodyA's world rotation × hingeAxis.
        // options.relPos / options.relRotation are implicit in each
        // body's current world transform under EConstraintSpace_WorldSpace.
        const aRot = bodyA.GetRotation();
        const worldAxis = rotateByJoltQuat(aRot, hingeAxis);
        const worldNormal = perpendicular(worldAxis);

        const settings: any = new this.jolt.HingeConstraintSettings();
        settings.mSpace = this.jolt.EConstraintSpace_WorldSpace;
        const point = new this.jolt.Vec3(ax, ay, az);
        const axisVec = new this.jolt.Vec3(worldAxis.x, worldAxis.y, worldAxis.z);
        const normalVec = new this.jolt.Vec3(worldNormal.x, worldNormal.y, worldNormal.z);
        settings.mPoint1 = point;
        settings.mPoint2 = point;
        settings.mHingeAxis1 = axisVec;
        settings.mHingeAxis2 = axisVec;
        settings.mNormalAxis1 = normalVec;
        settings.mNormalAxis2 = normalVec;

        if (angularLimitEnabled) {
            settings.mLimitsMin = angularLimit.x * Math.PI / 180;
            settings.mLimitsMax = angularLimit.y * Math.PI / 180;
        }

        if (motorEnabled) {
            settings.mMotorSettings.mMaxTorqueLimit = motorTorque;
        }

        const constraint: any = settings.Create(bodyA, bodyB);
        this.jolt.destroy(settings);
        this.jolt.destroy(point);
        this.jolt.destroy(axisVec);
        this.jolt.destroy(normalVec);

        this.physicsSystem.AddConstraint(constraint);

        if (motorEnabled) {
            try {
                constraint.SetMotorState?.(this.jolt.EMotorState_Velocity);
                constraint.SetTargetAngularVelocity?.(motorSpeed);
            } catch { /* motor API unavailable on this constraint type */ }
        }

        this.jointMap.set(this.getJointKey(uuidA, uuidB), constraint);

        if (!collisionEnabled) this.warnCollisionDisableUnsupported();
    }

    addPointToPointJoint(options: PointToPointJointOptions): void {
        const { collisionEnabled, uuidA, uuidB, pivotA, pivotB } = options;
        const bodyA = this.getBodyByUuid(uuidA);
        const bodyB = this.getBodyByUuid(uuidB);
        if (!bodyA || !bodyB) {
            console.warn("JoltPhysicsEngine.addPointToPointJoint: rigid body not found", uuidA, uuidB);
            return;
        }

        const settings: any = new this.jolt.PointConstraintSettings();
        settings.mSpace = this.jolt.EConstraintSpace_LocalToBodyCOM;
        const p1 = new this.jolt.Vec3(pivotA.x, pivotA.y, pivotA.z);
        const p2 = new this.jolt.Vec3(pivotB.x, pivotB.y, pivotB.z);
        settings.mPoint1 = p1;
        settings.mPoint2 = p2;

        const constraint = settings.Create(bodyA, bodyB);
        this.jolt.destroy(settings);
        this.jolt.destroy(p1);
        this.jolt.destroy(p2);

        this.physicsSystem.AddConstraint(constraint);
        this.jointMap.set(this.getJointKey(uuidA, uuidB), constraint);

        if (!collisionEnabled) this.warnCollisionDisableUnsupported();
    }

    removeJoint(uuidA: string, uuidB: string): void {
        const key = this.getJointKey(uuidA, uuidB);
        const constraint = this.jointMap.get(key);
        if (!constraint) return;
        try { this.physicsSystem.RemoveConstraint(constraint); } catch { /* already removed */ }
        try { constraint.Release?.(); } catch { /* already released */ }
        this.jointMap.delete(key);
    }

    private getJointKey(uuidA: string, uuidB: string): string {
        return uuidA < uuidB ? `${uuidA}:${uuidB}` : `${uuidB}:${uuidA}`;
    }

    private getBodyByUuid(uuid: string): any | null {
        const entry = this.rigidBodies.get(uuid);
        if (!entry) return null;
        try {
            return this.physicsSystem.GetBodyLockInterfaceNoLock?.().TryGetBody?.(entry.bodyId) ?? null;
        } catch {
            return null;
        }
    }

    private warnCollisionDisableUnsupported(): void {
        if (this.collisionDisableWarned) return;
        this.collisionDisableWarned = true;
        console.warn(
            "JoltPhysicsEngine: collisionEnabled=false on joints is not yet " +
            "implemented; jointed bodies will continue to collide. See " +
            "docs/physics/README.md.",
        );
    }
}

/** Rotate a Vector3-like by a Jolt `Quat` (no allocation on JS side). */
function rotateByJoltQuat(q: any, v: Vector3Like): Vector3Like {
    const qx = q.GetX(), qy = q.GetY(), qz = q.GetZ(), qw = q.GetW();
    const vx = v.x, vy = v.y, vz = v.z;
    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);
    return {
        x: vx + qw * tx + (qy * tz - qz * ty),
        y: vy + qw * ty + (qz * tx - qx * tz),
        z: vz + qw * tz + (qx * ty - qy * tx),
    };
}

/** A unit vector perpendicular to the input. Used as the Hinge's normal axis. */
function perpendicular(v: Vector3Like): Vector3Like {
    const ax = Math.abs(v.x), ay = Math.abs(v.y), az = Math.abs(v.z);
    let rx: number, ry: number, rz: number;
    if (ax <= ay && ax <= az) { rx = 0; ry = -v.z; rz = v.y; }
    else if (ay <= az)        { rx = -v.z; ry = 0; rz = v.x; }
    else                       { rx = -v.y; ry = v.x; rz = 0; }
    const len = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
    return { x: rx / len, y: ry / len, z: rz / len };
}
