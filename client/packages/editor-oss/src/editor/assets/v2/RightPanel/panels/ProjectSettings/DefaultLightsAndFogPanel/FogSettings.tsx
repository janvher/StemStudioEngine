import {useEffect, useState} from "react";
import {Fog, FogExp2} from "three";

import {ColorRow, NumberRow, Row} from "./common";
import {fogTypeOptions, DEFAULT_FOG} from "./constants";
import {SectionHeader} from "./SectionHeader";
import global from "@stem/editor-oss/global";
import TimeUtils from "@stem/editor-oss/utils/TimeUtils";
import StyledColorPicker from "../../../../common/StyledColorPicker/StyledColorPicker";
import {PanelCheckbox} from "../../../common/PanelCheckbox";
import {SelectRow} from "../../../common/SelectRow";
import {PanelSectionTitleSecondary} from "../../../RightPanel.style";

export const FogSettings = () => {
    const app = global.app!;
    const editor = app.editor!;
    const scene = editor.scene;
    const sceneFog = editor.scene.userData.savedFog;
    const environmentManager = app.environmentManager!;

    const [showFogColorPicker, setShowFogColorPicker] = useState(false);
    const [fogEditorVisibility, setFogEditorVisibility] = useState(scene?.userData?.fogEditorVisibility ?? true);
    const [fogType, setFogType] = useState(() => {
        if (sceneFog) return sceneFog.type || "none";
        if (!scene.fog) return "none";
        if (scene.fog instanceof Fog) return "linear";
        if (scene.fog instanceof FogExp2) return "exp";
        return "none";
    });

    const [fogColor, setFogColor] = useState(editor.rendering.fog?.color || "#aaaaaa");
    const [fogNear, setFogNear] = useState(() => {
        if (sceneFog) return sceneFog.near ?? 5;
        else return scene.fog instanceof Fog ? scene.fog.near : 5;
    });
    const [fogFar, setFogFar] = useState(() => {
        if (sceneFog) return sceneFog.far ?? 150;
        else return scene.fog instanceof Fog ? scene.fog.far : 150;
    });
    const [fogDensity, setFogDensity] = useState(() => {
        if (sceneFog) return sceneFog.density ?? 0.011;
        else return scene.fog instanceof FogExp2 ? scene.fog.density : 0.011;
    });

    const [fogMinHeight, setFogMinHeight] = useState(editor.rendering.fog?.heightMin ?? DEFAULT_FOG.heightMin);
    const [fogMaxHeight, setFogMaxHeight] = useState(editor.rendering.fog?.heightMax ?? DEFAULT_FOG.heightMax);
    const [fogHeightFalloff, setFogHeightFalloff] = useState<"linear" | "exp">(
        editor.rendering.fog?.heightFalloff || DEFAULT_FOG.heightFalloff,
    );

    const updateFogVisibility = () => {
        const userData = scene.userData || {};
        const savedFog = userData.savedFog;
        void environmentManager.updateEnvironmentSettings({fog: savedFog || {...DEFAULT_FOG, type: "none"}});
    };

    const isFogModified = () =>
        fogType !== DEFAULT_FOG.type ||
        fogColor.toLowerCase() !== DEFAULT_FOG.color.toLowerCase() ||
        fogNear !== DEFAULT_FOG.near ||
        fogFar !== DEFAULT_FOG.far ||
        fogDensity !== DEFAULT_FOG.density ||
        fogMinHeight !== DEFAULT_FOG.heightMin ||
        fogMaxHeight !== DEFAULT_FOG.heightMax ||
        fogHeightFalloff !== DEFAULT_FOG.heightFalloff;

    const saveFogSettings = (fogSettings: any) => {
        if (!scene.userData) scene.userData = {};
        scene.userData.savedFog = fogSettings;
    };

    const resetFog = () => {
        setFogType(DEFAULT_FOG.type);
        setFogColor(DEFAULT_FOG.color);
        setFogNear(DEFAULT_FOG.near);
        setFogFar(DEFAULT_FOG.far);
        setFogDensity(DEFAULT_FOG.density);
        setFogMinHeight(DEFAULT_FOG.heightMin);
        setFogMaxHeight(DEFAULT_FOG.heightMax);
        setFogHeightFalloff(DEFAULT_FOG.heightFalloff);
    };

    useEffect(() => {
        const fogSettings = {
            type: fogType,
            color: fogColor,
            near: fogNear,
            far: fogFar,
            density: fogDensity,
            heightMin: fogMinHeight,
            heightMax: fogMaxHeight,
            heightFalloff: fogHeightFalloff,
        };
        void environmentManager.updateEnvironmentSettings({
            fog: fogSettings,
        });
        saveFogSettings(fogSettings);
    }, [fogType, fogColor, fogNear, fogFar, fogDensity, fogMinHeight, fogMaxHeight, fogHeightFalloff]);

    return (
        <>
            <div className="box">
                <SectionHeader
                    title="Fog"
                    showReset={isFogModified()}
                    onReset={resetFog}
                    tooltip="Fades distant objects into a color to simulate atmospheric depth. Linear fog is easiest to tune with near/far distances, while exponential fog typically uses small density values like 0.001-0.02 for subtle atmosphere."
                />
            </div>
            <Row>
                <PanelSectionTitleSecondary>Type</PanelSectionTitleSecondary>
                <SelectRow
                    label=""
                    data={fogTypeOptions}
                    value={fogTypeOptions.find(opt => opt.key === fogType) || fogTypeOptions[0]}
                    onChange={item => setFogType(item.key)}
                    disableTyping
                    width="110px"
                    labelTooltip="Choose how fog fades depth. Linear is easiest to art direct with near/far distances, exponential is better for dense atmosphere, and height fog is best for ground mist or layered atmosphere."
                />
            </Row>

            {fogType !== "none" && (
                <>
                    <ColorRow
                        label="Color"
                        color={fogColor}
                        onClick={() => setShowFogColorPicker(true)}
                        labelTooltip="Fog tint. Match this close to the sky or background for a natural horizon blend. Strongly different colors create a more stylized or dreamlike look."
                    />
                    {showFogColorPicker && (
                        <StyledColorPicker
                            color={fogColor}
                            setColor={setFogColor}
                            hide={() => setShowFogColorPicker(false)}
                        />
                    )}
                </>
            )}

            {fogType === "linear" && (
                <>
                    <NumberRow
                        label="Near"
                        value={fogNear}
                        onChange={setFogNear}
                        min={0}
                        max={5000}
                        labelTooltip="Distance where fog starts. Typical values are just beyond the main playable space or camera comfort zone so nearby objects stay crisp."
                    />
                    <NumberRow
                        label="Far"
                        value={fogFar}
                        onChange={setFogFar}
                        min={0}
                        max={5000}
                        labelTooltip="Distance where fog reaches full strength. Keep this well beyond Near. Typical outdoor ranges are tens to hundreds of meters depending on scene scale."
                    />
                </>
            )}
            {fogType === "exp" && (
                <NumberRow
                    label="Density"
                    value={fogDensity}
                    onChange={setFogDensity}
                    min={0}
                    max={1}
                    decimalPlaces={3}
                    labelTooltip="How quickly fog accumulates with distance. Typical values are 0.001-0.02 for subtle atmosphere, 0.02-0.08 for heavy haze, and higher only for very dense stylized fog."
                />
            )}

            {fogType === "height" && (
                <>
                    <NumberRow
                        label="Min Height"
                        value={fogMinHeight}
                        onChange={setFogMinHeight}
                        min={-5000}
                        max={5000}
                        labelTooltip="Lower boundary of the fog band in world units. Use this near the ground plane for mist, or lower it to fill valleys and caves."
                    />
                    <NumberRow
                        label="Max Height"
                        value={fogMaxHeight}
                        onChange={setFogMaxHeight}
                        min={-5000}
                        max={5000}
                        labelTooltip="Upper boundary of the fog band. The gap between Min and Max defines how tall the fog layer feels."
                    />
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "0 5px",
                            alignItems: "center",
                            height: "32px",
                        }}>
                        <PanelSectionTitleSecondary style={{margin: 0}}>Falloff</PanelSectionTitleSecondary>
                        <SelectRow
                            label=""
                            data={[
                                {key: "linear", value: "Linear"},
                                {key: "exp", value: "Exponential"},
                            ]}
                            value={{
                                key: fogHeightFalloff,
                                value: fogHeightFalloff === "linear" ? "Linear" : "Exponential",
                            }}
                            onChange={item => setFogHeightFalloff(item.key as "linear" | "exp")}
                            disableTyping
                            width="110px"
                            $margin="0"
                            labelTooltip="Controls how the height fog fades through the band. Linear gives a predictable gradient, while exponential creates denser-looking ground fog."
                        />
                    </div>

                    {fogHeightFalloff === "linear" && (
                        <>
                            <NumberRow
                                label="Near"
                                value={fogNear}
                                onChange={setFogNear}
                                min={0}
                                max={5000}
                                labelTooltip="Distance where height fog starts contributing. Keep it low for immediate mist and higher when you only want distant atmospheric layering."
                            />
                            <NumberRow
                                label="Far"
                                value={fogFar}
                                onChange={setFogFar}
                                min={0}
                                max={5000}
                                labelTooltip="Distance where height fog reaches full strength. Larger values make the layer feel more gradual and spacious."
                            />
                        </>
                    )}

                    {fogHeightFalloff === "exp" && (
                        <NumberRow
                            label="Density"
                            value={fogDensity}
                            onChange={setFogDensity}
                            min={0}
                            max={1}
                            decimalPlaces={4}
                            labelTooltip="Density curve for height fog. Typical values are 0.002-0.03. Higher values create a thicker low-lying fog bank more quickly."
                        />
                    )}
                </>
            )}

            {fogType !== "none" && (
                <PanelCheckbox
                    v2
                    text="Visible in editor"
                    checked={fogEditorVisibility}
                    isGray
                    regular
                    onChange={e => {
                        const checked = e.target.checked;
                        setFogEditorVisibility(checked);

                        if (!scene.userData) scene.userData = {};
                        scene.userData.fogEditorVisibility = checked;
                        scene.userData.lastEditTime = TimeUtils.getServerUTCTime();
                        updateFogVisibility();
                    }}
                    tooltipText="Shows fog while editing. Turn this off if fog makes layout work harder, while keeping the effect enabled at runtime."
                />
            )}
        </>
    );
};
