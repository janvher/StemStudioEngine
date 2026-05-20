import * as THREE from "three";

import { BodyShapeType } from "@web-shared/physics/common/types";

/**
 * Cylinder Mesh Object
 * @class
 * @extends THREE.Mesh
 * @description A 3D cylinder with configurable geometry and material
 */
class Cylinder extends THREE.Mesh {
    /**
     * Create a new Cylinder object
     * @param {THREE.CylinderGeometry} [geometry=new THREE.CylinderGeometry(1, 1, 2, 32, 1, false)] - The cylinder geometry
     * @param {THREE.MeshStandardMaterial} [material=new THREE.MeshStandardMaterial()] - The material to apply
     */
    constructor(
        geometry = new THREE.CylinderGeometry(1, 1, 2, 32, 1, false),
        material = new THREE.MeshStandardMaterial(),
    ) {
        super(geometry, material);
        this.name = _t("Cylinder");
        this.castShadow = true;
        this.receiveShadow = true;

        // Set up default physics properties
        this.userData.physics = this.userData.physics || {
            enabled: true,
            type: "rigidBody",
            shape: BodyShapeType.CAPSULE,
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

export default Cylinder;
