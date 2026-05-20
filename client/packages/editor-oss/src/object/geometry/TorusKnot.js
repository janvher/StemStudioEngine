import * as THREE from "three";

/**
 * Torus Knot Mesh Object
 * @class
 * @extends THREE.Mesh
 * @description A 3D torus knot with configurable geometry and material
 */
class TorusKnot extends THREE.Mesh {
    /**
     * Create a new TorusKnot object
     * @param {THREE.TorusKnotGeometry} [geometry=new THREE.TorusKnotGeometry(2, 0.8, 64, 12, 2, 3)] - The torus knot geometry
     * @param {THREE.MeshStandardMaterial} [material=new THREE.MeshStandardMaterial()] - The material to apply
     */
    constructor(
        geometry = new THREE.TorusKnotGeometry(2, 0.8, 64, 12, 2, 3),
        material = new THREE.MeshStandardMaterial(),
    ) {
        super(geometry, material);

        this.name = _t("Torus Knot");
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

export default TorusKnot;
