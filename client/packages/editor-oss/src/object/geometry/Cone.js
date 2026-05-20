import * as THREE from "three";

import {BodyShapeType} from "@web-shared/physics/common/types";

/**
 * Cone Mesh Object
 * @class
 * @extends THREE.Mesh
 * @description A 3D cone with configurable geometry and material
 */
class Cone extends THREE.Mesh {
    /**
     * Create a new Cone object
     * @param {THREE.ConeGeometry} [geometry=new THREE.ConeGeometry(1, 2, 32)] - The cone geometry
     * @param {THREE.MeshStandardMaterial} [material=new THREE.MeshStandardMaterial()] - The material to apply
     */
    constructor(geometry = new THREE.ConeGeometry(1, 2, 32), material = new THREE.MeshStandardMaterial()) {
        super(geometry, material);
        this.name = _t("Cone");
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

export default Cone;
