import * as THREE from "three";

const ARC_SEGMENTS = 200;

/**
 * Line Curve
 * @class
 * @extends THREE.Line
 * @description A straight line segment between two points
 */
class LineCurve extends THREE.Line {
    /**
     * Create a new line curve
     * @param {Object} [options={}] - Configuration options
     * @param {Array<THREE.Vector3>} [options.points] - Array of two Vector3 points defining the line
     */
    constructor(options = {}) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ARC_SEGMENTS * 3), 3));

        const material = new THREE.LineBasicMaterial({
            color: 0xff0000,
            opacity: 0.35,
        });

        super(geometry, material);

        this.name = _t("Line Curve");
        this.castShadow = true;

        Object.assign(this.userData, {
            type: "LineCurve",
            points: options.points || [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 10, 10)],
        });

        this.update();
    }

    /**
     * Update the line geometry based on the current points
     */
    update() {
        const curve = new THREE.LineCurve3(this.userData.points[0], this.userData.points[1]);
        const position = this.geometry.attributes.position;
        const point = new THREE.Vector3();

        for (let i = 0; i < ARC_SEGMENTS; i++) {
            const t = i / (ARC_SEGMENTS - 1);
            curve.getPoint(t, point);
            position.setXYZ(i, point.x, point.y, point.z);
        }

        position.needsUpdate = true;
    }
}

export default LineCurve;
