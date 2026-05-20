
/**
 * Module: GPUPickEvent.js
 * Purpose: Contains logic for gpupick event.
 */

import {Line3, Plane, Raycaster, Vector2, Vector3} from "three";

import BaseEvent from "./BaseEvent";
import {GPUPicker} from "../assets/js/gpupicker/gpupicker";
import {QualityManager} from "../core/quality/QualityManager";
import global from "../global";
import {getPickBlockReason, resolveSelectionTargetFromPickHit} from "./picking/pickTargetUtils";
import {DetectDevice} from "../utils/DetectDevice";
import MeshUtils from "../utils/MeshUtils";

class GPUPickEvent extends BaseEvent {
    constructor() {
        super();
        this.isIn = false;
        this.offsetX = 0;
        this.offsetY = 0;
        this.waitTime = 10;
        this.oldTime = 0;

        this.selectMode = "whole";
        this.mouse = new Vector2();
        this.raycaster = new Raycaster();
        this.world = new Vector3();
        this.nearPosition = new Vector3();
        this.farPosition = new Vector3();
        this.line = new Line3(this.nearPosition, this.farPosition);
        this.plane = new Plane().setFromNormalAndCoplanarPoint(new Vector3(0, 1, 0), new Vector3());
        this.gpuPicker = null;
        this.pickingInProgress = false;
    }

    start() {
        global.app.on(`mousemove.${this.id}`, this.onMouseMove);
        global.app.on(`afterRender.${this.id}`, this.onAfterRender);
        global.app.on(`resize.${this.id}`, this.onResize);
        global.app.on(`storageChanged.${this.id}`, this.onStorageChanged);

        this.selectMode = global.app.storage.selectMode;
    }

    stop() {
        global.app.on(`mousemove.${this.id}`, null);
        global.app.on(`afterRender.${this.id}`, null);
        global.app.on(`resize.${this.id}`, null);
        global.app.on(`storageChanged.${this.id}`, null);

        this.selectMode = "whole";
        this.disposePicker();
    }

    reset() {}

    onMouseMove = event => {
        if (event.target !== global.app.editor?.renderer.domElement) {

            this.isIn = false;
            global.app.call(`gpuPick`, this, {
                object: null,
                point: null,
                distance: 0,
            });
            return;
        }
        this.isIn = true;
        this.offsetX = event.offsetX;
        this.offsetY = event.offsetY;
    };

    
    onAfterRender = async () => {
        if (!this.isIn || global.app.editor.gpuPickNum === 0 || this.pickingInProgress) {
            return;
        }

        let now = new Date().getTime();
        if (now - this.oldTime < this.waitTime) {
            return;
        }
        this.oldTime = now;

        const {scene, renderer} = global.app.editor;
        const camera =
            global.app.editor.view === "perspective" ? global.app.editor.camera : global.app.editor.orthCamera;

        const width = renderer.domElement.clientWidth || renderer.domElement.width;
        const height = renderer.domElement.clientHeight || renderer.domElement.height;

        this.mouse.set(
            this.offsetX / width * 2 - 1,
            -this.offsetY / height * 2 + 1,
        );
        this.raycaster.setFromCamera(this.mouse, camera);

        this.ensurePicker(renderer, scene, camera);

        let intersections = [];
        if (this.gpuPicker) {
            const qualityManager = QualityManager.getInstance();
            const pixelRatio =
                Math.max(
                    1,
                    Math.min(
                        3,
                        (window.devicePixelRatio || 1) *
                            (qualityManager.getCurrentSettings().rendering.pixelRatio || 1),
                    ),
                ) * (DetectDevice.isMobile() ? 0.75 : 1);

            this.pickingInProgress = true;
            try {
                const objId = await this.gpuPicker._doPick(this.offsetX * pixelRatio, this.offsetY * pixelRatio, undefined);
                const pickedObject = objId ? scene.getObjectById(objId) : null;
                if (pickedObject) {
                    intersections = this.raycaster.intersectObject(pickedObject, true);
                }
            } catch {
                intersections = this.raycaster.intersectObjects(scene.children, true);
            } finally {
                this.pickingInProgress = false;
            }
        } else {
            intersections = this.raycaster.intersectObjects(scene.children, true);
        }

        const hit = intersections.find(intersection => {
            const target = resolveSelectionTargetFromPickHit(intersection?.object);
            return !getPickBlockReason(target, {app: global.app, editor: global.app.editor});
        }) || null;

        let selected = resolveSelectionTargetFromPickHit(hit?.object) || null;
        let cameraDepth = 0;

        if (hit?.point) {
            this.world.copy(hit.point);
            cameraDepth = hit.distance;
        } else {
            this.nearPosition.copy(this.raycaster.ray.origin);
            this.farPosition.copy(this.raycaster.ray.direction).multiplyScalar(camera.far).add(this.nearPosition);
            this.line.set(this.nearPosition, this.farPosition);
            if (
                !this.raycaster.ray.intersectPlane(this.plane, this.world) &&
                !this.plane.intersectLine(this.line, this.world)
            ) {
                this.world.copy(this.farPosition);
            }
            cameraDepth = this.world.distanceTo(camera.position);
        }

        if (selected && this.selectMode === "whole") {

            selected = MeshUtils.partToMesh(selected);
        }

        global.app.call(`gpuPick`, this, {
            object: selected,
            point: this.world,
            distance: cameraDepth,
        });
    };

    onResize = () => {};

    onStorageChanged = (name, value) => {
        if (name === "selectMode") {
            this.selectMode = value;
        }
    };

    ensurePicker(renderer, scene, camera) {
        if (this.gpuPicker) {
            const needsRecreate =
                this.gpuPicker.renderer !== renderer || this.gpuPicker.scene !== scene || this.gpuPicker.camera !== camera;
            if (!needsRecreate) return;
            this.disposePicker();
        }

        if (!renderer?.isWebGPURenderer) return;

        try {
            this.gpuPicker = new GPUPicker(renderer, scene, camera, 1);
        } catch {
            this.gpuPicker = null;
        }
    }

    disposePicker() {
        try {
            this.gpuPicker?.dispose();
        } catch {
            // ignore dispose errors
        }
        this.gpuPicker = null;
        this.pickingInProgress = false;
    }
}

export default GPUPickEvent;
