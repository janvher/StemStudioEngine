import * as THREE from "three";

import {computeOrientedBox, createOrientedBoxResult, OrientedBoxResult} from "./orientedBox";
import {SizeLabelSprite} from "./SizeLabelSprite";

const _center = new THREE.Vector3();
const _size = new THREE.Vector3();
const _qIdent = new THREE.Quaternion();
const _camPos = new THREE.Vector3();
const _tmpPos = new THREE.Vector3();

const MIN_AXIS = 1e-6;

const clampSize = (size: THREE.Vector3): void => {
    if (size.x < MIN_AXIS) size.x = MIN_AXIS;
    if (size.y < MIN_AXIS) size.y = MIN_AXIS;
    if (size.z < MIN_AXIS) size.z = MIN_AXIS;
};

interface OrientedBoxHelperOptions {
    color?: THREE.ColorRepresentation;
    showLabels?: boolean;
}

/**
 * Wireframe helper that visualizes an oriented bounding box (OBB) around
 * an object. The group's matrix carries the object's world position and
 * rotation; the inner LineSegments carries the size scale. Optional
 * sprite labels show the X/Y/Z size of the box in world units.
 */
export class OrientedBoxHelper extends THREE.Group {
    public readonly box: THREE.LineSegments;
    public readonly labelX: SizeLabelSprite | null;
    public readonly labelY: SizeLabelSprite | null;
    public readonly labelZ: SizeLabelSprite | null;

    private readonly _result: OrientedBoxResult = createOrientedBoxResult();
    private readonly _boxMaterial: THREE.LineBasicMaterial;

    constructor({color = 0xffff00, showLabels = true}: OrientedBoxHelperOptions = {}) {
        super();
        Object.defineProperty(this, "type", {value: "OrientedBoxHelper"});
        this.matrixAutoUpdate = false;

        const boxGeo = new THREE.BoxGeometry(1, 1, 1);
        const edges = new THREE.EdgesGeometry(boxGeo);
        boxGeo.dispose();
        this._boxMaterial = new THREE.LineBasicMaterial({color, toneMapped: false});
        this.box = new THREE.LineSegments(edges, this._boxMaterial);
        this.box.matrixAutoUpdate = false;
        this.box.frustumCulled = false;
        this.box.renderOrder = 9999;
        this.add(this.box);

        if (showLabels) {
            this.labelX = new SizeLabelSprite({axis: "x"});
            this.labelY = new SizeLabelSprite({axis: "y"});
            this.labelZ = new SizeLabelSprite({axis: "z"});
            this.add(this.labelX, this.labelY, this.labelZ);
        } else {
            this.labelX = null;
            this.labelY = null;
            this.labelZ = null;
        }
    }

    /**
     * Backwards-compat shim for code that still expects the old
     * Box3Helper-like surface (e.g. `selectionBox.material.depthTest`).
     * Forwards to the inner LineSegments material.
     *
     * @returns
     */
    get material(): THREE.LineBasicMaterial {
        return this._boxMaterial;
    }

    setFromObject(object: THREE.Object3D): boolean {
        computeOrientedBox(object, this._result);
        return this.setFromOrientedBox(this._result);
    }

    setFromOrientedBox(result: OrientedBoxResult): boolean {
        this._result.hasGeometry = result.hasGeometry;
        this._result.box.copy(result.box);
        this._result.basis.copy(result.basis);

        if (!this._result.hasGeometry || this._result.box.isEmpty()) {
            return false;
        }
        this._result.box.getCenter(_center);
        this._result.box.getSize(_size);
        clampSize(_size);
        this._apply(this._result.basis, _center, _size);
        return true;
    }

    setFromWorldBox(box: THREE.Box3): void {
        box.getCenter(_center);
        box.getSize(_size);
        clampSize(_size);
        this.matrix.identity();
        this.matrixWorldNeedsUpdate = true;
        this.box.matrix.compose(_center, _qIdent.identity(), _size);
        this.box.matrixWorldNeedsUpdate = true;
        this._positionLabels(_center, _size);
        this._updateLabelText(_size);
    }

    setColor(color: THREE.ColorRepresentation): void {
        this._boxMaterial.color.set(color);
    }

    setLabelsVisible(visible: boolean): void {
        if (this.labelX) this.labelX.visible = visible;
        if (this.labelY) this.labelY.visible = visible;
        if (this.labelZ) this.labelZ.visible = visible;
    }

    /**
     * Per-frame label update: distance-scaled size + overlap fading.
     * Call after the helper's matrices are up to date.
        *
        * @param camera
     */
    updateLabelPresentation(camera: THREE.Camera): void {
        const labels = [this.labelX, this.labelY, this.labelZ].filter(Boolean) as SizeLabelSprite[];
        if (!labels.length) return;

        this.updateMatrixWorld(true);

        // 1) Distance-based pixel height with clamp.
        const camPos = _camPos.setFromMatrixPosition(camera.matrixWorld);
        for (const label of labels) {
            const pos = _tmpPos.setFromMatrixPosition(label.matrixWorld);
            const d = Math.max(0.001, pos.distanceTo(camPos));
            // Keep labels readable but prevent oversized near-camera text.
            const h = THREE.MathUtils.clamp(0.115 / d, 0.015, 0.025);
            label.setPixelHeight(h);
        }

        // 2) Overlap-based fading. Gather rects first.
        const rects: Array<{label: SizeLabelSprite; cx: number; cy: number; hx: number; hy: number; z: number; ok: boolean}> = [];
        for (const label of labels) {
            const r = {cx: 0, cy: 0, hx: 0, hy: 0, z: 0};
            const ok = label.getNDCRect(camera, r);
            rects.push({label, ...r, ok});
        }

        const overlaps = (a: typeof rects[number], b: typeof rects[number]): boolean =>
            a.ok && b.ok &&
            Math.abs(a.cx - b.cx) <= a.hx + b.hx &&
            Math.abs(a.cy - b.cy) <= a.hy + b.hy;

        let pairOverlapCount = 0;
        const overlapped: boolean[] = rects.map(() => false);
        for (let i = 0; i < rects.length; i++) {
            const rectA = rects[i];
            if (!rectA) continue;

            for (let j = i + 1; j < rects.length; j++) {
                const rectB = rects[j];
                if (!rectB) continue;

                if (overlaps(rectA, rectB)) {
                    pairOverlapCount++;
                    // Fade whichever is farther from camera (higher NDC z).
                    if (rectA.z > rectB.z) overlapped[i] = true;
                    else overlapped[j] = true;
                }
            }
        }

        const allOverlap = rects.length >= 3 && pairOverlapCount >= 3;

        for (let i = 0; i < rects.length; i++) {
            const rect = rects[i];
            if (!rect) continue;

            const label = rect.label;
            let target: number;
            if (!rect.ok) target = 0;
            else if (allOverlap) target = 0;
            else if (overlapped[i]) target = 0.18;
            else target = 1;
            const mat = label.material;
            const current = mat.opacity;
            // smooth lerp toward target
            const next = current + (target - current) * 0.25;
            label.setOpacity(next);
        }
    }

    dispose(): void {
        this.box.geometry.dispose();
        this._boxMaterial.dispose();
        this.labelX?.dispose();
        this.labelY?.dispose();
        this.labelZ?.dispose();
    }

    toJSON(): THREE.Object3DJSON {
        this.updateMatrix();

        return {
            metadata: {version: 4.7, type: "Object", generator: "OrientedBoxHelper.toJSON"},
            object: {
                uuid: this.uuid,
                type: this.type,
                name: this.name,
                visible: this.visible,
                layers: this.layers.mask,
                matrix: this.matrix.toArray(),
                up: this.up.toArray(),
                matrixAutoUpdate: this.matrixAutoUpdate,
                userData: {
                    ...this.userData,
                    isOrientedBoxHelper: true,
                },
            },
        };
    }

    private _apply(basis: THREE.Matrix4, center: THREE.Vector3, size: THREE.Vector3): void {
        this.matrix.copy(basis);
        this.matrixWorldNeedsUpdate = true;
        this.box.matrix.compose(center, _qIdent.identity(), size);
        this.box.matrixWorldNeedsUpdate = true;
        this._positionLabels(center, size);
        this._updateLabelText(size);
    }

    private _positionLabels(center: THREE.Vector3, size: THREE.Vector3): void {
        // Place each axis label at the midpoint of an edge along that axis,
        // anchored at one corner so labels don't overlap each other.
        if (this.labelX) {
            this.labelX.setLocalPosition(center.x, center.y - size.y / 2, center.z + size.z / 2);
        }
        if (this.labelY) {
            this.labelY.setLocalPosition(center.x + size.x / 2, center.y, center.z + size.z / 2);
        }
        if (this.labelZ) {
            this.labelZ.setLocalPosition(center.x + size.x / 2, center.y - size.y / 2, center.z);
        }
    }

    private _updateLabelText(size: THREE.Vector3): void {
        if (this.labelX) this.labelX.setSizeValue(size.x);
        if (this.labelY) this.labelY.setSizeValue(size.y);
        if (this.labelZ) this.labelZ.setSizeValue(size.z);
    }
}
