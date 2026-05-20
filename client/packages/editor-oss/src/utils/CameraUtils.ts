import * as THREE from "three";
import {Box3, Mesh, Object3D} from "three";

export default class CameraUtils {

    public static disableCameraCollision(target: Object3D) {
        target.traverse((child: Object3D) => {
            child.userData.disableCameraCollision = true;
        });
    }

    public static enableCameraCollision(target: Object3D) {
        target.traverse((child: Object3D) => {
            child.userData.disableCameraCollision = false;
        });
    }
    
}
