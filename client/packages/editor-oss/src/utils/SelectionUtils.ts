import {Box3, Camera, GridHelper, Light, Mesh, Object3D, Scene, Vector2, Vector3} from "three";

import {findTopVFXParent} from "@stem/editor-oss/services";
import {DYNAMIC_ROOT_NAME} from "@stem/editor-oss/scene/dynamicRoots";
import MeshUtils from "./MeshUtils";

export type NonSelectableReason =
    | "null-object"
    | "tag-helper"
    | "tag-gizmo"
    | "editor-scene"
    | "editor-camera"
    | "grid-helper"
    | "locked-item"
    | "player-object"
    | "hidden-hierarchy"
    | "isSelectable-false-in-play-mode";

interface SelectionEditor {
    scene: Object3D | null | undefined;
    camera: Object3D | null | undefined;
    sceneLockedItems?: string[] | null;
}

interface SelectionApp {
    editor: SelectionEditor | null | undefined;
    mode?: string;
    game?: {player?: {uuid?: string} | null} | null;
}

const isHiddenInfrastructureObject = (object: Object3D): boolean => {
    let current: Object3D | null = object;

    while (current) {
        if (
            current.name === DYNAMIC_ROOT_NAME ||
            current.userData?.isRuntimeOnly === true ||
            current.userData?.isSceneHelper === true ||
            current.userData?.isSceneHelperRoot === true
        ) {
            return true;
        }

        current = current.parent;
    }

    return false;
};

export const getNonSelectableReason = (
    object: Object3D | null | undefined,
    app: SelectionApp | null | undefined,
): NonSelectableReason | null => {
    if (!object) return "null-object";
    const tag = (object as {tag?: string}).tag;
    if (tag === "helper") return "tag-helper";
    if (tag === "gizmo") return "tag-gizmo";

    const editor = app?.editor;
    if (editor) {
        if (object === editor.scene) return "editor-scene";
        if (object === editor.camera) return "editor-camera";
        if (editor.sceneLockedItems?.includes(object.uuid)) return "locked-item";
    }

    if (isHiddenInfrastructureObject(object)) return "hidden-hierarchy";

    if (object instanceof GridHelper) return "grid-helper";

    const playerUuid = app?.game?.player?.uuid;
    if (playerUuid && object.uuid === playerUuid) return "player-object";

    if (app?.mode === "play" && object.userData?.isSelectable === false) {
        return "isSelectable-false-in-play-mode";
    }

    return null;
};

export const canSelectObject = (
    object: Object3D | null | undefined,
    app: SelectionApp | null | undefined,
): object is Object3D => getNonSelectableReason(object, app) === null;

export interface ScreenRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface FindObjectsInRectangleOpts {
    scene: Scene | Object3D;
    camera: Camera;
    viewport: ScreenRect;
    start: Vector2;
    end: Vector2;
    app: SelectionApp | null | undefined;
}

const projectToScreen = (worldPos: Vector3, camera: Camera, viewport: ScreenRect): {x: number; y: number} => {
    const projected = worldPos.clone().project(camera);
    return {
        x: (projected.x * 0.5 + 0.5) * viewport.width + viewport.left,
        y: (-projected.y * 0.5 + 0.5) * viewport.height + viewport.top,
    };
};

export const findObjectsInRectangle = (opts: FindObjectsInRectangleOpts): Object3D[] => {
    const {scene, camera, viewport, start, end, app} = opts;
    const selected = new Set<Object3D>();

    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    const leftToRight = end.x > start.x;

    const insideRect = (p: {x: number; y: number}) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;

    scene.traverse(obj => {
        if (!(obj instanceof Mesh) && obj.type !== "ParticleEmitter" && !(obj instanceof Light)) return;

        if (obj instanceof Light) {
            const pos = new Vector3();
            obj.getWorldPosition(pos);
            const screen = projectToScreen(pos, camera, viewport);
            if (insideRect(screen) && canSelectObject(obj, app)) {
                selected.add(obj);
            }
            return;
        }

        let target: Object3D = obj;
        if (obj.type === "ParticleEmitter") {
            const vfxParent = findTopVFXParent(obj, scene as Scene);
            if (vfxParent) target = vfxParent;
        } else if (obj instanceof Mesh) {
            target = MeshUtils.partToMesh(obj);
        }

        if ((target as {isBatchedMesh?: boolean}).isBatchedMesh) return;
        if (!canSelectObject(target, app)) return;
        if (selected.has(target)) return;

        const box = new Box3().setFromObject(obj);
        const corners: Vector3[] = [
            new Vector3(box.min.x, box.min.y, box.min.z),
            new Vector3(box.min.x, box.min.y, box.max.z),
            new Vector3(box.min.x, box.max.y, box.min.z),
            new Vector3(box.min.x, box.max.y, box.max.z),
            new Vector3(box.max.x, box.min.y, box.min.z),
            new Vector3(box.max.x, box.min.y, box.max.z),
            new Vector3(box.max.x, box.max.y, box.min.z),
            new Vector3(box.max.x, box.max.y, box.max.z),
        ];
        const projectedCorners = corners.map(c => projectToScreen(c, camera, viewport));

        const inside = leftToRight
            ? projectedCorners.every(insideRect)
            : projectedCorners.some(insideRect);

        if (inside) {
            selected.add(target);
        }
    });

    return Array.from(selected);
};
