import React from "react";

import {UNIT_OPTIONS, UnitType, UnitsSettings} from "../../../../../../units/constants";
import { PanelCheckbox } from "../../common/PanelCheckbox";
import { SelectRow } from "../../common/SelectRow";


export {UNITS, UNIT_LABELS, UNIT_OPTIONS} from "../../../../../../units/constants";
export type {UnitType, UnitsSettings} from "../../../../../../units/constants";

interface UnitsSectionProps {
    settings: UnitsSettings;
    onChange: (settings: UnitsSettings) => void;
}

export const UnitsSection: React.FC<UnitsSectionProps> = ({ settings, onChange }) => {
    if (!settings) {
        return null;
    }

    const handleEnabledChange = () => {
        onChange({
            ...settings,
            enabled: !settings.enabled,
        });
    };

    const handleUnitChange = (item: { key: string; value: string }) => {
        onChange({
            ...settings,
            currentUnit: item.key as UnitType,
        });
    };

    return (
        <>
            <PanelCheckbox
                v2
                text="Enable Unit System"
                checked={settings.enabled}
                isGray
                regular
                onChange={handleEnabledChange}
                tooltipText="Shows and edits transform-related values using a chosen display unit. This mainly affects how values are displayed in the editor so creators can work in the unit system they expect."
            />
            {settings.enabled && 
                <SelectRow
                    label="Display Unit"
                    data={UNIT_OPTIONS}
                    value={UNIT_OPTIONS.find((item) => item.key === settings.currentUnit)}
                    onChange={handleUnitChange}
                    $margin="0"
                    labelTooltip="Sets the unit shown in editor numeric fields. Meters and centimeters are typical for most 3D scenes, while inches and feet are useful for architecture or product workflows."
                />
            }
        </>
    );
};
