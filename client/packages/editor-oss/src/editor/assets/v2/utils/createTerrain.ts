import * as THREE from "three";

import {getPhysics} from "./getPhysics";
import {TERRAIN_BEHAVIOR_ID} from "@stem/editor-oss/EngineRuntime";
import {AddObjectCommand} from "@stem/editor-oss/command/Commands";

export const handleAddTerrain = async (editor: any): Promise<void> => {
    let hasTerrain = false;
    editor.scene.traverse((object: THREE.Object3D) => {
        const behaviors = object.userData?.behaviors;
        if (Array.isArray(behaviors)) {
            const behavior = behaviors.find(b => b.id === TERRAIN_BEHAVIOR_ID);
            if (behavior) {
                hasTerrain = true;
            }
        }
    });

    if (!hasTerrain) {
        const material = new THREE.MeshStandardMaterial({color: 0x228b22, transparent: true, opacity: 0.0});
        const geometry = new THREE.BoxGeometry(50, 0.001, 50);
        const terrain = new THREE.Mesh(geometry, material);

        const terrainWrapper = new THREE.Object3D();
        terrainWrapper.add(terrain);
        terrain.name = "Terrain";

        await editor.addBehaviorToObject(terrain, TERRAIN_BEHAVIOR_ID);
        addObjectToSceneInCameraView(terrain, editor);

        // In sandbox mode, make the terrain not selectable
        if (editor.isSandbox) {
            terrain.userData.isSelectable = false;
        }

        terrain.userData.physics = {
            ...getPhysics(null),
            enabled: true,
            type: "rigidBody",
            shape: "btConcaveHullShape",
            ctype: "Static",
        };
    }
};

const addObjectToSceneInCameraView = (object: THREE.Object3D, editor: any) => {
    editor.moveObjectToCameraClosestPoint(object);
    addObjectToSceneCenter(object, undefined, editor);
};

const addObjectToSceneCenter = (object: THREE.Object3D, offset?: THREE.Vector3, editor?: any) => {
    if (offset) {
        object.position.add(offset);
    }
    // add command already selects the object
    editor.execute(new (AddObjectCommand as any)(object));
};
