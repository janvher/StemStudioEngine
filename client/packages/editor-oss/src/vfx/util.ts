import {Object3D} from 'three';

/**
 * Read the VFX/Quarks asset id stored on an Object3D's userData.
 *
 * @param object - The Object3D to read from.
 * @returns The asset id, or null if the object doesn't reference a VFX asset.
 */
export const getVfxId = (object: Object3D): string | null => {
    const id = object.userData?.vfxAssetId;
    return typeof id === 'string' ? id : null;
};

/**
 * Write the VFX/Quarks asset id on an Object3D's userData. Passing null
 * clears the field.
 *
 * @param object - The Object3D to write to.
 * @param vfxId - The asset id to set, or null to clear.
 */
export const setVfxId = (object: Object3D, vfxId: string | null): void => {
    if (!vfxId) {
        delete object.userData.vfxAssetId;
    } else {
        object.userData.vfxAssetId = vfxId;
    }
};
