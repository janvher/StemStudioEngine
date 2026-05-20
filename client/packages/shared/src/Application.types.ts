import * as THREE from "three";

export type ObjectSnapshot = {
    uuid: string;
    parent: string;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
    visible: boolean;
};
