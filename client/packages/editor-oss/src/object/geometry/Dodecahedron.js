import * as THREE from "three";

import { BodyShapeType } from "@web-shared/physics/common/types";

/**
 * Dodecahedron Mesh Object
 * @class
 * @extends THREE.Mesh
 * @description A 3D dodecahedron (12-sided polyhedron with pentagonal faces) with configurable geometry and material
 */
class Dodecahedron extends THREE.Mesh {
    /**
     * Create a new Dodecahedron object
     * @param {THREE.DodecahedronGeometry} [geometry=new THREE.DodecahedronGeometry(1, 0)] - The dodecahedron geometry
     * @param {THREE.MeshStandardMaterial} [material=new THREE.MeshStandardMaterial()] - The material to apply
     */
    constructor(geometry = new THREE.DodecahedronGeometry(1, 0), material = new THREE.MeshStandardMaterial()) {
        super(geometry, material);
        this.name = _t("Dodecahedron");
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

export default Dodecahedron;
