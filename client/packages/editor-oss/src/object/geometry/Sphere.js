import * as THREE from "three";

import { BodyShapeType } from "@web-shared/physics/common/types";

/**
 * Sphere Mesh Object
 * @class
 * @extends THREE.Mesh
 * @description A 3D sphere with configurable geometry and material
 */
class Sphere extends THREE.Mesh {
    /**
     * Create a new Sphere object
     * @param {THREE.SphereGeometry} [geometry=new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI)] - The sphere geometry
     * @param {THREE.MeshStandardMaterial} [material=new THREE.MeshStandardMaterial()] - The material to apply
     */
    constructor(
        geometry = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI),
        material = new THREE.MeshStandardMaterial(),
    ) {
        super(geometry, material);
        this.name = _t("Sphere");
        this.castShadow = true;
        this.receiveShadow = true;

        // Set up default physics properties
        this.userData.physics = this.userData.physics || {
            enabled: true,
            type: "rigidBody",
            shape: BodyShapeType.SPHERE,
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

export default Sphere;
