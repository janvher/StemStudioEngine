import * as THREE from "three";

import {AnnotationBase, AnnotationType, userDataToPoints} from "./AnnotationBase";
import {AngleAnnotation} from "./AngleAnnotation";
import {AreaAnnotation} from "./AreaAnnotation";
import {DistanceAnnotation} from "./DistanceAnnotation";
import {PointNoteAnnotation} from "./PointNoteAnnotation";
import {PolylineAnnotation} from "./PolylineAnnotation";

export {AnnotationBase, AngleAnnotation, AreaAnnotation, DistanceAnnotation, PointNoteAnnotation, PolylineAnnotation};
export type {AnnotationType};

/**
 * Factory — produce the right AnnotationBase subclass for a given type.
 * Takes the points (and optional text) rather than a fully-reconstituted
 * Object3D so it's safe to call from both live authoring and rehydration.
 */
export function createAnnotation(type: AnnotationType, points: THREE.Vector3[], text = ""): AnnotationBase | null {
    switch (type) {
        case "distance":
            if (points.length < 2) return null;
            return new DistanceAnnotation(points[0]!, points[1]!);
        case "angle":
            if (points.length < 3) return null;
            return new AngleAnnotation(points[0]!, points[1]!, points[2]!);
        case "polyline":
            if (points.length < 2) return null;
            return new PolylineAnnotation(points);
        case "area":
            if (points.length < 3) return null;
            return new AreaAnnotation(points);
        case "pointNote":
            if (points.length < 1) return null;
            return new PointNoteAnnotation(points[0]!, text);
        default:
            return null;
    }
}

/**
 * Walk a scene graph and replace any Object3D whose
 * `userData.annotationType` flag identifies it as a deserialized annotation
 * with a fresh AnnotationBase subclass that has class identity restored.
 *
 * Purpose: after `THREE.ObjectLoader.parse(...)` round-trips a scene, every
 * annotation comes back as a plain `THREE.Group` (the Line + Sprite
 * children are preserved, but class identity is lost). This helper restores
 * the subclass so later edits (`setPoints`, `setText`, `computeLabelText`)
 * work again and so future serializations keep the annotation flag intact.
 *
 * Called after sceneLoaded. Safe to run multiple times — already-rehydrated
 * annotations (actual AnnotationBase instances) are skipped.
 */
export function rehydrateAnnotations(root: THREE.Object3D): number {
    const replacements: {old: THREE.Object3D; next: AnnotationBase}[] = [];
    root.traverse(node => {
        if (node instanceof AnnotationBase) return;
        const type = node.userData?.annotationType as AnnotationType | undefined;
        if (!type) return;
        const points = userDataToPoints(node.userData?.points);
        const text = typeof node.userData?.text === "string" ? node.userData.text : "";
        const rehydrated = createAnnotation(type, points, text);
        if (!rehydrated) return;
        // Preserve the original uuid so collab/selection references survive.
        rehydrated.uuid = node.uuid;
        rehydrated.name = node.name || rehydrated.name;
        rehydrated.position.copy(node.position);
        rehydrated.quaternion.copy(node.quaternion);
        rehydrated.scale.copy(node.scale);
        replacements.push({old: node, next: rehydrated});
    });
    for (const {old, next} of replacements) {
        const parent = old.parent;
        if (parent) {
            parent.add(next);
            parent.remove(old);
        }
    }
    return replacements.length;
}
