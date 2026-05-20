import {Object3D, Scene} from "three";

import {AssetType} from "@stem/network/api/asset";
import {emptyAssetResolutionContext, getAssetResolutionContext} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {traverseAssetRefs} from "@stem/editor-oss/asset-management/dependencies";
import BehaviorData from "../../../behaviors/BehaviorData";
import {RemoveObjectCommand} from "@stem/editor-oss/command/Commands";
import Editor from "../../../editor/Editor";
import global from "@stem/editor-oss/global";

export const removeAssetInstancesFromScene = async (
    editor: Editor,
    scene: Scene,
    assetIds: string[],
): Promise<void> => {
    const sceneContext = getAssetResolutionContext(scene) || emptyAssetResolutionContext;
    const objectsToRemove: Object3D[] = [];
    const app = global.app!;
    traverseAssetRefs(scene, sceneContext, (assetId, context, source) => {
        // Don't decend into prefabs when removing from the scene - ensure the
        // context is the same as the scene context.
        if (context !== sceneContext) {
            return;
        }

        const shouldRemove = assetIds.includes(assetId);
        if (!shouldRemove) {
            return;
        }

        switch (source.type) {
            case "behaviorAttribute": {
                source.behavior.attributesData![source.attribute] = null;
                break;
            }
            case AssetType.Behavior: {
                const behaviors = source.object.userData.behaviors as BehaviorData[];
                const index = behaviors.indexOf(source.behavior);
                if (index >= 0) {
                    behaviors.splice(index, 1);
                }
                break;
            }
            case "behaviorImport": {
                const behaviors = source.object.userData.behaviors as BehaviorData[];
                const index = behaviors.indexOf(source.behavior);
                if (index >= 0) {
                    behaviors.splice(index, 1);
                }
                break;
            }
            case AssetType.Audio: {
                const gameStartMenu = app?.editor?.scene.userData.gameUI?.gameStartMenu;
                const inGameMenu = app?.editor?.scene.userData.gameUI?.inGameMenu;
                if (gameStartMenu.menu_music.ID === assetId) {
                    gameStartMenu.menu_music = undefined;
                }
                if (inGameMenu.menu_music.ID === assetId) {
                    gameStartMenu.menu_music = undefined;
                }
                break;
            }
            case AssetType.Model:
            case AssetType.Prefab:
                objectsToRemove.push(source.object);
                break;
            case "lambdaImport": {
                const lambdaComponents = source.object.userData.lambdaComponents as import("../../../lambdas/Lambda").LambdaComponentData[];
                const index = lambdaComponents.indexOf(source.lambdaComponent);
                if (index >= 0) {
                    lambdaComponents.splice(index, 1);
                }
                break;
            }
            case "materialSetting":
                source.textures[source.key] = "";
                break;
            case "textureMap": {
                const {material, key} = source;
                (material as any)[key] = null;
                material.needsUpdate = true;
                break;
            }
        }
    });

    for (const object of objectsToRemove) {
        await editor.execute(new RemoveObjectCommand(object));
    }
};
