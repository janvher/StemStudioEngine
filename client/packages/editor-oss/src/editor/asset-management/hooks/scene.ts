import {useRemoveEditorDependencies} from "./assets";
import {saveScene} from "@stem/network/api/scene";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {ElementsUtils} from "@stem/editor-oss/utils/ElementsUtils";
import {removeAssetInstancesFromScene} from "../util/scene";

export const useRemoveAssetInstancesFromScene = () => {
    return (assetIds: string[]) => {
        const editor = global.app?.editor;
        const scene = global.app?.scene;
        if (!editor || !scene) {
            throw new Error("Editor or scene not found");
        }

        return removeAssetInstancesFromScene(editor, scene, assetIds);
    };
};

export const useRemoveAssetsAndInstancesFromScene = () => {
    const removeAssetInstancesFromScene = useRemoveAssetInstancesFromScene();
    const removeEditorDependencies = useRemoveEditorDependencies();

    const handleRemoveAssetsFromSceneOk = async (assetIds: string[]) => {
        await removeAssetInstancesFromScene(assetIds);
        await removeEditorDependencies.mutateAsync(assetIds);

        // Save to persist both the dependency removal and instance removal
        await saveScene(false, false);
    };

    return (assetIds: string[]) => {
        return new Promise<void>((resolve, reject) => {
            ElementsUtils.confirm({
                title: "Confirm",
                content:
                    "Removing an asset from the scene will also remove all instances of it from the scene. Are you sure you want to continue?",
                onOK: () => {
                    handleRemoveAssetsFromSceneOk(assetIds)
                        .then(() => {
                            showToast({
                                type: "success",
                                title: `Removed ${assetIds.length > 1 ? "assets" : "asset"} from scene.`,
                            });
                            resolve();
                        })
                        .catch(error => {
                            console.error("Error removing assets from scene:", error);
                            showToast({
                                type: "error",
                                title: `Failed to remove ${assetIds.length > 1 ? "assets" : "asset"} from scene.`,
                            });
                            reject(new Error("Failed to remove assets from scene"));
                        });
                },
            });
        });
    };
};
