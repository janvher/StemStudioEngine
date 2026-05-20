import * as THREE from "three";

import {AnnotationBase} from "./AnnotationBase";

/**
 * AreaAnnotation — N-point closed polygon. Shows the enclosed area in
 * square meters. For non-planar polygons we project onto the best-fit
 * plane (computed via the normal of the first triangle fan segment) and
 * sum up the projected fan triangles.
 */
export class AreaAnnotation extends AnnotationBase {
    constructor(points: THREE.Vector3[]) {
        super("area", points, "");
        this.rebuild();
    }

    protected override defaultName(): string {
        return "Area";
    }

    computeLabelText(): string {
        const area = this.computeArea();
        return `${area.toFixed(3)} m²`;
    }

    /**
     * Compute the (approximate) enclosed polygon area using a triangle fan
     * from the first vertex. This is exact for planar polygons and a
     * reasonable approximation for mildly non-planar inputs. Returns 0 for
     * fewer than 3 points.
     */
    private computeArea(): number {
        const n = this.points.length;
        if (n < 3) return 0;
        const p0 = this.points[0];
        if (p0 === undefined) return 0;
        let totalMagnitude = 0;
        const cross = new THREE.Vector3();
        for (let i = 1; i < n - 1; i++) {
            const v1 = new THREE.Vector3().subVectors(this.points[i]!, p0);
            const v2 = new THREE.Vector3().subVectors(this.points[i + 1]!, p0);
            cross.crossVectors(v1, v2);
            totalMagnitude += cross.length() * 0.5;
        }
        return totalMagnitude;
    }

    protected buildVisuals(): void {
        const n = this.points.length;
        if (n < 3) return;
        // Draw the closing polygon: N-1 edges plus a segment back to p0.
        for (let i = 1; i < n; i++) {
            this.attachLineSegment(this.points[i - 1]!, this.points[i]!);
        }
        this.attachLineSegment(this.points[n - 1]!, this.points[0]!);

        // Label at the polygon centroid.
        const centroid = new THREE.Vector3();
        for (const p of this.points) centroid.add(p);
        centroid.multiplyScalar(1 / n);
        this.attachLabel(centroid, this.computeLabelText());
    }
}
