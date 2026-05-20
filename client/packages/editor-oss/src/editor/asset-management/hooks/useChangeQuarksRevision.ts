import {useCallback} from "react";

import {useChangeAssetRevision} from "./useChangeAssetRevision";
import global from "@stem/editor-oss/global";
import {useUpdateVFXInstances} from "../../vfx/util";

/**
 * Hook that changes a VFX/Quarks asset's revision in the scene: pins the
 * new revision in the resolution context, reloads every in-scene VFX
 * instance with the new content, re-resolves AssetRef values, and
 * notifies editor plugins.
 *
 * Mirrors `useChangePrefabRevision` and `useChangeModelRevision`.
 *
 * Optionally swaps the asset id at the same time (fork-on-save case):
 * when newAssetId is provided and differs from vfxAssetId, instances
 * are located by the old id and reloaded from the fork.
 *
 * `excludeUuids` skips specific instances during reload — typically the
 * just-saved instance whose in-memory content is the source of truth
 * for the new revision (and would otherwise be needlessly trampled).
 *
 * @returns A function that performs the VFX revision change.
 */
export const useChangeQuarksRevision = () => {
    const changeAssetRevision = useChangeAssetRevision();
    const updateVFXInstances = useUpdateVFXInstances();

    return useCallback(
        async (
            vfxAssetId: string,
            newRevisionId: string,
            newAssetId?: string,
            excludeUuids?: string[],
        ): Promise<void> => {
            const scene = global.app?.editor?.scene;
            if (!scene) {
                console.warn("[useChangeQuarksRevision] No scene available.");
                return;
            }

            await changeAssetRevision(
                vfxAssetId,
                newRevisionId,
                () => updateVFXInstances(scene, vfxAssetId, {newAssetId, excludeUuids}),
                newAssetId,
            );
        },
        [changeAssetRevision, updateVFXInstances],
    );
};
