import * as THREE from "three";

/**
 * Tetrahedron Mesh Object
 * @class
 * @extends THREE.Mesh
 * @description A 3D tetrahedron (triangular pyramid) with configurable geometry and material
 */
class Triangle extends THREE.Mesh {
    /**
     * Create a new Tetrahedron object
     * @param {THREE.TetrahedronGeometry} [geometry=new THREE.TetrahedronGeometry(1, 0)] - The tetrahedron geometry
     * @param {THREE.MeshStandardMaterial} [material=new THREE.MeshStandardMaterial()] - The material to apply
     */
    constructor(geometry = new THREE.TetrahedronGeometry(1, 0), material = new THREE.MeshStandardMaterial()) {
        super(geometry, material);
        this.name = _t("Triangle");
        this.castShadow = true;
        this.receiveShadow = true;

        // Set up default physics properties
        this.userData.physics = this.userData.physics || {
            enabled: true,
            type: "rigidBody",
            shape: "btBoxShape",
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

export default Triangle;
