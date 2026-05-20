import * as THREE from "three";

import {CESIUM_BEHAVIOR_ID} from "@stem/editor-oss/EngineRuntime";
import {AddObjectCommand} from "@stem/editor-oss/command/Commands";
import global from "@stem/editor-oss/global";

export const handleAddCesium = async (editor: any): Promise<void> => {
    let hasCesium = false;
    editor.scene.traverse((object: THREE.Object3D) => {
        const behaviors = object.userData?.behaviors;
        if (Array.isArray(behaviors)) {
            const behavior = behaviors.find(b => b.id === CESIUM_BEHAVIOR_ID);
            if (behavior) {
                hasCesium = true;
            }
        }
    });

    if (hasCesium) {
        return;
    }

    editor.scene.userData = {
        ...editor.scene.userData,
        cesium: {
            ...editor.scene.userData?.cesium,
            enabled: true,
        },
    };

    const app = (global as {app?: any}).app;
    if (typeof app?.recreateRenderer === "function") {
        await app.recreateRenderer();
    }

    const object = new THREE.Object3D();
    object.name = "Cesium Globe";
    editor.execute(new (AddObjectCommand as any)(object));
    await editor.addBehaviorToObject(object, CESIUM_BEHAVIOR_ID);
};
