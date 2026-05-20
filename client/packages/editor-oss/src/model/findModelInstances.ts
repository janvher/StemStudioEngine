import {Object3D} from "three";

import {traverseSceneDepthFirst} from "../utils/SceneUtil";

/**
 * Find all instances of a model asset in the scene tree.
 * Stops traversing at prefab boundaries.
 *
 * @param scene - The scene root to traverse.
 * @param modelId - The model asset ID to search for.
 * @returns An array of object UUIDs that reference the model.
 */
export const findModelInstances = (scene: Object3D, modelId: string): string[] => {
    const objectUuids: string[] = [];

    traverseSceneDepthFirst(scene, (obj: Object3D) => {
        // Stop at prefab boundaries (same check as isPrefab in prefab/util.ts,
        // inlined to avoid heavy transitive imports from that module).
        if (obj.userData?.prefabId) {
            return false;
        }

        if (obj.userData?.ID === modelId || obj.userData?.modelId === modelId) {
            objectUuids.push(obj.uuid);
        }

        return true;
    });

    return objectUuids;
};
