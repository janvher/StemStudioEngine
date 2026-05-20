import {COLLISION_MATERIAL_TYPE} from "@stem/editor-oss/types/editor";

export enum CollisionType {
    Static = "Static",
    Dynamic = "Dynamic",
    Kinematic = "Kinematic",
}

export const normalizeCType = (ctype: unknown): CollisionType | undefined => {
    if (typeof ctype !== "string") return undefined;
    switch (ctype.toLowerCase()) {
        case "static": return CollisionType.Static;
        case "dynamic": return CollisionType.Dynamic;
        case "kinematic": return CollisionType.Kinematic;
        default: return undefined;
    }
};

export enum Shape {
    btBoxShape = "BoxShape",
    btSphereShape = "SphereShape",
    btConcaveHullShape = "ConcaveHullShape",
    btConvexHullShape = "ConvexHullShape",
    btCapsuleShape = "CapsuleShape",
}

export enum BouncinessPreset {
    CUSTOM = "Custom",
    METAL = "Metal",
    DIRT = "Dirt",
    GROUND = "Ground",
    PLASTIC = "Plastic",
    SNOW = "Snow",
    WOOD = "Wood",
    CONCRETE = "Concrete",
    MUD = "Mud",
    ICE = "Ice",
    SLIME = "Slime",
    WATER = "Water",
    SLIPPERY_GROUND = "Slippery Ground",
    RUBBER = "Rubber",
    SAND = "Sand",
}

export interface BouncinessPresetValues {
    restitution: number;
    friction: number;
    contactStiffness: number;
    contactDamping: number;
}

export const BOUNCINESS_PRESET_VALUES: Record<BouncinessPreset, BouncinessPresetValues> = {
    [BouncinessPreset.CUSTOM]: {restitution: 0.5, friction: 0.5, contactStiffness: 0.5, contactDamping: 0.25},
    [BouncinessPreset.METAL]: {restitution: 0.4, friction: 0.35, contactStiffness: 0.95, contactDamping: 0.08},
    [BouncinessPreset.DIRT]: {restitution: 0.15, friction: 0.7, contactStiffness: 0.3, contactDamping: 0.45},
    [BouncinessPreset.GROUND]: {restitution: 0.2, friction: 0.55, contactStiffness: 0.5, contactDamping: 0.3},
    [BouncinessPreset.PLASTIC]: {restitution: 0.45, friction: 0.3, contactStiffness: 0.55, contactDamping: 0.2},
    [BouncinessPreset.SNOW]: {restitution: 0.05, friction: 0.15, contactStiffness: 0.1, contactDamping: 0.7},
    [BouncinessPreset.WOOD]: {restitution: 0.35, friction: 0.45, contactStiffness: 0.7, contactDamping: 0.25},
    [BouncinessPreset.CONCRETE]: {restitution: 0.25, friction: 0.65, contactStiffness: 0.9, contactDamping: 0.15},
    [BouncinessPreset.MUD]: {restitution: 0.0, friction: 0.8, contactStiffness: 0.05, contactDamping: 0.95},
    [BouncinessPreset.ICE]: {restitution: 0.3, friction: 0.03, contactStiffness: 0.85, contactDamping: 0.1},
    [BouncinessPreset.SLIME]: {restitution: 0.4, friction: 0.15, contactStiffness: 0.08, contactDamping: 0.8},
    [BouncinessPreset.WATER]: {restitution: 0.02, friction: 0.05, contactStiffness: 0.02, contactDamping: 0.5},
    [BouncinessPreset.SLIPPERY_GROUND]: {restitution: 0.25, friction: 0.08, contactStiffness: 0.45, contactDamping: 0.25},
    [BouncinessPreset.RUBBER]: {restitution: 0.85, friction: 0.9, contactStiffness: 0.35, contactDamping: 0.35},
    [BouncinessPreset.SAND]: {restitution: 0.1, friction: 0.6, contactStiffness: 0.2, contactDamping: 0.55},
};

export interface PhysicsConfig {
    enabled: boolean;
    shape: keyof typeof Shape;
    shapeData?: any;
    anchorOffset?: {
        x: number;
        y: number;
        z: number;
    };
    anchorScale?: {
        x: number;
        y: number;
        z: number;
    };
    userShapeOffset?: {
        x: number;
        y: number;
        z: number;
    };
    userShapeScale?: {
        x: number;
        y: number;
        z: number;
    };
    shapeExcludesHiddenObjects?: boolean;
    mass: number;
    inertia: {
        x: number;
        y: number;
        z: number;
    };
    restitution: number;
    friction: number;
    rollingFriction: number;
    spinningFriction: number;
    contactStiffness: number;
    contactDamping: number;
    ctype: CollisionType;
    position: {
        x: number;
        y: number;
        z: number;
    };
    scale: {
        x: number;
        y: number;
        z: number;
    };
    rotation: {
        x: number;
        y: number;
        z: number;
    };
    rotationLock?: {
        x: boolean;
        y: boolean;
        z: boolean;
    };
    enable_preview: boolean;
    collision_material: COLLISION_MATERIAL_TYPE;
    bounciness_preset: BouncinessPreset;
    climbable: boolean;
    type: string;
}
