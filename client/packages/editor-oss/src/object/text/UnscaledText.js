/**
 * Module: UnscaledText.js
 * Purpose: Screen-space text label without custom shaders.
 */

import * as THREE from "three";

import CanvasUtils from "@web-shared/utils/CanvasUtils";

class UnscaledText extends THREE.Sprite {
    constructor(text = "", options) {
        options = options || {};

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

        this.userData.options = {
            fontSize: options.fontSize || 16,
            padding: options.padding || 4,
            lineWidth: options.lineWidth !== undefined ? options.lineWidth : 2,
            strokeStyle: options.strokeStyle || "#000",
            fillStyle: options.fillStyle || "#fff",
        };
        this.userData.type = "text";

        this.center.set(0.5, 0.5);
        this.renderOrder = 1001;

        this.setText(text);
    }

    setText(text) {
        const {
            fontSize = 16,
            padding = 4,
            lineWidth = 2,
            strokeStyle = "#000",
            fillStyle = "#fff",
        } = this.userData.options || {};

        this.name = text;
        this.userData.text = text;

        const map = this.material.map;
        const canvas = map.image;
        let context = canvas.getContext("2d");

        context.font = `${fontSize}px "Microsoft YaHei"`;

        const width = context.measureText(text).width;
        const width2 = CanvasUtils.makePowerOfTwo(Math.max(1, width + padding * 2));
        const height2 = CanvasUtils.makePowerOfTwo(Math.max(1, fontSize + padding * 2));

        canvas.width = width2;
        canvas.height = height2;

        context = canvas.getContext("2d");
        context.clearRect(0, 0, width2, height2);
        context.imageSmoothingQuality = "high";
        context.textBaseline = "middle";
        context.textAlign = "center";
        context.lineWidth = lineWidth;
        context.font = `${fontSize}px "Microsoft YaHei"`;

        const halfWidth = width2 / 2;
        const halfHeight = height2 / 2;

        if (lineWidth > 0) {
            context.strokeStyle = strokeStyle;
            context.strokeText(text, halfWidth, halfHeight);
        }

        context.fillStyle = fillStyle;
        context.fillText(text, halfWidth, halfHeight);

        map.needsUpdate = true;
        this.scale.set(width2, height2, 1);
    }

    dispose() {
        this.material.map?.dispose();
        this.material.dispose();
    }
}

export default UnscaledText;
