import {useEffect, useState} from "react";

import {ColorRow, NumberRow} from "./common";
import {DEFAULT_AMBIENT, DEFAULT_HEMISPHERE} from "./constants";
import {SectionHeader} from "./SectionHeader";
import global from "@stem/editor-oss/global";
import StyledColorPicker from "../../../../common/StyledColorPicker/StyledColorPicker";

export const Lighting = () => {
    const app = global.app!;
    const editor = app.editor!;
    const environmentManager = app.environmentManager!;

    const [ambientColor, setAmbientColor] = useState(editor.rendering.ambient?.color || "#ffffff");
    const [ambientIntensity, setAmbientIntensity] = useState(editor.rendering.ambient?.intensity ?? 0);
    const [hemisphereSkyColor, setHemisphereSkyColor] = useState(editor.rendering.hemisphere?.skyColor || "#ffffff");
    const [hemisphereGroundColor, setHemisphereGroundColor] = useState(
        editor.rendering.hemisphere?.groundColor || "#888888",
    );
    const [hemisphereIntensity, setHemisphereIntensity] = useState(editor.rendering.hemisphere?.intensity ?? 0);

    // Color Pickers State
    const [showAmbientColorPicker, setShowAmbientColorPicker] = useState(false);
    const [showHemisphereSkyColorPicker, setShowHemisphereSkyColorPicker] = useState(false);
    const [showHemisphereGroundColorPicker, setShowHemisphereGroundColorPicker] = useState(false);

    const resetAmbient = () => {
        setAmbientColor(DEFAULT_AMBIENT.color);
        setAmbientIntensity(DEFAULT_AMBIENT.intensity);
    };

    const resetHemisphere = () => {
        setHemisphereSkyColor(DEFAULT_HEMISPHERE.skyColor);
        setHemisphereGroundColor(DEFAULT_HEMISPHERE.groundColor);
        setHemisphereIntensity(DEFAULT_HEMISPHERE.intensity);
    };

    const isAmbientModified = () =>
        ambientColor.toLowerCase() !== DEFAULT_AMBIENT.color.toLowerCase() ||
        ambientIntensity !== DEFAULT_AMBIENT.intensity;

    const isHemisphereModified = () =>
        hemisphereSkyColor.toLowerCase() !== DEFAULT_HEMISPHERE.skyColor.toLowerCase() ||
        hemisphereGroundColor.toLowerCase() !== DEFAULT_HEMISPHERE.groundColor.toLowerCase() ||
        hemisphereIntensity !== DEFAULT_HEMISPHERE.intensity;

    useEffect(() => {
        void environmentManager.updateEnvironmentSettings({
            ambient: {color: ambientColor, intensity: ambientIntensity},
        });
    }, [ambientColor, ambientIntensity]);

    useEffect(() => {
        void environmentManager.updateEnvironmentSettings({
            hemisphere: {
                skyColor: hemisphereSkyColor,
                groundColor: hemisphereGroundColor,
                intensity: hemisphereIntensity,
            },
        });
    }, [hemisphereSkyColor, hemisphereGroundColor, hemisphereIntensity]);
    return (
        <>
            <div className="box">
                <SectionHeader
                    title="Ambient Lighting"
                    showReset={isAmbientModified()}
                    onReset={resetAmbient}
                    tooltip="Uniform fill light applied equally to all objects regardless of direction. Usually keep this subtle so the scene keeps contrast; values around 0.05-0.5 are common."
                />
            </div>
            <ColorRow
                label="Color"
                color={ambientColor}
                onClick={() => setShowAmbientColorPicker(true)}
                labelTooltip="Overall fill-light tint. Neutral gray or white is typical. Use warmer or cooler tones to gently shift the whole scene mood without creating visible light direction."
            />
            {showAmbientColorPicker && (
                <StyledColorPicker
                    color={ambientColor}
                    setColor={setAmbientColor}
                    hide={() => setShowAmbientColorPicker(false)}
                />
            )}
            <NumberRow
                label="Intensity"
                value={ambientIntensity}
                onChange={setAmbientIntensity}
                min={0}
                max={10}
                labelTooltip="Brightness of the uniform fill light. Typical values are 0.05-0.5 for realistic outdoor scenes, 0.3-1 for stylized scenes, and above 1 only when you want very flat low-contrast lighting."
            />

            <div className="box">
                <SectionHeader
                    title="Hemisphere Lighting"
                    showReset={isHemisphereModified()}
                    onReset={resetHemisphere}
                    tooltip="Two-tone ambient light that simulates sky and ground bounce. This is a fast way to add outdoor shape and color variation without placing more lights. Typical intensity is modest, often 0.1-0.8."
                />
            </div>
            <ColorRow
                label="Sky Color"
                color={hemisphereSkyColor}
                onClick={() => setShowHemisphereSkyColorPicker(true)}
                labelTooltip="Color projected onto upward-facing surfaces. Typical choices are blue-gray for daylight, orange/pink for sunset, or a subtle cool tint to fake sky bounce."
            />
            {showHemisphereSkyColorPicker && (
                <StyledColorPicker
                    color={hemisphereSkyColor}
                    setColor={setHemisphereSkyColor}
                    hide={() => setShowHemisphereSkyColorPicker(false)}
                />
            )}
            <ColorRow
                label="Ground Color"
                color={hemisphereGroundColor}
                onClick={() => setShowHemisphereGroundColorPicker(true)}
                labelTooltip="Color projected onto downward-facing surfaces. Typical values are darker and warmer than the sky color to mimic ground bounce, sand, grass, or indoor floor reflection."
            />
            {showHemisphereGroundColorPicker && (
                <StyledColorPicker
                    color={hemisphereGroundColor}
                    setColor={setHemisphereGroundColor}
                    hide={() => setShowHemisphereGroundColorPicker(false)}
                />
            )}
            <NumberRow
                label="Intensity"
                value={hemisphereIntensity}
                onChange={setHemisphereIntensity}
                min={0}
                max={10}
                labelTooltip="Strength of the sky-versus-ground ambient contrast. Typical values are 0.1-0.8. Use higher values when you want stronger outdoor shape definition without adding more direct lights."
            />
        </>
    );
};
