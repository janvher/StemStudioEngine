 
import {useEffect, useState} from "react";
import * as THREE from "three";

import {ExpandButton, Row, RowTitle, Wrapper} from "./Panels.styled";
import {useLightingContext} from "@stem/editor-oss/context";
import global from "@stem/editor-oss/global";
import {isPrefab, isPrefabUnlocked} from "@stem/editor-oss/prefab/util";
import {isTemplateScene} from "@stem/editor-oss/utils/isTemplateScene";
import {isDirectionalLight} from "@stem/editor-oss/utils/LightUtils";
import {ContentItem} from "../../common/ContentItem";
import {Separator} from "../../common/Separator";
import {PANEL_TYPES} from "../../helpers";
import arrowDown from "../../icons/arrow-down.svg";
import dependenciesIcon from "../../icons/dependencies-icon.svg";
import lightingsIcon from "../../icons/lighting-icon.svg";
import objectSettingsIcon from "../../icons/object-settings-icon.svg";
import physicsIcon from "../../icons/physics-icon.svg";
import {TextureType} from "../../RightPanel";
import {DependenciesSection} from "../../sections/DependenciesSection";
import {InGameSettingsSection} from "../../sections/InGameSettingsSection";
import {ModelLightingSection} from "../../sections/ModelLightingSection";
import {ModelSection} from "../../sections/ModelSection";
import {PhysicsSection} from "../../sections/PhysicsSection";
import {RenderingSection} from "../../sections/RenderingSection";
import {TextPropertiesSection} from "../../sections/TextPropertiesSection";
import {TransformationSection} from "../../sections/TransformationSection";
import {VisibilitySection} from "../../sections/VisibilitySection";
import LightingPanel from "../LightingPanel";

interface Props {
    label: string;
    panelType: PANEL_TYPES;
    color: string | null;
    setColor: React.Dispatch<React.SetStateAction<string | null>>;
    texture: TextureType;
    showTexture: boolean;
    hideAll: boolean;
    showPhysics: boolean;
    showRigidBody: boolean;
    showModelLighting: boolean;
    showCollision: boolean;
    showMaterial?: boolean;
    simpleMovementSection?: boolean;
    hideTextProperties?: boolean;
    renderArrow?: boolean;
    isStem: boolean;
}

export const ExpandablePanel = ({
    label,
    children,
    disableClickToOpen,
    panelType,
    defaultExpanded = false,
}: Pick<Props, "label"> & {
    children: React.ReactNode;
    disableClickToOpen?: boolean;
    panelType?: PANEL_TYPES;
    renderArrow?: boolean;
    defaultExpanded?: boolean;
}) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const getIcon = () => {
        switch (panelType) {
            case PANEL_TYPES.OBJ_SETTINGS:
                return objectSettingsIcon;
            case PANEL_TYPES.PHYSICS:
                return physicsIcon;
            case PANEL_TYPES.DEPENDENCIES:
                return dependenciesIcon;
            case PANEL_TYPES.MODEL_LIGHTING || PANEL_TYPES.LIGHTING:
                return lightingsIcon;

            default:
                break;
        }
    };
    return (
        <Wrapper $expanded={expanded}>
            <Row
                onClick={() => disableClickToOpen ? undefined : setExpanded(!expanded)}
                style={{cursor: disableClickToOpen ? "auto" : "pointer"}}
            >
                {label && 
                    <RowTitle style={{columnGap: "unset"}}>
                        <img src={getIcon()}
                            alt=""
                        />
                        {label}
                    </RowTitle>
                }
                {!disableClickToOpen && 
                    <ExpandButton className="reset-css"
                        $expanded={expanded}
                    >
                        <img src={arrowDown}
                            alt="show more"
                        />
                    </ExpandButton>
                }
            </Row>
            {expanded && children}
        </Wrapper>
    );
};

export const Panel = ({
    label,
    panelType,
    setColor,
    showModelLighting,
    showPhysics,
    showTexture,
    texture,
    showMaterial,
    color,
    hideAll,
    showRigidBody,
    simpleMovementSection,
    hideTextProperties,
    renderArrow,
    isStem,
}: Props) => {
    const {lightState} = useLightingContext();

    if (panelType === PANEL_TYPES.DEPENDENCIES && !isStem) return;
    if (panelType === PANEL_TYPES.TEXTURE && !showTexture) return;
    if (panelType === PANEL_TYPES.LIGHTING && !lightState.show) return;
    if (panelType === PANEL_TYPES.MODEL_LIGHTING && !showModelLighting) return;
    if (panelType === PANEL_TYPES.MATERIAL_RENDERING && !showMaterial) return;
    if (!showPhysics && panelType === PANEL_TYPES.PHYSICS || !showRigidBody && panelType === PANEL_TYPES.RIGID_BODY)
        return;
    if (hideAll) return;

    if (panelType === PANEL_TYPES.MOVEMENT && simpleMovementSection)
        return (
            <>
                <Content
                    panelType={panelType}
                    texture={texture}
                    color={color}
                    setColor={setColor}
                    hideTextProperties={hideTextProperties}
                />
            </>
        );

    const isLightingPanel = panelType === PANEL_TYPES.LIGHTING;

    return (
        <ExpandablePanel
            label={label}
            disableClickToOpen={isLightingPanel}
            panelType={panelType}
            renderArrow={!!renderArrow}
            defaultExpanded={isLightingPanel}
        >
            <Content
                panelType={panelType}
                texture={texture}
                color={color}
                setColor={setColor}
                hideTextProperties={hideTextProperties}
            />
        </ExpandablePanel>
    );
};

interface ContentProps {
    panelType: PANEL_TYPES;
    color: string | null;
    setColor: React.Dispatch<React.SetStateAction<string | null>>;
    texture: any;
    hideTextProperties?: boolean;
}

const Content = ({panelType, hideTextProperties}: ContentProps) => {
    const [locked, setLocked] = useState(false);
    const [isPhysicsLocked, setIsPhysicsLocked] = useState(false);
    const app = global.app;
    const editor = app?.editor;
    const isTemplate = isTemplateScene(editor?.sceneID);

    const updateUI = () => {
        const selected = editor?.selected;
        if (!selected || Array.isArray(selected)) return;
        setIsPhysicsLocked(isPrefab(selected) && !isPrefabUnlocked(selected));
    };

    useEffect(() => {
        updateUI();
    }, []);

    useEffect(() => {
        if (editor && app) {
            app.on(`objectSelected.Content`, updateUI);
            app.on(`objectChanged.Content`, updateUI);
        }

        return () => {
            app?.on(`objectSelected.Content`, null);
            app?.on(`objectChanged.Content`, null);
        };
    }, [editor]);

    useEffect(() => {
        const selected = editor?.selected;
        if (selected && selected instanceof THREE.Object3D) {
            setLocked(editor?.sceneLockedItems?.includes(selected.uuid));
        }
    }, [editor?.sceneLockedItems]);

    const isDirLight = editor?.selected
        ? isDirectionalLight(editor?.selected as THREE.Object3D<THREE.Object3DEventMap>)
        : false;

    const effectiveLocked = isTemplate || locked;

    return (
        <>
            {panelType === PANEL_TYPES.OBJ_SETTINGS &&
                <ContentItem $rowGap="12px">
                    <RenderingSection isLocked={effectiveLocked} />
                    <InGameSettingsSection isLocked={effectiveLocked} />
                    {!isDirLight && <VisibilitySection isLocked={effectiveLocked} />}
                    <ModelSection isLocked={effectiveLocked} />
                    {!hideTextProperties && <TextPropertiesSection isLocked={effectiveLocked} />}
                </ContentItem>
            }
            {panelType === PANEL_TYPES.MOVEMENT && <TransformationSection isLocked={effectiveLocked} />}
            {panelType === PANEL_TYPES.LIGHTING && <LightingPanel />}
            {panelType === PANEL_TYPES.MODEL_LIGHTING && <ModelLightingSection isLocked={effectiveLocked} />}
            {panelType === PANEL_TYPES.PHYSICS && <PhysicsSection isLocked={isPhysicsLocked || effectiveLocked} />}
            {panelType === PANEL_TYPES.MATERIAL_RENDERING && <LightingPanel />}
            {panelType === PANEL_TYPES.DEPENDENCIES && <DependenciesSection />}
            <Separator margin="16px 0 0 0"
                invisible
            />
        </>
    );
};
