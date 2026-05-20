import {Object3D} from "three";

import {
    emptyAssetResolutionContext,
    getAssetResolutionContext,
    resolveAssetRevisionId,
} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {AddObjectCommand, RemoveObjectCommand} from "@stem/editor-oss/command/Commands";
import global from "@stem/editor-oss/global";
import {isPrefab} from "@stem/editor-oss/prefab/util";
import {traverseSceneDepthFirst} from "@stem/editor-oss/utils/SceneUtil";
import {getVfxId, setVfxId} from "../../vfx/util";
import {useGetAssetRevisionData} from "../asset-management/hooks/assets";

export type UpdateVFXInstancesOptions = {
    /**
     * Override the asset id used to load the new revision. When provided,
     * instances are still located by `vfxAssetId` (the OLD id) but the
     * fresh content comes from `newAssetId`. Used by the fork-on-save
     * path: scene refs still point at the original asset until mapAssetIds
     * runs after this callback returns.
     */
    newAssetId?: string;
    /**
     * UUIDs to skip during reload — typically the just-saved instance
     * whose in-memory content is the source of truth for the new
     * revision. Reloading it would discard any post-save transient
     * state and is functionally redundant.
     */
    excludeUuids?: string[];
};

/**
 * Hook that reloads every in-scene VFX instance referencing the given
 * `vfxAssetId` so they pick up the latest revision content. Mirrors
 * `useUpdatePrefabInstances` in shape and intent.
 *
 * Stops traversal at child-prefab, model, and server-object boundaries —
 * the same encapsulation rules used by `findDirectDependencies` and the
 * prefab walker. VFX nested inside a locked prefab belong to that prefab's
 * resolution context, not the scene's.
 *
 * Each replacement preserves the original Object3D's uuid, name, and
 * transform so existing scene references (selection, behavior attribute
 * targets, multiplayer correlation) stay valid. Uses the editor command
 * stack so the swap participates in undo/redo.
 *
 * @returns A function `(scene, vfxAssetId, options?) => Promise<void>`.
 */
export const useUpdateVFXInstances = () => {
    const getRevisionData = useGetAssetRevisionData();

    return async (
        scene: Object3D,
        vfxAssetId: string,
        options: UpdateVFXInstancesOptions = {},
    ): Promise<void> => {
        const editor = global.app?.editor;
        if (!editor) {
            console.warn("[useUpdateVFXInstances] No editor available.");
            return;
        }

        const context = getAssetResolutionContext(scene) || emptyAssetResolutionContext;
        const loadId = options.newAssetId ?? vfxAssetId;
        const revisionId = resolveAssetRevisionId(loadId, context);
        if (!revisionId) {
            console.warn(`[useUpdateVFXInstances] Failed to resolve revision for ${loadId}`);
            return;
        }

        const excludeSet = new Set(options.excludeUuids ?? []);
        const instances: Object3D[] = [];
        traverseSceneDepthFirst(scene, obj => {
            if (getVfxId(obj) === vfxAssetId && !excludeSet.has(obj.uuid)) {
                instances.push(obj);
                // Stop traversing inside a VFX subtree — the asset content
                // is the encapsulated dep here.
                return false;
            }

            const isChildPrefab = isPrefab(obj) && obj !== scene;
            const isServerObject = Boolean(obj.userData?.Server);
            return !isChildPrefab && !isServerObject;
        });

        if (instances.length === 0) {
            return;
        }

        // Fetch the revision JSON once and reuse for each instance — the
        // deserializer mints fresh Object3Ds, so callers can't share.
        const revisionData = (await getRevisionData(loadId, revisionId)) as unknown[];

        for (const target of instances) {
            const parent = target.parent;
            if (!parent) {
                console.warn("[useUpdateVFXInstances] Target VFX has no parent — skipping");
                continue;
            }

            const newSubtree = await editor.deserializeObjectFromArray(revisionData as never);
            if (!newSubtree) {
                console.warn(`[useUpdateVFXInstances] Failed to deserialize VFX ${loadId}/${revisionId}`);
                continue;
            }

            // Preserve identity + transform from the original instance.
            newSubtree.uuid = target.uuid;
            newSubtree.name = target.name;
            newSubtree.position.copy(target.position);
            newSubtree.quaternion.copy(target.quaternion);
            newSubtree.scale.copy(target.scale);
            newSubtree.visible = target.visible;
            newSubtree.castShadow = target.castShadow;
            newSubtree.receiveShadow = target.receiveShadow;
            // Tag the fresh subtree with the new asset id so subsequent
            // dep walks treat it as a regular VFX instance.
            newSubtree.userData.isVFX = true;
            setVfxId(newSubtree, loadId);

            await editor.execute(new RemoveObjectCommand(target));
            await editor.execute(new AddObjectCommand(newSubtree, parent));
        }
    };
};
