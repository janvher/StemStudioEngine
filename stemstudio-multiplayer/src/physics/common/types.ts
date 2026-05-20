
export type Object3D = {
    uuid: string;
    name: string,
    quaternion: Quaternion;
    position: Vector3;
    scale: Vector3;
    userData: any;
}

export type Quaternion = {
    x: number;
    y: number;
    z: number;
    w: number;
}

export type Vector3 = {
    x: number;
    y: number;
    z: number;
}

export enum COLLISION_TYPE {
    UNKNOWN = -1,
    WITH_PLAYER,
    WITH_COLLIDABLE_OBJECTS,
    WITH_ENEMY
}

export type CollisionData = {
    uuid: string;
    listenerId: string;
};

export interface ICollisionSource {
    //consumeCollisionUpdates(out: CollisionData[]): void;
    addCollisionListener(listener: (collision: CollisionData) => void): void;
}

export interface IPhysics {
    //physics type
    isMultiplayer(): boolean;
    isWorker(): boolean;
    isLocal(): boolean;
    //local cache
    addObject(uuid: string, mass: number, collisionFlag: CollisionFlag, object: Object3D): CollisionFlag;
    removeObject(uuid: string): void;
    getDynamicBodyObject(uuid: string): Object3D | undefined;
    getKinematicBodyObjects(): Map<string, Object3D>;
    //generic
    start(): Promise<IPhysics>;
    terminate(): void;
    simulate(): void;
    pause(): void;
    resume(): void;
    initDebug(): Object3D | null;
    //objects
    addBox(object: Object3D, data: BoxData): void;
    addSphere(object: Object3D, data: SphereData): void;
    addConcaveHull(object: Object3D, data: ConcaveHullData): void;
    addConvexHull(object: Object3D, data: ConvexHullData): void;
    addCapsuleShape(object: Object3D, data: CapsuleData): void;
    addModel(object: Object3D, data: ModelData): void;
    addTerrain(object: Object3D, data: TerrainData): void;
    remove(uuid: string): void;
    //force, velocity, etc
    applyCentralImpulse(uuid: string, impulse: Vector3): void;
    //rotation, position
    setOrigin(uuid: string, position: Vector3): void;
    setRotation(uuid: string, quaternion: Quaternion): void;
    setLinearVelocity(uuid: string, velocity: Vector3): void;
    //character
    addPlayerObject(uuid: string, useController: boolean, options?: IPlayerOptions): Promise<Object3D | null>;
    removePlayerObject(uuid: string): void;
    movePlayerObject(uuid: string, walkDirection: Vector3, jump: boolean): void;
    setPlayerSpeedAdjustment(uuid: string, speedAdjustment: Vector3): void;
    setPlayerPosition(uuid: string, position: Vector3): void;
    applyImpulseToPlayer(uuid: string, impulse: Vector3): void;
    //collisions
    addCollidableObject(uuid: string): void;
    removeCollidableObject(uuid: string): void;
    detectCollisionsForObject(uuid: string, registration: CollisionRegistration, enable: boolean): void;
    //MP specific
    setCurrentAnimation(uuid: string, animation: string): void;
    addOtsShiftVector(otsShiftVector: Vector3): void;
}

export interface IPlayerOptions {
    playerGravity: number;
    jumpSpeed: number;
}

export interface CollisionRegistration {
    id: string;
    type: COLLISION_TYPE;
}

export interface IPlayerOptions {
    playerGravity: number;
    jumpSpeed: number;
}

export type ObjectMotionState = {
    onGround: boolean;
    linearVelocity: Vector3;
}

export interface IDispatcher {
    onReady(): void;
    onBodyUpdate(uuid: string, position: Vector3, rotation: Quaternion, dt: number, motionState?: ObjectMotionState): void;
    onCollision(uuid: string, listenerId: string): void;
}

export enum BodyShapeType {
    BOX = "btBoxShape",
    SPHERE = "btSphereShape",
    CAPSULE = "btCapsuleShape",
    CONVEX_HULL = "btConvexHullShape",
    CONCAVE_HULL = "btConcaveHullShape",
}

//from AmmoJS
export const COLLISION_FLAGS = {
    CF_DYNAMIC_OBJECT: 0,
    CF_STATIC_OBJECT: 1,
    CF_KINEMATIC_OBJECT: 2,
};

export enum CollisionFlag {
    DYNAMIC = COLLISION_FLAGS.CF_DYNAMIC_OBJECT,
    KINEMATIC = COLLISION_FLAGS.CF_KINEMATIC_OBJECT,
    STATIC = COLLISION_FLAGS.CF_STATIC_OBJECT,
}

export const COLLISION_MAP = new Map([
    ["Dynamic", CollisionFlag.DYNAMIC],
    ["Kinematic", CollisionFlag.KINEMATIC],
    ["Static", CollisionFlag.STATIC],
]);

export type CommonData = {
    uuid: string;
    template: string; //template uuid
    name: string;
    position: {x: number; y: number; z: number};
    quaternion: {x: number; y: number; z: number; w: number};
    scale: {x: number; y: number; z: number};
    mass: number;
    restitution?: number;
    friction: number;
    rollingFriction: number;
    spinningFriction: number;
    contactStiffness: number;
    contactDamping: number;
    damping?: {linear: number; angular: number};
    collision_flag?: CollisionFlag;
};

export type BoxData = CommonData & {
    width: number;
    length: number;
    height: number;
};

export type SphereData = CommonData & {
    radius: number;
};

export type ModelData = CommonData & {
    vertices: number[][];
    matrices: number[][];
    indexes: number[][];
    scale: {x: number; y: number; z: number};
};

export type TerrainData = CommonData & {
    terrainWidth: number;
    terrainDepth: number;
    terrainMinHeight: number;
    terrainMaxHeight: number;
    heightData: Float32Array;
    terrainWidthExtents?: number;
    terrainDepthExtents?: number;
};

export type ConvexHullData = CommonData & {
    vertices: number[];
};

export type ConcaveHullData = CommonData & {
    vertices: number[][];
    indexes: number[][];
};

export type CapsuleData = CommonData & {
    radius: number;
    height: number;
};

export const DEFAULT_SCALE = {x: 1, y: 1, z: 1};
