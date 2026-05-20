import * as THREE from "three";

/**
 * @author abelnation / http://github.com/abelnation
 * @author Mugen87 / http://github.com/Mugen87
 * @author WestLangley / http://github.com/WestLangley
 *
 *  This helper must be added as a child of the light
 */
class RectAreaLightHelper extends THREE.Line {
    constructor(light, color) {
        var positions = [1, 1, 0, -1, 1, 0, -1, -1, 0, 1, -1, 0, 1, 1, 0];

        var geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geometry.computeBoundingSphere();

        var material = new THREE.LineBasicMaterial({fog: false});

        super(geometry, material);

        this.type = "RectAreaLightHelper";

        this.light = light;

        this.color = color; // optional hardwired color for the helper

        //

        var positions2 = [1, 1, 0, -1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0];

        var geometry2 = new THREE.BufferGeometry();
        geometry2.setAttribute("position", new THREE.Float32BufferAttribute(positions2, 3));
        geometry2.computeBoundingSphere();

        this.picker = new THREE.Mesh(geometry2, new THREE.MeshBasicMaterial({side: THREE.BackSide, fog: false}));

        this.add(this.picker);

        this.update();
    }

    update() {
        this.scale.set(0.5 * this.light.width, 0.5 * this.light.height, 1);

        this.light.getWorldPosition(this.position);
        this.light.getWorldQuaternion(this.quaternion);

        if (this.color !== undefined) {
            this.material.color.set(this.color);
            this.picker.material.color.set(this.color);
        } else {
            this.material.color.copy(this.light.color).multiplyScalar(this.light.intensity);

            // prevent hue shift
            var c = this.material.color;
            var max = Math.max(c.r, c.g, c.b);
            if (max > 1) c.multiplyScalar(1 / max);

            this.picker.material.color.copy(this.material.color);
        }
    }

    updateMatrixWorld(force) {
        this.update();

        super.updateMatrixWorld(force);
    }

    raycast(raycaster, intersects) {
        var intersect = raycaster.intersectObject(this.picker)[0];
        if (intersect) {
            intersect.object = this.light;
            intersects.push(intersect);
        }
    }

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
        this.children[0].geometry.dispose();
        this.children[0].material.dispose();
        if (this.children[0].dispose) {
            this.children[0].dispose();
        }
    }
}

export default RectAreaLightHelper;
