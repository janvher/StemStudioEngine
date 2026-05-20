import { Object3D, Sprite } from "three";

/**
 * Type guard to check if an object is a Sprite
 * @param obj - The object to check
 * @returns True if the object is a Sprite
 */
export function isSprite(obj: Object3D): obj is Sprite {
    return (obj as Sprite).isSprite === true;
}
