import {useEffect, useState} from "react";
import {Object3D, PerspectiveCamera} from "three";

import {CustomNumericInput} from "./CustomNumericInput";
import {useAppGlobalContext} from "@stem/editor-oss/context";
import {RIGHT_PANEL_VERSIONS} from "@stem/editor-oss/context/appStateTypes";
import global from "@stem/editor-oss/global";
import {CAMERA_TYPES, CAMERA_TYPES_NEW, CameraData, OCCLUSION_TYPES} from "@stem/editor-oss/types/editor";
import {Item} from "../../../common/BasicCombobox/BasicCombobox";
import {Tooltip} from "../../../common/Tooltip";
import {PanelCheckbox} from "../../common/PanelCheckbox";
import {SelectRow} from "../../common/SelectRow";
// import CameraBehaviorConverter from "@stem/editor-oss/serialization/behaviours/CameraBehaviorConverter";
import {Separator} from "../../common/Separator";
import {PanelSectionTitle} from "../../RightPanel.style";
import {TooltipRowWrapper} from "../ProjectSettings/ProjectSettings.style";

export const CameraPanel = () => {
    const app = global.app;
    const editor = app?.editor;
    const selected = editor?.selected;
    const cameraTypeOptions: Item[] = [
        ...Object.values(CAMERA_TYPES_NEW).map((type, index) => ({
            key: `${index + 1}`,
            value: type,
        })),
    ];
    const occlusionTypeOptions: Item[] = [
        ...Object.values(OCCLUSION_TYPES).map((type, index) => ({
            key: `${index + 1}`,
            value: type,
        })),
    ];
    const {activeRightPanel} = useAppGlobalContext();
    const [cameraDataState, setCameraDataState] = useState<CameraData>();

    const getCurrentCameraData = (object: Object3D | null) => {
        if (!object) return null;
        return object.userData.cameraData as CameraData;
    };

    useEffect(() => {
        if (!selected || Array.isArray(selected)) return;
        let cameraData = getCurrentCameraData(selected);

        if (cameraData && (selected as PerspectiveCamera).isPerspectiveCamera) {
            const cam = selected as PerspectiveCamera;
            cameraData = {
                ...cameraData,
                cameraFOV: cameraData.cameraFOV ?? cam.fov,
                cameraNear: cameraData.cameraNear ?? cam.near,
                cameraFar: cameraData.cameraFar ?? cam.far,
            };
        }

        setCameraDataState(cameraData || undefined);
    }, [selected, activeRightPanel]);

    const handleInputChange = (value: string | number | boolean, name: keyof CameraData) => {
        if (!app || !selected || !cameraDataState) return;

        const updatedBehaviorState = {
            ...cameraDataState,
            [name]: value,
        };
        setCameraDataState(updatedBehaviorState);
        
        const selectedObj = selected as Object3D;
        selectedObj.userData.cameraData = updatedBehaviorState;

        if ((selectedObj as PerspectiveCamera).isPerspectiveCamera) {
            const cam = selectedObj as PerspectiveCamera;
            if (name === "cameraFOV") {
                cam.fov = value as number;
            } else if (name === "cameraNear") {
                cam.near = value as number;
            } else if (name === "cameraFar") {
                cam.far = value as number;
            }
            cam.updateProjectionMatrix();
        }

        app.call(`objectChanged`, app.editor, app.editor?.selected);
    };

    if (!cameraDataState) return null;
    if (activeRightPanel !== RIGHT_PANEL_VERSIONS.CameraSettings) return null;

    return (
        <>
            <TooltipRowWrapper>
                <PanelSectionTitle>Camera Settings</PanelSectionTitle>
                <Tooltip text="Configure the player camera type, field of view, distance limits, and occlusion behavior." />
            </TooltipRowWrapper>
            <Separator invisible
                margin="0 0 8px"
            />
            <PanelCheckbox
                v2
                disabled
                isGray
                regular
                text="Use Pointer Lock"
                checked={cameraDataState.usePointerLock}
                onChange={() => handleInputChange(!cameraDataState.usePointerLock, "usePointerLock")}
                tooltipText="Locks cursor to the viewport for mouse-look style controls."
            />
            <Separator invisible
                margin="0 0 8px"
            />
            <CustomNumericInput
                label="Field of View"
                value={cameraDataState.cameraFOV}
                setValue={value => handleInputChange(value, "cameraFOV")}
                unit="º"
                min={1}
                max={160}
                labelTooltip="Vertical camera viewing angle. Higher values show more scene with stronger perspective."
            />
            <CustomNumericInput
                label="Near Plane"
                value={cameraDataState.cameraNear ?? 0.1}
                setValue={value => handleInputChange(value, "cameraNear")}
                unit="m"
                min={0.01}
                dragStep={0.01}
                labelTooltip="Nearest distance from camera that will be rendered."
            />
            <CustomNumericInput
                label="Far Plane"
                value={cameraDataState.cameraFar ?? 100000}
                setValue={value => handleInputChange(value, "cameraFar")}
                unit="m"
                min={Math.max((cameraDataState.cameraNear ?? 0.1) + 0.01, 0.11)}
                labelTooltip="Farthest distance from camera that will be rendered."
            />
            <PanelSectionTitle>Camera Control Settings</PanelSectionTitle>
            <Separator invisible
                margin="0 0 8px"
            />
            {(cameraDataState.cameraType === CAMERA_TYPES.TOP_DOWN ||
                cameraDataState.cameraType === CAMERA_TYPES.THIRD_PERSON) && 
                <CustomNumericInput
                    label="Pitch"
                    value={cameraDataState.cameraAngle || 70}
                    setValue={value => handleInputChange(value, "cameraAngle")}
                    unit="º"
                    labelTooltip="Default vertical camera tilt relative to the player."
                />
            }
            {cameraDataState.cameraType !== CAMERA_TYPES.FIRST_PERSON && 
                <>
                    <CustomNumericInput
                        label="Default Distance"
                        value={cameraDataState.cameraDefaultDistance}
                        setValue={value => handleInputChange(value, "cameraDefaultDistance")}
                        unit="m"
                        labelTooltip="Starting camera distance from the target."
                    />
                    <CustomNumericInput
                        label="Minimum Distance"
                        value={cameraDataState.cameraMinDistance}
                        setValue={value => handleInputChange(value, "cameraMinDistance")}
                        unit="m"
                        labelTooltip="Closest allowed zoom distance."
                    />
                    <CustomNumericInput
                        label="Maximum Distance"
                        value={cameraDataState.cameraMaxDistance}
                        setValue={value => handleInputChange(value, "cameraMaxDistance")}
                        unit="m"
                        labelTooltip="Farthest allowed zoom distance."
                    />
                </>
            }
            {cameraDataState.cameraType === CAMERA_TYPES.FIRST_PERSON && 
                <>
                    <CustomNumericInput
                        label="Camera Head Height"
                        value={cameraDataState.cameraHeadHeight}
                        setValue={value => handleInputChange(value, "cameraHeadHeight")}
                        labelTooltip="Vertical offset of the first-person camera from the character origin."
                    />
                    <CustomNumericInput
                        label="Player Collision Box"
                        value={cameraDataState.playerCollisionBox}
                        setValue={value => handleInputChange(value, "playerCollisionBox")}
                        labelTooltip="Collision capsule/box size used for first-person movement collisions."
                    />
                </>
            }
            {cameraDataState.cameraType === CAMERA_TYPES.SIDE_SCROLLER && 
                <>
                    <CustomNumericInput
                        label="Axis"
                        value={cameraDataState.cameraAxis}
                        setValue={value => handleInputChange(value, "cameraAxis")}
                        labelTooltip="Defines the side-scroller travel axis constraint."
                    />
                </>
            }
            {/* Occlusion Type Selection */}
            <Separator invisible
                margin="8px 0"
            />
            <SelectRow
                label="Occlusion Type"
                data={occlusionTypeOptions}
                value={
                    occlusionTypeOptions.find(
                        opt => opt.value === String(cameraDataState.occlusionType ?? OCCLUSION_TYPES.DISTANCE),
                    ) || occlusionTypeOptions[0]
                }
                onChange={item => handleInputChange(item.value, "occlusionType")}
                $margin="0 0 8px"
                labelTooltip="How camera occlusion is handled when scene geometry blocks the target."
            />
            {/* Camera Follow Behavior Settings */}
            {cameraDataState.cameraType === CAMERA_TYPES.THIRD_PERSON && 
                <>
                    <TooltipRowWrapper>
                        <PanelSectionTitle>Camera Follow Behavior</PanelSectionTitle>
                        <Tooltip text="Controls how the camera tracks and follows the player character. Adjust tolerance and speed for smooth camera movement." />
                    </TooltipRowWrapper>
                    <Separator invisible
                        margin="0 0 8px"
                    />
                    <PanelCheckbox
                        v2
                        isGray
                        regular
                        text="Enable Camera Follow Behavior"
                        checked={cameraDataState.enableCameraFollowBehavior ?? false}
                        onChange={() =>
                            handleInputChange(!cameraDataState.enableCameraFollowBehavior, "enableCameraFollowBehavior")
                        }
                        tooltipText="Automatically adjusts camera orientation to maintain clearer framing on the player."
                    />
                    <Separator invisible
                        margin="0 0 8px"
                    />
                    <CustomNumericInput
                        label="Back View Tolerance"
                        value={cameraDataState.cameraBackViewTolerance ?? 90}
                        setValue={value => handleInputChange(value, "cameraBackViewTolerance")}
                        unit="º"
                        labelTooltip="Yaw difference allowed before the camera starts returning behind the player."
                    />
                    <CustomNumericInput
                        label="Back View Return Speed"
                        value={cameraDataState.cameraBackViewReturnSpeed ?? 0.5}
                        setValue={value => handleInputChange(value, "cameraBackViewReturnSpeed")}
                        unit="s"
                        labelTooltip="How quickly camera returns to rear view."
                    />
                    <CustomNumericInput
                        label="Front View Flip Speed"
                        value={cameraDataState.cameraFrontViewFlipSpeed ?? 0.3}
                        setValue={value => handleInputChange(value, "cameraFrontViewFlipSpeed")}
                        unit="s"
                        labelTooltip="Speed of switching into front-facing camera view."
                    />
                    <CustomNumericInput
                        label="Front View Flip Angle"
                        value={cameraDataState.cameraFrontViewFlipAngle ?? 120}
                        setValue={value => handleInputChange(value, "cameraFrontViewFlipAngle")}
                        unit="º"
                        labelTooltip="Angle threshold that triggers front-view camera flip."
                    />
                    <CustomNumericInput
                        label="Front View Transition Speed"
                        value={cameraDataState.cameraFrontViewFlipTransitionSpeed ?? 0.3}
                        setValue={value => handleInputChange(value, "cameraFrontViewFlipTransitionSpeed")}
                        unit="s"
                        labelTooltip="Blend speed used while transitioning between follow views."
                    />
                </>
            }
        </>
    );
};
