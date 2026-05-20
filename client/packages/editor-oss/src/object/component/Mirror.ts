import * as THREE from "three";
import {reflector} from "three/tsl";
import {MeshBasicNodeMaterial} from "three/webgpu";

export interface MirrorOptions {
    /** Plane width (world units). Default 2. */
    width?: number;
    /** Plane height (world units). Default 2. */
    height?: number;
    /** Reflection render-target resolution scale 0..1. Default 0.5 (half-res). */
    resolutionScale?: number;
    /** Tint applied to the reflection, 0xrrggbb. Default 0xffffff (no tint). */
    tint?: number;
}

export type MirrorConfig = Required<MirrorOptions>;

const DEFAULT_CONFIG: MirrorConfig = {
    width: 2,
    height: 2,
    resolutionScale: 0.5,
    tint: 0xffffff,
};

/**
 * Create a flat reflective surface — a "mirror" primitive.
 *
 * Uses the `reflector()` TSL node (WebGPU-native), which renders the scene
 * from a reflected camera into its own render target each frame. Pairs
 * well with the global SSR pass:
 *   - Mirror/Reflector: dedicated high-quality reflection for one surface.
 *   - SSR: scene-wide reflections on any metallic/low-roughness material,
 *     but only reflects what's currently on-screen.
 *
 * The result is a regular `THREE.Mesh` — savable, selectable, transformable
 * like any primitive. Serialization is handled by `MirrorSerializer`,
 * identified via `userData.type === "Mirror"`.
 *
 * Construction vs. hydration: this function runs both at editor-create time
 * and when loading a scene, so it must be idempotent and not depend on any
 * one-time application state.
 */
export function createMirror(options: MirrorOptions = {}): THREE.Mesh {
    const config: MirrorConfig = {...DEFAULT_CONFIG, ...options};

    const geometry = new THREE.PlaneGeometry(config.width, config.height);
    const material = new MeshBasicNodeMaterial();

    // The reflector sampler returns the reflected scene as a color at the
    // current UV. Using it as `colorNode` makes the mesh a mirror.
    const reflectorSampler = reflector();
    reflectorSampler.target.rotateX(-Math.PI / 2); // reflector convention — target's +Z is the reflection normal
    reflectorSampler.reflector.resolutionScale = config.resolutionScale;

    // v1: mirror reflects the scene at full fidelity. Tint is stored in
    // userData so a future update can compose it into colorNode with a
    // proper TSL tint — dropped here to avoid a hacky cross-version vec3
    // constructor.
    material.colorNode = reflectorSampler;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "Mirror";
    // Attach the reflector's tracking object so the reflector can follow
    // the mirror through transform changes.
    mesh.add(reflectorSampler.target);

    mesh.userData.type = "Mirror";
    mesh.userData.mirrorConfig = config;

    return mesh;
}
