
/**
 * Module: VolumePointLightHelper.js
 * Purpose: Contains logic for volume point light helper.
 */


import * as THREE from "three";

class VolumePointLightHelper extends THREE.PointLightHelper {
    constructor(light, sphereSize, color) {
        super(light, sphereSize, color);

        var geometry = new THREE.SphereGeometry(2, 4, 2);
        var material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            visible: false,
        });

        this.picker = new THREE.Mesh(geometry, material);
        this.picker.name = "picker";
        this.add(this.picker);
    }

    raycast(raycaster, intersects) {
        var intersect = raycaster.intersectObject(this.picker)[0];
        if (intersect) {
            intersect.object = this.light;
            intersects.push(intersect);
        }
    }

    dispose() {
        this.remove(this.picker);

        this.picker?.geometry.dispose();
        this.picker?.material.dispose();
        if (this.picker.dispose) {
            this.picker.dispose();
        }
        delete this.picker;

        super.dispose();
    }
}

export default VolumePointLightHelper;
