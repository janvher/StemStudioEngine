import { useCallback, useEffect, useState } from "react";
import * as THREE from "three";

import { AngleUnitType } from "../editor/assets/v2/RightPanel/panels/ProjectSettings/AngleUnitsSection";
import global from "../global";

export interface AngleUnitsSettings {
    currentUnit: AngleUnitType;
}

const DEFAULT_ANGLE_UNITS: AngleUnitsSettings = {
    currentUnit: "degrees",
};

export const useAngleUnits = () => {
    const app = (global as any).app;
    const [angleUnitsSettings, setAngleUnitsSettings] = useState<AngleUnitsSettings>(() => {
        if (!app?.editor?.scene?.userData) {
            return DEFAULT_ANGLE_UNITS;
        }
        const saved = app.editor.scene.userData.angleUnits;
        return saved ? { ...DEFAULT_ANGLE_UNITS, ...saved } : DEFAULT_ANGLE_UNITS;
    });

    useEffect(() => {
        if (!app) return;

        const handleAngleUnitsChanged = (_editor: any, settings: AngleUnitsSettings) => {
            if (settings) {
                setAngleUnitsSettings({ ...DEFAULT_ANGLE_UNITS, ...settings });
            }
        };

        app.on("angleUnitsSettingsChanged.useAngleUnits", handleAngleUnitsChanged);

        return () => {
            app.on("angleUnitsSettingsChanged.useAngleUnits", null);
        };
    }, [app]);

    const convertFromRadians = useCallback(
        (valueInRadians: number): number =>
            angleUnitsSettings.currentUnit === "radians" ? valueInRadians : valueInRadians * THREE.MathUtils.RAD2DEG,
        [angleUnitsSettings.currentUnit],
    );

    const convertToRadians = useCallback(
        (valueInDisplayUnit: number): number =>
            angleUnitsSettings.currentUnit === "radians" ? valueInDisplayUnit : valueInDisplayUnit * THREE.MathUtils.DEG2RAD,
        [angleUnitsSettings.currentUnit],
    );

    return {
        angleUnitsSettings,
        convertFromRadians,
        convertToRadians,
        currentUnit: angleUnitsSettings.currentUnit,
    };
};
