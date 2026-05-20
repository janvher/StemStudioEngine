import React from "react";

import { SelectRow } from "../../common/SelectRow";

export type AngleUnitType = "degrees" | "radians";

export interface AngleUnitsSettings {
    currentUnit: AngleUnitType;
}

interface AngleUnitsSectionProps {
    settings: AngleUnitsSettings;
    onChange: (settings: AngleUnitsSettings) => void;
}

const ANGLE_UNIT_OPTIONS = [
    { key: "degrees", value: "Degrees (deg)" },
    { key: "radians", value: "Radians (rad)" },
];

export const ANGLE_UNIT_LABELS: Record<AngleUnitType, string> = {
    degrees: "deg",
    radians: "rad",
};

export const ANGLE_UNIT_SYMBOLS: Record<AngleUnitType, string> = {
    degrees: "\u00b0",
    radians: "rad",
};

export const AngleUnitsSection: React.FC<AngleUnitsSectionProps> = ({ settings, onChange }) => {
    if (!settings) {
        return null;
    }

    const handleUnitChange = (item: { key: string; value: string }) => {
        onChange({
            ...settings,
            currentUnit: item.key as AngleUnitType,
        });
    };

    return (
        <SelectRow
            label="Display Unit"
            data={ANGLE_UNIT_OPTIONS}
            value={ANGLE_UNIT_OPTIONS.find((item) => item.key === settings.currentUnit)}
            onChange={handleUnitChange}
            $margin="0"
            labelTooltip="Sets the editor angle unit shown in rotation fields and gizmo overlays."
        />
    );
};
