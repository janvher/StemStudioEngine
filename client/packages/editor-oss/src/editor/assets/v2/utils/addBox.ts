import * as THREE from "three";

import {generateRandomColor} from "./generateRandomColor";
import {AddObjectCommand} from "@stem/editor-oss/command/Commands";
import Box from "../../../../object/geometry/Box";
import {generateUniqueName} from "../../../../v2/pages/services";
import {PRIMITIVES_NAME} from "../LeftPanel/MainTabs/AssetsTab/SubTabs/PrimitivesTab";

export const handleAddBox = (callback?: any, editor?: any, app?: any, addAsCharacter?: boolean) => {
    const material = new THREE.MeshStandardMaterial({
        color: generateRandomColor(),
    });
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const box = new Box(geometry, material);
    const uniqueName = generateUniqueName(PRIMITIVES_NAME.BOX, getExistingNames(editor));
    box.name = uniqueName;

    addObjectToSceneInCameraView(box, editor);
    callback && callback(box);

    if (app && addAsCharacter) {
        const behaviorData = editor!.addBehaviorToObject(box, "character");
        if (behaviorData) {
            // Only create runtime behavior if GameManager has an active scene (play mode).
            // In edit mode the behavior config is stored on the editor side and
            // GameManager will pick it up when play mode starts.
            if (app!.game?.scene) {
                const behaviorOptions = {
                    uuid: behaviorData.uuid,
                    attributes: behaviorData.attributesData,
                    throttleConfig: behaviorData.throttleConfig,
                };
                app!.game.addBehaviorToObject(box, "character", behaviorOptions);
            }
        }

        app!.call(`objectChanged`, app!.editor, editor.selected);
    }
};

const addObjectToSceneInCameraView = (object: THREE.Object3D, editor: any) => {
    editor.moveObjectToCameraClosestPoint(object);
    const geometry = (object as any).geometry as THREE.BufferGeometry;
    if (geometry && geometry.boundingBox === null) {
        geometry.computeBoundingBox();
    }

    const boundingBox = geometry?.boundingBox;
    if (boundingBox) {
        const height = boundingBox.max.y - boundingBox.min.y;
        object.position.y += height / 2;
    }

    editor.execute(new (AddObjectCommand as any)(object));
};

export const getExistingNames: (editor: any) => Set<string> = editor => {
    return new Set(editor.scene.children.map((obj: any) => obj.name));
};
