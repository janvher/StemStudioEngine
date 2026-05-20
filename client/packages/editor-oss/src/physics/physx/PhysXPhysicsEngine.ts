import {QuaternionLike, Vector3Like} from "three/webgpu";

import {
    BodyShapeType,
    CollisionBehavior,
    CollisionShape,
    ConcaveHullShape,
    ConvexHullShape,
    FixedJointOptions,
    HingeJointOptions,
    PointToPointJointOptions,
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
} from "../PhysicsEngine";
import {PhysXModule} from "./physx";

type ShapeEntry = {
    geometry: any;
    material: any;
    staticOnly: boolean;
    refCount: number;
    removeWhenUnused: boolean;
};

type RigidBodyEntry = {
    actor: any;
    type: RigidBodyType;
    shapeUuid: string;
    collisionBehavior: CollisionBehavior;
    collisionGroup: number;
    collisionMask: number;
};

type ControllerEntry = {
    controller: any;
    shapeUuid: string;
    walkVelocity: {x: number; y: number; z: number};
    onGround: boolean;
    collisionBehavior: CollisionBehavior;
    maxSlope: number;
    stepHeight: number;

    // Engine-owned vertical velocity (gravity + jump + impulse).
    // walkVelocity carries any caller-supplied motion (including
    // platform carry via its y component).
    gravity: number;
    internalVerticalVelocity: number;
    isJumping: boolean;
};

type PhysXCollisionEvent = {
    uuid1: string;
    uuid2: string;
    started: boolean;
};

export class PhysXPhysicsEngine implements PhysicsEngine, JointPhysics {
    stepDuration = DEFAULT_STEP_DURATION;

    private readonly rigidBodies = new Map<string, RigidBodyEntry>();
    private readonly actorToUuid = new Map<number, string>();
    private readonly collisionObjectToShapeMap = new Map<string, string>();
    private readonly controllers = new Map<string, ControllerEntry>();
    private readonly shapeCache = new Map<string, ShapeEntry>();
    private readonly pendingCollisionEvents: PhysXCollisionEvent[] = [];
    private readonly jointMap = new Map<string, any>();

    private readonly physics: any;
    private readonly scene: any;
    private readonly cookingParams: any;
    private readonly controllerManager: any;
    private readonly defaultMaterial: any;
    private readonly foundation: any;

    private paused = false;
    private gravity: number;

    constructor(
        private readonly PhysX: PhysXModule,
        gravity: number,
    ) {
        this.gravity = gravity;

        const version = (PhysX as any).PHYSICS_VERSION;
        const allocator = new (PhysX as any).PxDefaultAllocator();
        const errorCallback = new (PhysX as any).PxDefaultErrorCallback();
        this.foundation = (PhysX as any).CreateFoundation(version, allocator, errorCallback);

        const tolerances = new (PhysX as any).PxTolerancesScale();
        this.physics = (PhysX as any).CreatePhysics(version, this.foundation, tolerances);

        this.cookingParams = new (PhysX as any).PxCookingParams(tolerances);

        this.defaultMaterial = this.physics.createMaterial(0.5, 0.5, 0.5);

        const sceneDesc = new (PhysX as any).PxSceneDesc(tolerances);
        sceneDesc.set_gravity(new (PhysX as any).PxVec3(0, gravity, 0));
        sceneDesc.set_cpuDispatcher((PhysX as any).DefaultCpuDispatcherCreate(0));
        sceneDesc.set_filterShader((PhysX as any).DefaultFilterShader());
        this.scene = this.physics.createScene(sceneDesc);

        this.controllerManager = (PhysX as any).CreateControllerManager(this.scene);
    }

    dispose(): void {
        for (const joint of this.jointMap.values()) {
            joint.release?.();
        }
        this.jointMap.clear();

        for (const entry of this.controllers.values()) {
            entry.controller.release();
        }
        this.controllers.clear();

        for (const entry of this.rigidBodies.values()) {
            this.scene.removeActor(entry.actor);
            entry.actor.release();
        }
        this.rigidBodies.clear();
        this.actorToUuid.clear();
        this.collisionObjectToShapeMap.clear();

        for (const shapeEntry of this.shapeCache.values()) {
            shapeEntry.geometry?.release?.();
        }
        this.shapeCache.clear();

        this.controllerManager?.release?.();
        this.scene?.release?.();
        this.cookingParams?.delete?.();
        this.physics?.release?.();
        this.foundation?.release?.();
    }

    getGravity(): number {
        return this.gravity;
    }

    simulate(onCollision?: CollisionCallback): void {
        if (this.paused) {
            return;
        }

        try {
            this.scene.simulate(this.stepDuration);
            this.scene.fetchResults(true);
        } catch (e) {
            console.error("PhysX: simulate crashed, pausing physics", e);
            this.paused = true;
            return;
        }

        // Update character controllers
        for (const entry of this.controllers.values()) {
            entry.internalVerticalVelocity += entry.gravity * this.stepDuration;

            const effectiveX = entry.walkVelocity.x;
            const effectiveY = entry.walkVelocity.y + entry.internalVerticalVelocity;
            const effectiveZ = entry.walkVelocity.z;

            const prePos = entry.controller.getPosition();
            const preY = prePos.get_y();

            const disp = new (this.PhysX as any).PxVec3(
                effectiveX * this.stepDuration,
                effectiveY * this.stepDuration,
                effectiveZ * this.stepDuration,
            );
            const flags = entry.controller.move(disp, 0.001, this.stepDuration, null);
            entry.onGround = (flags.isSet)?.((this.PhysX as any).PxControllerCollisionFlag.eCOLLISION_DOWN) ?? false;

            // Clamp internalVerticalVelocity DOWN toward actual vertical
            // motion — only shrinking. Catches the ceiling case without
            // interfering with penetration correction / platform carry.
            const postY = entry.controller.getPosition().get_y();
            const actualVy = (postY - preY) / this.stepDuration;
            const actualInternalVy = actualVy - entry.walkVelocity.y;
            if (entry.internalVerticalVelocity > actualInternalVy) {
                entry.internalVerticalVelocity = actualInternalVy;
            }

            // Reset engine-owned vertical velocity on landing.
            if (entry.onGround && entry.internalVerticalVelocity <= 0) {
                entry.internalVerticalVelocity = 0;
                entry.isJumping = false;
            }
        }

        if (onCollision && this.pendingCollisionEvents.length > 0) {
            for (const event of this.pendingCollisionEvents) {
                const body1 = this.rigidBodies.get(event.uuid1);
                const body2 = this.rigidBodies.get(event.uuid2);
                if (!body1 || !body2) continue;

                onCollision({
                    type1: "rigidBody",
                    uuid1: event.uuid1,
                    group1: body1.collisionGroup,
                    type2: "rigidBody",
                    uuid2: event.uuid2,
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
        if (this.rigidBodies.has(uuid)) return;

        const shapeEntry = this.shapeCache.get(shapeUuid);
        if (!shapeEntry) return;

        const effectiveType = shapeEntry.staticOnly ? RigidBodyType.Static : type;
        const PX = this.PhysX as any;

        const transform = new PX.PxTransform(new PX.PxVec3(0, 0, 0), new PX.PxQuat(0, 0, 0, 1));

        let actor: any;
        const friction = options?.friction ?? 0.5;
        const restitution = options?.restitution ?? 0.5;
        const material = this.physics.createMaterial(friction, friction, restitution);
        const shape = this.physics.createShape(shapeEntry.geometry, material, true);

        if (effectiveType === RigidBodyType.Static) {
            actor = this.physics.createRigidStatic(transform);
        } else {
            actor = this.physics.createRigidDynamic(transform);
            if (effectiveType === RigidBodyType.Kinematic) {
                actor.setRigidBodyFlag(PX.PxRigidBodyFlag.eKINEMATIC, true);
            }
            const mass = options?.mass ?? 1;
            if (mass > 0) {
                PX.PxRigidBodyExt.prototype.setMassAndUpdateInertia(actor, mass);
            }
            actor.setLinearDamping(options?.linearDamping ?? 0);
            actor.setAngularDamping(options?.angularDamping ?? 0);
        }

        actor.attachShape(shape);
        shape.release();
        this.scene.addActor(actor);

        const collisionGroup = options?.collisionGroup ?? DEFAULT_RIGID_BODY_COLLISION_GROUP;
        const collisionMask = options?.collisionMask ?? DEFAULT_RIGID_BODY_COLLISION_MASK;

        const ptr = PX.getPointer(actor);
        this.rigidBodies.set(uuid, {
            actor,
            type: effectiveType,
            shapeUuid,
            collisionBehavior: CollisionBehavior.Regular,
            collisionGroup,
            collisionMask,
        });
        this.actorToUuid.set(ptr, uuid);
        this.collisionObjectToShapeMap.set(uuid, shapeUuid);
        shapeEntry.refCount++;
    }

    removeRigidBody(uuid: string): void {
        const entry = this.rigidBodies.get(uuid);
        if (!entry) return;

        const PX = this.PhysX as any;
        const ptr = PX.getPointer(entry.actor);

        this.scene.removeActor(entry.actor);
        entry.actor.release();

        this.releaseShape(entry.shapeUuid);
        this.actorToUuid.delete(ptr);
        this.collisionObjectToShapeMap.delete(uuid);
        this.rigidBodies.delete(uuid);
    }

    hasRigidBody(uuid: string): boolean {
        return this.rigidBodies.has(uuid);
    }

    *rigidBodyUuids(): IterableIterator<string> {
        yield* this.rigidBodies.keys();
    }

    applyImpulseToRigidBody(uuid: string, impulse: Vector3Like, relativePosition?: Vector3Like): void {
        const entry = this.rigidBodies.get(uuid);
        if (!entry || entry.type === RigidBodyType.Static) return;

        const PX = this.PhysX as any;
        const impulseVec = new PX.PxVec3(impulse.x, impulse.y, impulse.z);
        if (relativePosition) {
            const pos = new PX.PxVec3(relativePosition.x, relativePosition.y, relativePosition.z);
            PX.PxRigidBodyExt.prototype.addForceAtLocalPos(entry.actor, impulseVec, pos, PX.PxForceMode.eIMPULSE);
        } else {
            entry.actor.addForce(impulseVec, PX.PxForceMode.eIMPULSE);
        }
    }

    getRigidBodyLinearVelocity(uuid: string): Vector3Like | null {
        const entry = this.rigidBodies.get(uuid);
        if (!entry || entry.type === RigidBodyType.Static) return null;
        const v = entry.actor.getLinearVelocity();
        return {x: v.get_x(), y: v.get_y(), z: v.get_z()};
    }

    getRigidBodyAngularVelocity(uuid: string): Vector3Like | null {
        const entry = this.rigidBodies.get(uuid);
        if (!entry || entry.type === RigidBodyType.Static) return null;
        const v = entry.actor.getAngularVelocity();
        return {x: v.get_x(), y: v.get_y(), z: v.get_z()};
    }

    getRigidBodyPosition(uuid: string): Vector3Like | null {
        const entry = this.rigidBodies.get(uuid);
        if (!entry) return null;
        const t = entry.actor.getGlobalPose();
        const p = t.get_p();
        return {x: p.get_x(), y: p.get_y(), z: p.get_z()};
    }

    getRigidBodyRotation(uuid: string): QuaternionLike | null {
        const entry = this.rigidBodies.get(uuid);
        if (!entry) return null;
        const t = entry.actor.getGlobalPose();
        const q = t.get_q();
        return {x: q.get_x(), y: q.get_y(), z: q.get_z(), w: q.get_w()};
    }

    getRigidBodyShapeUuid(uuid: string): string | null {
        return this.collisionObjectToShapeMap.get(uuid) ?? null;
    }

    getRigidBodyType(uuid: string): RigidBodyType | null {
        return this.rigidBodies.get(uuid)?.type ?? null;
    }

    setRigidBodyCollisionBehavior(uuid: string, behavior: CollisionBehavior): void {
        const entry = this.rigidBodies.get(uuid);
        if (!entry) return;
        entry.collisionBehavior = behavior;
        // PhysX uses shape flags for triggers
        const shapes = entry.actor.getShapes();
        if (shapes && shapes.size() > 0) {
            const shape = shapes.get(0);
            const PX = this.PhysX as any;
            if (behavior === CollisionBehavior.Ghost) {
                shape.setFlag(PX.PxShapeFlag.eSIMULATION_SHAPE, false);
                shape.setFlag(PX.PxShapeFlag.eTRIGGER_SHAPE, true);
            } else {
                shape.setFlag(PX.PxShapeFlag.eTRIGGER_SHAPE, false);
                shape.setFlag(PX.PxShapeFlag.eSIMULATION_SHAPE, true);
            }
        }
    }

    setRigidBodyCollisionMasks(uuid: string, collisionGroup: number, collisionMask: number): void {
        const entry = this.rigidBodies.get(uuid);
        if (!entry) return;
        entry.collisionGroup = collisionGroup;
        entry.collisionMask = collisionMask;
        // PhysX collision filtering is set via PxFilterData on shapes
        const PX = this.PhysX as any;
        const filterData = new PX.PxFilterData(collisionGroup, collisionMask, 0, 0);
        const shapes = entry.actor.getShapes();
        if (shapes && shapes.size() > 0) {
            shapes.get(0).setSimulationFilterData(filterData);
        }
    }

    setRigidBodyAngularVelocity(uuid: string, velocity: Vector3Like): void {
        const entry = this.rigidBodies.get(uuid);
        if (!entry || entry.type === RigidBodyType.Static) return;
        const PX = this.PhysX as any;
        entry.actor.setAngularVelocity(new PX.PxVec3(velocity.x, velocity.y, velocity.z));
    }

    setRigidBodyLinearVelocity(uuid: string, velocity: Vector3Like): void {
        const entry = this.rigidBodies.get(uuid);
        if (!entry || entry.type === RigidBodyType.Static) return;
        const PX = this.PhysX as any;
        entry.actor.setLinearVelocity(new PX.PxVec3(velocity.x, velocity.y, velocity.z));
    }

    setRigidBodyPosition(uuid: string, position: Vector3Like): void {
        const entry = this.rigidBodies.get(uuid);
        if (!entry) return;
        const PX = this.PhysX as any;
        const t = entry.actor.getGlobalPose();
        const q = t.get_q();
        const newTransform = new PX.PxTransform(new PX.PxVec3(position.x, position.y, position.z), q);
        entry.actor.setGlobalPose(newTransform);
    }

    setRigidBodyRotation(uuid: string, quaternion: QuaternionLike): void {
        const entry = this.rigidBodies.get(uuid);
        if (!entry) return;
        const PX = this.PhysX as any;
        const t = entry.actor.getGlobalPose();
        const p = t.get_p();
        const newTransform = new PX.PxTransform(p, new PX.PxQuat(quaternion.x, quaternion.y, quaternion.z, quaternion.w));
        entry.actor.setGlobalPose(newTransform);
    }

    setRigidBodyLinearDamping(uuid: string, damping: number): void {
        const entry = this.rigidBodies.get(uuid);
        if (!entry || entry.type === RigidBodyType.Static) return;
        entry.actor.setLinearDamping(damping);
    }

    setRigidBodyAngularDamping(uuid: string, damping: number): void {
        const entry = this.rigidBodies.get(uuid);
        if (!entry || entry.type === RigidBodyType.Static) return;
        entry.actor.setAngularDamping(damping);
    }

    setRigidBodyRotationLock(uuid: string, lock: {x: boolean; y: boolean; z: boolean}): void {
        const entry = this.rigidBodies.get(uuid);
        if (!entry || entry.type === RigidBodyType.Static) return;
        const PX = this.PhysX as any;
        entry.actor.setRigidDynamicLockFlag(PX.PxRigidDynamicLockFlag.eLOCK_ANGULAR_X, lock.x);
        entry.actor.setRigidDynamicLockFlag(PX.PxRigidDynamicLockFlag.eLOCK_ANGULAR_Y, lock.y);
        entry.actor.setRigidDynamicLockFlag(PX.PxRigidDynamicLockFlag.eLOCK_ANGULAR_Z, lock.z);
    }

    setRigidBodyScale(uuid: string, scale: Vector3Like): void {
        const entry = this.rigidBodies.get(uuid);
        if (!entry) return;
        // PhysX does not natively support runtime shape scaling.
        // For now, log a warning. A full implementation would recreate the shape.
        console.warn("PhysX: setRigidBodyScale not fully supported, shape recreation needed", uuid, scale);
    }

    setRigidBodyShape(uuid: string, newShapeUuid: string): void {
        const entry = this.rigidBodies.get(uuid);
        const shapeEntry = this.shapeCache.get(newShapeUuid);
        if (!entry || !shapeEntry) return;

        // Remove old shapes
        const oldShapes = entry.actor.getShapes();
        if (oldShapes) {
            for (let i = oldShapes.size() - 1; i >= 0; i--) {
                entry.actor.detachShape(oldShapes.get(i));
            }
        }

        // Attach new shape
        const newShape = this.physics.createShape(shapeEntry.geometry, this.defaultMaterial, true);
        entry.actor.attachShape(newShape);
        newShape.release();

        this.releaseShape(entry.shapeUuid);
        shapeEntry.refCount++;
        entry.shapeUuid = newShapeUuid;
        this.collisionObjectToShapeMap.set(uuid, newShapeUuid);
    }

    addShape(uuid: string, collisionShape: CollisionShape): void {
        if (this.shapeCache.has(uuid)) return;

        const result = this.createGeometry(collisionShape);
        if (!result) return;

        this.shapeCache.set(uuid, {
            geometry: result.geometry,
            material: this.defaultMaterial,
            staticOnly: collisionShape.type === BodyShapeType.CONCAVE_HULL,
            refCount: 0,
            removeWhenUnused: false,
        });
    }

    removeShape(uuid: string): void {
        const shapeEntry = this.shapeCache.get(uuid);
        if (!shapeEntry) return;

        if (shapeEntry.refCount > 0) {
            shapeEntry.removeWhenUnused = true;
            return;
        }

        shapeEntry.geometry?.release?.();
        this.shapeCache.delete(uuid);
    }

    hasShape(uuid: string): boolean {
        return this.shapeCache.has(uuid);
    }

    // ========================================================================
    // Character controller methods
    // ========================================================================

    addCharacterController(uuid: string, shapeUuid: string): void {
        if (this.controllers.has(uuid)) return;

        const shapeEntry = this.shapeCache.get(shapeUuid);
        if (!shapeEntry) return;

        const PX = this.PhysX as any;
        const desc = new PX.PxCapsuleControllerDesc();
        // Default capsule dimensions — will be overridden by the shape if it's a capsule
        desc.set_height(1.0);
        desc.set_radius(0.3);
        desc.set_material(this.defaultMaterial);
        desc.set_position(new PX.PxExtendedVec3(0, 0, 0));
        desc.set_stepOffset(0.5);
        desc.set_slopeLimit(Math.cos(60 * Math.PI / 180));

        const controller = this.controllerManager.createController(desc);
        if (!controller) {
            console.warn("PhysX: failed to create character controller for", uuid);
            return;
        }

        this.controllers.set(uuid, {
            controller,
            shapeUuid,
            walkVelocity: {x: 0, y: 0, z: 0},
            onGround: false,
            collisionBehavior: CollisionBehavior.Regular,
            maxSlope: 60 * Math.PI / 180,
            stepHeight: 0.5,
            gravity: this.gravity,
            internalVerticalVelocity: 0,
            isJumping: false,
        });

        shapeEntry.refCount++;
    }

    removeCharacterController(uuid: string): void {
        const entry = this.controllers.get(uuid);
        if (!entry) return;

        entry.controller.release();
        this.releaseShape(entry.shapeUuid);
        this.controllers.delete(uuid);
    }

    hasCharacterController(uuid: string): boolean {
        return this.controllers.has(uuid);
    }

    *characterControllerUuids(): IterableIterator<string> {
        yield* this.controllers.keys();
    }

    getCharacterControllerLinearVelocity(uuid: string): Vector3Like | null {
        const entry = this.controllers.get(uuid);
        if (!entry) return null;
        // PhysX CCT doesn't track velocity directly — return walk velocity
        return {...entry.walkVelocity};
    }

    getCharacterControllerPosition(uuid: string): Vector3Like | null {
        const entry = this.controllers.get(uuid);
        if (!entry) return null;
        const p = entry.controller.getPosition();
        return {x: p.get_x(), y: p.get_y(), z: p.get_z()};
    }

    getCharacterControllerRotation(uuid: string): QuaternionLike | null {
        // PhysX CCT doesn't have rotation — return identity
        if (!this.controllers.has(uuid)) return null;
        return {x: 0, y: 0, z: 0, w: 1};
    }

    isCharacterControllerOnGround(uuid: string): boolean {
        return this.controllers.get(uuid)?.onGround ?? false;
    }

    setCharacterControllerCollisionBehavior(uuid: string, behavior: CollisionBehavior): void {
        const entry = this.controllers.get(uuid);
        if (!entry) return;
        entry.collisionBehavior = behavior;
    }

    setCharacterControllerMaxSlope(uuid: string, maxSlope: number): void {
        const entry = this.controllers.get(uuid);
        if (!entry) return;
        entry.maxSlope = maxSlope;
        entry.controller.setSlopeLimit(Math.cos(maxSlope));
    }

    setCharacterControllerPosition(uuid: string, position: Vector3Like): void {
        const entry = this.controllers.get(uuid);
        if (!entry) return;
        const PX = this.PhysX as any;
        entry.controller.setPosition(new PX.PxExtendedVec3(position.x, position.y, position.z));
    }

    setCharacterControllerRotation(_uuid: string, _quaternion: QuaternionLike): void {
        // PhysX CCT doesn't support rotation — no-op
    }

    setCharacterControllerStepHeight(uuid: string, stepHeight: number): void {
        const entry = this.controllers.get(uuid);
        if (!entry) return;
        entry.stepHeight = stepHeight;
        entry.controller.setStepOffset(stepHeight);
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

    // ========================================================================
    // Debug
    // ========================================================================

    initDebug(): any {
        return null;
    }

    // ========================================================================
    // Private helpers
    // ========================================================================

    private createGeometry(collisionShape: CollisionShape): {geometry: any} | null {
        const PX = this.PhysX as any;

        switch (collisionShape.type) {
            case BodyShapeType.BOX: {
                const geometry = new PX.PxBoxGeometry(
                    collisionShape.width / 2,
                    collisionShape.height / 2,
                    collisionShape.length / 2,
                );
                return {geometry};
            }
            case BodyShapeType.SPHERE: {
                const geometry = new PX.PxSphereGeometry(collisionShape.radius);
                return {geometry};
            }
            case BodyShapeType.CAPSULE: {
                const geometry = new PX.PxCapsuleGeometry(collisionShape.radius, collisionShape.height / 2);
                return {geometry};
            }
            case BodyShapeType.CONVEX_HULL:
                return this.createConvexHullGeometry(collisionShape);
            case BodyShapeType.CONCAVE_HULL:
                return this.createTriangleMeshGeometry(collisionShape);
            default:
                return null;
        }
    }

    private createConvexHullGeometry(collisionShape: ConvexHullShape): {geometry: any} | null {
        const PX = this.PhysX as any;
        const vertices = collisionShape.vertices;
        const numVerts = Math.floor(vertices.length / 3);

        const desc = new PX.PxConvexMeshDesc();
        desc.points.count = numVerts;
        desc.points.stride = 12; // 3 floats * 4 bytes
        desc.flags = new PX.PxConvexFlags(PX.PxConvexFlag.eCOMPUTE_CONVEX);

        // Allocate buffer for vertices
        const bufSize = numVerts * 3 * 4;
        const buf = PX._malloc(bufSize);
        const floatView = new Float32Array(PX.HEAPF32.buffer, buf, numVerts * 3);
        for (let i = 0; i < vertices.length; i++) {
            floatView[i] = vertices[i] ?? 0;
        }
        desc.points.data = buf;

        const mesh = (this.PhysX as any).CreateConvexMesh(this.cookingParams, desc);
        PX._free(buf);

        if (!mesh) return null;
        const geometry = new PX.PxConvexMeshGeometry(mesh);
        return {geometry};
    }

    private createTriangleMeshGeometry(collisionShape: ConcaveHullShape): {geometry: any} | null {
        const PX = this.PhysX as any;

        // Flatten all sub-meshes into a single vertex + index buffer (indexed approach like Jolt fix)
        let totalVerts = 0;
        let totalTris = 0;
        for (let i = 0; i < collisionShape.vertices.length; i++) {
            totalVerts += Math.floor((collisionShape.vertices[i]?.length ?? 0) / 3);
            totalTris += Math.floor((collisionShape.indexes[i]?.length ?? 0) / 3);
        }

        if (totalVerts === 0 || totalTris === 0) return null;

        // Allocate vertex buffer
        const vertBufSize = totalVerts * 3 * 4;
        const vertBuf = PX._malloc(vertBufSize);
        const vertView = new Float32Array(PX.HEAPF32.buffer, vertBuf, totalVerts * 3);

        // Allocate index buffer
        const idxBufSize = totalTris * 3 * 4;
        const idxBuf = PX._malloc(idxBufSize);
        const idxView = new Uint32Array(PX.HEAPU32.buffer, idxBuf, totalTris * 3);

        let vertOffset = 0;
        let idxOffset = 0;
        let vertexOffset = 0;

        for (let meshIndex = 0; meshIndex < collisionShape.vertices.length; meshIndex++) {
            const meshVertices = collisionShape.vertices[meshIndex] ?? [];
            const meshIndices = collisionShape.indexes[meshIndex] ?? [];
            const numVerts = Math.floor(meshVertices.length / 3);

            for (let v = 0; v < meshVertices.length; v++) {
                vertView[vertOffset++] = meshVertices[v] ?? 0;
            }

            const numTris = Math.floor(meshIndices.length / 3);
            for (let t = 0; t < numTris * 3; t++) {
                idxView[idxOffset++] = (meshIndices[t] ?? 0) + vertexOffset;
            }

            vertexOffset += numVerts;
        }

        const desc = new PX.PxTriangleMeshDesc();
        desc.points.count = totalVerts;
        desc.points.stride = 12;
        desc.points.data = vertBuf;
        desc.triangles.count = totalTris;
        desc.triangles.stride = 12;
        desc.triangles.data = idxBuf;

        const mesh = (this.PhysX as any).CreateTriangleMesh(this.cookingParams, desc);
        PX._free(vertBuf);
        PX._free(idxBuf);

        if (!mesh) return null;
        const geometry = new PX.PxTriangleMeshGeometry(mesh);
        return {geometry};
    }

    private releaseShape(shapeUuid: string): void {
        const shapeEntry = this.shapeCache.get(shapeUuid);
        if (!shapeEntry) return;

        shapeEntry.refCount = Math.max(0, shapeEntry.refCount - 1);
        if (shapeEntry.refCount === 0 && shapeEntry.removeWhenUnused) {
            shapeEntry.geometry?.release?.();
            this.shapeCache.delete(shapeUuid);
        }
    }

    // ========================================================================
    // Joint methods (PhysX joints)
    // ========================================================================

    addFixedJoint(options: FixedJointOptions): void {
        const { collisionEnabled, uuidA, uuidB, pivotB, rotationB } = options;
        const entryA = this.rigidBodies.get(uuidA);
        const entryB = this.rigidBodies.get(uuidB);
        if (!entryA || !entryB) {
            console.warn("PhysXPhysicsEngine.addFixedJoint: rigid body not found", uuidA, uuidB);
            return;
        }

        const PX = this.PhysX as any;
        const frame0 = this.identityTransform();
        const frame1 = this.transformFrom(pivotB, rotationB);
        const joint = PX.PxFixedJointCreate(this.physics, entryA.actor, frame0, entryB.actor, frame1);

        this.setCollisionEnabled(joint, collisionEnabled);
        this.jointMap.set(this.getJointKey(uuidA, uuidB), joint);
    }

    addHingeJoint(options: HingeJointOptions): void {
        const {
            collisionEnabled, uuidA, uuidB,
            hingeAxis, relPos, relRotation,
            angularLimitEnabled, angularLimit,
            motorEnabled, motorSpeed, motorTorque,
        } = options;
        const entryA = this.rigidBodies.get(uuidA);
        const entryB = this.rigidBodies.get(uuidB);
        if (!entryA || !entryB) {
            console.warn("PhysXPhysicsEngine.addHingeJoint: rigid body not found", uuidA, uuidB);
            return;
        }

        const PX = this.PhysX as any;

        // PhysX revolute joint rotates around the X axis of its joint
        // frame. Align the joint frame's X with the caller-supplied
        // hingeAxis (expressed in A's local frame).
        const qAxisA = axisToXQuaternion(hingeAxis);
        // In B's frame the same world axis is `relRotation * hingeAxis`.
        const axisInB = rotateVectorByQuaternion(relRotation, hingeAxis);
        const qAxisB = axisToXQuaternion(axisInB);

        const frame0 = this.transformFrom({ x: 0, y: 0, z: 0 }, qAxisA);
        const frame1 = this.transformFrom(relPos, qAxisB);
        const joint = PX.PxRevoluteJointCreate(this.physics, entryA.actor, frame0, entryB.actor, frame1);

        if (angularLimitEnabled) {
            const minRad = angularLimit.x * Math.PI / 180;
            const maxRad = angularLimit.y * Math.PI / 180;
            const limitPair = new PX.PxJointAngularLimitPair(minRad, maxRad, 0.01);
            joint.setLimit(limitPair);
            joint.setRevoluteJointFlag(PX.PxRevoluteJointFlagEnum.eLIMIT_ENABLED, true);
        }

        if (motorEnabled) {
            joint.setDriveVelocity(motorSpeed);
            joint.setDriveForceLimit(motorTorque);
            joint.setRevoluteJointFlag(PX.PxRevoluteJointFlagEnum.eDRIVE_ENABLED, true);
        }

        this.setCollisionEnabled(joint, collisionEnabled);
        this.jointMap.set(this.getJointKey(uuidA, uuidB), joint);
    }

    addPointToPointJoint(options: PointToPointJointOptions): void {
        const { collisionEnabled, uuidA, uuidB, pivotA, pivotB } = options;
        const entryA = this.rigidBodies.get(uuidA);
        const entryB = this.rigidBodies.get(uuidB);
        if (!entryA || !entryB) {
            console.warn("PhysXPhysicsEngine.addPointToPointJoint: rigid body not found", uuidA, uuidB);
            return;
        }

        const PX = this.PhysX as any;
        const frame0 = this.transformFrom(pivotA, { x: 0, y: 0, z: 0, w: 1 });
        const frame1 = this.transformFrom(pivotB, { x: 0, y: 0, z: 0, w: 1 });
        const joint = PX.PxSphericalJointCreate(this.physics, entryA.actor, frame0, entryB.actor, frame1);

        this.setCollisionEnabled(joint, collisionEnabled);
        this.jointMap.set(this.getJointKey(uuidA, uuidB), joint);
    }

    removeJoint(uuidA: string, uuidB: string): void {
        const key = this.getJointKey(uuidA, uuidB);
        const joint = this.jointMap.get(key);
        if (!joint) return;
        joint.release?.();
        this.jointMap.delete(key);
    }

    private getJointKey(uuidA: string, uuidB: string): string {
        return uuidA < uuidB ? `${uuidA}:${uuidB}` : `${uuidB}:${uuidA}`;
    }

    private identityTransform(): any {
        const PX = this.PhysX as any;
        return new PX.PxTransform(
            new PX.PxVec3(0, 0, 0),
            new PX.PxQuat(0, 0, 0, 1),
        );
    }

    private transformFrom(pos: Vector3Like, rot: QuaternionLike): any {
        const PX = this.PhysX as any;
        return new PX.PxTransform(
            new PX.PxVec3(pos.x, pos.y, pos.z),
            new PX.PxQuat(rot.x, rot.y, rot.z, rot.w),
        );
    }

    private setCollisionEnabled(joint: any, collisionEnabled: boolean): void {
        const PX = this.PhysX as any;
        joint.setConstraintFlag(PX.PxConstraintFlagEnum.eCOLLISION_ENABLED, collisionEnabled);
    }
}

/**
 * Rotate a vector by a quaternion, using v' = q * v * q⁻¹.
 */
function rotateVectorByQuaternion(q: QuaternionLike, v: Vector3Like): Vector3Like {
    const { x: qx, y: qy, z: qz, w: qw } = q;
    const { x: vx, y: vy, z: vz } = v;
    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);
    return {
        x: vx + qw * tx + (qy * tz - qz * ty),
        y: vy + qw * ty + (qz * tx - qx * tz),
        z: vz + qw * tz + (qx * ty - qy * tx),
    };
}

/**
 * Unit quaternion that rotates the +X axis onto `axis`. Produces a
 * stable joint frame for revolute joints whose native axis is X.
 * Falls back to the identity for zero-length input.
 */
function axisToXQuaternion(axis: Vector3Like): QuaternionLike {
    const length = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z);
    if (length < 1e-8) return { x: 0, y: 0, z: 0, w: 1 };
    const nx = axis.x / length;
    const ny = axis.y / length;
    const nz = axis.z / length;

    // +X to (nx, ny, nz): axis-angle where rotation axis = X × target and
    // angle = acos(X · target) = acos(nx).
    const dot = nx;
    if (dot > 1 - 1e-8) return { x: 0, y: 0, z: 0, w: 1 };
    if (dot < -1 + 1e-8) {
        // 180° rotation around any axis perpendicular to X.
        return { x: 0, y: 0, z: 1, w: 0 };
    }
    const rx = 0;
    const ry = -nz;
    const rz = ny;
    const rLen = Math.sqrt(ry * ry + rz * rz);
    const nrx = rx / rLen;
    const nry = ry / rLen;
    const nrz = rz / rLen;
    const angle = Math.acos(dot);
    const half = angle * 0.5;
    const s = Math.sin(half);
    return { x: nrx * s, y: nry * s, z: nrz * s, w: Math.cos(half) };
}
