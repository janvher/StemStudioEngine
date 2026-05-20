import * as THREE from "three";

// Points defining the wine glass shape
const points = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(4, 0),
    new THREE.Vector2(3.5, 0.5),
    new THREE.Vector2(1, 0.75),
    new THREE.Vector2(0.8, 1),
    new THREE.Vector2(0.8, 4),
    new THREE.Vector2(1, 4.2),
    new THREE.Vector2(1.4, 4.8),
    new THREE.Vector2(2, 5),
    new THREE.Vector2(2.5, 5.4),
    new THREE.Vector2(3, 12),
];

/**
 * Wine Glass (Lathe) Mesh Object
 * @class
 * @extends THREE.Mesh
 * @description A 3D wine glass created using lathe geometry with configurable parameters
 */
class Lathe extends THREE.Mesh {
    /**
     * Create a new Lathe object (wine glass)
     * @param {THREE.LatheGeometry} [geometry=new THREE.LatheGeometry(points, 20, 0, 2 * Math.PI)] - The lathe geometry
     * @param {THREE.MeshStandardMaterial} [material=new THREE.MeshStandardMaterial({side: THREE.DoubleSide})] - The material to apply
     */
    constructor(
        geometry = new THREE.LatheGeometry(points, 20, 0, 2 * Math.PI),
        material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }),
    ) {
        super(geometry, material);
        this.name = _t("Lathe");
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

export default Lathe;
