import React, {useEffect, useRef, useState} from "react";
import {Object3D} from "three";

import {
    getDefaultName,
    handleDrag,
    handleDragLeave,
    handleDragOver,
    handleDragStart,
    handleMultipleDrop,
} from "./helpers";
import arrowIcon from "./icons/arrow.svg";
import behaviorsIcon from "./icons/behaviors-icon.svg";
import closedEyeIcon from "./icons/closed-eye.svg";
import deleteIcon from "./icons/delete-icon.svg";
import lightsIcon from "./icons/lights-icon.svg";
import lockIcon from "./icons/lock-icon.svg";
import menuIcon from "./icons/menu.svg";
import meshIcon from "./icons/mesh-icon.svg";
import cameraIcon from "./icons/misc-icon.svg";
import modelIcon from "./icons/model-icon.svg";
import openEyeIcon from "./icons/open-eye.svg";
import particleIcon from "./icons/particle-icon.svg";
import {ItemRightClickMenu} from "./ItemRightClickMenu";
import {
    ExpandItemButton,
    Line,
    ListItem,
    ListItemContent,
    RenameInput,
    SelectedItemIcon,
    SelectedItemIconWrapper,
    SubList,
    TypeImg,
    TypeImgWrapper,
} from "./Tree.style";
import {MenuPositionType} from "./types";
import {getAsset} from "@stem/network/api/asset";
import {DomainAssetDto} from "@stem/network/api/client/api";
import EngineRuntime from "../../../EngineRuntime";
import {useAppGlobalContext} from "../../../context";
import {RIGHT_PANEL_VERSIONS} from "../../../context/appStateTypes";
import lambdaIcon from "../../../editor/assets/v2/AssetsLibrary/FoldersView/icons/lambda-icon.svg";
import editIcon from "../../../editor/assets/v2/AssetsLibrary/images/edit.svg";
import {MarqueeLabel, Tooltip} from "../../../editor/assets/v2/common";
import {useCanEditAsset} from "../../../editor/assets/v2/common/hooks/useCanEditAsset";
import prefabUnlockedIcon from "../../../editor/assets/v2/icons/prefab-unlocked-icon.svg";
import prefabIcon from "../../../editor/assets/v2/icons/prefabs-icon.svg";
import {isStemEditor} from "../../../editor/stem-editor/isStemEditor";
import global from "../../../global";

export interface TreeItemData {
    value: string;
    text: string;
    tooltipText?: string;
    // TODO: seems like we're storing a lot of redundant information between
    // type, cls, isCamera, isLight, isObject3D, isMesh, etc.
    type: string;
    expanded: boolean;
    isDefaultItem?: boolean;
    noMaxWidth?: boolean;
    cls?: string;
    isCamera?: boolean;
    cameraIcon?: boolean;
    isLight?: boolean;
    isObject3D?: boolean;
    isMesh?: boolean;
    noLock?: boolean;
    draggable?: boolean;
    children?: TreeItemData[];
    onClick?: (event: React.MouseEvent) => void;
    userData?: any;
}

interface Props {
    selected: string[] | null;
    data: TreeItemData;
    index: number;
    leaf: boolean;
    lockedItems: string[];
    isBehaviors: boolean;
    isGroup: boolean;
    isPrefab: boolean;
    isPrefabLocked: boolean;
    isStemEditorRoot: boolean;
    onLockClick: (value: string) => void;
    handleClick: (event: React.MouseEvent) => void;
    onDoubleClick: (value: string, event: React.MouseEvent) => void;
    onDrop: (values: string[], target: HTMLElement, area: number) => void;
    onExpand: (value: string, event?: React.MouseEvent) => void;
    scrollToSelected: (uuid?: string) => void;
    createEmptyGroup: () => void;
    convertToPrefab?: () => void;
    editPrefab?: () => void;
    openInStemEditor?: () => void;
    savePrefab?: () => void;
    revertPrefab?: () => void;
    exportStem?: () => void;
    ungroupModelAsset?: (objectUuid: string) => void;
    onEditLambda?: (instanceId: string) => void;
    onDeleteLambda?: (instanceId: string) => void;
    expandedPath: string[];
    isModelChild: boolean;
}

const TreeItemComponent = ({
    selected,
    data,
    index,
    leaf,
    lockedItems,
    isBehaviors,
    isGroup,
    isPrefab,
    isPrefabLocked,
    isStemEditorRoot,
    onLockClick,
    handleClick,
    onDoubleClick,
    onDrop,
    onExpand,
    scrollToSelected,
    createEmptyGroup,
    convertToPrefab,
    editPrefab,
    openInStemEditor,
    savePrefab,
    revertPrefab,
    exportStem,
    ungroupModelAsset,
    onEditLambda,
    onDeleteLambda,
    expandedPath,
    isModelChild,
}: Props) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [expanded, setExpanded] = useState<boolean>();
    const [renameActive, setRenameActive] = useState(false);
    const [itemName, setItemName] = useState<string>(data.text || getDefaultName(data) || "");
    const [menuItem, setMenuItem] = useState("");
    const [currentDrag, setCurrentDrag] = useState<EventTarget>();
    const [menuPosition, setMenuPosition] = useState<MenuPositionType | null>(null);
    const [editorVisibility, setEditorVisibility] = useState(!!data.userData?.editorVisibility);
    const [currentStem, setCurrentStem] = useState<DomainAssetDto>();
    const app = global.app as EngineRuntime;

    const {activeRightPanel} = useAppGlobalContext();

    const {canEdit} = useCanEditAsset({
        assetOwnerId: currentStem?.userId,
    });
    const closeMenu = () => {
        setMenuPosition(null);
        setMenuItem("");
    };

    const getStem = async () => {
        try {
            const stem = await getAsset(data.userData?.prefabId);
            setCurrentStem(stem);
        } catch (error) {
            console.error("getStem error", error);
        }
    };

    useEffect(() => {
        if (isPrefab) {
            getStem();
        }
    }, [isPrefab]);

    const handleEditorVisibilityChange = () => {
        app?.editor?.handleEditorVisibilityChange(data.value, !editorVisibility);
        setEditorVisibility(prev => !prev);
    };

    const getTypeImage = (obj: TreeItemData) => {
        if (obj.type === "Lambda") {
            return lambdaIcon;
        }

        if (obj.type === "ParticleEmitter") {
            return particleIcon;
        }

        if (obj.isLight) {
            return lightsIcon;
        }

        if (obj.isCamera || obj.cameraIcon) {
            return cameraIcon;
        }

        if (obj.isMesh) {
            return meshIcon;
        }

        if (obj.isObject3D) {
            return modelIcon;
        }

        return modelIcon;
    };
    const handleRightClick = (event: React.MouseEvent<HTMLElement, MouseEvent>, valueObj?: any) => {
        event.stopPropagation();
        event.preventDefault();

        const value = event.currentTarget.getAttribute("value") || valueObj;
        if (value) {
            setMenuItem(value);
            const x = event.clientX;
            const y = event.clientY;
            setMenuPosition({x, y});
        }
    };

    const handleDoubleClick = (event: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
        const value = event.currentTarget.getAttribute("value");
        if (value) {
            onDoubleClick?.(value, event);
        }
    };

    const handleExpandNode = (event: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
        event.stopPropagation();
        const value = event.currentTarget.getAttribute("data-value");
        if (value) {
            setExpanded(prevState => !prevState);
            onExpand?.(value, event);
        }
    };

    useEffect(() => {
        setExpanded(!isPrefab && !!data?.expanded);
    }, []);

    useEffect(() => {
        if (!isPrefab && expandedPath?.includes(data.value)) {
            setExpanded(true);
            onExpand?.(data.value);
            if (expandedPath[expandedPath.length - 1] === data.value) {
                requestAnimationFrame(() => {
                    scrollToSelected();
                });
            }
        }
    }, [expandedPath]);

    const children =
        isGroup && expanded && data.children?.length ? (
            <SubList $collapse={false}>
                {data.children.map((child, idx) => {
                    const isBehaviors = child.userData?.behaviors && child.userData?.behaviors.length > 0;
                    const isPrefab = Boolean(child.userData?.prefabId);
                    const isPrefabLocked = !child.userData?.prefabEditRevisionId;
                    const isGroup = child.type === "Group";
                    let showGroup = isGroup;
                    if (isPrefab && isPrefabLocked) {
                        showGroup = false;
                    }
                    return (
                        <TreeItem
                            key={child.value}
                            expandedPath={expandedPath}
                            scrollToSelected={scrollToSelected}
                            selected={selected}
                            data={child}
                            index={idx}
                            leaf={!child.children || child.children.length === 0}
                            lockedItems={lockedItems}
                            isBehaviors={isBehaviors}
                            isGroup={showGroup}
                            isPrefab={isPrefab}
                            isPrefabLocked={isPrefabLocked}
                            isStemEditorRoot={false}
                            onLockClick={onLockClick}
                            handleClick={handleClick}
                            onDoubleClick={onDoubleClick}
                            onDrop={onDrop}
                            onExpand={onExpand}
                            createEmptyGroup={createEmptyGroup}
                            convertToPrefab={convertToPrefab}
                            editPrefab={editPrefab}
                            openInStemEditor={openInStemEditor}
                            savePrefab={savePrefab}
                            revertPrefab={revertPrefab}
                            exportStem={exportStem}
                            ungroupModelAsset={ungroupModelAsset}
                            onEditLambda={onEditLambda}
                            onDeleteLambda={onDeleteLambda}
                            isModelChild={isModelChild}
                        />
                    );
                })}
            </SubList>
        ) : null;

    useEffect(() => {
        if (renameActive && inputRef.current) {
            inputRef.current.focus();
        }
    }, [renameActive]);

    useEffect(() => {
        const refreshState = () => {
            const selected = app?.editor?.selected;
            if (!selected || Array.isArray(selected) || selected.uuid !== data.value) return;
            setItemName((selected).name);
        };

        app?.on(`objectChanged.TreeItemComponent${data.value}`, refreshState);

        return () => {
            app?.on(`objectChanged.TreeItemComponent${data.value}`, null);
        };
    }, []);

    const handleNameChange = () => {
        const editor = app?.editor;
        if (app && editor?.selected) {
            const selected = editor.selected;
            if (!Array.isArray(selected)) {
                selected.name = itemName;
                selected.userData.uiTag = `UITag_${itemName}`;
                selected.userData.variable = itemName;
                app.call(`objectChanged`, editor.selected, editor.selected);
                setRenameActive(false);
            }
        }
    };

    const icon = isPrefab
        ? isPrefabLocked
            ? prefabIcon
            : prefabUnlockedIcon
        : isBehaviors
          ? behaviorsIcon
          : getTypeImage(data);
    const selectedState =
        data.value === "0"
            ? activeRightPanel === RIGHT_PANEL_VERSIONS.GameSettings
            : data.value === "1"
              ? activeRightPanel === RIGHT_PANEL_VERSIONS.DEFAULT_LIGHTS_FOG
              : data.value === "2"
                ? activeRightPanel === RIGHT_PANEL_VERSIONS.RenderingAndPerformance
                : !!selected?.includes(data.value);

    const isPrefabInEditMode = isPrefab && isPrefabLocked && canEdit;

    return (
        <ListItem
            className={selected?.includes(data.value) ? "selected" : ""}
            $selected={selectedState}
            value={data.value}
            key={data.value + index}
            onContextMenu={handleRightClick}
            onClick={data.onClick || handleClick}
            onDoubleClick={handleDoubleClick}
            draggable={data.draggable !== false}
            onDrag={e => handleDrag(e, setCurrentDrag)}
            onDragStart={e => {
                const draggedUuid = e.currentTarget.getAttribute("value");
                const draggedValues = draggedUuid
                    ? selected?.includes(draggedUuid)
                        ? selected
                        : [draggedUuid]
                    : selected;

                draggedValues?.forEach(uuid => {
                    const el = document.querySelector<HTMLLIElement>(`li[value="${uuid}"]`);
                    if (el) {
                        el.classList.add("dragging");
                    }
                });
                handleDragStart(e);
            }}
            onDragOver={e => handleDragOver(e, currentDrag)}
            onDrop={e => {
                handleMultipleDrop(e, app, selected!, onDrop);

                const draggedUuid = e.dataTransfer.getData("object-uuid");
                const draggedValues = draggedUuid
                    ? selected?.includes(draggedUuid)
                        ? selected
                        : [draggedUuid]
                    : selected;

                draggedValues?.forEach(uuid => {
                    const el = document.querySelector<HTMLLIElement>(`li[value="${uuid}"]`);
                    if (el) {
                        el.classList.remove("dragging");
                    }
                });
            }}
            onDragLeave={e => handleDragLeave(e, currentDrag)}
            id={data.value + index}
        >
            <ListItemContent className="node-content">
                <TypeImgWrapper>
                    <TypeImg
                        className="itemIcon"
                        $selected={selectedState}
                        $emphasized={isBehaviors || isPrefab}
                        $isPrefab={isPrefab}
                        src={icon}
                    />
                </TypeImgWrapper>
                {renameActive ? (
                    <form onSubmit={handleNameChange}>
                        <RenameInput
                            ref={inputRef}
                            type="text"
                            onChange={e => setItemName(e.target.value)}
                            value={itemName}
                            onBlur={() => setTimeout(handleNameChange, 0)}
                        />
                    </form>
                ) : (
                    <div style={{display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0}}>
                        <MarqueeLabel
                            minWidth={200}
                            style={{
                                maxWidth: data.noMaxWidth ? undefined : "calc(100% - 110px)",
                                marginLeft: 7,
                                color: selectedState ? "#fff" : "#b4b0b0",
                                textDecoration: "none",
                                pointerEvents: "none",
                            }}
                        >
                            {itemName}
                        </MarqueeLabel>
                        {data.tooltipText && (
                            <Tooltip
                                text={data.tooltipText}
                                width="220px"
                            />
                        )}
                    </div>
                )}
                <Line
                    $top
                    className="line"
                />
                <Line
                    $bottom
                    className="line"
                />

                {isGroup && data.children?.length ? (
                    <ExpandItemButton
                        $selected={selectedState}
                        $open={!leaf && !!expanded}
                        onClick={handleExpandNode}
                        data-value={data.value}
                    >
                        <img
                            data-value={data.value}
                            src={arrowIcon}
                        />
                    </ExpandItemButton>
                ) : (
                    <Line
                        $middle
                        className="line"
                    />
                )}

                {!data.noLock && (
                    <SelectedItemIcon
                        $isLocked={lockedItems.includes(data.value)}
                        $rightPosition="48px"
                        $selected={!!selected?.includes(data.value) || lockedItems.includes(data.value)}
                        data-value={data.value}
                        onClick={() => onLockClick(data.value)}
                        src={lockIcon}
                    />
                )}
                {data.type === "Lambda" && (onEditLambda || onDeleteLambda) && (
                    <>
                        {onEditLambda && (
                            <SelectedItemIcon
                                $rightPosition="28px"
                                $selected={!!selected?.includes(data.value)}
                                src={editIcon}
                                onClick={e => {
                                    e.stopPropagation();
                                    onEditLambda(data.value);
                                }}
                                height={13}
                            />
                        )}
                        {onDeleteLambda && (
                            <SelectedItemIcon
                                $rightPosition="6px"
                                $selected={!!selected?.includes(data.value)}
                                src={deleteIcon}
                                onClick={e => {
                                    e.stopPropagation();
                                    onDeleteLambda(data.value);
                                }}
                            />
                        )}
                    </>
                )}
                {data.value !== "game-manager-id" && !data.isDefaultItem && (
                    <>
                        {isPrefab && isPrefabInEditMode ? (
                            <SelectedItemIconWrapper
                                $rightPosition="38px"
                                $selected={!editorVisibility || !!selected?.includes(data.value)}
                            >
                                <Tooltip text="Stem is not in edit mode">
                                    <SelectedItemIcon
                                        $rightPosition="-10px"
                                        $selected={!editorVisibility || !!selected?.includes(data.value)}
                                        src={editorVisibility ? openEyeIcon : closedEyeIcon}
                                        onClick={isPrefabInEditMode ? undefined : handleEditorVisibilityChange}
                                        height={13}
                                        $disabledPrefab={isPrefabInEditMode}
                                    />
                                </Tooltip>
                            </SelectedItemIconWrapper>
                        ) : (
                            <SelectedItemIcon
                                $rightPosition="28px"
                                $selected={!editorVisibility || !!selected?.includes(data.value)}
                                src={editorVisibility ? openEyeIcon : closedEyeIcon}
                                onClick={isPrefabInEditMode ? undefined : handleEditorVisibilityChange}
                                height={13}
                                $disabledPrefab={isPrefabInEditMode}
                            />
                        )}
                        <SelectedItemIcon
                            $rightPosition="6px"
                            $selected={!!selected?.includes(data.value)}
                            src={menuIcon}
                            onClick={e => handleRightClick(e, data.value)}
                        />
                        {menuItem === data.value && menuPosition && (() => {
                            const stemEditorMode = isStemEditor(app.editor?.scene);
                            return (
                            <ItemRightClickMenu
                                isGroup={isGroup}
                                data={data}
                                createEmptyGroup={createEmptyGroup}
                                convertToPrefab={!isPrefab && !stemEditorMode ? convertToPrefab : undefined}
                                editPrefab={isPrefabInEditMode && !stemEditorMode ? editPrefab : undefined}
                                openInStemEditor={
                                    isPrefabInEditMode && !stemEditorMode ? openInStemEditor : undefined
                                }
                                savePrefab={
                                    isPrefab && !isPrefabLocked && canEdit && !stemEditorMode
                                        ? savePrefab
                                        : undefined
                                }
                                revertPrefab={
                                    isPrefab && !isPrefabLocked && !stemEditorMode ? revertPrefab : undefined
                                }
                                exportStem={
                                    isPrefab && isPrefabLocked && canEdit && !stemEditorMode
                                        ? exportStem
                                        : undefined
                                }
                                ungroupModelAsset={ungroupModelAsset}
                                lockedItems={lockedItems}
                                closeMenu={closeMenu}
                                onLockClick={onLockClick}
                                menuPosition={menuPosition}
                                scrollToSelected={scrollToSelected}
                                setRenameActive={setRenameActive}
                                isModelChild={isModelChild}
                                isPrefab={isPrefab}
                                isPrefabLocked={isPrefabLocked}
                                isStemEditorRoot={isStemEditorRoot}
                            />
                            );
                        })()}
                    </>
                )}
            </ListItemContent>
            {leaf ? null : children}
        </ListItem>
    );
};

export const TreeItem = React.memo(TreeItemComponent, (prevProps, nextProps) => {
    // Custom comparison function for better performance
    // Return true if props are equal (skip re-render)
    return (
        prevProps.data.value === nextProps.data.value &&
        prevProps.data.text === nextProps.data.text &&
        prevProps.data.expanded === nextProps.data.expanded &&
        prevProps.index === nextProps.index &&
        prevProps.leaf === nextProps.leaf &&
        prevProps.isBehaviors === nextProps.isBehaviors &&
        prevProps.isPrefab === nextProps.isPrefab &&
        prevProps.isPrefabLocked === nextProps.isPrefabLocked &&
        prevProps.isGroup === nextProps.isGroup &&
        prevProps.selected === nextProps.selected &&
        prevProps.lockedItems.includes(prevProps.data.value) === nextProps.lockedItems.includes(nextProps.data.value) &&
        // Check if children array is the same
        prevProps.data.children === nextProps.data.children
    );
});

TreeItem.displayName = "TreeItem";
