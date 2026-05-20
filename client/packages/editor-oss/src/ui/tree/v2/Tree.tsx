import React, {RefObject, useEffect, useState} from "react";
import * as THREE from "three";

import {StyledList, TreeWrapV2} from "./Tree.style";
import {TreeItem, TreeItemData} from "./TreeItem";
import {GLOBAL_BEHAVIOR_HOST} from "../../../EngineRuntime";
import {AddObjectCommand} from "../../../command/Commands";
import {useAppGlobalContext} from "../../../context";
import {RIGHT_PANEL_VERSIONS} from "../../../context/appStateTypes";
import {getPhysics} from "../../../physics/common/getPhysics";
import {useUngroupModelAsset} from "../../../editor/models/hooks/ungroupModelAsset";
import {useExportStem} from "../../../editor/prefabs/hooks/exportImportStem";
import {useConvertToPrefab, useEditPrefab, useRevertPrefab, useSavePrefab} from "../../../editor/prefabs/hooks/prefabs";
import {isStemEditor} from "../../../editor/stem-editor/isStemEditor";
import type {StemEditorMetadata} from "../../../editor/stem-editor/saveStemEditor";
import global from "../../../global";
import {isVFXParent} from "../../../services";
import {ItemMenuText, RightClickMenu} from "../../../ui/common/RightClickMenu/RightClickMenu";

const getPath = (object: THREE.Object3D, scene: THREE.Object3D) => {
    const path: string[] = [];

    let current: THREE.Object3D | null = object;
    while (current && current !== scene) {
        path.unshift(current.uuid);
        current = current.parent;
    }

    return path;
};

type Props = {
    onExpand: (value: string, event?: React.MouseEvent) => void;
    onSelect: (value: string, multiselect: boolean, noSelectByUuid?: boolean, rangeSelect?: boolean) => void;
    onDoubleClick: (value: string, event: React.MouseEvent) => void;
    onDrop: (values: string[], target: HTMLElement, area: number) => void;
    className: string;
    style: React.CSSProperties;
    data: TreeItemData[];
    treeRef: RefObject<HTMLUListElement>;
    selected: string[] | null;
    onLockClick: (id: string) => void;
    lockedItems: string[];
    openCameraSettings: () => void;
    openSceneSettings: () => void;
    scrollToSelected: () => void;
    onEditLambda?: (instanceId: string) => void;
    onDeleteLambda?: (instanceId: string) => void;
};

export const Tree = ({
    onExpand,
    onSelect,
    onDoubleClick,
    onDrop,
    className,
    style,
    data,
    treeRef,
    selected,
    onLockClick,
    lockedItems,
    openCameraSettings,
    scrollToSelected,
    onEditLambda,
    onDeleteLambda,
    openSceneSettings,
}: Props) => {
    const {activeRightPanel, setActiveRightPanel} = useAppGlobalContext();
    const convertToPrefab = useConvertToPrefab();
    const editPrefab = useEditPrefab();
    const revertPrefab = useRevertPrefab();
    const savePrefab = useSavePrefab();
    const ungroupModelAsset = useUngroupModelAsset();
    const exportStemFn = useExportStem();
    const [expandedPath, setExpandedPath] = useState<string[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{x: number; y: number} | null>(null);
    const isCameraSettingsPanelOpen = activeRightPanel === RIGHT_PANEL_VERSIONS.CameraSettings;

    useEffect(() => {
        const defaultCamera = data?.find((el: TreeItemData) => el.cls === "Camera" || el.isCamera);
        // close camera panel if opened and camera not selected
        if (selected?.length === 1 && defaultCamera?.value !== selected[0] && isCameraSettingsPanelOpen) {
            setActiveRightPanel(RIGHT_PANEL_VERSIONS.None);
        }
    }, [selected]);

    useEffect(() => {
        global.app?.on("objectSelected.TreeItemComponent", () => {
            const selected = global.app?.editor?.selected;
            // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
            const scene = global.app?.editor?.scene!;
            if (Array.isArray(selected) || !selected) return;

            const path = getPath(selected, scene);

            setExpandedPath(path);

            // const vfxParent = findTopVFXParent(selected, scene);
            // if (vfxParent && editor && selected.uuid !== vfxParent.uuid) {
            //     setTimeout(() => {
            //         editor.select(vfxParent);
            //     }, 300); // based on this.doubleClickThreshold = 300; in SelectHelper.js
            // }
        });

        return () => {
            global.app?.on("objectSelected.TreeItemComponent", null);
        };
    }, []);

    const handleClick = (event: React.MouseEvent, noReset?: boolean) => {
        event.stopPropagation();

        if (event.target instanceof HTMLLIElement) {
            const value = event.target.getAttribute("value");
            if (value) {
                const shiftPressed = event.shiftKey;
                const cmdPressed = event.metaKey || event.ctrlKey;

                if (!noReset) {
                    setActiveRightPanel(RIGHT_PANEL_VERSIONS.None);
                }
                onSelect?.(value, cmdPressed, undefined, shiftPressed);
            }
        }
    };

    const createEmptyGroup = () => {
        closeMenu();
        if (!global.app?.editor) return;

        const group = new THREE.Group();
        group.name = "Empty Group";
        group.receiveShadow = true;
        group.castShadow = true;
        group.userData.physics = {
            ...getPhysics(group.userData.physics || null),
            enabled: false, // disable physics for group
        };
        global.app.editor?.execute(new AddObjectCommand(group));
    };

    const handleConvertToPrefab = () => {
        closeMenu();
        const selected = global.app?.editor?.selected;
        if (!selected || Array.isArray(selected)) {
            return;
        }

        convertToPrefab(selected);
    };

    const handleEditPrefab = () => {
        closeMenu();
        const selected = global.app?.editor?.selected;
        if (!selected || Array.isArray(selected)) {
            return;
        }

        void editPrefab(selected);
    };

    const handleOpenInStemEditor = () => {
        closeMenu();
        const selected = global.app?.editor?.selected;
        if (!selected || Array.isArray(selected)) {
            return;
        }

        const prefabId = selected.userData?.prefabId as string | undefined;
        if (prefabId) {
            global.app?.editor?.component?.openStemEditor(prefabId);
        }
    };

    const handleSavePrefab = () => {
        closeMenu();
        const selected = global.app?.editor?.selected;
        if (!selected || Array.isArray(selected)) {
            return;
        }

        void savePrefab(selected);
    };

    const handleRevertPrefab = () => {
        closeMenu();
        const selected = global.app?.editor?.selected;
        if (!selected || Array.isArray(selected)) {
            return;
        }

        revertPrefab(selected);
    };

    const handleUngroupModelAsset = (objectUuid: string) => {
        const object = global.app?.editor?.objectByUuid(objectUuid);
        if (!object) return;
        void ungroupModelAsset(object);
    };

    const handleExportStem = () => {
        closeMenu();
        const selected = global.app?.editor?.selected;
        if (!selected || Array.isArray(selected)) return;
        void exportStemFn(selected);
    };

    const closeMenu = () => {
        setMenuPosition(null);
        setIsMenuOpen(false);
    };

    const handleRightClick = (event: React.MouseEvent) => {
        event.preventDefault();
        setIsMenuOpen(true);
        const x = event.clientX;
        const y = event.clientY;
        setMenuPosition({x, y});
    };

    const createNode = (singleDataObj: TreeItemData, index: number) => {
        if (singleDataObj.type === "Box3Helper" || singleDataObj.text === GLOBAL_BEHAVIOR_HOST) {
            return null;
        }

        const leaf =
            (!singleDataObj.children || singleDataObj.children.length === 0) && singleDataObj.leaf !== false;
        const isBehaviors = Boolean(singleDataObj.userData?.behaviors?.length);
        const isPrefab = Boolean(singleDataObj.userData?.prefabId);
        const isPrefabLocked = !singleDataObj.userData?.prefabEditRevisionId;
        const isGroup = singleDataObj.type === "Group";
        const selectedObject = global.app?.editor?.objectByUuid(singleDataObj.value);
        const isModelChild = selectedObject?.parent?.userData?.modelId;

        // The stem-editor root is the direct child of the scene whose
        // prefabId matches the editor's stem assetId — same shape as
        // findStemInstance in saveStemEditor. Ungroup/Delete on this object
        // would leave saveStemEditor unable to locate the stem.
        const scene = global.app?.editor?.scene;
        const stemMeta = scene?.userData?.stemEditor as StemEditorMetadata | undefined;
        const isStemEditorRoot =
            isStemEditor(scene) &&
            !!selectedObject &&
            selectedObject.parent === scene &&
            singleDataObj.userData?.prefabId === stemMeta?.assetId;

        if (singleDataObj.type === "Scene") {
            singleDataObj.onClick = (e: React.MouseEvent) => {
                openSceneSettings();
                handleClick(e, true);
            };
        }
        if (singleDataObj.cls === "Camera" || singleDataObj.isCamera) {
            singleDataObj.onClick = (e: React.MouseEvent) => {
                openCameraSettings();
                handleClick(e, true);
            };
        }

        let showGroup = isGroup;

        if (!!selectedObject && isVFXParent(selectedObject)) {
            showGroup = true;
        }

        if (isPrefab && isPrefabLocked) {
            showGroup = false;
        }

        return (
            <TreeItem
                key={singleDataObj.value}
                selected={selected}
                data={singleDataObj}
                index={index}
                leaf={leaf}
                lockedItems={lockedItems}
                isBehaviors={isBehaviors}
                isGroup={showGroup}
                isPrefab={isPrefab}
                isPrefabLocked={isPrefabLocked}
                isStemEditorRoot={isStemEditorRoot}
                onLockClick={onLockClick}
                handleClick={handleClick}
                onDoubleClick={onDoubleClick}
                onDrop={onDrop}
                onExpand={onExpand}
                scrollToSelected={scrollToSelected}
                createEmptyGroup={createEmptyGroup}
                convertToPrefab={handleConvertToPrefab}
                editPrefab={handleEditPrefab}
                openInStemEditor={handleOpenInStemEditor}
                savePrefab={handleSavePrefab}
                revertPrefab={handleRevertPrefab}
                exportStem={handleExportStem}
                ungroupModelAsset={handleUngroupModelAsset}
                onEditLambda={onEditLambda}
                onDeleteLambda={onDeleteLambda}
                expandedPath={expandedPath}
                isModelChild={isModelChild}
            />
        );
    };

    return (
        <TreeWrapV2>
            <StyledList
                className={`custom-scroll ${className}`}
                style={style}
                ref={treeRef}
                onContextMenu={handleRightClick}
            >
                {isMenuOpen && menuPosition && (
                    <RightClickMenu
                        onClickoutsideCallback={closeMenu}
                        left={menuPosition.x}
                        top={menuPosition.y}
                    >
                        <ItemMenuText onClick={createEmptyGroup}>Create Empty Group</ItemMenuText>
                    </RightClickMenu>
                )}
                {data.map((n, index) => createNode(n, index + 1))}
            </StyledList>
        </TreeWrapV2>
    );
};
