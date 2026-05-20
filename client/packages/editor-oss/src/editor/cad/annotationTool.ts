import * as THREE from "three";

import {AddAnnotationCommand} from "@stem/editor-oss/command/Commands";
import global from "@stem/editor-oss/global";
import {AnnotationType, createAnnotation} from "../../object/annotation";
import {AnnotationBase} from "../../object/annotation/AnnotationBase";

/**
 * CAD-mode annotation pick-tool.
 *
 * Lifecycle:
 *   - start(type): become active, begin listening for pointer events.
 *   - on pointerdown: pick a world-space point via editor.computeIntersectPoint,
 *     push it onto the in-progress list, update the preview.
 *   - single-click commits when point count hits the target for the type:
 *     distance=2, angle=3, pointNote=1.
 *   - double-click commits polyline/area using the current point list.
 *   - ESC cancels the in-progress pick.
 *
 * The tool is CAD-mode-only; the Editor facade enforces that.
 *
 * Collaboration: the commit step runs `AddAnnotationCommand` which goes
 * through the standard AddObjectCommand path, so the annotation syncs to
 * peers via the same mechanism as any other scene object. A preview
 * annotation lives locally only — it's never added to the scene tree until
 * commit.
 */
export class AnnotationTool {
    private editor: any;
    private active: boolean;
    private activeType: AnnotationType | null;
    private collectedPoints: THREE.Vector3[];
    private previewAnnotation: AnnotationBase | null;
    private pendingText: string;
    private viewportEl: HTMLElement | null;

    // Bound handlers so add/remove listener pairs match.
    private readonly onPointerDown = (e: PointerEvent) => this.handlePointerDown(e);
    private readonly onDoubleClick = (e: MouseEvent) => this.handleDoubleClick(e);
    private readonly onKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);

    constructor(editor: any) {
        this.editor = editor;
        this.active = false;
        this.activeType = null;
        this.collectedPoints = [];
        this.previewAnnotation = null;
        this.pendingText = "";
        this.viewportEl = null;
    }

    isActive(): boolean {
        return this.active;
    }

    getActiveType(): AnnotationType | null {
        return this.activeType;
    }

    /** Begin annotating. Fails silently if already active. */
    start(type: AnnotationType, options: {text?: string} = {}): boolean {
        if (this.active) return false;
        const el = this.resolveViewport();
        if (!el) return false;
        this.active = true;
        this.activeType = type;
        this.collectedPoints = [];
        this.pendingText = options.text ?? "";
        this.viewportEl = el;
        el.addEventListener("pointerdown", this.onPointerDown);
        el.addEventListener("dblclick", this.onDoubleClick);
        window.addEventListener("keydown", this.onKeyDown);
        return true;
    }

    /** Stop annotating without committing (cancel). */
    cancel(): void {
        this.teardown();
        this.removePreview();
    }

    /** Stop annotating and commit the current points if they satisfy the type. */
    async commit(): Promise<AnnotationBase | null> {
        const annotation = this.buildAnnotation();
        this.teardown();
        this.removePreview();
        if (!annotation) return null;
        const command = new AddAnnotationCommand(annotation);
        await this.editor.execute(command);
        return annotation;
    }

    dispose(): void {
        if (this.active) this.cancel();
    }

    private resolveViewport(): HTMLElement | null {
        const app: any = global?.app;
        const vp = app?.viewport as HTMLElement | null | undefined;
        if (vp) return vp;
        const rendererDom = app?.editor?.renderer?.domElement as HTMLElement | null | undefined;
        return rendererDom ?? null;
    }

    private handlePointerDown(event: PointerEvent) {
        if (!this.active) return;
        // Ignore right/middle clicks.
        if (event.button !== 0) return;
        const point = this.pickWorldPoint(event.clientX, event.clientY);
        if (!point) return;
        this.collectedPoints.push(point);
        this.updatePreview();

        // Single-click commit thresholds by type.
        const target = this.singleClickCommitTarget();
        if (target !== null && this.collectedPoints.length >= target) {
            void this.commit();
        }
    }

    private handleDoubleClick(event: MouseEvent) {
        if (!this.active) return;
        // Polyline and area commit on double-click; for the other types the
        // single-click path has already committed by the time we'd see this.
        if (this.activeType !== "polyline" && this.activeType !== "area") return;
        event.preventDefault();
        // A dblclick fires two pointerdown events first — the tail-end one
        // has already landed in collectedPoints. Pop the duplicate so the
        // commit uses the intended unique points.
        if (this.collectedPoints.length >= 2) {
            const last = this.collectedPoints[this.collectedPoints.length - 1]!;
            const prev = this.collectedPoints[this.collectedPoints.length - 2]!;
            if (last.distanceToSquared(prev) < 1e-9) {
                this.collectedPoints.pop();
            }
        }
        void this.commit();
    }

    private handleKeyDown(event: KeyboardEvent) {
        if (!this.active) return;
        if (event.key === "Escape") {
            event.preventDefault();
            this.cancel();
        }
    }

    private singleClickCommitTarget(): number | null {
        switch (this.activeType) {
            case "distance": return 2;
            case "angle": return 3;
            case "pointNote": return 1;
            // polyline + area commit on dblclick; no single-click target
            default: return null;
        }
    }

    private pickWorldPoint(clientX: number, clientY: number): THREE.Vector3 | null {
        if (typeof this.editor?.computeIntersectPoint !== "function") return null;
        const app: any = global?.app;
        const sceneHelpers = app?.sceneHelpers ?? null;
        try {
            return this.editor.computeIntersectPoint({x: clientX, y: clientY}, sceneHelpers);
        } catch {
            return null;
        }
    }

    private buildAnnotation(): AnnotationBase | null {
        if (!this.activeType) return null;
        return createAnnotation(this.activeType, this.collectedPoints, this.pendingText);
    }

    /**
     * Maintain a local preview annotation that shows what the user is
     * building. Added to sceneHelpers (not the main scene) so it doesn't
     * serialize or collide with normal object picking, and so it's cleaned
     * up on cancel/commit.
     */
    private updatePreview() {
        this.removePreview();
        if (!this.activeType) return;
        const preview = createAnnotation(this.activeType, this.collectedPoints, this.pendingText);
        if (!preview) return;
        preview.userData.annotationPreview = true;
        const app: any = global?.app;
        const helpers = app?.sceneHelpers as THREE.Object3D | undefined;
        if (helpers) helpers.add(preview);
        this.previewAnnotation = preview;
    }

    private removePreview() {
        if (!this.previewAnnotation) return;
        const parent = this.previewAnnotation.parent;
        if (parent) parent.remove(this.previewAnnotation);
        this.previewAnnotation = null;
    }

    private teardown() {
        if (this.viewportEl) {
            this.viewportEl.removeEventListener("pointerdown", this.onPointerDown);
            this.viewportEl.removeEventListener("dblclick", this.onDoubleClick);
        }
        window.removeEventListener("keydown", this.onKeyDown);
        this.active = false;
        this.activeType = null;
        this.viewportEl = null;
    }
}
