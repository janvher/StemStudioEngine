import * as THREE from "three";

import {AnnotationBase} from "./AnnotationBase";

/**
 * PolylineAnnotation — N world-space points connected as a chain. Shows
 * total cumulative distance as the label at the last point.
 */
export class PolylineAnnotation extends AnnotationBase {
    constructor(points: THREE.Vector3[]) {
        super("polyline", points, "");
        this.rebuild();
    }

    protected override defaultName(): string {
        return "Polyline";
    }

    computeLabelText(): string {
        if (this.points.length < 2) return "";
        let total = 0;
        for (let i = 1; i < this.points.length; i++) {
            const a = this.points[i - 1];
            const b = this.points[i];
            if (a === undefined || b === undefined) return "";
            total += a.distanceTo(b);
        }
        return `${total.toFixed(3)} m`;
    }

    protected buildVisuals(): void {
        if (this.points.length < 2) return;
        for (let i = 1; i < this.points.length; i++) {
            const a = this.points[i - 1];
            const b = this.points[i];
            if (a === undefined || b === undefined) return;
            this.attachLineSegment(a, b);
        }
        // Label at the last point.
        const last = this.points[this.points.length - 1];
        if (last === undefined) return;
        this.attachLabel(last.clone(), this.computeLabelText());
    }
}
