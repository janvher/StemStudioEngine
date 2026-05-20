/**
 * Module: RuntimeContext.ts
 * Purpose: Shared interface for Three.js runtime state (scene, camera, renderer, etc.).
 * Application is the canonical implementation. Editor and GameManager consume this
 * interface instead of copying individual references that can go stale.
 */

import type {Group, PerspectiveCamera, Scene} from "three";
import type {WebGPURenderer} from "three/webgpu";

export interface RuntimeContext {
    readonly scene: Scene;
    readonly sceneHelpers: Group;
    readonly camera: PerspectiveCamera;
    readonly renderer: WebGPURenderer;
    readonly viewport: HTMLElement | undefined;
}
