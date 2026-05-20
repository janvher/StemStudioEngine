import * as THREE from "three";

import CustomTube, {CurveType} from "../../object/geometry/CustomTube";
import {isInputActive} from "../assets/v2/utils/isInputActive";

/**
 * Control Point Gizmo - A sphere mesh representing a curve control point
 */
class ControlPointGizmo extends THREE.Mesh {
    public index: number;
    private originalColor: number;
    private selectedColor: number = 0xff5722; // Orange
    private hoverColor: number = 0xffeb3b; // Yellow

    constructor(position: THREE.Vector3, index: number, selected: boolean = false) {
        const geometry = new THREE.SphereGeometry(0.15, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: selected ? 0xff5722 : 0x4caf50, // Green when unselected
            transparent: true,
            opacity: 0.8,
            depthTest: false,
            depthWrite: false,
        });

        super(geometry, material);

        this.index = index;
        this.originalColor = 0x4caf50;
        this.position.copy(position);
        this.renderOrder = 999; // Render on top
    }

    setSelected(selected: boolean) {
        const material = this.material as THREE.MeshBasicMaterial;
        material.color.set(selected ? this.selectedColor : this.originalColor);
    }

    setHover(hover: boolean) {
        const material = this.material as THREE.MeshBasicMaterial;
        if (hover) {
            material.color.set(this.hoverColor);
        } else {
            material.color.set(this.originalColor);
        }
    }

    dispose() {
        this.geometry.dispose();
        (this.material as THREE.Material).dispose();
    }
}

/**
 * Helper function to determine if we can add more control points based on curve type
 * @param curveType
 * @param currentCount
 */
const canAddMorePoints = (curveType: CurveType, currentCount: number): boolean => {
    const fixedPointRequirements: {[key in CurveType]?: number} = {
        [CurveType.QUADRATIC_BEZIER]: 3,
        [CurveType.CUBIC_BEZIER]: 4,
    };

    const requiredPoints = fixedPointRequirements[curveType];
    if (requiredPoints === undefined) {
        return true; // No fixed requirement, can add points
    }

    return currentCount < requiredPoints;
};

/**
 * Curve Editor Controls - Interactive 3D editing of curve control points
 * Similar to TransformControls but specifically for curve editing
 */
export class CurveEditorControls extends THREE.Object3D {
    private controlPointGizmos: ControlPointGizmo[] = [];
    private selectedPointIndex: number | null = null;
    private hoveredPointIndex: number | null = null;
    private targetObject: CustomTube | null = null;
    private raycaster: THREE.Raycaster;
    private camera: THREE.Camera;
    private domElement: HTMLElement;
    private plane: THREE.Plane = new THREE.Plane();
    private planeNormal: THREE.Vector3 = new THREE.Vector3(0, 0, 1);
    private offset: THREE.Vector3 = new THREE.Vector3();
    private isDragging: boolean = false;
    public enabled: boolean = false;

    constructor(camera: THREE.Camera, domElement: HTMLElement) {
        super();

        this.camera = camera;
        this.domElement = domElement;
        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Points.threshold = 0.2;
    }

    /**
     * Attach to a CustomTube object for editing
     * @param object
     */
    attach(object: CustomTube): this {
        this.detach(); // Clear any existing attachment

        this.targetObject = object;
        this.enabled = true;

        // Create gizmos for each control point
        const points = object.userData.curvePoints || [];

        points.forEach((p: any, index: number) => {
            const worldPos = new THREE.Vector3(p.x, p.y, p.z);
            // Transform to world space
            object.localToWorld(worldPos);

            const gizmo = new ControlPointGizmo(worldPos, index);
            this.controlPointGizmos.push(gizmo);
            this.add(gizmo);
        });

        console.log(`[CurveEditor] Attached ${this.controlPointGizmos.length} control point gizmos`);

        // Add event listeners
        this.domElement.addEventListener("pointerdown", this.onPointerDown);
        this.domElement.addEventListener("pointermove", this.onPointerMove);
        this.domElement.addEventListener("pointerup", this.onPointerUp);
        this.domElement.addEventListener("dblclick", this.onDoubleClick);
        window.addEventListener("keydown", this.onKeyDown);

        this.visible = true;
        return this;
    }

    /**
     * Update gizmo positions based on current object transform
     * Call this when the object is transformed
     */
    updateGizmoPositions() {
        if (!this.targetObject) return;

        const points = this.targetObject.userData.curvePoints || [];

        this.controlPointGizmos.forEach((gizmo, index) => {
            if (points[index]) {
                const worldPos = new THREE.Vector3(points[index].x, points[index].y, points[index].z);
                this.targetObject!.localToWorld(worldPos);
                gizmo.position.copy(worldPos);
            }
        });
    }

    /**
     * Enforce point count requirements for a curve type
     * @param curveType The curve type to enforce
     */
    enforcePointCount(curveType: string) {
        if (!this.targetObject) return;

        const requiredPoints: {[key: string]: number} = {
            QuadraticBezier: 3,
            CubicBezier: 4,
        };

        const required = requiredPoints[curveType];
        if (!required) return; // No specific requirement

        // Remove excess points
        while (this.controlPointGizmos.length > required) {
            const lastIndex = this.controlPointGizmos.length - 1;
            this.removeControlPoint(lastIndex);
        }
    }

    /**
     * Detach from current object
     */
    detach() {
        if (!this.enabled) return;

        // Dispose all gizmos
        this.controlPointGizmos.forEach(gizmo => {
            gizmo.dispose();
            this.remove(gizmo);
        });

        this.controlPointGizmos = [];
        this.selectedPointIndex = null;
        this.hoveredPointIndex = null;
        this.targetObject = null;
        this.enabled = false;
        this.isDragging = false;

        // Remove event listeners
        this.domElement.removeEventListener("pointerdown", this.onPointerDown);
        this.domElement.removeEventListener("pointermove", this.onPointerMove);
        this.domElement.removeEventListener("pointerup", this.onPointerUp);
        this.domElement.removeEventListener("dblclick", this.onDoubleClick);
        window.removeEventListener("keydown", this.onKeyDown);

        this.visible = false;
    }

    /**
     * Add a new control point at the cursor position
     * @param position
     */
    addControlPoint(position: THREE.Vector3) {
        if (!this.targetObject) return;

        // Check if we can add more points based on curve type
        const curveType = this.targetObject.userData.curveType as CurveType;
        const currentCount = this.controlPointGizmos.length;
        if (!canAddMorePoints(curveType, currentCount)) {
            console.warn(`[CurveEditor] Cannot add control point: ${curveType} curve has reached maximum point count`);
            return;
        }

        const index = this.controlPointGizmos.length;
        const gizmo = new ControlPointGizmo(position, index);
        this.controlPointGizmos.push(gizmo);
        this.add(gizmo);

        // Update target object userData
        const worldPos = position.clone();
        const localPos = this.targetObject.worldToLocal(worldPos);

        if (!this.targetObject.userData.curvePoints) {
            this.targetObject.userData.curvePoints = [];
        }
        this.targetObject.userData.curvePoints.push({
            x: localPos.x,
            y: localPos.y,
            z: localPos.z,
        });

        this.updateCurveGeometry();
    }

    /**
     * Remove a control point by index
     * @param index
     */
    removeControlPoint(index: number) {
        if (!this.targetObject || index < 0 || index >= this.controlPointGizmos.length) return;

        // Don't allow removing if we have only 2 points (minimum for a curve)
        if (this.controlPointGizmos.length <= 2) {
            console.warn("[CurveEditor] Cannot remove control point: minimum 2 points required");
            return;
        }

        // Remove gizmo
        const gizmo = this.controlPointGizmos[index];
        if (!gizmo) return;
        gizmo.dispose();
        this.remove(gizmo);

        // Remove from arrays
        this.controlPointGizmos.splice(index, 1);
        this.targetObject.userData.curvePoints.splice(index, 1);

        // Re-index remaining gizmos
        this.controlPointGizmos.forEach((g, i) => {
            g.index = i;
        });

        // Clear selection if we deleted the selected point
        if (this.selectedPointIndex === index) {
            this.selectedPointIndex = null;
        } else if (this.selectedPointIndex !== null && this.selectedPointIndex > index) {
            this.selectedPointIndex--;
        }

        console.log(`[CurveEditor] Deleted control point ${index}, ${this.controlPointGizmos.length} points remaining`);
        this.updateCurveGeometry();
    }

    /**
     * Select a control point
     * @param index
     */
    selectPoint(index: number) {
        // Deselect previous
        if (this.selectedPointIndex !== null) {
            this.controlPointGizmos[this.selectedPointIndex]?.setSelected(false);
        }

        this.selectedPointIndex = index;

        if (index !== null && this.controlPointGizmos[index]) {
            this.controlPointGizmos[index].setSelected(true);
        }
    }

    /**
     * Get information about the currently selected control point
     * @returns Object with index and distances to adjacent points, or null if none selected
     */
    getSelectedPointInfo(): {index: number; prevDistance: number | null; nextDistance: number | null} | null {
        if (this.selectedPointIndex === null || !this.controlPointGizmos[this.selectedPointIndex]) {
            return null;
        }

        const selectedGizmo = this.controlPointGizmos[this.selectedPointIndex]!;
        const prevGizmo = this.controlPointGizmos[this.selectedPointIndex - 1];
        const nextGizmo = this.controlPointGizmos[this.selectedPointIndex + 1];

        return {
            index: this.selectedPointIndex,
            prevDistance: prevGizmo ? selectedGizmo.position.distanceTo(prevGizmo.position) : null,
            nextDistance: nextGizmo ? selectedGizmo.position.distanceTo(nextGizmo.position) : null,
        };
    }

    /**
     * Update the curve geometry based on current control points
     */
    private updateCurveGeometry() {
        if (!this.targetObject) return;

        const points = this.controlPointGizmos.map(gizmo => {
            const worldPos = gizmo.position.clone();
            return this.targetObject!.worldToLocal(worldPos);
        });

        // Update userData
        this.targetObject.userData.curvePoints = points.map(p => ({
            x: p.x,
            y: p.y,
            z: p.z,
        }));

        // Update the tube geometry
        const userData = this.targetObject.userData;
        this.targetObject.updateTube(
            points,
            userData.curveType,
            userData.tubularSegments,
            userData.radius,
            userData.radialSegments,
            userData.closed,
            userData.extrudeDepth,
        );
    }

    /**
     * Get pointer position in normalized device coordinates
     * @param event
     */
    private getPointer(event: PointerEvent): THREE.Vector2 {
        const rect = this.domElement.getBoundingClientRect();
        return new THREE.Vector2(
            (event.clientX - rect.left) / rect.width * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
        );
    }

    /**
     * Pointer down event handler
     * @param event
     */
    private onPointerDown = (event: PointerEvent) => {
        if (!this.enabled || event.button !== 0) return;

        const pointer = this.getPointer(event);
        this.raycaster.setFromCamera(pointer, this.camera);

        // Raycast against control point gizmos
        const intersects = this.raycaster.intersectObjects(this.controlPointGizmos);

        if (intersects.length > 0) {
            const gizmo = intersects[0]!.object as ControlPointGizmo;
            this.selectPoint(gizmo.index);

            // Setup drag plane
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);

            // Use a plane perpendicular to the camera
            this.plane.setFromNormalAndCoplanarPoint(cameraDirection, gizmo.position);

            // Calculate offset from plane intersection to control point
            const intersection = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(this.plane, intersection);
            if (intersection) {
                this.offset.copy(intersection).sub(gizmo.position);
            }

            this.isDragging = true;
            event.stopPropagation();
        }
    };

    /**
     * Pointer move event handler
     * @param event
     */
    private onPointerMove = (event: PointerEvent) => {
        if (!this.enabled) return;

        const pointer = this.getPointer(event);
        this.raycaster.setFromCamera(pointer, this.camera);

        if (this.isDragging && this.selectedPointIndex !== null) {
            // Drag selected point
            const intersection = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(this.plane, intersection);

            if (intersection && this.controlPointGizmos[this.selectedPointIndex]) {
                const newPosition = intersection.sub(this.offset);
                this.controlPointGizmos[this.selectedPointIndex]!.position.copy(newPosition);
                this.updateCurveGeometry();
            }

            event.stopPropagation();
        } else {
            // Hover detection
            const intersects = this.raycaster.intersectObjects(this.controlPointGizmos);

            // Clear previous hover
            if (this.hoveredPointIndex !== null && this.hoveredPointIndex !== this.selectedPointIndex) {
                this.controlPointGizmos[this.hoveredPointIndex]?.setHover(false);
            }

            if (intersects.length > 0) {
                const gizmo = intersects[0]!.object as ControlPointGizmo;
                this.hoveredPointIndex = gizmo.index;

                if (this.hoveredPointIndex !== this.selectedPointIndex) {
                    gizmo.setHover(true);
                }

                this.domElement.style.cursor = "pointer";
            } else {
                this.hoveredPointIndex = null;
                this.domElement.style.cursor = "default";
            }
        }
    };

    /**
     * Pointer up event handler
     * @param event
     */
    private onPointerUp = (event: PointerEvent) => {
        if (!this.enabled) return;

        if (this.isDragging) {
            this.isDragging = false;
            event.stopPropagation();
        }
    };

    /**
     * Keyboard event handler
     * @param event
     */
    private onKeyDown = (event: KeyboardEvent) => {
        if (!this.enabled) return;

        // Don't interfere with text input
        if (isInputActive()) return;

        // Delete or Backspace key to remove selected control point
        if (event.key === "Delete" || event.key === "Backspace") {
            if (this.selectedPointIndex !== null) {
                this.removeControlPoint(this.selectedPointIndex);
                event.preventDefault();
                event.stopPropagation();
            }
        }
    };

    /**
     * Double-click event handler - adds a control point at click location on curve
     * @param event
     */
    private onDoubleClick = (event: MouseEvent) => {
        if (!this.enabled || !this.targetObject) return;

        const pointer = new THREE.Vector2(
            event.clientX / this.domElement.clientWidth * 2 - 1,
            -(event.clientY / this.domElement.clientHeight) * 2 + 1,
        );

        this.raycaster.setFromCamera(pointer, this.camera);

        // Raycast against the curve mesh
        const intersects = this.raycaster.intersectObject(this.targetObject, true);

        if (intersects.length > 0) {
            const intersectionPoint = intersects[0]!.point;
            console.log("[CurveEditor] Double-click detected, adding point at:", intersectionPoint);

            // Add the control point at the intersection location
            this.addControlPoint(intersectionPoint);

            event.preventDefault();
            event.stopPropagation();
        }
    };

    /**
     * Dispose of all resources
     */
    dispose() {
        this.detach();
    }
}
