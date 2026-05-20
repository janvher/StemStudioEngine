
/**
 * Module: CatmullRomCurve.js
 * Purpose: Contains logic for catmull rom curve.
 */


import * as THREE from "three";

var ARC_SEGMENTS = 200;

class CatmullRomCurve extends THREE.Line {
    constructor(options = {}) {
        var geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ARC_SEGMENTS * 3), 3));

        var material = new THREE.LineBasicMaterial({
            color: 0xff0000,
            opacity: 0.35,
        });

        super(geometry, material);

        this.name = _t("CatmullRom Curve");

        this.castShadow = true;

        Object.assign(this.userData, {
            type: "CatmullRomCurve",
            points: options.points || [
                new THREE.Vector3(4, 8, 16),
                new THREE.Vector3(0, 12, -4),
                new THREE.Vector3(-16, 4, -8),
            ],
            closed: options.closed || false,
            curveType: options.curveType || "catmullrom", // centripetal, chordal and catmullrom
            tension: options.tension || 0.5,
        });

        this.update();
    }

    update() {
        var curve = new THREE.CatmullRomCurve3(
            this.userData.points,
            this.userData.closed,
            this.userData.curveType,
            this.userData.tension,
        );

        var position = this.geometry.attributes.position;

        var point = new THREE.Vector3();

        for (var i = 0; i < ARC_SEGMENTS; i++) {
            var t = i / (ARC_SEGMENTS - 1);
            curve.getPoint(t, point);
            position.setXYZ(i, point.x, point.y, point.z);
        }

        position.needsUpdate = true;
    }
}

export default CatmullRomCurve;
