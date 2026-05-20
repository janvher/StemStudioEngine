import * as THREE from "three";

import CameraUtils from "./CameraUtils";

describe('CameraUtils', () => {
    describe('disableCameraCollision', () => {
        it('should set userData.disableCameraCollision to true on object and its descendants', () => {
            const object = new THREE.Object3D();
            const childObject = new THREE.Object3D();
            object.add(childObject);
            CameraUtils.disableCameraCollision(object);
            expect(object.userData.disableCameraCollision).toBe(true);
            expect(childObject.userData.disableCameraCollision).toBe(true);
        });
    });
});
