import React from "react";
import styled from "styled-components";
import * as THREE from "three";

import { AngleUnitType, ANGLE_UNIT_SYMBOLS } from "./AngleUnitsSection";
import { StyledButton } from "../../../common/StyledButton";
import { NumericInputRow } from "../../common/NumericInputRow";
import { PanelCheckbox } from "../../common/PanelCheckbox";
import { SelectRow } from "../../common/SelectRow";

export interface SnappingSettings {
    playMode: {
        enabled: boolean;
    };
    grid: {
        enabled: boolean;
        increment: number;
    };
    rotation: {
        enabled: boolean;
        angleDegrees: number;
    };
    scale: {
        enabled: boolean;
        increment: number;
    };
    geometric: {
        enabled: boolean;
        snapToVertex: boolean;
        snapToEdge: boolean;
        snapToFace: boolean;
        snapDistance: number;
        visualFeedback: boolean;
    };
    priority: "geometric" | "grid" | "auto";
}

interface SnappingSettingsSectionProps {
    settings: SnappingSettings;
    onChange: (settings: SnappingSettings) => void;
    angleUnit?: AngleUnitType;
}

const PresetButtonsWrapper = styled.div`
    display: flex;
    gap: 6px;
    justify-content: space-between;
    margin: 8px 0 0;
`;

const SNAP_PRIORITY_OPTIONS = [
    { key: "auto", value: "Auto (Geometric > Grid)" },
    { key: "geometric", value: "Geometric Only" },
    { key: "grid", value: "Grid Only" },
];

const ANGLE_PRESETS = [15, 30, 45, 90];

export const SnappingSection: React.FC<SnappingSettingsSectionProps> = ({
    settings,
    onChange,
    angleUnit = "degrees",
}) => {
    // Safety check: don't render if settings is undefined
    if (!settings) {
        return null;
    }

    const displayAngle =
        angleUnit === "radians" ? settings.rotation.angleDegrees * THREE.MathUtils.DEG2RAD : settings.rotation.angleDegrees;

    const displayAnglePresets =
        angleUnit === "radians"
            ? ANGLE_PRESETS.map((angle) => angle * THREE.MathUtils.DEG2RAD)
            : ANGLE_PRESETS;

    const handleGridEnabledChange = () => {
        onChange({
            ...settings,
            grid: { ...settings.grid, enabled: !settings.grid.enabled },
        });
    };

    const handleGridIncrementChange = (value: number) => {
        onChange({
            ...settings,
            grid: { ...settings.grid, increment: value },
        });
    };

    const handleRotationEnabledChange = () => {
        onChange({
            ...settings,
            rotation: { ...settings.rotation, enabled: !settings.rotation.enabled },
        });
    };

    const handleRotationAngleChange = (value: number) => {
        const angleInDegrees = angleUnit === "radians" ? value * THREE.MathUtils.RAD2DEG : value;
        onChange({
            ...settings,
            rotation: { ...settings.rotation, angleDegrees: angleInDegrees },
        });
    };

    const handleAnglePresetClick = (angle: number) => {
        const angleInDegrees = angleUnit === "radians" ? angle * THREE.MathUtils.RAD2DEG : angle;
        onChange({
            ...settings,
            rotation: { enabled: true, angleDegrees: angleInDegrees },
        });
    };

    const handleScaleEnabledChange = () => {
        onChange({
            ...settings,
            scale: { ...settings.scale, enabled: !settings.scale.enabled },
        });
    };

    const handleScaleIncrementChange = (value: number) => {
        onChange({
            ...settings,
            scale: { ...settings.scale, increment: value },
        });
    };

    const handleGeometricEnabledChange = () => {
        onChange({
            ...settings,
            geometric: { ...settings.geometric, enabled: !settings.geometric.enabled },
        });
    };

    const handleSnapToVertexChange = () => {
        onChange({
            ...settings,
            geometric: {
                ...settings.geometric,
                snapToVertex: !settings.geometric.snapToVertex,
            },
        });
    };

    const handleSnapToEdgeChange = () => {
        onChange({
            ...settings,
            geometric: {
                ...settings.geometric,
                snapToEdge: !settings.geometric.snapToEdge,
            },
        });
    };

    const handleSnapToFaceChange = () => {
        onChange({
            ...settings,
            geometric: {
                ...settings.geometric,
                snapToFace: !settings.geometric.snapToFace,
            },
        });
    };

    const handleSnapDistanceChange = (value: number) => {
        onChange({
            ...settings,
            geometric: { ...settings.geometric, snapDistance: value },
        });
    };

    const handleVisualFeedbackChange = () => {
        onChange({
            ...settings,
            geometric: {
                ...settings.geometric,
                visualFeedback: !settings.geometric.visualFeedback,
            },
        });
    };

    const handlePlayModeEnabledChange = () => {
        onChange({
            ...settings,
            playMode: { ...settings.playMode, enabled: !settings.playMode.enabled },
        });
    };

    const handlePriorityChange = (item: { key: string; value: string }) => {
        onChange({
            ...settings,
            priority: item.key as "geometric" | "grid" | "auto",
        });
    };

    return (
        <>
            {/* Grid Snapping */}
            <PanelCheckbox
                v2
                text="Enable Grid Snapping"
                checked={settings.grid.enabled}
                isGray
                regular
                onChange={handleGridEnabledChange}
                tooltipText="Snaps translation to fixed grid increments when moving objects."
            />
            {settings.grid.enabled && 
                <NumericInputRow
                    label="Snap Resolution"
                    value={settings.grid.increment}
                    setValue={handleGridIncrementChange}
                    min={0.01}
                    max={100}
                    dragStep={0.1}
                    rightAlign
                    $margin="0"
                    labelTooltip="Distance step used for move snapping."
                />
            }

            {/* Angular Snapping */}
            <PanelCheckbox
                v2
                text="Enable Rotation Snapping"
                checked={settings.rotation.enabled}
                isGray
                regular
                onChange={handleRotationEnabledChange}
                tooltipText="Snaps object rotation to fixed angle increments."
            />
            {settings.rotation.enabled && 
                <>
                    <NumericInputRow
                        label="Snap Angle"
                        value={displayAngle}
                        setValue={handleRotationAngleChange}
                        min={0}
                        max={angleUnit === "radians" ? Math.PI : 180}
                        dragStep={angleUnit === "radians" ? 0.01 : 1}
                        decimalPlaces={angleUnit === "radians" ? 4 : 2}
                        unit={ANGLE_UNIT_SYMBOLS[angleUnit]}
                        rightAlign
                        $margin="0"
                        labelTooltip="Angle increment used for rotation snapping."
                    />
                    <PresetButtonsWrapper>
                        {displayAnglePresets.map((angle, index) => 
                            <StyledButton
                                key={ANGLE_PRESETS[index]}
                                isGreySecondary
                                onClick={() => handleAnglePresetClick(angle)}
                            >
                                {angleUnit === "radians" ? `${angle.toFixed(2)} rad` : `${angle}\u00b0`}
                            </StyledButton>,
                        )}
                    </PresetButtonsWrapper>
                </>
            }

            {/* Scale Snapping */}
            <PanelCheckbox
                v2
                text="Enable Scale Snapping"
                checked={settings.scale.enabled}
                isGray
                regular
                onChange={handleScaleEnabledChange}
                tooltipText="Snaps scaling to fixed step increments."
            />
            {settings.scale.enabled && 
                <NumericInputRow
                    label="Scale Increment"
                    value={settings.scale.increment}
                    setValue={handleScaleIncrementChange}
                    min={0.01}
                    max={10}
                    dragStep={0.01}
                    rightAlign
                    $margin="0"
                    labelTooltip="Scale amount applied per snap step."
                />
            }

            {/* Geometric Snapping */}
            <PanelCheckbox
                v2
                text="Enable Geometric Snapping (Beta)"
                checked={settings.geometric.enabled}
                isGray
                regular
                onChange={handleGeometricEnabledChange}
                tooltipText="Snaps to nearby mesh features like vertices, edges, and faces."
            />
            {settings.geometric.enabled && 
                <>
                    <PanelCheckbox
                        v2
                        text="Snap to Vertices"
                        checked={settings.geometric.snapToVertex}
                        isGray
                        regular
                        onChange={handleSnapToVertexChange}
                        tooltipText="Allows snapping to mesh corner points."
                    />
                    <PanelCheckbox
                        v2
                        text="Snap to Edges"
                        checked={settings.geometric.snapToEdge}
                        isGray
                        regular
                        onChange={handleSnapToEdgeChange}
                        tooltipText="Allows snapping to mesh edge segments."
                    />
                    <PanelCheckbox
                        v2
                        text="Snap to Faces"
                        checked={settings.geometric.snapToFace}
                        isGray
                        regular
                        onChange={handleSnapToFaceChange}
                        tooltipText="Allows snapping to polygon surfaces."
                    />
                    <NumericInputRow
                        label="Snap Distance"
                        value={settings.geometric.snapDistance}
                        setValue={handleSnapDistanceChange}
                        min={0.1}
                        max={10}
                        dragStep={0.1}
                        rightAlign
                        $margin="0"
                        labelTooltip="Maximum distance from target geometry for a snap to trigger."
                    />
                    <PanelCheckbox
                        v2
                        text="Visual Feedback"
                        checked={settings.geometric.visualFeedback}
                        isGray
                        regular
                        onChange={handleVisualFeedbackChange}
                        tooltipText="Shows snap indicators/highlights while positioning objects."
                    />
                </>
            }

            <PanelCheckbox
                v2
                text="Enable Snapping In Play Mode"
                checked={settings.playMode.enabled}
                isGray
                regular
                onChange={handlePlayModeEnabledChange}
                tooltipText="When off, move/rotate/scale snapping is editor-only and disabled during play mode."
            />

            {/* Snap Priority */}
            <SelectRow
                label="Snap Priority"
                data={SNAP_PRIORITY_OPTIONS}
                value={SNAP_PRIORITY_OPTIONS.find((item) => item.key === settings.priority)}
                onChange={handlePriorityChange}
                $margin="0"
                labelTooltip="Chooses whether geometric snapping, grid snapping, or automatic fallback takes precedence."
            />
        </>
    );
};
