import React from "react";
import * as THREE from "three";

import {handleClone} from "./helpers";
import {IRightClickMenu, MENU_OPTION_TYPE, MenuPositionType} from "./types";
import {useRemoveObject} from "./useRemoveObject";
import EngineRuntime from "../../../EngineRuntime";
import {AlignDistributeCommand, CSGOperation} from "../../../command/Commands";
import type {AlignDistributeAxis, AlignDistributeMode} from "../../../command/geometry/AlignDistributeCommand";
import {isStemEditor} from "../../../editor/stem-editor/isStemEditor";
import type {StemEditorMetadata} from "../../../editor/stem-editor/saveStemEditor";
import global from "../../../global";
import CustomTube from "../../../object/geometry/CustomTube";
import {ItemMenuText, RightClickMenu, MenuSeparator} from "../../common/RightClickMenu/RightClickMenu";

interface Props {
    isGroup: boolean;
    data: any;
    createEmptyGroup: () => void;
    convertToPrefab?: () => void;
    editPrefab?: () => void;
    openInStemEditor?: () => void;
    savePrefab?: () => void;
    revertPrefab?: () => void;
    exportStem?: () => void;
    ungroupModelAsset?: (objectUuid: string) => void;
    lockedItems: string[];
    closeMenu: () => void;
    onLockClick: (value: string) => void;
    menuPosition: MenuPositionType;
    scrollToSelected: () => void;
    setRenameActive: React.Dispatch<React.SetStateAction<boolean>>;
    isModelChild: boolean;
    isPrefab: boolean;
    isPrefabLocked: boolean;
    isStemEditorRoot: boolean;
}

export const ItemRightClickMenu = ({
    isGroup,
    data,
    createEmptyGroup,
    convertToPrefab,
    editPrefab,
    openInStemEditor,
    savePrefab,
    revertPrefab,
    exportStem,
    ungroupModelAsset,
    lockedItems,
    closeMenu,
    onLockClick,
    menuPosition,
    scrollToSelected,
    setRenameActive,
    isModelChild,
    isPrefab,
    isPrefabLocked,
    isStemEditorRoot,
}: Props) => {
    const app = global.app as EngineRuntime;
    const removeObject = useRemoveObject();
    // Check if selected objects are all meshes (any type) for CSG operations
    const areAllMeshes = (): boolean => {
        const selected = app.editor?.selected;
        if (!Array.isArray(selected) || selected.length < 2) return false;

        return selected.every(obj => {
            // Check if it's a mesh with valid geometry
            if (!(obj instanceof THREE.Mesh)) return false;
            const geometry = obj.geometry;
            // Ensure geometry exists and has valid vertices
            return geometry && geometry.attributes && geometry.attributes.position;
        });
    };

    const showCSGOptions = areAllMeshes();
    console.log("showCSGOptions:", showCSGOptions);

    // Align/Distribute apply to any Object3D (not mesh-only). Need 2+ for align,
    // 3+ for distribute. A group selection where all entries are valid Object3Ds.
    const selectedCount = Array.isArray(app.editor?.selected) ? (app.editor?.selected as any[]).length : 0;
    const showAlign = selectedCount >= 2;
    const showDistribute = selectedCount >= 3;

    // Group operates on the full multi-selection, not the right-clicked
    // item, so isStemEditorRoot (which is per-item) isn't enough — we
    // also need to detect a stem instance anywhere in the selection.
    const selectionIncludesStemEditorRoot = (() => {
        const scene = app.editor?.scene;
        if (!isStemEditor(scene)) return false;
        const stemMeta = scene?.userData?.stemEditor as StemEditorMetadata | undefined;
        if (!stemMeta) return false;
        const stemInstance = scene?.children.find(
            child => (child.userData?.prefabId as string | undefined) === stemMeta.assetId,
        );
        if (!stemInstance) return false;
        const selected = app.editor?.selected;
        if (!Array.isArray(selected)) return selected === stemInstance;
        return selected.some(obj => obj === stemInstance);
    })();

    // Check if the selected object is a CustomTube
    const isCustomTube = (): boolean => {
        if (!app?.editor) return false;
        const object = app.editor.objectByUuid(data.value);
        return object instanceof CustomTube;
    };

    const showEditCurveOption = isCustomTube();

    const MENU_ITEMS: IRightClickMenu[] = [
        {label: "Duplicate", optionType: MENU_OPTION_TYPE.CLONE},
        {label: lockedItems.includes(data.value) ? "Unlock" : "Lock", optionType: MENU_OPTION_TYPE.LOCK},
        {label: "", optionType: MENU_OPTION_TYPE.SEPARATOR, isSeparator: true},
        {label: "Create Empty Group", optionType: MENU_OPTION_TYPE.EMPTY_GROUP},
        ...(convertToPrefab && (!Array.isArray(app.editor?.selected) || (app.editor?.selected as any)?.length === 1)
            ? [{label: "Convert to Stem", optionType: MENU_OPTION_TYPE.CONVERT_TO_PREFAB}]
            : []),
        ...(editPrefab ? [{label: "Edit Stem", optionType: MENU_OPTION_TYPE.EDIT_PREFAB}] : []),
        ...(openInStemEditor ? [{label: "Open in Stem Editor", optionType: MENU_OPTION_TYPE.OPEN_IN_STEM_EDITOR}] : []),
        ...(savePrefab ? [{label: "Save Stem", optionType: MENU_OPTION_TYPE.SAVE_PREFAB}] : []),
        ...(revertPrefab ? [{label: "Revert Stem", optionType: MENU_OPTION_TYPE.REVERT_PREFAB}] : []),
        ...(exportStem ? [{label: "Export Stem", optionType: MENU_OPTION_TYPE.EXPORT_STEM}] : []),
        (isGroup || (app.editor?.objectByUuid(data.value)?.children?.length ?? 0) > 0) &&
            !isStemEditorRoot &&
            !(isPrefab && isPrefabLocked) && {
                label: "Ungroup",
                optionType: MENU_OPTION_TYPE.UNGROUP,
            },
        (app.editor?.selected as any)?.length > 1 &&
            !selectionIncludesStemEditorRoot && {label: "Group", optionType: MENU_OPTION_TYPE.GROUP},
        ...(showCSGOptions
            ? [
                  {label: "", optionType: MENU_OPTION_TYPE.SEPARATOR, isSeparator: true},
                  {label: "Merge Shapes", optionType: MENU_OPTION_TYPE.CSG_UNION},
                  {label: "Intersect Shapes", optionType: MENU_OPTION_TYPE.CSG_INTERSECTION},
                  {label: "Subtract Shapes", optionType: MENU_OPTION_TYPE.CSG_SUBTRACTION},
                  {label: "Difference Shapes", optionType: MENU_OPTION_TYPE.CSG_DIFFERENCE},
                  {label: "Hollow Subtract", optionType: MENU_OPTION_TYPE.CSG_HOLLOW_SUBTRACTION},
                  {label: "Hollow Intersect", optionType: MENU_OPTION_TYPE.CSG_HOLLOW_INTERSECTION},
              ]
            : []),
        ...(showAlign
            ? [
                  {label: "", optionType: MENU_OPTION_TYPE.SEPARATOR, isSeparator: true},
                  {label: "Align X", optionType: MENU_OPTION_TYPE.ALIGN_X},
                  {label: "Align Y", optionType: MENU_OPTION_TYPE.ALIGN_Y},
                  {label: "Align Z", optionType: MENU_OPTION_TYPE.ALIGN_Z},
              ]
            : []),
        ...(showDistribute
            ? [
                  {label: "Distribute X", optionType: MENU_OPTION_TYPE.DISTRIBUTE_X},
                  {label: "Distribute Y", optionType: MENU_OPTION_TYPE.DISTRIBUTE_Y},
                  {label: "Distribute Z", optionType: MENU_OPTION_TYPE.DISTRIBUTE_Z},
              ]
            : []),
        {label: "", optionType: MENU_OPTION_TYPE.SEPARATOR, isSeparator: true},
        ...(showEditCurveOption ? [{label: "Edit Curve", optionType: MENU_OPTION_TYPE.EDIT_CURVE}] : []),
        !isStemEditorRoot && {label: "Delete", optionType: MENU_OPTION_TYPE.DELETE},
        {label: "Edit Name", optionType: MENU_OPTION_TYPE.EDIT_NAME},
    ].filter(Boolean) as IRightClickMenu[];

    console.log(
        "CSG items in menu:",
        MENU_ITEMS.filter(
            item =>
                item.optionType === MENU_OPTION_TYPE.CSG_UNION ||
                item.optionType === MENU_OPTION_TYPE.CSG_INTERSECTION ||
                item.optionType === MENU_OPTION_TYPE.CSG_SUBTRACTION ||
                item.optionType === MENU_OPTION_TYPE.CSG_DIFFERENCE ||
                item.optionType === MENU_OPTION_TYPE.CSG_HOLLOW_SUBTRACTION ||
                item.optionType === MENU_OPTION_TYPE.CSG_HOLLOW_INTERSECTION,
        ),
    );

    const handleUngroup = (event: any, value: any) => {
        event.stopPropagation();
        if (!app || !app.editor) return;

        const object = app.editor.objectByUuid(value);
        if (!object) return;

        // If ungrouping a model asset instance, upload children as separate assets
        if (object.userData?.modelId && ungroupModelAsset) {
            ungroupModelAsset(value);
            return;
        }

        app.editor.ungroupElements(object);
    };

    const handleGroup = (event: any) => {
        event.stopPropagation();
        if (!app || !app.editor) return;
        const selected = app.editor.selected;

        if (Array.isArray(selected) && selected?.length > 1) {
            app.editor.groupElements(selected);
        }
    };

    const handleEditName = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, value: any) => {
        event.stopPropagation();
        if (!app?.editor) return;
        const object = app.editor.objectByUuid(value);

        if (object === null || object?.parent === null) {
            return;
        }
        setRenameActive(true);
        app.editor.select(object);
    };

    const handleEditCurve = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, value: any) => {
        event.stopPropagation();
        if (!app?.editor) return;
        const object = app.editor.objectByUuid(value);

        if (object instanceof CustomTube) {
            // Select the object - CurveEditor panel will auto-open via RightPanel
            app.editor.select(object);
        }
        closeMenu();
    };

    const handleAlignDistribute = async (
        event: React.MouseEvent<HTMLDivElement, MouseEvent>,
        axis: AlignDistributeAxis,
        mode: AlignDistributeMode,
    ) => {
        event.stopPropagation();
        if (!app?.editor) return;
        const selected = app.editor.selected;
        if (!Array.isArray(selected) || selected.length < 2) return;
        if (mode === "distribute" && selected.length < 3) return;
        closeMenu();
        try {
            const command = new AlignDistributeCommand(selected, axis, mode);
            await app.editor.execute(command);
        } catch (error) {
            console.error(`AlignDistribute ${mode} ${axis} failed:`, error);
        }
    };

    const handleCSGOperation = async (event: React.MouseEvent<HTMLDivElement, MouseEvent>, operation: CSGOperation) => {
        event.stopPropagation();
        console.log("handleCSGOperation called with operation:", operation);

        if (!app?.editor) {
            console.log("No app.editor, returning");
            return;
        }

        const selected = app.editor.selected;
        console.log("Selected objects:", selected);

        if (!Array.isArray(selected) || selected.length < 2) {
            console.log("Not enough objects selected, returning");
            return;
        }

        // Close this menu first
        closeMenu();

        // For union, intersection, and hollow intersection - order doesn't matter, execute directly
        if (
            operation === CSGOperation.UNION ||
            operation === CSGOperation.INTERSECTION ||
            operation === CSGOperation.HOLLOW_INTERSECTION
        ) {
            console.log(`${operation} operation - executing directly without dialog (order doesn't matter)`);
            try {
                const {CSGCommand} = await import("../../../command/Commands");
                const command = new CSGCommand(selected, operation);
                await app.editor.execute(command);
            } catch (error) {
                console.error(`CSG ${operation} operation failed:`, error);
            }
            return;
        }

        // For subtraction, difference, and hollow subtraction - show dialog to choose order (A-B vs B-A matters)
        const editorComponent = (app.editor as any).component;
        if (editorComponent && editorComponent.showCSGDialog) {
            console.log(`Calling editorComponent.showCSGDialog for ${operation}`);
            editorComponent.showCSGDialog(selected, operation);
        } else {
            console.error("EditorComponent.showCSGDialog not available");
        }
    };

    const handleMenuClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, type: MENU_OPTION_TYPE) => {
        closeMenu();
        switch (type) {
            case MENU_OPTION_TYPE.CLONE:
                handleClone({event: e, value: data.value, app, scrollToSelected});
                break;

            case MENU_OPTION_TYPE.LOCK:
                onLockClick(data.value);
                break;

            case MENU_OPTION_TYPE.EMPTY_GROUP:
                createEmptyGroup();
                break;

            case MENU_OPTION_TYPE.CONVERT_TO_PREFAB:
                convertToPrefab?.();
                break;

            case MENU_OPTION_TYPE.EDIT_PREFAB:
                editPrefab?.();
                break;

            case MENU_OPTION_TYPE.OPEN_IN_STEM_EDITOR:
                openInStemEditor?.();
                break;

            case MENU_OPTION_TYPE.SAVE_PREFAB:
                savePrefab?.();
                break;

            case MENU_OPTION_TYPE.REVERT_PREFAB:
                revertPrefab?.();
                break;

            case MENU_OPTION_TYPE.EXPORT_STEM:
                exportStem?.();
                break;

            case MENU_OPTION_TYPE.UNGROUP:
                handleUngroup(e, data.value);
                break;

            case MENU_OPTION_TYPE.GROUP:
                handleGroup(e);
                break;

            case MENU_OPTION_TYPE.DELETE:
                removeObject(e, data.value);
                break;

            case MENU_OPTION_TYPE.EDIT_NAME:
                handleEditName(e, data.value);
                break;

            case MENU_OPTION_TYPE.EDIT_CURVE:
                handleEditCurve(e, data.value);
                break;

            case MENU_OPTION_TYPE.CSG_UNION:
                handleCSGOperation(e, CSGOperation.UNION);
                break;

            case MENU_OPTION_TYPE.CSG_INTERSECTION:
                handleCSGOperation(e, CSGOperation.INTERSECTION);
                break;

            case MENU_OPTION_TYPE.CSG_SUBTRACTION:
                handleCSGOperation(e, CSGOperation.SUBTRACTION);
                break;

            case MENU_OPTION_TYPE.CSG_DIFFERENCE:
                handleCSGOperation(e, CSGOperation.DIFFERENCE);
                break;

            case MENU_OPTION_TYPE.CSG_HOLLOW_SUBTRACTION:
                handleCSGOperation(e, CSGOperation.HOLLOW_SUBTRACTION);
                break;

            case MENU_OPTION_TYPE.CSG_HOLLOW_INTERSECTION:
                handleCSGOperation(e, CSGOperation.HOLLOW_INTERSECTION);
                break;

            case MENU_OPTION_TYPE.ALIGN_X:
                handleAlignDistribute(e, "x", "align");
                break;

            case MENU_OPTION_TYPE.ALIGN_Y:
                handleAlignDistribute(e, "y", "align");
                break;

            case MENU_OPTION_TYPE.ALIGN_Z:
                handleAlignDistribute(e, "z", "align");
                break;

            case MENU_OPTION_TYPE.DISTRIBUTE_X:
                handleAlignDistribute(e, "x", "distribute");
                break;

            case MENU_OPTION_TYPE.DISTRIBUTE_Y:
                handleAlignDistribute(e, "y", "distribute");
                break;

            case MENU_OPTION_TYPE.DISTRIBUTE_Z:
                handleAlignDistribute(e, "z", "distribute");
                break;

            default:
                break;
        }
    };

    return (
        <RightClickMenu
            onClickoutsideCallback={closeMenu}
            left={menuPosition.x}
            top={menuPosition.y}
        >
            {isModelChild ? (
                <ItemMenuText
                    onClick={e => handleMenuClick(e, MENU_OPTION_TYPE.DELETE)}
                    $red
                >
                    Delete
                </ItemMenuText>
            ) : (
                MENU_ITEMS.map(({label, optionType, isSeparator}, index) =>
                    isSeparator ? (
                        <MenuSeparator key={`separator-${index}`} />
                    ) : (
                        <ItemMenuText
                            key={label}
                            onClick={e => handleMenuClick(e, optionType)}
                            $red={optionType === MENU_OPTION_TYPE.DELETE}
                        >
                            {label}
                        </ItemMenuText>
                    ),
                )
            )}
        </RightClickMenu>
    );
};
