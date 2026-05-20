import React from "react";

import type { BoundingBoxMode, BoundingBoxSettings } from "./constants";
import { SelectRow } from "../../common/SelectRow";

const BOUNDING_BOX_OPTIONS = [
    { key: "oobb", value: "Object-Oriented (OOBB)" },
    { key: "aabb", value: "Axis-Aligned (AABB)" },
];

interface BoundingBoxSectionProps {
    settings: BoundingBoxSettings;
    onChange: (settings: BoundingBoxSettings) => void;
}

export const BoundingBoxSection: React.FC<BoundingBoxSectionProps> = ({ settings, onChange }) => {
    if (!settings) {
        return null;
    }

    const handleModeChange = (item: { key: string; value: string }) => {
        onChange({
            ...settings,
            mode: item.key as BoundingBoxMode,
        });
    };

    return (
        <SelectRow
            label="Bounding Box"
            data={BOUNDING_BOX_OPTIONS}
            value={BOUNDING_BOX_OPTIONS.find(item => item.key === settings.mode)}
            onChange={handleModeChange}
            $margin="0"
            labelTooltip="Object-Oriented (OOBB) rotates with the object. Axis-Aligned (AABB) always aligns to world axes and resizes when the object rotates."
        />
    );
};
