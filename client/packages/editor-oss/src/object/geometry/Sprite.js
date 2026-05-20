import * as THREE from "three";

/**
 * Sprite Object
 * @class
 * @extends THREE.Sprite
 * @description A billboard sprite that always faces the camera
 */
class Sprite extends THREE.Sprite {
    /**
     * Create a new Sprite object
     * @param {THREE.SpriteMaterial} [material=new THREE.SpriteMaterial()] - The material to apply
     */
    constructor(material = new THREE.SpriteMaterial()) {
        super(material);
        this.name = _t("Sprite");
    }
}

export default Sprite;
