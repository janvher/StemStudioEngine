import {useCallback} from "react";

import {getAssetResolutionContext} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {mapAssetIds, resolveAllSceneAssetRefs} from "@stem/editor-oss/asset-management/dependencies";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import global from "@stem/editor-oss/global";

/**
 * Hook that orchestrates the full sequence for changing an asset's revision
 * (and optionally its asset id) in the scene: update the resolution context,
 * run type-specific instance updates, re-resolve all AssetRef values in
 * behavior/lambda attributes, and notify affected editor plugins.
 *
 * Same-id revision change (legacy behavior): pass only assetId + newRevisionId.
 * Asset-id swap (e.g. fork-on-edit): pass newAssetId distinct from assetId.
 * The updateInstances callback is responsible for actually replacing scene
 * references — for an id swap it must end up with instances keyed to
 * newAssetId.
 *
 * @returns A function that performs the change.
 */
export const useChangeAssetRevision = () => {
    const {setAssetRevision, removeAssetRevision} = useAssetResolutionContext();

    return useCallback(
        async (
            assetId: string,
            newRevisionId: string,
            updateInstances?: () => Promise<void>,
            newAssetId?: string,
        ): Promise<void> => {
            const editor = global.app?.editor;
            const scene = editor?.scene;
            if (!scene) {
                console.warn("[useChangeAssetRevision] No scene available.");
                return;
            }

            const isAssetIdChange = !!newAssetId && newAssetId !== assetId;
            const effectiveAssetId = newAssetId ?? assetId;

            // Write the new revision pin BEFORE the instance swap so any model
            // / prefab / behavior loader called from updateInstances resolves
            // to the new revision.
            setAssetRevision(effectiveAssetId, newRevisionId);

            await updateInstances?.();

            const context = getAssetResolutionContext(scene) || {};

            if (isAssetIdChange) {
                // Per-type updateInstances handles direct instances (model id
                // on Object3D userData, behavior.id on BehaviorData, prefab
                // id on prefab roots). It does NOT rewrite AssetRef.assetId
                // values stored inside behavior attributes or lambda
                // componentData, which still point at the old id. Walk the
                // scene and remap any straggler reference from old → new.
                //
                // Scope the remap to scene-level dependencies — refs inside
                // a prefab subtree use the prefab's own resolution context
                // and should keep referring to the original (un-forked) id.
                // traverseAssetRefs hands the callback whichever context
                // applies to each ref; identity-compare it against the one
                // we passed in to detect "still scene-level".
                mapAssetIds(scene, context, (id, refContext) =>
                    refContext === context && id === assetId ? effectiveAssetId : id,
                );
                removeAssetRevision(assetId);
            }

            resolveAllSceneAssetRefs(scene, context);
            editor?.behaviorPluginManager?.updateAssetRefs(scene, effectiveAssetId);
        },
        [setAssetRevision, removeAssetRevision],
    );
};
