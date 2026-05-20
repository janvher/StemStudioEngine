import {Material, Mesh, Object3D, SkinnedMesh} from "three";

import {useCreateModel} from "./models";
import {ModelFormat} from "@stem/network/api/asset";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import global from "@stem/editor-oss/global";
import {convertToGlb} from "@stem/editor-oss/model/convertToGlb";
import {isModelAssetInstance, setModelId, setModelRevisionId} from "@stem/editor-oss/model/util";
import {showToast} from "@stem/editor-oss/showToast";
import Converter from "@stem/editor-oss/utils/Converter";
import {ModelUtils} from "@stem/editor-oss/utils/ModelUtils";

const THUMBNAIL_SIZE = 512;

/**
 * Clone materials on every mesh so convertToGlb's internal cloneObject
 * shares the clones (not the originals). applyTextureFixes then mutates
 * the clones, keeping the originals untouched and preventing a WebGPU
 * renderer crash from null textures on in-scene materials.
 *
 * Returns a restore function that swaps the originals back.
 * @param obj
 */
const cloneMaterials = (obj: Object3D): (() => void) => {
    const originals = new Map<string, Material | Material[]>();
    obj.traverse(child => {
        if (!(child instanceof Mesh || child instanceof SkinnedMesh)) return;
        originals.set(child.uuid, child.material);
        if (Array.isArray(child.material)) {
            child.material = child.material.map((m: Material) => m.clone());
        } else {
            child.material = child.material.clone();
        }
    });
    return () => {
        obj.traverse(child => {
            if ((child instanceof Mesh || child instanceof SkinnedMesh) && originals.has(child.uuid)) {
                child.material = originals.get(child.uuid)!;
            }
        });
    };
};

export const useUngroupModelAsset = () => {
    const createModel = useCreateModel();
    const {setAssetRevision} = useAssetResolutionContext();

    const ungroupModelAsset = async (group: Object3D) => {
        if (!group || !isModelAssetInstance(group)) {
            global.app?.editor?.ungroupElements(group);
            return;
        }

        const parent = group.parent;
        if (!parent) return;

        const children = [...group.children];
        if (children.length === 0) return;

        const editor = global.app?.editor;
        if (!editor) return;

        const abortController = new AbortController();
        const parentMaterialSettings = group.userData?.materialSettings;

        showToast({
            type: "info",
            title: "Ungrouping model...",
            body: `Uploading ${children.length} child(ren) as separate model assets.`,
        });

        try {
            for (const child of children) {
                // Clone materials so convertToGlb mutates clones, not originals.
                // This prevents the WebGPU renderer from seeing null textures.
                const restoreMaterials = cloneMaterials(child);

                const glbBuffer = await convertToGlb(child, abortController.signal, {});

                // Swap back the original, untouched materials
                restoreMaterials();

                const thumbnailUrl = await ModelUtils.createThumbnailFromModel(child, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
                const thumbnailFile = (Converter as any).dataURLtoFile(thumbnailUrl, "thumbnail") as File;

                const blob = new Blob([glbBuffer], {type: "model/gltf-binary"});

                const childName = child.name || `${group.name}_part`;
                const asset = await createModel({
                    name: childName,
                    blob,
                    format: ModelFormat.Glb,
                    contentType: "model/gltf-binary",
                    thumbnail: {
                        file: thumbnailFile,
                        width: THUMBNAIL_SIZE,
                        height: THUMBNAIL_SIZE,
                    },
                });

                setModelId(child, asset.id);
                setModelRevisionId(child, asset.headRevisionId);

                if (parentMaterialSettings) {
                    child.userData.materialSettings = parentMaterialSettings;
                }

                setAssetRevision(asset.id, asset.headRevisionId);
            }

            editor.ungroupElements(group);

            showToast({
                type: "success",
                title: "Model ungrouped",
                body: `${children.length} child(ren) saved as separate model assets.`,
            });
        } catch (err) {
            console.error("Failed to ungroup model asset:", err);
            showToast({
                type: "error",
                title: "Failed to ungroup model",
                body: String(err),
            });
        }
    };

    return ungroupModelAsset;
};
