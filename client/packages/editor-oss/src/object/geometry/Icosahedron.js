import * as THREE from "three";

/**
 * Icosahedron Mesh Object
 * @class
 * @extends THREE.Mesh
 * @description A 3D icosahedron (20-faced polyhedron) with configurable geometry and material
 */
class Icosahedron extends THREE.Mesh {
    /**
     * Create a new Icosahedron object
     * @param {THREE.IcosahedronGeometry} [geometry=new THREE.IcosahedronGeometry(1, 2)] - The icosahedron geometry
     * @param {THREE.MeshStandardMaterial} [material=new THREE.MeshStandardMaterial()] - The material to apply
     */
    constructor(geometry = new THREE.IcosahedronGeometry(1, 2), material = new THREE.MeshStandardMaterial()) {
        super(geometry, material);
        this.name = _t("Icosahedron");
        this.castShadow = true;
        this.receiveShadow = true;

        // Set up default physics properties
        this.userData.physics = this.userData.physics || {
            enabled: true,
            type: "rigidBody",
            shape: "btSphereShape",
            mass: 0,
            inertia: {
                x: 0,
                y: 0,
                z: 0,
            },
            ctype: "Static",
        };
    }
}

export default Icosahedron;
