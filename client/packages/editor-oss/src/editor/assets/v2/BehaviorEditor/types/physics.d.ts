/**
 * Physics System Types for Behavior Scripts
 * This file is imported as a raw string for Monaco Editor IntelliSense
 */

interface IPlayerOptions {
    playerGravity: number;
    jumpHeight: number;
    stepHeight?: number;
    maxSlope: number;
    pushObjects?: boolean;
    pushImpulse?: number;
}

interface VehicleInput {
    throttle: number;
    steer: number;
    brake: number;
}

interface VehicleWheelSpec {
    name: string;
    isFront: boolean;
    radius: number;
    width: number;
    connection: {x: number; y: number; z: number};
    wheelObjectUuid?: string;
    wheelObject?: THREE.Object3D;
}

interface VehicleSpec {
    chassisObjectUuid: string;
    chassisObject?: THREE.Object3D;
    chassis: {
        halfExtents: {x: number; y: number; z: number};
        centerOffset: {x: number; y: number; z: number};
        initialTransform: {
            position: {x: number; y: number; z: number};
            quaternion: {x: number; y: number; z: number; w: number};
        };
    };
    wheels: VehicleWheelSpec[];
}

interface VehicleOptions {
    mass: number;
    suspensionStiffness: number;
    suspensionDamping: number;
    suspensionCompression: number;
    suspensionRestLength: number;
    rollInfluence: number;
    wheelFriction: number;
    maxEngineForce: number;
    maxBrakeForce: number;
    maxSteerAngle: number;
    throttleDeadzone: number;
    steerDeadzone: number;
}

interface Vector3Like {
    x: number;
    y: number;
    z: number;
}

interface QuaternionLike {
    x: number;
    y: number;
    z: number;
    w: number;
}

declare enum CollisionFlag {
    DYNAMIC = 0,
    KINEMATIC = 2,
    STATIC = 1,
}

declare enum CollisionBehavior {
    /** Does not respond to collisions but triggers callbacks */
    Ghost = 'ghost',
    /** Responds to collisions and triggers callbacks */
    Regular = 'regular',
}

interface CollisionRegistration {
    id: string;
    type: string;
}

interface ObjectMotionState {
    onGround: boolean;
    linearVelocity: Vector3Like;
    angularVelocity?: Vector3Like;
}

interface IPhysics {
    /** Check if physics is multiplayer */
    isMultiplayer(): boolean;
    /** Check if physics is running in worker */
    isWorker(): boolean;
    /** Check if physics is local */
    isLocal(): boolean;
    /** Get world gravity */
    getGravity(): number;

    // Object management
    /** Add object to physics simulation */
    addObject(uuid: string, mass: number, collisionFlag: CollisionFlag, object: THREE.Object3D): CollisionFlag;
    /** Remove object from physics simulation */
    removeObject(uuid: string): void;
    /** Get dynamic body object by UUID */
    getDynamicBodyObject(uuid: string): THREE.Object3D | undefined;
    /** Get all kinematic body objects */
    getKinematicBodyObjects(): Map<string, THREE.Object3D>;

    // Simulation control
    /** Start physics simulation */
    start(): Promise<void>;
    /** Terminate physics simulation */
    terminate(): void;
    /** Simulate physics step */
    simulate(deltaTime: number): void;
    /** Pause physics simulation */
    pause(): void;
    /** Resume physics simulation */
    resume(): void;
    /** Initialize debug rendering */
    initDebug(): THREE.Object3D | null;
    /** Check if physics has processed all events */
    ping(): Promise<void>;

    // Joints
    /** Add fixed joint between two objects */
    addFixedJoint(collisionEnabled: boolean, uuidA: string, uuidB: string, vec3PivotB: Vector3Like, vec4RotationB: QuaternionLike): void;
    /** Add hinge joint between two objects */
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
        motorTorque: number
    ): void;
    /** Add point-to-point joint between two objects */
    addPoint2PointJoint(collisionEnabled: boolean, uuidA: string, vec3PivotA: Vector3Like, uuidB: string, vec3PivotB: Vector3Like): void;

    // Forces and velocities
    /** Apply central impulse to object */
    applyCentralImpulse(uuid: string, impulse: Vector3Like): void;
    /** Set object origin/position */
    setOrigin(uuid: string, position: Vector3Like): void;
    /** Set object rotation */
    setRotation(uuid: string, quaternion: QuaternionLike): void;
    /** Set object linear velocity */
    setLinearVelocity(uuid: string, velocity: Vector3Like): void;
    /** Set object angular velocity */
    setAngularVelocity(uuid: string, velocity: Vector3Like): void;
    /** Get object linear velocity */
    getLinearVelocity(uuid: string): Vector3Like | null;
    /** Get object angular velocity */
    getAngularVelocity(uuid: string): Vector3Like | null;
    /** Set object linear damping */
    setLinearDamping(uuid: string, damping: number): void;
    /** Set object angular damping */
    setAngularDamping(uuid: string, damping: number): void;

    // Character/Player
    /** Add player object to physics */
    addPlayerObject(uuid: string, useController: boolean, options?: IPlayerOptions): Promise<THREE.Object3D | null>;
    /** Remove player object from physics */
    removePlayerObject(uuid: string): void;
    /** Move player object */
    movePlayerObject(uuid: string, walkDirection: Vector3Like, jump: boolean): void;
    /** Set player gravity */
    setPlayerGravity(uuid: string, acceleration: Vector3Like): void;
    /** Set player speed adjustment */
    setPlayerSpeedAdjustment(uuid: string, speedAdjustment: Vector3Like): void;
    /** Set player position */
    setPlayerPosition(uuid: string, position: Vector3Like): void;
    /** Apply impulse to player */
    applyImpulseToPlayer(uuid: string, impulse: Vector3Like): void;

    // Vehicle
    /** Add vehicle object to physics */
    addVehicleObject(vehicleUuid: string, spec: VehicleSpec, options: VehicleOptions): Promise<void>;
    /** Remove vehicle object from physics */
    removeVehicleObject(vehicleUuid: string): void;
    /** Move vehicle object using input */
    moveVehicleObject(vehicleUuid: string, input: VehicleInput): void;

    // Collisions
    /** Add collidable object */
    addCollidableObject(uuid: string): void;
    /** Remove collidable object */
    removeCollidableObject(uuid: string): void;
    /** Detect collisions for object */
    detectCollisionsForObject(uuid: string, registration: CollisionRegistration, enable: boolean): void;
    /** Set collision behavior */
    setCollisionBehavior(uuid: string, behavior: CollisionBehavior): void;
}
