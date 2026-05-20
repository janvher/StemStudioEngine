/**
 * Module: VolumeDirectionalLightHelper.js
 * Purpose: Contains logic for volume directional light helper.
 */

import * as THREE from "three";


class VolumeDirectionalLightHelper extends THREE.DirectionalLightHelper {
    constructor(light, size, color) {
        super(light, size, color);

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

        this.picker.geometry.dispose();
        this.picker.material.dispose();
        if (this.picker.dispose) {
            this.picker.dispose();
        }
        delete this.picker;

        super.dispose.call(this);
    }
}

export default VolumeDirectionalLightHelper;
