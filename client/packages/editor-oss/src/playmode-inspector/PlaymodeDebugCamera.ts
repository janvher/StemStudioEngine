import * as THREE from "three";

import GameManager from "../behaviors/game/GameManager";
import {OrbitControls} from "../controls/OrbitControls";

type CameraSnapshot = {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
};

export class PlaymodeDebugCamera {
    private camera: THREE.PerspectiveCamera;
    private domElement: HTMLElement;
    private controls: OrbitControls | null = null;
    private cameraPoseBeforeAttach: CameraSnapshot | null = null;
    private game: GameManager | null = null;
    private cameraControlWasPaused = false;
    private _active = false;

    constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
        this.camera = camera;
        this.domElement = domElement;
    }

    get active(): boolean {
        return this._active;
    }

    attach(game: GameManager | null): void {
        if (this._active) return;
        this.game = game;
        this.cameraPoseBeforeAttach = {
            position: this.camera.position.clone(),
            quaternion: this.camera.quaternion.clone(),
        };

        const cameraControl = (this.game as any)?.cameraControl as
            | {pause: () => void; resume: () => void; isPaused?: boolean}
            | undefined;
        if (cameraControl) {
            this.cameraControlWasPaused = cameraControl.isPaused === true;
            cameraControl.pause();
        }

        const controls = new OrbitControls(this.camera, this.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enableZoom = true;
        controls.panSpeed = 1.6;
        // Place orbit target ~5 units in front of the saved camera pose.
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.cameraPoseBeforeAttach.quaternion);
        controls.target.copy(this.cameraPoseBeforeAttach.position).addScaledVector(forward, 5);
        controls.update();
        this.controls = controls;
        this._active = true;
    }

    update(): void {
        if (!this._active || !this.controls) return;
        this.controls.update();
    }

    detach(): void {
        if (!this._active) return;
        this.controls?.dispose();
        this.controls = null;

        // Keep the user's chosen viewpoint: push the new camera pose into the
        // game camera controller so it follows the player from this offset
        // instead of snapping back to where Free Cam started. If we can't adopt
        // the pose (no character / unsupported control type) fall back to
        // restoring the original pose so the camera doesn't end up stuck inside
        // geometry the user flew into.
        const cameraControl = (this.game as any)?.cameraControl as
            | {
                  pause: () => void;
                  resume: () => void;
                  isPaused?: boolean;
                  adoptCameraPose?: () => boolean;
              }
            | undefined;

        const adopted = cameraControl?.adoptCameraPose?.() ?? false;
        if (!adopted && this.cameraPoseBeforeAttach) {
            this.camera.position.copy(this.cameraPoseBeforeAttach.position);
            this.camera.quaternion.copy(this.cameraPoseBeforeAttach.quaternion);
            this.camera.updateMatrixWorld();
        }
        this.cameraPoseBeforeAttach = null;

        if (cameraControl && !this.cameraControlWasPaused) {
            cameraControl.resume();
        }
        this.game = null;
        this._active = false;
    }

    dispose(): void {
        this.detach();
    }
}
