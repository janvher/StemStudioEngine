import * as THREE from "three";

/**
 * Circle Mesh Object
 * @class
 * @extends THREE.Mesh
 * @description A 3D circle with configurable geometry and material
 */
class Circle extends THREE.Mesh {
    /**
     * Create a new Circle object
     * @param {THREE.CircleGeometry} [geometry=new THREE.CircleGeometry(1, 32)] - The circle geometry
     * @param {THREE.MeshStandardMaterial} [material=new THREE.MeshStandardMaterial()] - The material to apply
     */
    constructor(geometry = new THREE.CircleGeometry(1, 32), material = new THREE.MeshStandardMaterial()) {
        super(geometry, material);
        this.name = _t("Circle");
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

export default Circle;
