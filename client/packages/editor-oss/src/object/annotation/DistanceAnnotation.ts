import * as THREE from "three";

import {AnnotationBase} from "./AnnotationBase";

/**
 * DistanceAnnotation — two world-space points connected by a line, with a
 * midpoint label showing the scalar distance.
 */
export class DistanceAnnotation extends AnnotationBase {
    constructor(p1: THREE.Vector3, p2: THREE.Vector3) {
        super("distance", [p1, p2], "");
        this.rebuild();
    }

    protected override defaultName(): string {
        return "Distance";
    }

    computeLabelText(): string {
        if (this.points.length < 2) return "";
        const p0 = this.points[0];
        const p1 = this.points[1];
        if (p0 === undefined || p1 === undefined) return "";
        const d = p0.distanceTo(p1);
        return `${d.toFixed(3)} m`;
    }

    protected buildVisuals(): void {
        if (this.points.length < 2) return;
        const a = this.points[0];
        const b = this.points[1];
        if (a === undefined || b === undefined) return;
        this.attachLineSegment(a, b);
        const midpoint = a.clone().add(b).multiplyScalar(0.5);
        const label = this.computeLabelText();
        this.attachLabel(midpoint, label);
    }
}
