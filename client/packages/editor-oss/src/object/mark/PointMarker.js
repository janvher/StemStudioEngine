import * as THREE from "three";

import CanvasUtils from "@web-shared/utils/CanvasUtils";

/**
 * Point Marker
 * @class
 * @extends THREE.Sprite
 * @description A screen-space marker with text label and pointer triangle.
 */
class PointMarker extends THREE.Sprite {
    constructor(text = "", options = {}) {
        const canvas = document.createElement("canvas");
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            sizeAttenuation: false,
        });

        super(material);

        this.userData.type = "pointMarker";
        this.center.set(0.5, 0);
        this.renderOrder = 1002;

        this.setText(text);
    }

    setText(text) {
        const fontSize = 16;
        const padding = 4;
        const triangleWidth = 24;
        const triangleHeight = 12;

        this.name = text;
        this.userData.text = text;

        const map = this.material.map;
        const canvas = map.image;
        let context = canvas.getContext("2d");

        context.font = `${fontSize}px "Microsoft YaHei"`;

        const width = context.measureText(text).width;
        const width2 = CanvasUtils.makePowerOfTwo(Math.max(width, triangleWidth) + padding * 2);
        const height2 = CanvasUtils.makePowerOfTwo(fontSize + triangleHeight + padding * 3);

        canvas.width = width2;
        canvas.height = height2;

        context = canvas.getContext("2d");
        context.clearRect(0, 0, width2, height2);
        context.imageSmoothingQuality = "high";
        context.textBaseline = "hanging";
        context.textAlign = "center";
        context.lineWidth = 2;
        context.font = `${fontSize}px "Microsoft YaHei"`;

        const halfWidth = width2 / 2;

        context.strokeStyle = "#000";
        context.strokeText(text, halfWidth, padding);

        context.fillStyle = "#fff";
        context.fillText(text, halfWidth, padding);

        context.beginPath();
        context.moveTo(halfWidth - triangleWidth / 2, fontSize + padding * 2);
        context.lineTo(halfWidth + triangleWidth / 2, fontSize + padding * 2);
        context.lineTo(halfWidth, fontSize + padding * 2 + triangleHeight);
        context.closePath();
        context.fillStyle = "#ff0";
        context.fill();

        map.needsUpdate = true;
        this.scale.set(width2, height2, 1);
    }

    dispose() {
        this.material.map?.dispose();
        this.material.dispose();
    }
}

export default PointMarker;
