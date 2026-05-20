import {UNITS, UNIT_LABELS, UnitType} from "../units/constants";
import global from "../global";

interface UnitsSettings {
    enabled?: boolean;
    currentUnit?: UnitType;
}

const readUnitsSettings = (): UnitsSettings => {
    const app = (global as any).app;
    const settings = app?.editor?.scene?.userData?.units as UnitsSettings | undefined;
    return settings || {};
};

export const getActiveDisplayUnit = (): {enabled: boolean; unit: UnitType; label: string; factor: number} => {
    const s = readUnitsSettings();
    const enabled = !!s.enabled;
    const unit = (s.currentUnit as UnitType) || "meters";
    // Label always reflects the unit the displayed value is in. When unit
    // conversion is disabled, values stay in meters, so the label is "m".
    const displayUnit: UnitType = enabled ? unit : "meters";
    return {
        enabled,
        unit,
        label: UNIT_LABELS[displayUnit],
        factor: UNITS[unit],
    };
};

export const convertFromMetersDisplay = (valueInMeters: number): number => {
    const {enabled, factor} = getActiveDisplayUnit();
    if (!enabled) return valueInMeters;
    return valueInMeters / factor;
};

export const convertToMetersDisplay = (valueInCurrentUnit: number): number => {
    const {enabled, factor} = getActiveDisplayUnit();
    if (!enabled) return valueInCurrentUnit;
    return valueInCurrentUnit * factor;
};
