import * as THREE from "three";

import {AnnotationBase} from "./AnnotationBase";

/**
 * PointNoteAnnotation — a single world-space point with a user-editable
 * text label. The text is the only label content; no numeric computation.
 */
export class PointNoteAnnotation extends AnnotationBase {
    constructor(point: THREE.Vector3, text: string) {
        super("pointNote", [point], text);
        this.rebuild();
    }

    protected override defaultName(): string {
        return "Note";
    }

    computeLabelText(): string {
        return this.text;
    }

    protected buildVisuals(): void {
        // A small cross in the scene to mark the anchor point, plus the
        // label offset slightly above.
        const p = this.points[0];
        if (p === undefined) return;
        const s = 0.1;
        this.attachLineSegment(
            new THREE.Vector3(p.x - s, p.y, p.z),
            new THREE.Vector3(p.x + s, p.y, p.z),
        );
        this.attachLineSegment(
            new THREE.Vector3(p.x, p.y - s, p.z),
            new THREE.Vector3(p.x, p.y + s, p.z),
        );
        const labelPos = new THREE.Vector3(p.x, p.y + 0.3, p.z);
        this.attachLabel(labelPos, this.computeLabelText());
    }
}
