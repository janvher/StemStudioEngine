/// <reference lib="dom" />

import {TreeItemData} from "./TreeItem";
import EngineRuntime from "../../../EngineRuntime";
import Editor from "../../../editor/Editor";
import {isStemEditor} from "../../../editor/stem-editor/isStemEditor";
import type {StemEditorMetadata} from "../../../editor/stem-editor/saveStemEditor";
import {getPrefabId} from "../../../prefab/util";

export const handleDrag = (
    event: React.DragEvent<HTMLLIElement>,
    setCurrentDrag: (el: HTMLLIElement | undefined) => void,
) => {
    event.stopPropagation();
    setCurrentDrag(event.currentTarget || undefined);
};

export const isProtectedTreeNode = (uuid: string | null, editor: Editor) => {
    if (uuid === editor.scene.uuid || uuid === editor.camera.uuid) return true;
    // The stem instance is the direct child of scene whose prefabId matches
    // the stem-editor metadata. Reparenting it via tree drag-and-drop would
    // leave saveStemEditor unable to locate it.
    if (isStemEditor(editor.scene)) {
        const stemMeta = editor.scene.userData?.stemEditor as StemEditorMetadata | undefined;
        const stemInstance = stemMeta
            ? editor.scene.children.find(child => getPrefabId(child) === stemMeta.assetId)
            : undefined;
        if (stemInstance && stemInstance.uuid === uuid) return true;
    }
    return false;
};

export const handleMultipleDrop = (
    event: React.DragEvent<HTMLLIElement>,
    engine: EngineRuntime,
    selected: string[],
    onDrop?: (values: string[], target: HTMLElement, area: number) => void,
) => {
    if (!engine?.editor || !selected || selected.length === 0) return;
    const editor = engine.editor;
    const draggedUuid = event.dataTransfer.getData("object-uuid");
    const draggedValues = draggedUuid ? (selected.includes(draggedUuid) ? selected : [draggedUuid]) : selected;

    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget;
    target.classList.remove("dragTop", "dragBottom", "drag");

    const area = event.nativeEvent.offsetY / target.clientHeight;
    const targetValue = target.getAttribute("value");
    const targetParentValue = target.parentElement?.parentElement?.getAttribute("value") || editor.scene.uuid;
    let newParentValue: string | null = null;

    if (area < 0.25) {
        newParentValue = targetParentValue;
    } else if (area > 0.75) {
        newParentValue = targetParentValue;
    } else {
        newParentValue = targetValue;
    }

    if (draggedValues.some(uuid => isProtectedTreeNode(uuid, editor)) || newParentValue === editor.camera.uuid)
        return;

    const targetObject = targetValue ? editor.objectByUuid(targetValue) : null;

    if (
        area >= 0.25 &&
        area <= 0.75 &&
        targetObject &&
        (targetObject.type !== "Group" || !!targetObject.userData.modelId)
    ) {
        const objectsToGroup = draggedValues.map(uuid => editor.objectByUuid(uuid)).filter(Boolean) as THREE.Object3D[];

        if (!draggedValues.includes(targetObject.uuid)) {
            objectsToGroup.push(targetObject);
        }

        if (objectsToGroup.length > 1) {
            editor.groupElements(objectsToGroup as any);
        }
        return;
    }
    onDrop?.(draggedValues, event.currentTarget, area);
};

export const handleDragStart = (event: React.DragEvent<HTMLLIElement>) => {
    event.stopPropagation();
    const target = event.currentTarget;
    const objectUuid = target.getAttribute("value");

    event.dataTransfer.setData("text/plain", target.id);
    if (objectUuid) {
        event.dataTransfer.setData("object-uuid", objectUuid);
    }
};

export const handleDragOver = (event: React.DragEvent<HTMLLIElement>, currentDrag?: EventTarget | null) => {
    event.preventDefault();
    event.stopPropagation();

    let target = event.currentTarget;

    if (target === currentDrag) {
        return;
    }

    let area = event.nativeEvent.offsetY / target.clientHeight;

    if (area < 0.25) {
        target.classList.add("dragTop");
    } else if (area > 0.75) {
        target.classList.add("dragBottom");
    } else {
        target.classList.add("drag");
    }
};

export const handleDragLeave = (event: React.DragEvent<HTMLLIElement>, currentDrag?: EventTarget | null) => {
    event.preventDefault();
    event.stopPropagation();

    let target = event.currentTarget;

    if (target === currentDrag) {
        return;
    }

    target.classList.remove("dragTop");
    target.classList.remove("dragBottom");
    target.classList.remove("drag");
};

export const handleClone = (args: {
    event: {stopPropagation: () => void};
    value: string;
    app: EngineRuntime | null | undefined;
    scrollToSelected: () => void;
}) => {
    const {event, value, app, scrollToSelected} = args;
    event.stopPropagation();
    app?.editor?.cloneObjectByUuid(value);
    scrollToSelected();
};

export const getDefaultName = (obj: TreeItemData) => {
    if (obj.isLight) {
        return "Light";
    }

    if (obj.isCamera) {
        return "Camera";
    }

    if (obj.isObject3D) {
        return "3D Model";
    }

    return obj.cls;
};
