import {GridHelper, type Object3D} from "three";

import {DYNAMIC_ROOT_NAME} from "../../scene/dynamicRoots";
import MeshUtils from "../../utils/MeshUtils";

type PickContext = {
    app: {
        mode?: string;
        game?: {
            player?: {
                uuid?: string;
            } | null;
        } | null;
    };
    editor: {
        scene: Object3D;
        camera: Object3D;
        sceneLockedItems?: string[] | null;
    };
};

export function isHiddenFromSceneHierarchy(object: Object3D | null | undefined): boolean {
    let current = object;

    while (current) {
        if (current.name === DYNAMIC_ROOT_NAME || current.userData?.isRuntimeOnly) {
            return true;
        }
        current = current.parent;
    }

    return false;
}

export function resolveSelectionTargetFromPickHit(object: Object3D | null | undefined): Object3D | null {
    if (!object) {
        return null;
    }

    if (object.userData?.object) {
        return object.userData.object;
    }

    if (object.parent?.userData?.isSingleChildModel) {
        return object.parent;
    }

    return MeshUtils.partToMesh(object);
}

export function getPickBlockReason(object: Object3D | null | undefined, {app, editor}: PickContext): string | null {
    if (!object) return "null-object";
    if (isHiddenFromSceneHierarchy(object)) return "hidden-hierarchy";
    if ((object as Object3D & {tag?: string}).tag === "helper") return "tag-helper";
    if ((object as Object3D & {tag?: string}).tag === "gizmo") return "tag-gizmo";
    if (object === editor.scene) return "editor-scene";
    if (object === editor.camera) return "editor-camera";
    if (object instanceof GridHelper) return "grid-helper";
    if (editor.sceneLockedItems?.includes(object.uuid)) return "locked-item";
    if (object.uuid === app.game?.player?.uuid) return "player-object";
    if (app.mode === "play" && object.userData?.isSelectable === false) return "isSelectable-false-in-play-mode";
    return null;
}