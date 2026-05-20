import * as THREE from "three";

import { BodyShapeType } from "@web-shared/physics/common/types";

/**
 * Box Mesh Object
 * @class
 * @extends THREE.Mesh
 * @description A 3D box/cube with configurable geometry and material
 */
class Box extends THREE.Mesh {
    /**
     * Create a new Box object
     * @param {THREE.BoxGeometry} [geometry=new THREE.BoxGeometry(1, 1, 1)] - The box geometry
     * @param {THREE.MeshStandardMaterial} [material=new THREE.MeshStandardMaterial()] - The material to apply
     */
    constructor(geometry = new THREE.BoxGeometry(1, 1, 1), material = new THREE.MeshStandardMaterial()) {
        super(geometry, material);
        this.name = _t("Box");
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

export default Box;
