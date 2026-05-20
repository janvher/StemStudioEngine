import * as THREE from "three";

import { BodyShapeType } from "@web-shared/physics/common/types";

/**
 * Capsule Mesh Object
 * @class
 * @extends THREE.Mesh
 * @description A 3D capsule (pill shape - cylinder with hemisphere caps) with configurable geometry and material
 */
class Capsule extends THREE.Mesh {
    /**
     * Create a new Capsule object
     * @param {THREE.CapsuleGeometry} [geometry=new THREE.CapsuleGeometry(0.5, 1, 4, 8)] - The capsule geometry
     * @param {THREE.MeshStandardMaterial} [material=new THREE.MeshStandardMaterial()] - The material to apply
     */
    constructor(geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8), material = new THREE.MeshStandardMaterial()) {
        super(geometry, material);
        this.name = _t("Capsule");
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

export default Capsule;
