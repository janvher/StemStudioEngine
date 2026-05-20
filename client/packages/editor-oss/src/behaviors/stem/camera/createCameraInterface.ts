import { PerspectiveCamera } from 'three';

import { StemCamera } from './StemCamera';
import GameManager from '../../game/GameManager';

export const createCameraInterface = (game: GameManager): StemCamera => {
    const getCamera = (): PerspectiveCamera => {
        const cam = game.camera;
        if (!cam) {
            throw new Error('Camera is not available');
        }
        return cam;
    };

    return {
        get position() {
            return getCamera().position;
        },
        get quaternion() {
            return getCamera().quaternion;
        },
        get fov() {
            return getCamera().fov;
        },
        set fov(value: number) {
            const cam = getCamera();
            cam.fov = value;
            cam.updateProjectionMatrix();
        },
        get near() {
            return getCamera().near;
        },
        set near(value: number) {
            const cam = getCamera();
            cam.near = value;
            cam.updateProjectionMatrix();
        },
        get far() {
            return getCamera().far;
        },
        set far(value: number) {
            const cam = getCamera();
            cam.far = value;
            cam.updateProjectionMatrix();
        },
        lookAt(x: number, y: number, z: number) {
            getCamera().lookAt(x, y, z);
        },
    };
};
