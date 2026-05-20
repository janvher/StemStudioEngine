import type { ComponentFieldSchema } from "@stem/editor-oss/scheduler/data/ComponentStore";

/**
 * SoA field definitions for physics lambda component stores.
 * Each schema maps to a ComponentStore with contiguous TypedArrays
 * for cache-friendly iteration in hot update loops.
 */

export const VELOCITY_SCHEMA: ComponentFieldSchema[] = [
    { name: "vx", type: "f32", default: 0 },
    { name: "vy", type: "f32", default: 0 },
    { name: "vz", type: "f32", default: 0 },
    { name: "damping", type: "f32", default: 0 },
    { name: "maxSpeed", type: "f32", default: 100 },
];

export const RIGIDBODY_SCHEMA: ComponentFieldSchema[] = [
    // Linear velocity
    { name: "vx", type: "f32", default: 0 },
    { name: "vy", type: "f32", default: 0 },
    { name: "vz", type: "f32", default: 0 },
    // Angular velocity
    { name: "avx", type: "f32", default: 0 },
    { name: "avy", type: "f32", default: 0 },
    { name: "avz", type: "f32", default: 0 },
    // Physics properties
    { name: "mass", type: "f32", default: 1 },
    { name: "drag", type: "f32", default: 0 },
    { name: "angularDrag", type: "f32", default: 0.05 },
    { name: "gravityScale", type: "f32", default: 1 },
    // Boolean flags stored as u8 (0/1)
    { name: "useGravity", type: "u8", default: 1 },
    { name: "isKinematic", type: "u8", default: 0 },
    { name: "freezePositionX", type: "u8", default: 0 },
    { name: "freezePositionY", type: "u8", default: 0 },
    { name: "freezePositionZ", type: "u8", default: 0 },
    { name: "freezeRotationX", type: "u8", default: 0 },
    { name: "freezeRotationY", type: "u8", default: 0 },
    { name: "freezeRotationZ", type: "u8", default: 0 },
];

export const GRAVITY_SCHEMA: ComponentFieldSchema[] = [
    { name: "mass", type: "f32", default: 1 },
    { name: "drag", type: "f32", default: 0 },
    { name: "useGravity", type: "u8", default: 1 },
];
