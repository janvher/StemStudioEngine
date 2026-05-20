import {t} from "i18next";
import * as THREE from "three";

import Command from "./Command";
import type {NamedView} from "../editor/viewport/NamedViews";
import {captureView} from "../editor/viewport/NamedViews";
import global from "../global";

/**
 * Jump the editor camera to a NamedView. Undoes back to the camera pose
 * captured at execute() time.
 *
 * This is a camera-only change — no Object3D mutation happens. Collaboration
 * sync intentionally does NOT replicate camera moves because each user has
 * their own viewport; replicating would fight presence/viewing conventions
 * other multi-user tools already follow. If "follow another user's camera"
 * becomes a product requirement, add an opt-in flag rather than firing
 * objectChanged on this command.
 */
export class SetCameraViewCommand extends Command {
    private targetView: NamedView;
    private previousView: NamedView | null;

    constructor(targetView: NamedView) {
        super();
        this.type = "SetCameraViewCommand";
        this.name = t(`View: ${targetView.name}`);
        (this as any).editor = global?.app?.editor;
        this.targetView = targetView;
        this.previousView = null;
    }

    private applyView(view: NamedView): boolean {
        const app: any = global?.app;
        const editor: any = app?.editor;
        const camera: THREE.Camera | undefined = editor?.camera;
        if (!camera) return false;

        camera.position.set(view.position[0], view.position[1], view.position[2]);
        camera.up.set(view.up[0], view.up[1], view.up[2]);
        const targetVec = new THREE.Vector3(view.target[0], view.target[1], view.target[2]);
        camera.lookAt(targetVec);

        // The editor's orbit/pan controls store the lookAt target in their
        // own `center` vector. Push the new target in so subsequent orbiting
        // rotates around the correct point instead of snapping back.
        const controlsImpl = editor?.controls?.controls ?? editor?.controls;
        if (controlsImpl && controlsImpl.center instanceof THREE.Vector3) {
            controlsImpl.center.copy(targetVec);
        }

        // Trigger a re-render. The existing editor event path uses these two
        // calls elsewhere for camera changes.
        app?.call?.("render");
        app?.call?.("cameraChanged", this, camera);
        return true;
    }

    execute() {
        const app: any = global?.app;
        const editor: any = app?.editor;
        const camera: THREE.Camera | undefined = editor?.camera;
        if (!camera) {
            return {message: "SetCameraView: no active camera", status: "error"};
        }
        const controlsImpl = editor?.controls?.controls ?? editor?.controls;
        const center = controlsImpl?.center instanceof THREE.Vector3
            ? controlsImpl.center
            : new THREE.Vector3();
        this.previousView = captureView(camera, center, {id: "pre-" + this.targetView.id, name: "Previous"});

        const ok = this.applyView(this.targetView);
        return {
            message: ok ? `SetCameraView: ${this.targetView.name}` : "SetCameraView failed",
            status: ok ? "success" : "error",
        };
    }

    undo() {
        if (!this.previousView) {
            return {message: "SetCameraView: nothing to undo", status: "success"};
        }
        this.applyView(this.previousView);
        return {message: `SetCameraView: reverted`, status: "success"};
    }

    toJSON() {
        const output: any = Command.prototype.toJSON.call(this);
        output.targetView = this.targetView;
        output.previousView = this.previousView;
        return output;
    }

    fromJSON(json: any) {
        Command.prototype.fromJSON.call(this, json);
        this.targetView = json.targetView;
        this.previousView = json.previousView ?? null;
    }
}
