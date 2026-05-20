import * as THREE from "three";

/**
 * RectAreaLightHelper
 * @class
 * @extends THREE.Object3D
 * @description Helper object to visualize a rectangular area light in the scene.
 * Creates a front and back plane to represent the light's area and direction.
 */
class RectAreaLightHelper extends THREE.Object3D {
    /**
     * Create a new rectangular area light helper
     * @param {number} width - Width of the rectangular area light
     * @param {number} height - Height of the rectangular area light
     */
    constructor(width, height) {
        super();

        this.name = _t("Helper");

        // Front side plane
        const rectLightMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(),
            new THREE.MeshBasicMaterial(),
        );
        rectLightMesh.scale.x = width;
        rectLightMesh.scale.y = height;

        rectLightMesh.name = _t("FrontSide");
        rectLightMesh.userData.type = "frontSide";

        this.add(rectLightMesh);

        // Back side plane (darker color)
        const rectLightMeshBack = new THREE.Mesh(
            new THREE.PlaneGeometry(),
            new THREE.MeshBasicMaterial({color: 0x080808}),
        );
        rectLightMeshBack.scale.x = width;
        rectLightMeshBack.scale.y = height;
        rectLightMeshBack.rotation.y = Math.PI;

        rectLightMeshBack.name = _t("BackSide");
        rectLightMeshBack.userData.type = "backSide";

        this.add(rectLightMeshBack);
    }
}

export default RectAreaLightHelper;
