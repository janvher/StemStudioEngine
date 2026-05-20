import * as THREE from "three";

import { BodyShapeType } from "@web-shared/physics/common/types";

/**
 * Octahedron Mesh Object
 * @class
 * @extends THREE.Mesh
 * @description A 3D octahedron (8-sided polyhedron) with configurable geometry and material
 */
class Octahedron extends THREE.Mesh {
    /**
     * Create a new Octahedron object
     * @param {THREE.OctahedronGeometry} [geometry=new THREE.OctahedronGeometry(1, 0)] - The octahedron geometry
     * @param {THREE.MeshStandardMaterial} [material=new THREE.MeshStandardMaterial()] - The material to apply
     */
    constructor(geometry = new THREE.OctahedronGeometry(1, 0), material = new THREE.MeshStandardMaterial()) {
        super(geometry, material);
        this.name = _t("Octahedron");
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

export default Octahedron;
