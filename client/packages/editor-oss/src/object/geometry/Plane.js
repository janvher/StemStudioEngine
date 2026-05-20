import * as THREE from "three";

import { BodyShapeType } from "@web-shared/physics/common/types";

/**
 * Plane Mesh Object
 * @class
 * @extends THREE.Mesh
 * @description A 3D plane/floor with configurable geometry and material
 */
class Plane extends THREE.Mesh {
    /**
     * Create a new Plane object
     * @param {THREE.PlaneGeometry} [geometry=new THREE.PlaneGeometry(50, 50).rotateX(-Math.PI / 2)] - The plane geometry
     * @param {THREE.Material} [material=new THREE.MeshStandardMaterial()] - The material to apply
     */
    constructor(geometry = new THREE.PlaneGeometry(50, 50).rotateX(-Math.PI / 2), material = new THREE.MeshStandardMaterial()) {
        super(geometry, material);
        this.name = _t("Plane");
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

export default Plane;
