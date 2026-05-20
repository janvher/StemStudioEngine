import { Object3D } from 'three';

import { GameObject } from '../core/GameObject';

/**
 * Object utilities.
 */
export interface StemObject {
    /**
     * Wrap an existing Three.js Object3D as a GameObject so it can be
     * used with the engine's scene, behavior, and physics systems.
     *
     * @example
     * ```typescript
     * const geometry = new THREE.BoxGeometry(1, 1, 1);
     * const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
     * const mesh = new THREE.Mesh(geometry, material);
     *
     * const gameObj = this.erth.object.createFromThreeObject(mesh);
     * gameObj.position.set(5, 0.5, 0);
     * await this.erth.scene.addObject(gameObj);
     * ```
     *
     * @param object - The Three.js object to wrap
     * @returns A GameObject wrapping the provided object
     */
    createFromThreeObject(object: Object3D): GameObject;
}
