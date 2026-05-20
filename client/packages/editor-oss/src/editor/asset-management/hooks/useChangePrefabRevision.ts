import {useCallback} from "react";

import {useChangeAssetRevision} from "./useChangeAssetRevision";
import global from "@stem/editor-oss/global";
import {useUpdatePrefabInstances} from "../../prefabs/hooks/prefabs";

/**
 * Hook that changes a prefab asset's revision in the scene: updates the
 * resolution context, replaces all locked prefab instances with the new
 * revision, re-resolves AssetRef values, and notifies editor plugins.
 *
 * Optionally swaps the asset id at the same time (fork-on-edit case): when
 * newAssetId is provided and differs from prefabId, locked instances are
 * located by the old prefabId and reloaded from the fork id.
 *
 * `excludeUuids` skips additional instances during reload (in addition to
 * the existing isPrefabUnlocked-based skip). Useful when a non-unlocked
 * instance is the source of truth for the new revision content.
 *
 * @returns A function that performs the prefab revision change.
 */
export const useChangePrefabRevision = () => {
    const changeAssetRevision = useChangeAssetRevision();
    const updatePrefabInstances = useUpdatePrefabInstances();

    return useCallback(
        async (
            prefabId: string,
            newRevisionId: string,
            newAssetId?: string,
            excludeUuids?: string[],
        ): Promise<void> => {
            const scene = global.app?.editor?.scene;
            if (!scene) {
                console.warn("[useChangePrefabRevision] No scene available.");
                return;
            }

            await changeAssetRevision(
                prefabId,
                newRevisionId,
                () => updatePrefabInstances(scene, prefabId, newAssetId, {excludeUuids}),
                newAssetId,
            );
        },
        [changeAssetRevision, updatePrefabInstances],
    );
};
