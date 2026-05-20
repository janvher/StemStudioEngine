import {
    HiOutlineArrowsExpand as ArrowsExpandIcon,
    HiOutlineChevronUp as ChevronUpIcon,
    HiOutlineCube as CubeIcon,
    HiOutlinePencilAlt as PencilAltIcon,
    HiOutlineRefresh as RefreshIcon,
    HiOutlineScale as ScaleIcon,
    HiOutlineViewGrid as ViewGridIcon,
} from "react-icons/hi";
import {useEffect, useMemo, useReducer, useRef, useState, type ReactNode, type SVGProps} from "react";
import styled from "styled-components";
import * as THREE from "three";

import {ActionButton, Separator} from "./ActionBar.style";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import {useEditorSelection} from "@stem/editor-oss/hooks/useEditorSelection";
import {isCADToolsEnabled} from "../../../cad/settings";
import {CADAxisConstraint, CADSelectionMode, CADSelectionShape, CADTool} from "../../../cad/types";
import {Tooltip} from "../common";
import {NumericInput} from "../common/NumericInput";

const CadButton = styled(ActionButton)<{$active?: boolean; $iconOnly?: boolean}>`
    width: ${({$iconOnly}) => $iconOnly ? "32px" : "auto"};
    min-width: 32px;
    padding: ${({$iconOnly}) => $iconOnly ? "0" : "0 10px"};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.03em;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${({$active}) => ($active ? "var(--theme-font-main-selected-color)" : "white")};
    background: ${({$active}) => ($active ? "var(--theme-grey-bg-secondary-button)" : "transparent")};
`;

const CadIcon = styled.span`
    display: inline-flex;
    width: 16px;
    height: 16px;
    align-items: center;
    justify-content: center;
    color: inherit;
    svg {
        width: 16px;
        height: 16px;
        display: block;
    }
`;

const CadField = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const CadMenuGroup = styled.div`
    position: relative;
    display: flex;
    align-items: center;
`;

const CadMenuTrigger = styled(CadButton)<{$open?: boolean}>`
    min-width: 40px;
    padding: 0 8px 0 10px;
    gap: 6px;
    background: ${({$active, $open}) =>
        $open || $active ? "var(--theme-grey-bg-secondary-button)" : "transparent"};
`;

const CadTriggerChevron = styled.span<{$open?: boolean}>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    height: 12px;
    opacity: 0.72;
    transform: ${({$open}) => ($open ? "rotate(180deg)" : "rotate(0deg)")};
    transition: transform 120ms ease;

    svg {
        width: 12px;
        height: 12px;
        display: block;
    }
`;

const CadMenuSheet = styled.div`
    position: absolute;
    left: 50%;
    bottom: calc(100% + 10px);
    transform: translateX(-50%);
    min-width: 220px;
    max-width: 300px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-radius: 14px;
    border: 1px solid #ffffff1a;
    background: var(--theme-container-minor-dark);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.38);
    z-index: 12;
`;

const CadMenuItem = styled.button<{$active?: boolean}>`
    width: 100%;
    padding: 9px 10px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    border: 0;
    border-radius: 10px;
    text-align: left;
    color: white;
    background: ${({$active}) => ($active ? "var(--theme-grey-bg-secondary-button)" : "transparent")};
    cursor: pointer;

    &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
`;

const CadMenuItemText = styled.span`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
`;

const CadMenuItemLabel = styled.span`
    font-size: 11px;
    font-weight: 700;
    line-height: 1.2;
`;

const CadMenuItemDescription = styled.span`
    font-size: 10px;
    line-height: 1.35;
    color: rgba(255, 255, 255, 0.72);
`;

const CadAxisPillRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const CadAxisPill = styled.button<{$active?: boolean}>`
    border: 0;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 10px;
    font-weight: 700;
    color: white;
    background: ${({$active}) => ($active ? "var(--theme-container-main-blue)" : "var(--theme-grey-bg)")};
    cursor: pointer;
`;

const CadTooltipContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 260px;
`;

const CadTooltipTitle = styled.div`
    font-size: 12px;
    font-weight: 700;
    color: white;
`;

const CadTooltipBody = styled.div`
    font-size: 11px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.88);
`;

const MeshToolIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
    />
);

const VertexSelectIcon = () => (
    <MeshToolIcon>
        <path d="M5 14L10 5.5L15 14" />
        <path d="M5 14H15" />
        <circle cx="10"
            cy="5.5"
            r="1.8"
            fill="currentColor"
            stroke="none"
        />
        <circle cx="5"
            cy="14"
            r="1.3"
        />
        <circle cx="15"
            cy="14"
            r="1.3"
        />
    </MeshToolIcon>
);

const EdgeSelectIcon = () => (
    <MeshToolIcon>
        <path d="M4.5 6.5L15.5 6.5L13.5 13.5L6.5 13.5Z" />
        <path d="M4.5 6.5L6.5 13.5" />
        <path d="M15.5 6.5L13.5 13.5" />
        <path d="M4.5 6.5L15.5 6.5"
            strokeWidth="2.6"
        />
    </MeshToolIcon>
);

const FaceSelectIcon = () => (
    <MeshToolIcon>
        <path d="M4.5 6.5L15.5 6.5L13.5 13.5L6.5 13.5Z" />
        <path d="M4.5 6.5L6.5 13.5" />
        <path d="M15.5 6.5L13.5 13.5" />
        <path d="M6.2 8.1H13.8L12.6 11.9H7.4Z"
            fill="currentColor"
            fillOpacity="0.3"
            stroke="none"
        />
    </MeshToolIcon>
);

const LassoSelectIcon = () => (
    <MeshToolIcon>
        <path d="M4.5 10.5C4.7 7.1 7.4 5 10.4 5C13.4 5 15.8 6.7 15.8 9.4C15.8 12.2 13.4 14 9.9 14C7.4 14 5.8 13.2 5.2 12.1" />
        <path d="M5 12.1L3.8 14.8L6.9 14.3" />
        <circle cx="8"
            cy="9.3"
            r="1"
            fill="currentColor"
            stroke="none"
        />
        <circle cx="12.1"
            cy="10.8"
            r="1"
            fill="currentColor"
            stroke="none"
        />
    </MeshToolIcon>
);

const ExtrudeIcon = () => (
    <MeshToolIcon>
        <path d="M5.5 12.8H14.5V16H5.5Z" />
        <path d="M7 10.2H13V12.8H7Z"
            fill="currentColor"
            fillOpacity="0.2"
        />
        <path d="M10 12.3V4.5" />
        <path d="M7.7 6.8L10 4.5L12.3 6.8" />
    </MeshToolIcon>
);

const InsetIcon = () => (
    <MeshToolIcon>
        <rect x="4.5"
            y="4.5"
            width="11"
            height="11"
            rx="0.5"
        />
        <rect x="7.3"
            y="7.3"
            width="5.4"
            height="5.4"
            rx="0.5"
        />
        <path d="M10 4.7V2.9" />
        <path d="M10 17.1V15.3" />
        <path d="M4.7 10H2.9" />
        <path d="M17.1 10H15.3" />
    </MeshToolIcon>
);

const BevelIcon = () => (
    <MeshToolIcon>
        <path d="M5 5H12.2L15 7.8V15H5Z" />
        <path d="M12.2 5V7.8H15" />
        <path d="M8 12L12 8" />
        <path d="M7 14H10.2L14 10.2V7" />
    </MeshToolIcon>
);

const ApplyCheckIcon = () => (
    <MeshToolIcon>
        <path d="M4.5 10.5L8.5 14.5L15.5 5.5" />
    </MeshToolIcon>
);

const RulerIcon = () => (
    <MeshToolIcon>
        <path d="M3 10H17" />
        <path d="M3 8V12" />
        <path d="M17 8V12" />
        <path d="M10 8.5V10" />
        <path d="M6.5 9V10" />
        <path d="M13.5 9V10" />
    </MeshToolIcon>
);

const AxisIcon = () => (
    <MeshToolIcon>
        <path d="M10 10H16.5" />
        <path d="M14.5 8L16.5 10L14.5 12" />
        <path d="M10 10V3.5" />
        <path d="M8 5.5L10 3.5L12 5.5" />
        <path d="M10 10L5.5 14.5" />
        <path d="M5.8 12.2L5.5 14.5L7.8 14.2" />
    </MeshToolIcon>
);

const FlatProfileIcon = () => (
    <MeshToolIcon>
        <circle cx="5" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="15" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <path d="M6.5 10H13.5" />
    </MeshToolIcon>
);

const RoundProfileIcon = () => (
    <MeshToolIcon>
        <circle cx="5" cy="13" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="15" cy="13" r="1.5" fill="currentColor" stroke="none" />
        <path d="M5 13C5 6 15 6 15 13" />
    </MeshToolIcon>
);

interface CadDropdownOption {
    id: string;
    label: string;
    description: string;
    icon?: ReactNode;
    active?: boolean;
    disabled?: boolean;
    group?: string;
    shortcut?: string;
    onSelect: () => void;
}

const CadMenuSeparator = styled.hr`
    border: 0;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    margin: 2px 0;
`;

const CadMenuItemShortcut = styled.span`
    font-size: 10px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.4);
    margin-left: auto;
    white-space: nowrap;
    padding-left: 12px;
`;

const CAD_AXES: CADAxisConstraint[] = ["x", "y", "z"];

export const CADActionBarControls = () => {
    const app = global.app as EngineRuntime;
    const {selected, editor} = useEditorSelection("CADActionBarControls");
    const [, forceCadRefresh] = useReducer((count: number) => count + 1, 0);
    const [openCadMenu, setOpenCadMenu] = useState<null | "selectionMode" | "transformTool" | "selectionShape" | "surfaceOperation" | "axis" | "selectionActions" | "meshOps" | "annotate">(null);
    const [cadAmount, setCadAmount] = useState(0.25);
    const [bevelSteps, setBevelSteps] = useState(1);
    const [bevelProfile, setBevelProfile] = useState<"flat" | "round">("flat");
    const [edgeLength, setEdgeLength] = useState(1);
    const cadMenusRef = useRef<HTMLDivElement>(null);

    const selectedMesh = !Array.isArray(selected) && selected instanceof THREE.Mesh ? selected : null;
    const cadToolsEnabled = !!editor && isCADToolsEnabled(editor.scene);
    const cadSupport = cadToolsEnabled && selectedMesh ? editor?.getCADSupport(selectedMesh) : null;
    const isEditingSelectedMesh = !!(
        editor?.cadMode &&
        selectedMesh &&
        editor.cadEditedObject &&
        editor.cadEditedObject.uuid === selectedMesh.uuid
    );
    const canUseCAD = cadToolsEnabled && !!(isEditingSelectedMesh || cadSupport?.supported);
    const activeCADOperation =
        editor?.cadTool === "extrude" || editor?.cadTool === "inset" || editor?.cadTool === "bevel" ? editor.cadTool : null;
    const isFaceOnlyToolActive = !!activeCADOperation;
    const selectedEdgeCount = editor?.cadController.selectedEdgeIds.size || 0;
    const selectedVertexCount = editor?.cadController.selectedVertexIds.size || 0;
    const selectedFaceCount = editor?.cadController.selectedFaceIds.size || 0;
    const cadAxisConstraint = editor?.cadAxisConstraint || CAD_AXES;
    const selectedEdgeLength =
        isEditingSelectedMesh && editor?.cadSelectionMode === "edge" ? editor.cadController.getSelectedEdgeLength() : null;
    const canEditEdgeLength = isEditingSelectedMesh && editor?.cadSelectionMode === "edge" && selectedEdgeCount > 0;
    const canApplyCADOperation = !!(
        isEditingSelectedMesh &&
        editor?.cadSelectionMode === "face" &&
        activeCADOperation &&
        (activeCADOperation === "extrude" ? selectedFaceCount > 0 : selectedFaceCount === 1)
    );
    const disabledSelectionModeReason = activeCADOperation
        ? activeCADOperation === "extrude"
            ? "Extrude is active and currently works on face selections only."
            : `${activeCADOperation.charAt(0).toUpperCase()}${activeCADOperation.slice(1)} is active and currently works on one selected face only.`
        : null;
    const canDeleteCAD = !!(
        isEditingSelectedMesh &&
        ((editor?.cadSelectionMode === "vertex" && selectedVertexCount > 0) ||
            (editor?.cadSelectionMode === "edge" && selectedEdgeCount > 0) ||
            (editor?.cadSelectionMode === "face" && selectedFaceCount > 0))
    );
    const canMergeCAD = isEditingSelectedMesh && editor?.cadSelectionMode === "vertex" && selectedVertexCount >= 2;
    const canKnifeCAD = isEditingSelectedMesh && editor?.cadSelectionMode === "vertex" && selectedVertexCount === 2;
    const canEdgeBevel = isEditingSelectedMesh && editor?.cadSelectionMode === "edge" && selectedEdgeCount >= 1;
    const canDissolveCAD = isEditingSelectedMesh && editor?.cadSelectionMode === "edge" && selectedEdgeCount > 0;
    const canLoopSelectCAD = isEditingSelectedMesh && editor?.cadSelectionMode === "edge" && selectedEdgeCount > 0;
    const canLoopCutCAD = isEditingSelectedMesh && editor?.cadSelectionMode === "edge" && selectedEdgeCount === 1;
    const canBridgeCAD = isEditingSelectedMesh && editor?.cadSelectionMode === "edge" && selectedEdgeCount === 2;
    const canFillCAD = isEditingSelectedMesh && editor?.cadSelectionMode === "edge" && selectedEdgeCount >= 3;
    const canLinkedCAD = !!(
        isEditingSelectedMesh &&
        ((editor?.cadSelectionMode === "vertex" && selectedVertexCount > 0) ||
            (editor?.cadSelectionMode === "edge" && selectedEdgeCount > 0) ||
            (editor?.cadSelectionMode === "face" && selectedFaceCount > 0))
    );
    const canUseAxisConstraint = !!(
        isEditingSelectedMesh &&
        (editor?.cadTool === "move" || editor?.cadTool === "rotate" || editor?.cadTool === "scale")
    );

    const setCADMode = (enabled: boolean) => {
        if (!editor) {
            return;
        }

        if (enabled) {
            editor.enterCADMode(selectedMesh);
            return;
        }

        editor.exitCADMode();
    };

    const setCADSelectionMode = (mode: CADSelectionMode) => editor?.setCADSelectionMode(mode);
    const setCADSelectionShape = (shape: CADSelectionShape) => editor?.setCADSelectionShape(shape);
    const setCADTool = (tool: CADTool) => editor?.setCADTool(tool);

    const setAllAxes = () => editor?.setCADAxisConstraint([...CAD_AXES]);
    const toggleAxis = (axis: CADAxisConstraint) => {
        if (!editor) {
            return;
        }
        const next = cadAxisConstraint.includes(axis)
            ? cadAxisConstraint.filter(currentAxis => currentAxis !== axis)
            : [...cadAxisConstraint, axis];
        editor.setCADAxisConstraint(next);
    };

    const applyCADOperation = () => {
        if (!editor || !activeCADOperation) {
            return;
        }

        if (activeCADOperation === "extrude") {
            editor.applyCADExtrude(cadAmount);
            return;
        }

        if (activeCADOperation === "inset") {
            editor.applyCADInset(cadAmount);
            return;
        }

        editor.applyCADBevel(cadAmount);
    };

    const applyEdgeLength = () => {
        if (!editor || !canEditEdgeLength) {
            return;
        }

        editor.applyCADEdgeLength(edgeLength);
    };

    const applyCADEdgeBevel = () => {
        if (!editor || !canEdgeBevel) {
            return;
        }

        editor.applyCADEdgeBevel(cadAmount, bevelSteps, bevelProfile);
    };

    useEffect(() => {
        app.on("cadModeChanged.CADActionBarControls", forceCadRefresh);
        app.on("cadSelectionModeChanged.CADActionBarControls", forceCadRefresh);
        app.on("cadSelectionShapeChanged.CADActionBarControls", forceCadRefresh);
        app.on("cadAxisConstraintChanged.CADActionBarControls", forceCadRefresh);
        app.on("cadToolChanged.CADActionBarControls", forceCadRefresh);
        app.on("cadToolsSettingsChanged.CADActionBarControls", forceCadRefresh);
        app.on("objectChanged.CADActionBarControls", (_source: unknown, object: THREE.Object3D) => {
            if (editor?.cadEditedObject && object?.uuid === editor.cadEditedObject.uuid) {
                forceCadRefresh();
            }
        });

        return () => {
            app.on("cadModeChanged.CADActionBarControls", null);
            app.on("cadSelectionModeChanged.CADActionBarControls", null);
            app.on("cadSelectionShapeChanged.CADActionBarControls", null);
            app.on("cadAxisConstraintChanged.CADActionBarControls", null);
            app.on("cadToolChanged.CADActionBarControls", null);
            app.on("cadToolsSettingsChanged.CADActionBarControls", null);
            app.on("objectChanged.CADActionBarControls", null);
        };
    }, [app, editor]);

    useEffect(() => {
        if (selectedEdgeLength !== null) {
            setEdgeLength(Number(selectedEdgeLength.toFixed(4)));
        }
    }, [selectedEdgeLength]);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (!cadMenusRef.current?.contains(event.target as Node)) {
                setOpenCadMenu(null);
            }
        };

        window.addEventListener("mousedown", handlePointerDown);
        return () => window.removeEventListener("mousedown", handlePointerDown);
    }, []);

    useEffect(() => {
        setOpenCadMenu(null);
    }, [
        editor?.cadMode,
        editor?.cadSelectionMode,
        editor?.cadSelectionShape,
        editor?.cadTool,
        selectedMesh?.uuid,
        cadToolsEnabled,
    ]);

    const renderCadTooltip = (title: string, body: string, compare?: string) => (
        <CadTooltipContent>
            <CadTooltipTitle>{title}</CadTooltipTitle>
            <CadTooltipBody>{body}</CadTooltipBody>
            {compare && <CadTooltipBody>{compare}</CadTooltipBody>}
        </CadTooltipContent>
    );

    const cadTooltipProps = {
        height: "auto",
        stayOpenOnHover: true,
        offsetY: -10,
    } as const;

    const selectionModeTrigger = editor?.cadSelectionMode === "edge"
        ? {label: "Edge", icon: <EdgeSelectIcon />}
        : editor?.cadSelectionMode === "face"
            ? {label: "Face", icon: <FaceSelectIcon />}
            : {label: "Vertex", icon: <VertexSelectIcon />};
    const transformTrigger = editor?.cadTool === "rotate"
        ? {label: "Rotate", icon: <RefreshIcon />}
        : editor?.cadTool === "scale"
            ? {label: "Scale", icon: <ScaleIcon />}
            : {label: "Move", icon: <ArrowsExpandIcon />};
    const selectionShapeTrigger = editor?.cadSelectionShape === "lasso"
        ? {label: "Lasso", icon: <LassoSelectIcon />}
        : {label: "Box", icon: <ViewGridIcon />};
    const surfaceOperationTrigger = activeCADOperation === "inset"
        ? {label: "Inset", icon: <InsetIcon />}
        : activeCADOperation === "bevel"
            ? {label: "Bevel", icon: <BevelIcon />}
            : {label: "Extrude", icon: <ExtrudeIcon />};
    const axisLabel = cadAxisConstraint.length === 3
        ? "All"
        : cadAxisConstraint.length === 0
            ? "None"
            : cadAxisConstraint.map(axis => axis.toUpperCase()).join("");

    const selectionModeOptions: CadDropdownOption[] = [
        {
            id: "vertex",
            label: "Vertex",
            description: disabledSelectionModeReason || "Pick individual points for the most precise shape edits.",
            icon: <VertexSelectIcon />,
            active: editor?.cadSelectionMode === "vertex",
            disabled: !isEditingSelectedMesh || isFaceOnlyToolActive,
            onSelect: () => setCADSelectionMode("vertex"),
        },
        {
            id: "edge",
            label: "Edge",
            description: disabledSelectionModeReason || "Pick edge segments to control borders, lengths, and edge-only tools.",
            icon: <EdgeSelectIcon />,
            active: editor?.cadSelectionMode === "edge",
            disabled: !isEditingSelectedMesh || isFaceOnlyToolActive,
            onSelect: () => setCADSelectionMode("edge"),
        },
        {
            id: "face",
            label: "Face",
            description: activeCADOperation
                ? `${activeCADOperation.charAt(0).toUpperCase()}${activeCADOperation.slice(1)} uses face selection while it is active.`
                : "Pick full polygons for surface-wide edits like extrude, inset, and face bevel.",
            icon: <FaceSelectIcon />,
            active: editor?.cadSelectionMode === "face",
            disabled: !isEditingSelectedMesh,
            onSelect: () => setCADSelectionMode("face"),
        },
    ];

    const transformToolOptions: CadDropdownOption[] = [
        {
            id: "move",
            label: "Move",
            description: "Translate the current vertex, edge, or face selection without creating new geometry.",
            icon: <ArrowsExpandIcon />,
            active: editor?.cadTool === "move",
            disabled: !isEditingSelectedMesh,
            onSelect: () => setCADTool("move"),
        },
        {
            id: "rotate",
            label: "Rotate",
            description: "Rotate only the selected mesh components around the CAD selection center.",
            icon: <RefreshIcon />,
            active: editor?.cadTool === "rotate",
            disabled: !isEditingSelectedMesh,
            onSelect: () => setCADTool("rotate"),
        },
        {
            id: "scale",
            label: "Scale",
            description: "Scale only the selected mesh components around the CAD selection center.",
            icon: <ScaleIcon />,
            active: editor?.cadTool === "scale",
            disabled: !isEditingSelectedMesh,
            onSelect: () => setCADTool("scale"),
        },
    ];

    const selectionShapeOptions: CadDropdownOption[] = [
        {
            id: "box",
            label: "Box",
            description: "Drag a rectangular marquee to select components quickly.",
            icon: <ViewGridIcon />,
            active: editor?.cadSelectionShape === "box",
            disabled: !isEditingSelectedMesh,
            onSelect: () => setCADSelectionShape("box"),
        },
        {
            id: "lasso",
            label: "Lasso",
            description: "Draw a freeform region to capture irregular component groups.",
            icon: <LassoSelectIcon />,
            active: editor?.cadSelectionShape === "lasso",
            disabled: !isEditingSelectedMesh,
            onSelect: () => setCADSelectionShape("lasso"),
        },
    ];

    const surfaceOperationOptions: CadDropdownOption[] = [
        {
            id: "extrude",
            label: "Extrude",
            description: "Add new geometry by pulling the selected face region outward.",
            icon: <ExtrudeIcon />,
            active: editor?.cadTool === "extrude",
            disabled: !isEditingSelectedMesh,
            onSelect: () => setCADTool("extrude"),
        },
        {
            id: "inset",
            label: "Inset",
            description: "Create a smaller inner face and border on the selected face.",
            icon: <InsetIcon />,
            active: editor?.cadTool === "inset",
            disabled: !isEditingSelectedMesh,
            onSelect: () => setCADTool("inset"),
        },
        {
            id: "bevel",
            label: "Bevel",
            description: "Chamfer the selected face with a softened transition ring.",
            icon: <BevelIcon />,
            active: editor?.cadTool === "bevel",
            disabled: !isEditingSelectedMesh,
            onSelect: () => setCADTool("bevel"),
        },
    ];

    const canInvertNormals = isEditingSelectedMesh && editor?.cadSelectionMode === "face";
    const canSubdivide = isEditingSelectedMesh && editor?.cadSelectionMode === "face" && selectedFaceCount > 0;
    const canExtrudeEdge = isEditingSelectedMesh && editor?.cadSelectionMode === "edge" && selectedEdgeCount > 0;
    const canMergeCoplanar = isEditingSelectedMesh && editor?.cadSelectionMode === "face" && selectedFaceCount >= 2;
    const canEdgeToEdgeCut = isEditingSelectedMesh && editor?.cadSelectionMode === "edge" && selectedEdgeCount === 2;
    const canArcEdge = isEditingSelectedMesh && editor?.cadSelectionMode === "edge" && selectedEdgeCount > 0;
    const canMirror = isEditingSelectedMesh;
    const canArray = isEditingSelectedMesh;
    // Scatter needs two meshes selected — source and target.
    const scatterSelectedMeshes = Array.isArray(selected)
        ? (selected).filter(o => (o as any).isMesh) as THREE.Mesh[]
        : [];
    const canScatter = scatterSelectedMeshes.length >= 2;
    const canMergeEdges = isEditingSelectedMesh && editor?.cadSelectionMode === "edge" && selectedEdgeCount >= 1;
    const canFillFromVertices = isEditingSelectedMesh && editor?.cadSelectionMode === "vertex" && selectedVertexCount >= 3;

    const selectionActionOptions = useMemo<CadDropdownOption[]>(() => {
        if (editor?.cadSelectionMode === "vertex") {
            return [
                {
                    id: "link",
                    label: "Linked",
                    description: "Expand the current vertex selection to the full connected component.",
                    group: "selection",
                    disabled: !canLinkedCAD,
                    onSelect: () => editor?.applyCADSelectLinked(),
                },
                {
                    id: "merge",
                    label: "Merge",
                    description: "Weld the selected vertices into one vertex at their average position.",
                    group: "edit",
                    shortcut: "M",
                    disabled: !canMergeCAD,
                    onSelect: () => editor?.applyCADMerge(),
                },
                {
                    id: "knife",
                    label: "Knife",
                    description: "Split a face between two selected vertices on the same face.",
                    group: "edit",
                    disabled: !canKnifeCAD,
                    onSelect: () => editor?.applyCADKnife(),
                },
                {
                    id: "fillVertices",
                    label: "Fill",
                    description: "Create a new face from the selected vertices ordered around their centroid.",
                    group: "edit",
                    disabled: !canFillFromVertices,
                    onSelect: () => editor?.applyCADFillFromVertices(),
                },
                {
                    id: "delete",
                    label: "Delete",
                    description: "Delete the selected vertices and attached topology from the editable mesh.",
                    group: "delete",
                    disabled: !canDeleteCAD,
                    onSelect: () => editor?.applyCADDelete(),
                },
            ];
        }

        if (editor?.cadSelectionMode === "edge") {
            return [
                {
                    id: "loop",
                    label: "Loop",
                    description: "Extend the current edge selection along the straightest connected loop.",
                    group: "selection",
                    disabled: !canLoopSelectCAD,
                    onSelect: () => editor?.applyCADSelectLoop(),
                },
                {
                    id: "ring",
                    label: "Ring",
                    description: "Extend the current edge selection across opposite edges on quad strips.",
                    group: "selection",
                    disabled: !canLoopSelectCAD,
                    onSelect: () => editor?.applyCADSelectRing(),
                },
                {
                    id: "link",
                    label: "Linked",
                    description: "Expand the current edge selection to the full connected edge component.",
                    group: "selection",
                    disabled: !canLinkedCAD,
                    onSelect: () => editor?.applyCADSelectLinked(),
                },
                {
                    id: "extrudeEdge",
                    label: "Edge Extrude",
                    description: "Create a new quad face by extruding the selected boundary edge along the face normal.",
                    group: "create",
                    disabled: !canExtrudeEdge,
                    onSelect: () => editor?.applyCADExtrudeEdge(cadAmount),
                },
                {
                    id: "bridge",
                    label: "Bridge",
                    description: "Create a face between two selected edges.",
                    group: "create",
                    disabled: !canBridgeCAD,
                    onSelect: () => editor?.applyCADBridge(),
                },
                {
                    id: "fill",
                    label: "Fill",
                    description: "Fill a closed boundary made from the selected edge loop.",
                    group: "create",
                    disabled: !canFillCAD,
                    onSelect: () => editor?.applyCADFill(),
                },
                {
                    id: "edgeToEdgeCut",
                    label: "Edge-to-Edge Cut",
                    description: "Split the shared face between two selected edges by inserting midpoints.",
                    group: "create",
                    shortcut: "K",
                    disabled: !canEdgeToEdgeCut,
                    onSelect: () => editor?.applyCADEdgeToEdgeCut(),
                },
                {
                    id: "arc",
                    label: "Arc Edge",
                    description: "Replace straight edges with a circular arc subdivided into segments.",
                    group: "modify",
                    shortcut: "A",
                    disabled: !canArcEdge,
                    onSelect: () => editor?.applyCADArcEdge(cadAmount, 8),
                },
                {
                    id: "mergeEdges",
                    label: "Merge Edges",
                    description: "Collapse selected edges by merging connected vertices to their average position.",
                    group: "modify",
                    disabled: !canMergeEdges,
                    onSelect: () => editor?.applyCADMergeEdges(),
                },
                {
                    id: "dissolve",
                    label: "Dissolve",
                    description: "Remove the selected edge and merge its adjacent faces when the edge is manifold.",
                    group: "modify",
                    disabled: !canDissolveCAD,
                    onSelect: () => editor?.applyCADDissolve(),
                },
                {
                    id: "cut",
                    label: "Cut",
                    description: "Insert a midpoint loop cut across a quad strip starting from the selected edge.",
                    group: "modify",
                    disabled: !canLoopCutCAD,
                    onSelect: () => editor?.applyCADLoopCut(),
                },
                {
                    id: "delete",
                    label: "Delete",
                    description: "Delete the selected edges and attached topology from the editable mesh.",
                    group: "delete",
                    disabled: !canDeleteCAD,
                    onSelect: () => editor?.applyCADDelete(),
                },
            ];
        }

        if (editor?.cadSelectionMode === "face") {
            return [
                {
                    id: "link",
                    label: "Linked",
                    description: "Expand the current face selection to all connected faces in the same mesh island.",
                    group: "selection",
                    disabled: !canLinkedCAD,
                    onSelect: () => editor?.applyCADSelectLinked(),
                },
                {
                    id: "subdivide",
                    label: "Subdivide",
                    description: "Split each selected face into a grid of smaller faces.",
                    group: "create",
                    shortcut: "D",
                    disabled: !canSubdivide,
                    onSelect: () => editor?.applyCADSubdivide(2),
                },
                {
                    id: "invertNormals",
                    label: "Invert Normals",
                    description: "Reverse the winding order of selected faces (or all faces if none selected).",
                    group: "modify",
                    shortcut: "N",
                    disabled: !canInvertNormals,
                    onSelect: () => editor?.applyCADInvertNormals(),
                },
                {
                    id: "mergeCoplanar",
                    label: "Merge Coplanar",
                    description: "Merge selected faces that share an edge and have the same normal.",
                    group: "modify",
                    shortcut: "M",
                    disabled: !canMergeCoplanar,
                    onSelect: () => editor?.applyCADMergeCoplanar(),
                },
                {
                    id: "delete",
                    label: "Delete",
                    description: "Delete the selected faces from the editable mesh.",
                    group: "delete",
                    disabled: !canDeleteCAD,
                    onSelect: () => editor?.applyCADDelete(),
                },
            ];
        }

        return [];
    }, [
        cadAmount,
        canArcEdge,
        canBridgeCAD,
        canDeleteCAD,
        canDissolveCAD,
        canEdgeToEdgeCut,
        canExtrudeEdge,
        canFillCAD,
        canFillFromVertices,
        canInvertNormals,
        canKnifeCAD,
        canLinkedCAD,
        canLoopCutCAD,
        canLoopSelectCAD,
        canMergeCAD,
        canMergeCoplanar,
        canMergeEdges,
        canSubdivide,
        editor,
    ]);

    const renderCadDropdown = (
        menuId: "selectionMode" | "transformTool" | "selectionShape" | "surfaceOperation" | "selectionActions" | "meshOps" | "annotate",
        triggerLabel: string,
        triggerIcon: ReactNode,
        options: CadDropdownOption[],
        disabled: boolean,
        tooltipDescription?: string,
    ) => (
        <CadMenuGroup>
            <Tooltip
                content={openCadMenu === menuId ? undefined : renderCadTooltip(triggerLabel, tooltipDescription || "")}
                {...cadTooltipProps}
            >
                <CadMenuTrigger
                    $active={options.some(option => option.active) || menuId === "selectionActions"}
                    $open={openCadMenu === menuId}
                    disabled={disabled}
                    onClick={() => setOpenCadMenu(current => current === menuId ? null : menuId)}
                >
                    <CadIcon>{triggerIcon}</CadIcon>
                    <CadTriggerChevron $open={openCadMenu === menuId}>
                        <ChevronUpIcon />
                    </CadTriggerChevron>
                </CadMenuTrigger>
            </Tooltip>
            {openCadMenu === menuId && !disabled && (
                <CadMenuSheet>
                    {options.map((option, index) => {
                        const prevGroup = index > 0 ? options[index - 1]?.group : undefined;
                        const showSeparator = index > 0 && option.group && prevGroup && option.group !== prevGroup;
                        return (
                            <span key={option.id}>
                                {showSeparator && <CadMenuSeparator />}
                                <CadMenuItem
                                    $active={option.active}
                                    disabled={option.disabled}
                                    onClick={() => {
                                        if (option.disabled) {
                                            return;
                                        }
                                        option.onSelect();
                                        setOpenCadMenu(null);
                                    }}
                                >
                                    {option.icon && <CadIcon>{option.icon}</CadIcon>}
                                    <CadMenuItemText>
                                        <CadMenuItemLabel>{option.label}</CadMenuItemLabel>
                                        <CadMenuItemDescription>{option.description}</CadMenuItemDescription>
                                    </CadMenuItemText>
                                    {option.shortcut && <CadMenuItemShortcut>{option.shortcut}</CadMenuItemShortcut>}
                                </CadMenuItem>
                            </span>
                        );
                    })}
                </CadMenuSheet>
            )}
        </CadMenuGroup>
    );

    if (!canUseCAD) {
        return null;
    }

    const cadAmountLabel =
        activeCADOperation === "extrude" ? "Depth" : activeCADOperation === "inset" ? "Inset" : activeCADOperation === "bevel" ? "Width" : "";

    return (
        <>
            <div ref={cadMenusRef}
                style={{display: "flex", alignItems: "center", gap: 8}}
            >
                <Tooltip content={isEditingSelectedMesh
                    ? renderCadTooltip("Object Mode", "Leave component editing and go back to whole-object transforms and selection.")
                    : renderCadTooltip("Edit Mode", "Edit the mesh directly by selecting vertices, edges, and faces instead of moving the whole object.")}
                    {...cadTooltipProps}
                >
                    <CadButton
                        $active={isEditingSelectedMesh}
                        $iconOnly
                        aria-label={isEditingSelectedMesh ? "Object mode" : "Edit mode"}
                        onClick={() => setCADMode(!isEditingSelectedMesh)}
                    >
                        <CadIcon>
                            {isEditingSelectedMesh ? <CubeIcon /> : <PencilAltIcon />}
                        </CadIcon>
                    </CadButton>
                </Tooltip>
                {renderCadDropdown("selectionMode", selectionModeTrigger.label, selectionModeTrigger.icon, selectionModeOptions, !isEditingSelectedMesh, "Switch between vertex, edge, and face selection.")}
                {renderCadDropdown("transformTool", transformTrigger.label, transformTrigger.icon, transformToolOptions, !isEditingSelectedMesh, "Choose a transform tool for the selection.")}
                {renderCadDropdown("selectionShape", selectionShapeTrigger.label, selectionShapeTrigger.icon, selectionShapeOptions, !isEditingSelectedMesh, "Choose how to drag-select components.")}
                {renderCadDropdown("surfaceOperation", surfaceOperationTrigger.label, surfaceOperationTrigger.icon, surfaceOperationOptions, !isEditingSelectedMesh, "Pick a face operation: extrude, inset, or bevel.")}
                {selectionActionOptions.length > 0 &&
                    renderCadDropdown(
                        "selectionActions",
                        editor?.cadSelectionMode === "edge" ? "Edge Ops" : editor?.cadSelectionMode === "face" ? "Face Ops" : "Vertex Ops",
                        editor?.cadSelectionMode === "edge" ? <EdgeSelectIcon /> : editor?.cadSelectionMode === "face" ? <FaceSelectIcon /> : <VertexSelectIcon />,
                        selectionActionOptions,
                        !isEditingSelectedMesh,
                        "Available operations for the current selection.",
                    )}
                {renderCadDropdown(
                    "meshOps",
                    "Mesh Ops",
                    <CubeIcon />,
                    [
                        {
                            id: "offsetTop",
                            label: "Offset Top",
                            description: "Raise or lower the highest vertices of the mesh.",
                            shortcut: "O",
                            disabled: !isEditingSelectedMesh,
                            onSelect: () => editor?.applyCADOffsetTop(cadAmount),
                        },
                        {
                            id: "inflate",
                            label: "Inflate",
                            description: "Expand the mesh outward along averaged vertex normals.",
                            disabled: !isEditingSelectedMesh,
                            onSelect: () => editor?.applyCADInflateDeflate(cadAmount),
                        },
                        {
                            id: "deflate",
                            label: "Deflate",
                            description: "Shrink the mesh inward along averaged vertex normals.",
                            disabled: !isEditingSelectedMesh,
                            onSelect: () => editor?.applyCADInflateDeflate(-cadAmount),
                        },
                        {
                            id: "mirror",
                            label: "Mirror",
                            description: "Mirror the mesh geometry across the chosen axis.",
                            disabled: !canMirror,
                            onSelect: () => editor?.applyCADMirror("x"),
                        },
                        {
                            id: "arrayLinear",
                            label: "Array Linear",
                            description: "Repeat the mesh along X. Count fixed at 3; step uses the CAD amount field.",
                            disabled: !canArray,
                            onSelect: () => editor?.applyCADArrayLinear(3, new THREE.Vector3(cadAmount || 1, 0, 0)),
                        },
                        {
                            id: "arrayRadial",
                            label: "Array Radial",
                            description: "Repeat the mesh evenly around Y. Count fixed at 6; full 360° sweep.",
                            disabled: !canArray,
                            onSelect: () => editor?.applyCADArrayRadial(6, "y", Math.PI * 2),
                        },
                        {
                            id: "scatter",
                            label: "Scatter on Surface",
                            description: "Select 2+ meshes — first is the source prop, second is the target surface. Produces an InstancedMesh with 100 sampled positions aligned to the surface normal.",
                            disabled: !canScatter,
                            onSelect: () => {
                                const [source, target] = scatterSelectedMeshes as [THREE.Mesh, THREE.Mesh];
                                void editor?.applyCADSurfaceScatter(source, target, {
                                    count: 100,
                                    seed: Math.floor(Math.random() * 1e9),
                                    alignToNormal: true,
                                    scale: 1,
                                    scaleJitter: 0.2,
                                    rotationJitter: Math.PI,
                                });
                            },
                        },
                    ],
                    !isEditingSelectedMesh && !canScatter,
                    "Whole-mesh operations like offset, inflate, mirror, array, and scatter.",
                )}
                {renderCadDropdown(
                    "annotate",
                    "Annotate",
                    <CubeIcon />,
                    [
                        {
                            id: "ann-distance",
                            label: "Distance",
                            description: "Pick two points; label shows distance between them.",
                            disabled: false,
                            onSelect: () => { void editor?.startAnnotating("distance"); },
                        },
                        {
                            id: "ann-angle",
                            label: "Angle",
                            description: "Pick three points (apex is the middle pick); label shows the angle.",
                            disabled: false,
                            onSelect: () => { void editor?.startAnnotating("angle"); },
                        },
                        {
                            id: "ann-polyline",
                            label: "Polyline",
                            description: "Pick 2+ points, double-click to finish. Label shows total length.",
                            disabled: false,
                            onSelect: () => { void editor?.startAnnotating("polyline"); },
                        },
                        {
                            id: "ann-area",
                            label: "Area",
                            description: "Pick 3+ points, double-click to finish. Label shows enclosed area.",
                            disabled: false,
                            onSelect: () => { void editor?.startAnnotating("area"); },
                        },
                        {
                            id: "ann-pointNote",
                            label: "Point Note",
                            description: "Pick one point; attach a text note.",
                            disabled: false,
                            onSelect: () => { void editor?.startAnnotating("pointNote", {text: "Note"}); },
                        },
                    ],
                    false,
                    "Pick dimensions and notes that save with the scene. Press Esc to cancel.",
                )}
                {activeCADOperation && (
                    <CadField>
                        <Tooltip content={renderCadTooltip(cadAmountLabel, "Set the amount for the active surface operation.")} {...cadTooltipProps}>
                            <NumericInput
                                value={cadAmount}
                                setValue={setCadAmount}
                                width="72px"
                                height="28px"
                                decimalPlaces={4}
                                min={0}
                                dragStep={0.01}
                                disabled={!isEditingSelectedMesh}
                            />
                        </Tooltip>
                        <Tooltip content={renderCadTooltip("Apply", "Apply the current surface operation.")} {...cadTooltipProps}>
                            <CadButton
                                $iconOnly
                                disabled={!canApplyCADOperation}
                                onClick={applyCADOperation}
                            >
                                <CadIcon><ApplyCheckIcon /></CadIcon>
                            </CadButton>
                        </Tooltip>
                    </CadField>
                )}
                {canUseAxisConstraint && (
                    <CadMenuGroup>
                        <Tooltip
                            content={openCadMenu === "axis" ? undefined : renderCadTooltip(`Axis: ${axisLabel}`, "Constrain transforms to selected axes.")}
                            {...cadTooltipProps}
                        >
                            <CadMenuTrigger
                                $active={cadAxisConstraint.length > 0}
                                $open={openCadMenu === "axis"}
                                onClick={() => setOpenCadMenu(current => current === "axis" ? null : "axis")}
                            >
                                <CadIcon><AxisIcon /></CadIcon>
                                <CadTriggerChevron $open={openCadMenu === "axis"}>
                                    <ChevronUpIcon />
                                </CadTriggerChevron>
                            </CadMenuTrigger>
                        </Tooltip>
                        {openCadMenu === "axis" && (
                            <CadMenuSheet>
                                <CadMenuItem
                                    $active={cadAxisConstraint.length === 3}
                                    onClick={() => setAllAxes()}
                                >
                                    <CadMenuItemText>
                                        <CadMenuItemLabel>All Axes</CadMenuItemLabel>
                                        <CadMenuItemDescription>Enable X, Y, and Z together.</CadMenuItemDescription>
                                    </CadMenuItemText>
                                </CadMenuItem>
                                <CadAxisPillRow>
                                    {CAD_AXES.map(axis => (
                                        <CadAxisPill
                                            key={axis}
                                            $active={cadAxisConstraint.includes(axis)}
                                            onClick={() => toggleAxis(axis)}
                                        >
                                            {axis.toUpperCase()}
                                        </CadAxisPill>
                                    ))}
                                </CadAxisPillRow>
                            </CadMenuSheet>
                        )}
                    </CadMenuGroup>
                )}
                {isEditingSelectedMesh && editor?.cadSelectionMode === "edge" && (
                    <CadField>
                        <Tooltip content={renderCadTooltip("Edge Length", "Set the exact length of selected edges.")} {...cadTooltipProps}>
                            <NumericInput
                                value={edgeLength}
                                setValue={setEdgeLength}
                                width="72px"
                                height="28px"
                                decimalPlaces={4}
                                min={0.0001}
                                dragStep={0.01}
                                disabled={!canEditEdgeLength}
                            />
                        </Tooltip>
                        <Tooltip content={renderCadTooltip("Resize", "Apply the edge length.")} {...cadTooltipProps}>
                            <CadButton
                                $iconOnly
                                disabled={!canEditEdgeLength}
                                onClick={applyEdgeLength}
                            >
                                <CadIcon><RulerIcon /></CadIcon>
                            </CadButton>
                        </Tooltip>
                    </CadField>
                )}
                {isEditingSelectedMesh && editor?.cadSelectionMode === "edge" && (
                    <CadField>
                        <Tooltip content={renderCadTooltip("Bevel Width", "Width of the edge bevel.")} {...cadTooltipProps}>
                            <NumericInput
                                value={cadAmount}
                                setValue={setCadAmount}
                                width="60px"
                                height="28px"
                                decimalPlaces={4}
                                min={0}
                                dragStep={0.01}
                                disabled={!isEditingSelectedMesh}
                            />
                        </Tooltip>
                        <Tooltip content={renderCadTooltip("Steps", "Number of bevel segments (1-8).")} {...cadTooltipProps}>
                            <NumericInput
                                value={bevelSteps}
                                setValue={(v: number) => setBevelSteps(Math.round(v))}
                                width="40px"
                                height="28px"
                                decimalPlaces={0}
                                min={1}
                                max={8}
                                dragStep={1}
                                disabled={!isEditingSelectedMesh}
                            />
                        </Tooltip>
                        <Tooltip content={renderCadTooltip(bevelProfile === "flat" ? "Profile: Flat" : "Profile: Round", "Toggle between flat chamfer and round bevel.")} {...cadTooltipProps}>
                            <CadButton
                                $iconOnly
                                disabled={!canEdgeBevel}
                                onClick={() => setBevelProfile(bevelProfile === "flat" ? "round" : "flat")}
                                style={{minWidth: "28px", padding: "0 4px"}}
                            >
                                <CadIcon>{bevelProfile === "flat" ? <FlatProfileIcon /> : <RoundProfileIcon />}</CadIcon>
                            </CadButton>
                        </Tooltip>
                        <Tooltip content={renderCadTooltip("Apply Bevel", "Apply edge bevel to selection.")} {...cadTooltipProps}>
                            <CadButton
                                $iconOnly
                                disabled={!canEdgeBevel}
                                onClick={applyCADEdgeBevel}
                            >
                                <CadIcon><BevelIcon /></CadIcon>
                            </CadButton>
                        </Tooltip>
                    </CadField>
                )}
            </div>
            <Separator />
        </>
    );
};
