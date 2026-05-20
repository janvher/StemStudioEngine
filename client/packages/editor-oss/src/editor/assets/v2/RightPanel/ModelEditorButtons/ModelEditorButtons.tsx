import {useLayoutEffect, useMemo, useRef, useState} from "react";
import ReactDOM from "react-dom";
import * as THREE from "three";

import graphIcon from "./icons/graph-icon.svg";
import modelEditorIcon from "../icons/model-editor-icon.svg";
import materialIcon from "./icons/material-icon.svg";
import {
    ButtonContainer,
    ButtonsWrapper,
    ButtonContent,
    EditIcon,
    EditorButton,
    Label,
    MainIcon,
    MaterialLabel,
    VisibilityIcon,
    ImgWrapper,
} from "./ModelEditorButtons.style";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {useAppGlobalContext} from "@stem/editor-oss/context";
import {RIGHT_PANEL_VERSIONS} from "@stem/editor-oss/context/appStateTypes";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import closedEyeIcon from "../../../../../ui/tree/v2/icons/closed-eye.svg";
import openEyeIcon from "../../../../../ui/tree/v2/icons/open-eye.svg";
import editIcon from "../../icons/edit-icon.svg";
import {generateMaterialPathKey} from "../../materials/materialUtils";
import {Separator} from "../common/Separator";
import {Row, RowTitle} from "../panels/Panels/Panels.styled";
import {MaterialRenderingSectionV2} from "../sections/MaterialRenderingSection/MaterialRenderingSectionV2";

export interface MaterialInfo {
    material: THREE.Material;
    objectName: string;
    materialName: string;
    objectUuid: string;
    pathKey: string;
}
export interface IButton {
    label: string;
    icon: string;
    action: () => void;
    disabled: boolean;
    showLabelAbove?: boolean;
    active: boolean;
    uuid: string;
}
export interface MainButtonsProps {
    showModelAnimationCombiner: () => void;
    isPrimitiveSelected: boolean;
    isStemSelected: boolean;
}

export const MaterialRow = ({showModelAnimationCombiner, isPrimitiveSelected, isStemSelected}: MainButtonsProps) => 
    <>
        <Row>
            <RowTitle>
                <img src={modelEditorIcon}
                    alt=""
                /> Model Editors
            </RowTitle>
        </Row>
        <SimpleButtons
            showModelAnimationCombiner={showModelAnimationCombiner}
            isPrimitiveSelected={isPrimitiveSelected}
            isStemSelected={isStemSelected}
        />
    </>
;

export const ModelEditorButtons = ({
    showModelAnimationCombiner,
    isPrimitiveSelected,
    isStemSelected,
}: MainButtonsProps) => {
    const app = global.app as EngineRuntime;
    const editor = app.editor;
    const selected = app.editor?.selected;
    const {setActiveRightPanel} = useAppGlobalContext();
    const materialPanelRef = useRef<HTMLDivElement | null>(null);

    // Collect all materials from the selected object
    const materials = useMemo(() => {
        if (!selected) return [];

        const selectedObj = Array.isArray(selected) ? selected[0] : selected;
        if (!selectedObj) return [];

        const materialMap = new Map<string, MaterialInfo>();

        selectedObj.traverse((child: THREE.Object3D) => {
            if ((child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];

                materials.forEach((mat: THREE.Material, index: number) => {
                    if (!materialMap.has(mat.uuid)) {
                        materialMap.set(mat.uuid, {
                            material: mat,
                            objectName: child.name || "Unnamed",
                            materialName: mat.name || "Material",
                            objectUuid: child.uuid,
                            pathKey: generateMaterialPathKey(
                                child as THREE.Mesh | THREE.SkinnedMesh,
                                index,
                                selectedObj,
                            ),
                        });
                    }
                });
            }
        });

        return Array.from(materialMap.values());
    }, [selected]);

    const BUTTONS: IButton[] = useMemo(() => {
        const buttons: Array<{
            label: string;
            icon: string;
            action: () => void;
            disabled: boolean;
            showLabelAbove?: boolean;
            active: boolean;
            uuid: string;
        }> = [];
        const isStemDisabled = isStemSelected && !(selected as any)?.userData?.prefabEditRevisionId;

        // If primitive, show single material button
        if (isPrimitiveSelected) {
            buttons.push({
                label: "Material",
                icon: materialIcon,
                action: () => setActiveRightPanel(RIGHT_PANEL_VERSIONS.MaterialEditor),
                disabled: isStemDisabled ?? false,
                showLabelAbove: false,
                active: true,
                uuid: (editor?.selected as THREE.Object3D<THREE.Object3DEventMap>)?.uuid,
            });
        } else if (materials.length > 0) {
            // For non-primitives, create a button per material
            materials.forEach(matInfo => {
                const label = `${matInfo.objectName} | ${matInfo.materialName}`;
                buttons.push({
                    label,
                    icon: materialIcon,
                    action: () => editor?.component?.setSelectedMaterialInfo(matInfo),
                    disabled: isStemDisabled ?? false,
                    // disabled: !(selected as any)!.userData.prefabEditRevisionId,
                    showLabelAbove: false,
                    active: matInfo.objectUuid === editor?.component?.state.selectedMaterialInfo?.objectUuid,
                    uuid: matInfo.objectUuid,
                });
            });
            if (!buttons.some(b => b.active) && buttons[0]) {
                buttons[0].active = true;
                editor?.component?.setSelectedMaterialInfo(materials[0]!);
            }
        }

        return buttons;
    }, [isPrimitiveSelected, materials, showModelAnimationCombiner, selected]);

    return (
        <div ref={materialPanelRef}>
            <ButtonsWrapper>
                {BUTTONS.map((buttonData, index) => 
                    <ModelEditorSingleButton
                        buttonData={buttonData}
                        key={`${buttonData.label}-${index}`}
                        materialPanelRef={materialPanelRef}
                    />,
                )}
            </ButtonsWrapper>
        </div>
    );
};

const ModelEditorSingleButton = ({
    buttonData,
    materialPanelRef,
}: {
    buttonData: IButton;
    materialPanelRef: React.RefObject<HTMLDivElement | null>;
}) => {
    const app = global.app as EngineRuntime;
    const {label, icon, action, disabled, showLabelAbove, active, uuid} = buttonData;
    const [editorVisibility, setEditorVisibility] = useState(true);
    const [mounted, setMounted] = useState(false);

    useLayoutEffect(() => {
        setMounted(true);
    }, []);

    const handleEditorVisibilityChange = () => {
        app?.editor?.handleEditorVisibilityChange(uuid, !editorVisibility);
        setEditorVisibility(prev => !prev);
    };

    return (
        <>
            <ButtonContainer>
                {showLabelAbove && <Label>{label}</Label>}
                <EditorButton onClick={action}
                    disabled={disabled}
                >
                    <ButtonContent>
                        <ImgWrapper $active={active}>
                            <MainIcon src={icon}
                                alt=""
                            />
                        </ImgWrapper>
                        {!showLabelAbove && <MaterialLabel>{label}</MaterialLabel>}
                    </ButtonContent>
                    <VisibilityIcon
                        src={editorVisibility ? openEyeIcon : closedEyeIcon}
                        alt="edit visibility"
                        onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEditorVisibilityChange();
                        }}
                    />
                </EditorButton>
            </ButtonContainer>
            {active &&
                mounted &&
                materialPanelRef.current &&
                ReactDOM.createPortal(
                    <>
                        <Separator invisible />
                        <MaterialRenderingSectionV2 />
                    </>,
                    materialPanelRef.current,
                )}
        </>
    );
};

export const SimpleButtons = ({showModelAnimationCombiner, isPrimitiveSelected, isStemSelected}: MainButtonsProps) => {
    const app = global.app as EngineRuntime;
    const selected = app.editor?.selected;
    const {setActiveRightPanel} = useAppGlobalContext();

    const BUTTONS = useMemo(() => {
        const buttons: Array<{
            label: string;
            icon: string;
            action: () => void;
            disabled: boolean;
            showLabelAbove?: boolean;
        }> = [];
        const isStemDisabled = isStemSelected && !(selected as any)?.userData?.prefabEditRevisionId;

        buttons.push({
            label: "Material",
            icon: materialIcon,
            action: () => setActiveRightPanel(RIGHT_PANEL_VERSIONS.MaterialEditor),
            disabled: isStemDisabled ?? false,
            showLabelAbove: true,
        });

        // Animation Graph button for non-primitives
        if (!isPrimitiveSelected) {
            buttons.push({
                label: "Animation Graph",
                icon: graphIcon,
                action: () => {
                    const selectedObj = Array.isArray(selected) ? selected[0] : selected;
                    if (selectedObj && !selectedObj.userData?.modelId) {
                        showToast({type: "error", title: "Please reupload the model to use editing tools"});
                        return;
                    }
                    showModelAnimationCombiner();
                },
                disabled: isStemDisabled ?? false,
                showLabelAbove: true,
            });
        }

        return buttons;
    }, [isPrimitiveSelected, showModelAnimationCombiner, selected]);

    return (
        <>
            <ButtonsWrapper>
                {BUTTONS.map(({label, icon, action, disabled, showLabelAbove}, index) => 
                    <ButtonContainer key={`${label}-${index}`}>
                        {showLabelAbove && <Label>{label}</Label>}
                        <EditorButton onClick={action}
                            disabled={disabled}
                        >
                            <ButtonContent>
                                <MainIcon src={icon}
                                    alt=""
                                />
                                {!showLabelAbove && <MaterialLabel>{label}</MaterialLabel>}
                            </ButtonContent>
                            <EditIcon src={editIcon}
                                alt="edit"
                            />
                        </EditorButton>
                    </ButtonContainer>,
                )}
            </ButtonsWrapper>
        </>
    );
};
