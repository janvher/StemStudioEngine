import * as THREE from "three";

import CanvasUtils from "../../utils/CanvasUtils";

export type AnnotationType = "distance" | "angle" | "polyline" | "area" | "pointNote";

/**
 * Convert an array of world-space positions to plain [x,y,z] tuples for
 * userData serialization.
 */
export function pointsToUserData(points: THREE.Vector3[]): number[][] {
    return points.map(p => [p.x, p.y, p.z]);
}

export function userDataToPoints(data: unknown): THREE.Vector3[] {
    if (!Array.isArray(data)) return [];
    return data
        .filter(p => Array.isArray(p) && p.length === 3)
        .map(p => new THREE.Vector3(p[0], p[1], p[2]));
}

/**
 * AnnotationBase — shared scaffolding for every annotation type.
 *
 * Extends THREE.Group. Each subclass:
 *   - owns the authoritative `points: THREE.Vector3[]` and `text: string` in
 *     userData so serialization round-trips through the standard scene
 *     serializer (so collaboration sync works with no special wiring — see
 *     master plan's Architecture Invariant section),
 *   - implements `buildVisuals()` to add lines/labels to `this`,
 *   - calls `rebuild()` whenever the underlying points change.
 *
 * The label is a billboard sprite drawn from a canvas so it stays legible at
 * any zoom. Lines use Line2/LineGeometry so they have a consistent pixel
 * width independent of distance.
 */
export abstract class AnnotationBase extends THREE.Group {
    annotationType: AnnotationType;
    points: THREE.Vector3[];
    text: string;
    protected labelSprite: THREE.Sprite | null;

    constructor(type: AnnotationType, points: THREE.Vector3[], text = "") {
        super();
        this.annotationType = type;
        this.points = points.map(p => p.clone());
        this.text = text;
        this.labelSprite = null;

        this.userData.type = "annotation";
        this.userData.annotationType = type;
        this.userData.points = pointsToUserData(this.points);
        this.userData.text = text;

        this.name = this.defaultName();
    }

    /** Default object-tree name for this annotation. Subclasses can override. */
    protected defaultName(): string {
        return `Annotation (${this.annotationType})`;
    }

    /** Build scene children for the current `points`. Subclasses implement. */
    protected abstract buildVisuals(): void;

    /** Compute the label text displayed on this annotation. Override per type. */
    abstract computeLabelText(): string;

    /**
     * Replace all scene children with a fresh set built from the current
     * `points`. Called after any mutation.
     */
    rebuild(): void {
        // Dispose and clear existing children so we don't leak geometry,
        // materials, or canvas textures.
        while (this.children.length > 0) {
            const child = this.children[0] as THREE.Object3D;
            this.remove(child);
            this.disposeRecursive(child);
        }
        this.labelSprite = null;
        this.userData.points = pointsToUserData(this.points);
        this.userData.text = this.text;
        this.buildVisuals();
    }

    /** Update points (replaces all) and rebuild visuals. */
    setPoints(points: THREE.Vector3[]): void {
        this.points = points.map(p => p.clone());
        this.rebuild();
    }

    /** Update label text directly (used by PointNote). */
    setText(text: string): void {
        this.text = text;
        this.userData.text = text;
        this.rebuild();
    }

    /**
     * Attach a label sprite at the given world position. Canvas is sized to
     * text length; sprite scale mirrors the canvas so text stays legible.
     */
    protected attachLabel(position: THREE.Vector3, text: string): void {
        const fontSize = 18;
        const padding = 6;

        // Estimate width up-front; measureText isn't always available in
        // headless/test environments. The ~0.6 em ratio is a reasonable
        // fallback for sans-serif labels.
        let canvas: HTMLCanvasElement | null = null;
        let canvasWidth = CanvasUtils.makePowerOfTwo(Math.max(64, text.length * fontSize * 0.6 + padding * 2));
        const canvasHeight = CanvasUtils.makePowerOfTwo(fontSize + padding * 2);

        if (typeof document !== "undefined" && typeof document.createElement === "function") {
            try {
                canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (ctx && typeof ctx.measureText === "function") {
                    ctx.font = `${fontSize}px sans-serif`;
                    const measured = ctx.measureText(text).width;
                    if (measured > 0) {
                        canvasWidth = CanvasUtils.makePowerOfTwo(Math.max(64, measured + padding * 2));
                    }
                }
                if (canvas) {
                    canvas.width = canvasWidth;
                    canvas.height = canvasHeight;
                    const ctx2 = canvas.getContext("2d");
                    if (ctx2 && typeof ctx2.fillText === "function") {
                        ctx2.fillStyle = "rgba(0, 0, 0, 0.75)";
                        ctx2.fillRect(0, 0, canvasWidth, canvasHeight);
                        ctx2.font = `${fontSize}px sans-serif`;
                        ctx2.fillStyle = "#ffffff";
                        ctx2.textBaseline = "middle";
                        ctx2.textAlign = "center";
                        ctx2.fillText(text, canvasWidth / 2, canvasHeight / 2);
                    }
                }
            } catch {
                canvas = null;
            }
        }

        const material = new THREE.SpriteMaterial({
            map: canvas ? new THREE.CanvasTexture(canvas) : undefined,
            depthTest: false,
            transparent: true,
            color: canvas ? 0xffffff : 0xffff00,
        });
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        // Scale the sprite so it appears about 24 world-units tall at typical
        // framing. The editor normalizes sprite size elsewhere; this is a
        // deliberate starting point, expect to tune.
        const aspect = canvasWidth / canvasHeight;
        sprite.scale.set(0.8 * aspect, 0.8, 1);
        sprite.userData.annotationLabel = true;
        this.add(sprite);
        this.labelSprite = sprite;
    }

    /** Draw a Line2 between two world-space points as a child. */
    protected attachLineSegment(a: THREE.Vector3, b: THREE.Vector3, color = 0xffff00): void {
        const geometry = new THREE.BufferGeometry().setFromPoints([a, b]);
        const material = new THREE.LineBasicMaterial({color, depthTest: false, transparent: true});
        const line = new THREE.Line(geometry, material);
        line.renderOrder = 999;
        this.add(line);
    }

    private disposeRecursive(obj: THREE.Object3D): void {
        obj.traverse(n => {
            const anyN = n as any;
            if (anyN.geometry && typeof anyN.geometry.dispose === "function") anyN.geometry.dispose();
            if (anyN.material) {
                const mats = Array.isArray(anyN.material) ? anyN.material : [anyN.material];
                for (const mat of mats) {
                    if (mat.map && typeof mat.map.dispose === "function") mat.map.dispose();
                    if (typeof mat.dispose === "function") mat.dispose();
                }
            }
        });
    }
}
