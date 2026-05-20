
/**
 * Module: ControlsManager.js
 * Purpose: Contains logic for controls manager.
 */


import * as THREE from "three";

import BaseControls from "./BaseControls";
import EditorControls from "./EditorControls";
import FirstPersonControls from "./FirstPersonControls";
import FreeControls from "./FreeControls";
import global from "@web-shared/global";

const Controls = {
    EditorControls,
    FreeControls,
    FirstPersonControls,
};

/**
 *
 * @author tengge1 / https://github.com/tengge1
 */
class ControlsManager extends BaseControls {
    constructor(camera, domElement) {
        super(camera, domElement);

        this.handleUpdate = this.handleUpdate.bind(this);
        this.handleEnd = this.handleEnd.bind(this);

        const mode = global.app.storage.controlMode;
        this.changeMode(mode);

        this.lastControl = this.current;

        this.lastCamera = new THREE.Object3D();

        global.app.on(`animate.${this.id}`, this.update.bind(this));
        global.app.on(`gpuPick.${this.id}`, this.onGPUPick.bind(this));
    }

    // CHECK: do we need to save the camera state in localStorage?
    // It seems like we can just rely on the app's camera state and not persist it across sessions.
    // Let's keep it for now, but we might want to remove this if it's not necessary.
    saveCamera() {
        const camera = global.app.editor.camera;
        const controls = this.current?.controls;
        const target = controls?.target || new THREE.Vector3(0, 0, 0);
        const sceneId = global.app.editor.sceneID;

        const allData = JSON.parse(localStorage.getItem("savedCameras") || "{}");

        allData[sceneId] = {
            position: camera.position.toArray(),
            target: target.toArray(),
        };

        localStorage.setItem("savedCameras", JSON.stringify(allData));
        console.log(`Camera saved for scene ${sceneId}:`, allData[sceneId]);
    }

    initCameraPosition() {
        const camera = global.app.editor.camera;
        // Delete incorrect characterOptions from global camera if still present
        if (camera.userData?.characterOptions) {
            delete camera.userData.characterOptions;
        }
        if (camera.userData?.cameraData.characterOptions) {
            delete camera.userData?.cameraData.characterOptions;
        }
        const controls = this.current?.controls;

        // Reset camera orientation to default Y-up (XZ horizontal, Y vertical)
        camera.up.set(0, 1, 0);
        camera.rotation.set(0, 0, 0);
        camera.quaternion.identity();
        camera.position.set(0, 10, 25);

        if (controls) {
            controls.target.set(0, 0, 0);
            controls.update();
        }
    }

    loadCamera() {
        const camera = global.app.editor.camera;
        const controls = this.current?.controls;
        const sceneId = global.app.editor.sceneID;
        const allData = JSON.parse(localStorage.getItem("savedCameras") || "{}");
        const data = allData[sceneId];

        // Always enforce Y-up orientation when loading camera
        camera.up.set(0, 1, 0);

        if (data) {
            camera.position.fromArray(data.position);

            if (controls && data.target) {
                controls.target.fromArray(data.target);
                controls.update();
            }

            console.log(`Camera loaded for scene ${sceneId}:`, data);
        } else {
            console.log(`No saved camera for scene ${sceneId}`);
        }
    }

    
    changeMode(modeName) {
        if (!Controls[modeName]) {
            console.warn(`ControlsManager: ${modeName} is not defined.`);
            return;
        }
        this.changeControl(new Controls[modeName](this.camera, this.domElement));
    }

    changeControl(control) {
        console.log(`ControlsManager: is already enabled.`);
        if (this.current) {
            let camera = global.app.editor.camera;

            if (!(this.current instanceof FirstPersonControls)) {
                this.lastControl = this.current;
                this.lastCamera.position.copy(camera.position);
                this.lastCamera.rotation.copy(camera.rotation);
                this.lastCamera.scale.copy(camera.scale);
            }

            this.current.disable();
            this.current.on(`update.${this.id}`, null);
            this.current.on(`end.${this.id}`, null);
            this.call("change", this, false, this.current.constructor.name, this.current); // enabled, controlName, control
        }

        this.current = control;
        this.current.enable();
        this.current.on(`update.${this.id}`, this.handleUpdate);
        this.current.on(`end.${this.id}`, this.handleEnd);
        this.call("change", this, true, this.current.constructor.name, this.current);
    }

    enable() {
        this.enabled = true;
        if (this.current) this.current.enable();
    }

    disable() {
        this.enabled = false;
        if (this.current) this.current.disable();
    }

    focus(target) {
        if (this.current) this.current.focus(target);
    }

    update(clock, deltaTime) {
        if (this.current) this.current.update(clock, deltaTime);
    }

    setPickPosition(position) {
        if (this.current) this.current.setPickPosition(position);
    }

    onGPUPick(obj) {
        if (obj.point) {
            this.setPickPosition(obj.point);
        }
    }

    handleUpdate() {
        // TODO
        // global.app.call('cameraChanged', this, global.app.editor.camera);
    }

    
    handleEnd() {
        this.changeControl(this.lastControl);

        let camera = global.app.editor.camera;

        camera.position.copy(this.lastCamera.position);
        camera.rotation.copy(this.lastCamera.rotation);
        camera.scale.copy(this.lastCamera.scale);
    }

    dispose() {
        global.app.on(`animate.${this.id}`, null);
        if (this.current) this.current.dispose();
    }
}

export default ControlsManager;
