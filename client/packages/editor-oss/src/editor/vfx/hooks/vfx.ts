import {useCallback} from "react";
import {Object3D} from "three";

import {AssetType, forkAsset, getAsset} from "@stem/network/api/asset";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {getVfxId, setVfxId} from "../../../vfx/util";
import {useReplaceAsset} from "../../asset-management/hooks/useReplaceAsset";
import {useCanEditAsset} from "../../assets/v2/common/hooks/useCanEditAsset";
import {useVFXUploader} from "../../assets/v2/LeftPanel/MainTabs/AssetsTab/SubTabs/hooks/useVFXUploader";
import {useUpdateVFXInstances} from "../util";

export type SaveVfxParams = {
    /**
     * The in-scene VFX Object3D to persist. Its `userData.vfxAssetId` (if
     * present) drives the fork-on-save check; on success the field is
     * updated to the saved asset's id.
     */
    selectedObject: Object3D;
    /** The name to use for the VFX asset (only used when creating a new asset). */
    name: string;
};

export type SaveVfxResult = {
    assetId: string;
    revisionId: string;
};

/**
 * Hook that persists an in-place VFX edit, forking the underlying asset
 * first when the user is a contributor on the scene but doesn't own the
 * asset. The "Save" click is the user's explicit consent — there's no
 * separate fork prompt.
 *
 * Mirrors `useSavePrefab` for VFX. Each save helper owns the persistence
 * concerns for its asset type, including the fork-when-needed branch and
 * the reload-other-instances step that propagates the just-saved content
 * to siblings of the same asset.
 *
 * Brand-new VFX (no prior `vfxAssetId`) skip the fork branch and go
 * straight to asset creation.
 *
 * @returns A function that performs the save and returns the saved
 *   {assetId, revisionId}, or null if the save failed.
 */
export const useSaveVfx = () => {
    const replaceAsset = useReplaceAsset();
    const updateVFXInstances = useUpdateVFXInstances();
    const {uploadVFX} = useVFXUploader();
    const {setAssetRevision} = useAssetResolutionContext();
    // canFork is independent of the asset's owner — safe to evaluate at
    // hook setup. canEdit is computed inline from the fetched asset's
    // userId so we can check ownership without an extra hook call.
    const {canFork} = useCanEditAsset({});

    return useCallback(
        async ({selectedObject, name}: SaveVfxParams): Promise<SaveVfxResult | null> => {
            const editor = global.app?.editor;
            const scene = editor?.scene;
            if (!editor || !scene) {
                console.warn("[useSaveVfx] No editor/scene available.");
                return null;
            }

            const oldAssetId = getVfxId(selectedObject);

            // Pre-save fork check: only applies to existing assets. A brand
            // new VFX (no vfxAssetId yet) just gets created fresh.
            let updateAssetId: string | undefined = oldAssetId ?? undefined;
            let forkedAssetId: string | null = null;

            if (oldAssetId) {
                let asset;
                try {
                    asset = await getAsset(oldAssetId);
                } catch (err) {
                    console.error("[useSaveVfx] Failed to fetch VFX asset", err);
                    showToast({type: "error", title: "Failed to save particle effect"});
                    return null;
                }

                const sceneOwnerId = global.app?.editor?.projectUserId;
                const assetBelongsToSceneOwner =
                    !!asset.userId && !!sceneOwnerId && asset.userId === sceneOwnerId;

                if (!assetBelongsToSceneOwner && canFork) {
                    let forked;
                    try {
                        forked = await forkAsset({
                            assetId: oldAssetId,
                            revisionId: asset.headRevisionId,
                        });
                    } catch (err) {
                        console.error("[useSaveVfx] Failed to fork VFX asset", err);
                        showToast({
                            type: "error",
                            title: "Failed to save particle effect",
                            body: "Could not create your own copy of this effect. Please try again.",
                        });
                        return null;
                    }

                    // Pin fork.head in the resolution context so uploadVFX can
                    // resolve it as parentRevisionId. We DON'T run replaceAsset
                    // yet — we want it to fire after upload so it can reload
                    // other instances with the just-saved revision (rather
                    // than the byte-identical fork.head).
                    setAssetRevision(forked.assetId, forked.revisionId);
                    updateAssetId = forked.assetId;
                    forkedAssetId = forked.assetId;
                }
            }

            const serialized = editor.serializeObject(selectedObject);
            // uploadVFX updates the resolution-context pin to the new
            // revision on success (both create and update paths).
            const result = await uploadVFX(name, serialized, {updateAssetId});
            if (!result) return null;

            if (forkedAssetId && oldAssetId) {
                // Fork-on-save: swap every scene reference from the old asset
                // id to the fork, and reload other instances with the
                // just-uploaded revision. The just-saved instance is excluded
                // by uuid — its in-memory content is the source of truth.
                try {
                    await replaceAsset({
                        originalAssetId: oldAssetId,
                        newAssetId: forkedAssetId,
                        newRevisionId: result.revisionId,
                        assetType: AssetType.Quarks,
                        excludeUuids: [selectedObject.uuid],
                    });
                } catch (err) {
                    console.error("[useSaveVfx] Failed to swap refs after fork", err);
                    showToast({type: "error", title: "Failed to save particle effect"});
                    return null;
                }
            } else if (oldAssetId) {
                // Same-id revision change: reload other instances of this
                // VFX with the just-saved content. Without this they'd hold
                // pre-edit content while the resolution-context pin points
                // at the new revision — visually stale until next reload.
                try {
                    await updateVFXInstances(scene, oldAssetId, {
                        excludeUuids: [selectedObject.uuid],
                    });
                } catch (err) {
                    console.error("[useSaveVfx] Failed to reload other VFX instances", err);
                    // Non-fatal — the just-saved instance is still correct.
                }
            }

            // For brand-new VFX, wire up the freshly-created asset id on the
            // in-scene object. For the forked path mapAssetIds already
            // rewrote vfxAssetId; for same-id saves the value is unchanged.
            setVfxId(selectedObject, result.assetId);

            return result;
        },
        [canFork, replaceAsset, setAssetRevision, updateVFXInstances, uploadVFX],
    );
};
