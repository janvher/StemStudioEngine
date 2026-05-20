import { GameObject } from '../core/GameObject';

/**
 * Scene graph manipulation for adding objects at runtime.
 */
export interface StemScene {
    /**
     * Add a GameObject to the scene, optionally under a parent.
     *
     * @param object - The GameObject to add
     * @param parent - Optional parent GameObject; if omitted, added to the scene root
     */
    addObject(object: GameObject, parent?: GameObject): Promise<void>;
}
