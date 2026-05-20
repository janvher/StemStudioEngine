import {useCallback} from "react";

import {useChangeAssetRevision} from "./useChangeAssetRevision";
import global from "@stem/editor-oss/global";
import {findModelInstances} from "@stem/editor-oss/model/findModelInstances";
import {useUpdateModelInstances} from "../../models/hooks/models";

/**
 * Hook that changes a model asset's revision in the scene: updates the
 * resolution context, replaces all model instances with the new revision,
 * re-resolves AssetRef values, and notifies editor plugins.
 *
 * Optionally swaps the asset id at the same time (fork-on-edit case): when
 * newAssetId is provided and differs from modelId, instances are found via
 * the old modelId and re-loaded via newAssetId so they end up keyed to the
 * fork's id.
 *
 * @returns A function that performs the model revision change.
 */
export const useChangeModelRevision = () => {
    const changeAssetRevision = useChangeAssetRevision();
    const updateModelInstances = useUpdateModelInstances();

    return useCallback(
        async (
            modelId: string,
            newRevisionId: string,
            objectUuids?: string[],
            newAssetId?: string,
        ): Promise<void> => {
            const scene = global.app?.editor?.scene;
            if (!scene) {
                console.warn("[useChangeModelRevision] No scene available.");
                return;
            }

            // Locate instances by their CURRENT modelId before the swap.
            const uuids = objectUuids ?? findModelInstances(scene, modelId);
            // Load + replace using the EFFECTIVE id (new on fork, same on
            // legacy revision change). The new instances naturally carry the
            // effective modelId set by loadModel.
            const effectiveModelId = newAssetId ?? modelId;

            await changeAssetRevision(
                modelId,
                newRevisionId,
                () => updateModelInstances(effectiveModelId, uuids),
                newAssetId,
            );
        },
        [changeAssetRevision, updateModelInstances],
    );
};
