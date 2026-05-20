import * as THREE from "three";

/**
 * Torus Mesh Object
 * @class
 * @extends THREE.Mesh
 * @description A 3D torus (donut shape) with configurable geometry and material
 */
class Torus extends THREE.Mesh {
    /**
     * Create a new Torus object
     * @param {THREE.TorusGeometry} [geometry=new THREE.TorusGeometry(2, 1, 32, 32, Math.PI * 2)] - The torus geometry
     * @param {THREE.MeshStandardMaterial} [material=new THREE.MeshStandardMaterial()] - The material to apply
     */
    constructor(
        geometry = new THREE.TorusGeometry(2, 1, 32, 32, Math.PI * 2),
        material = new THREE.MeshStandardMaterial(),
    ) {
        super(geometry, material);
        this.name = _t("Torus");
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

export default Torus;
