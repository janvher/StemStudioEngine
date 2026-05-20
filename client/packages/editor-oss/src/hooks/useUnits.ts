import { useCallback, useEffect, useState } from "react";

import { UNITS, UNIT_LABELS, UnitType } from "../editor/assets/v2/RightPanel/panels/ProjectSettings/UnitsSection";
import global from "../global";

export interface UnitsSettings {
    enabled: boolean;
    currentUnit: UnitType;
}

/**
 * Hook to access and manage unit conversion throughout the application
 */
const DEFAULT_UNITS: UnitsSettings = {
    enabled: true,
    currentUnit: "meters",
};

export const useUnits = () => {
    const app = (global as any).app;
    const [unitsSettings, setUnitsSettings] = useState<UnitsSettings>(() => {
        if (!app?.editor?.scene?.userData) {
            return DEFAULT_UNITS;
        }
        const saved = app.editor.scene.userData.units;
        // Ensure we have a complete settings object
        return saved ? { ...DEFAULT_UNITS, ...saved } : DEFAULT_UNITS;
    });

    useEffect(() => {
        if (!app) return;

        const handleUnitsChanged = (_editor: any, settings: UnitsSettings) => {
            if (settings) {
                console.log('[useUnits] Units settings changed:', settings);
                // Ensure we preserve all properties when updating
                setUnitsSettings({ ...DEFAULT_UNITS, ...settings });
            }
        };

        app.on("unitsSettingsChanged.useUnits", handleUnitsChanged);

        return () => {
            app.on("unitsSettingsChanged.useUnits", null);
        };
    }, [app]);

    /**
     * Convert a value from meters (internal units) to the current display unit
     * @param valueInMeters
     */
    const convertFromMeters = useCallback((valueInMeters: number): number => {
        if (!unitsSettings?.enabled) return valueInMeters;
        const conversionFactor = UNITS[unitsSettings.currentUnit];
        return valueInMeters / conversionFactor;
    }, [unitsSettings]);

    /**
     * Convert a value from the current display unit to meters (internal units)
     * @param valueInCurrentUnit
     */
    const convertToMeters = useCallback((valueInCurrentUnit: number): number => {
        if (!unitsSettings?.enabled) return valueInCurrentUnit;
        const conversionFactor = UNITS[unitsSettings.currentUnit];
        return valueInCurrentUnit * conversionFactor;
    }, [unitsSettings]);

    /**
     * Get the current unit label (e.g., "m", "cm", "ft")
     */
    const getUnitLabel = useCallback((): string => {
        console.log('[useUnits] getUnitLabel called. Settings:', unitsSettings);
        if (!unitsSettings?.enabled) {
            console.log('[useUnits] getUnitLabel returning empty (not enabled)');
            return "";
        }
        const label = UNIT_LABELS[unitsSettings.currentUnit];
        console.log('[useUnits] getUnitLabel returning:', label);
        return label;
    }, [unitsSettings]);

    /**
     * Cycle to the next unit in the list
     */
    const cycleUnit = useCallback((): UnitType => {
        const unitKeys: UnitType[] = ["meters", "centimeters", "millimeters", "inches", "feet"];
        const currentIndex = unitKeys.indexOf(unitsSettings?.currentUnit ?? "meters");
        const nextIndex = (currentIndex + 1) % unitKeys.length;
        const nextUnit = unitKeys[nextIndex] ?? "meters";

        console.log('[useUnits] Cycling units. Current settings:', unitsSettings);
        console.log('[useUnits] Next unit:', nextUnit);

        // Update the units settings - preserve enabled state
        const newSettings: UnitsSettings = {
            enabled: unitsSettings?.enabled ?? false,
            currentUnit: nextUnit,
        };

        console.log('[useUnits] New settings:', newSettings);

        if (app?.editor?.scene) {
            app.editor.scene.userData.units = newSettings;
            console.log('[useUnits] Saved to scene.userData.units');
            app.call("objectChanged", app.editor, app.editor.scene);
            app.call("unitsSettingsChanged", app.editor, newSettings);
        }

        return nextUnit;
    }, [unitsSettings, app]);

    return {
        unitsSettings,
        convertFromMeters,
        convertToMeters,
        getUnitLabel,
        cycleUnit,
        isEnabled: unitsSettings?.enabled ?? false,
        currentUnit: unitsSettings?.currentUnit ?? "meters",
    };
};
