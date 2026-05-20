import * as THREE from "three";

import { BodyShapeType } from "@web-shared/physics/common/types";

/**
 * Ring Mesh Object
 * @class
 * @extends THREE.Mesh
 * @description A 3D flat ring (washer shape) with configurable geometry and material
 */
class Ring extends THREE.Mesh {
    /**
     * Create a new Ring object
     * @param {THREE.RingGeometry} [geometry=new THREE.RingGeometry(0.5, 1, 32)] - The ring geometry
     * @param {THREE.MeshStandardMaterial} [material=new THREE.MeshStandardMaterial()] - The material to apply
     */
    constructor(geometry = new THREE.RingGeometry(0.5, 1, 32), material = new THREE.MeshStandardMaterial()) {
        super(geometry, material);
        this.name = _t("Ring");
        this.castShadow = true;
        this.receiveShadow = true;

        // Set up default physics properties
        this.userData.physics = this.userData.physics || {
            enabled: true,
            type: "rigidBody",
            shape: BodyShapeType.BOX,
            mass: 0,
            inertia: {
                x: 0,
                y: 0,
                z: 0,
            },
            restitution: 0,
            ctype: "Static",
        };
    }
}

export default Ring;
