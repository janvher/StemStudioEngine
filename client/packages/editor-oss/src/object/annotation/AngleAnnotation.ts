import * as THREE from "three";

import {AnnotationBase} from "./AnnotationBase";

/**
 * AngleAnnotation — three world-space points (A, B, C) where B is the apex.
 * Draws the two edges BA and BC and labels the interior angle at B.
 */
export class AngleAnnotation extends AnnotationBase {
    constructor(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
        super("angle", [a, b, c], "");
        this.rebuild();
    }

    protected override defaultName(): string {
        return "Angle";
    }

    computeLabelText(): string {
        if (this.points.length < 3) return "";
        const a = this.points[0];
        const b = this.points[1];
        const c = this.points[2];
        if (a === undefined || b === undefined || c === undefined) return "";
        const ba = new THREE.Vector3().subVectors(a, b);
        const bc = new THREE.Vector3().subVectors(c, b);
        const lenBA = ba.length();
        const lenBC = bc.length();
        if (lenBA < 1e-9 || lenBC < 1e-9) return "0.0°";
        const cos = THREE.MathUtils.clamp(ba.dot(bc) / (lenBA * lenBC), -1, 1);
        const rad = Math.acos(cos);
        const deg = THREE.MathUtils.radToDeg(rad);
        return `${deg.toFixed(1)}°`;
    }

    protected buildVisuals(): void {
        if (this.points.length < 3) return;
        const a = this.points[0];
        const b = this.points[1];
        const c = this.points[2];
        if (a === undefined || b === undefined || c === undefined) return;
        this.attachLineSegment(b, a);
        this.attachLineSegment(b, c);
        // Label slightly offset from the apex along the angle bisector so it
        // doesn't sit exactly on top of the intersection point.
        const ba = new THREE.Vector3().subVectors(a, b).normalize();
        const bc = new THREE.Vector3().subVectors(c, b).normalize();
        const bisector = new THREE.Vector3().addVectors(ba, bc);
        if (bisector.lengthSq() < 1e-9) {
            // 180° angle: pick any perpendicular direction for the label.
            bisector.crossVectors(ba, new THREE.Vector3(0, 1, 0));
            if (bisector.lengthSq() < 1e-9) bisector.set(1, 0, 0);
        }
        bisector.normalize().multiplyScalar(Math.min(a.distanceTo(b), c.distanceTo(b)) * 0.25);
        const labelPos = b.clone().add(bisector);
        this.attachLabel(labelPos, this.computeLabelText());
    }
}
