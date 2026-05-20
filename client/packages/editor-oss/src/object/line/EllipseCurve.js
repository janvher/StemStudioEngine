
/**
 * Module: EllipseCurve.js
 * Purpose: Contains logic for ellipse curve.
 */


import * as THREE from "three";

var ARC_SEGMENTS = 200;

class EllipseCurve extends THREE.Line {
    constructor(options = {}) {
        var geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ARC_SEGMENTS * 3), 3));

        var material = new THREE.LineBasicMaterial({
            color: 0xff0000,
            opacity: 0.35,
        });

        super(geometry, material);

        this.name = _t("Ellipse Curve");

        this.castShadow = true;

        Object.assign(this.userData, {
            type: "EllipseCurve",
            aX: options.aX || 0,
            aY: options.aY || 0,
            xRadius: options.xRadius || 10,
            yRadius: options.yRadius || 5,
            aStartAngle: options.aStartAngle || 0,
            aEndAngle: options.aEndAngle || 2 * Math.PI,
            aClockwise: options.aClockwise || false,
            aRotation: options.aRotation || 0,
        });

        this.update();
    }

    update() {
        var curve = new THREE.EllipseCurve(
            this.userData.aX,
            this.userData.aY,
            this.userData.xRadius,
            this.userData.yRadius,
            this.userData.aStartAngle,
            this.userData.aEndAngle,
            this.userData.aClockwise,
            this.userData.aRotation,
        );

        var position = this.geometry.attributes.position;

        var point = new THREE.Vector3();

        for (var i = 0; i < ARC_SEGMENTS; i++) {
            var t = i / (ARC_SEGMENTS - 1);
            curve.getPoint(t, point);
            position.setXYZ(i, point.x, point.y, 0);
        }

        position.needsUpdate = true;
    }
}

export default EllipseCurve;
