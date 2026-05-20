import {useState, useEffect, useRef, RefObject, useCallback} from "react";
import ReactGradientPicker from "react-best-gradient-color-picker";
import {Color, MathUtils, PCFShadowMap, PCFSoftShadowMap} from "three";
import {useOnClickOutside} from "usehooks-ts";

import {gradientModeOptions, DEFAULT_BACKGROUND} from "./constants";
import {GradientPreview, StyledGradientPicker} from "./DefaultLightsAndFogPanel.style";
import {FogSettings} from "./FogSettings";
import {Lighting} from "./Lighting";
import {Shadows} from "./Shadows";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import type {AssetRef} from "@stem/editor-oss/asset-management/AssetRef";
import {useAppGlobalContext} from "@stem/editor-oss/context";
import global from "@stem/editor-oss/global";
import {RenderingSettings} from "@stem/editor-oss/types/GameSettingsTypes";
import Editor from "../../../../../../Editor";
import {NumericInput} from "../../../../common/NumericInput";
import StyledColorPicker from "../../../../common/StyledColorPicker/StyledColorPicker";
import {Tooltip} from "../../../../common/Tooltip";
import {SelectRow} from "../../../common/SelectRow";
import {PanelSectionTitleSecondary} from "../../../RightPanel.style";
import {CheckboxGrid} from "../ProjectSettings.style";
import {SimpleTextureUpload} from "../SimpleTextureUpload";
import "../../../css/Section.css";
import {SectionHeader} from "./SectionHeader";
import {ToneMapping} from "./ToneMapping";

type BackgroundType = "Color" | "Texture" | "Cubemap" | "Gradient";
type BackgroundGradientMode = "2d" | "3d";

const EMPTY_CUBEMAP_ASSETS: Array<AssetRef | undefined> = [undefined, undefined, undefined, undefined, undefined, undefined];

const toBackgroundType = (value: unknown): BackgroundType => {
    switch (value) {
        case "Color":
        case "Texture":
        case "Cubemap":
        case "Gradient":
            return value;
        default:
            return "Color";
    }
};

const toGradientMode = (value: unknown): BackgroundGradientMode => {
    return value === "3d" ? "3d" : "2d";
};

const FieldLabel = ({label, tooltip}: {label: string; tooltip: string}) => (
    <div style={{display: "flex", alignItems: "center", gap: 4}}>
        <PanelSectionTitleSecondary>{label}</PanelSectionTitleSecondary>
        <Tooltip content={tooltip} stayOpenOnHover maxWidth="360px" />
    </div>
);

export const DefaultLightsAndFogPanel = () => {
    const app = global.app as EngineRuntime;
    const editor = app.editor as Editor & {rendering: RenderingSettings};
    const scene = editor.scene;
    const {activeRightPanel} = useAppGlobalContext();
    const environmentManager = app.environmentManager!;
    const initialBackground = editor.rendering.background;

    const [useShadows, setUseShadows] = useState(!!app.editor?.useShadows);
    const [shadowMapType, setShadowMapType] = useState<number>(
        app.editor?.rendering?.shadowMapType ?? PCFShadowMap,
    );

    const [backgroundColor, setBackgroundColor] = useState(() => {
        if (scene.background instanceof Color) {
            return scene.background.getStyle();
        }
        return "#27272a";
    });
    const [backgroundType, setBackgroundType] = useState<BackgroundType>(toBackgroundType(initialBackground?.type));
    const [backgroundTexture, setBackgroundTexture] = useState(initialBackground?.texture || "");
    const [backgroundTextureAsset, setBackgroundTextureAsset] = useState<AssetRef | undefined>(
        initialBackground?.textureAsset,
    );
    const [backgroundCubemap, setBackgroundCubemap] = useState<string[]>(initialBackground?.cubemap || ["", "", "", "", "", ""]);
    const [backgroundCubemapAssets, setBackgroundCubemapAssets] = useState<Array<AssetRef | undefined>>(
        (initialBackground?.cubemapAssets) || EMPTY_CUBEMAP_ASSETS,
    );
    const [backgroundRotation, setBackgroundRotation] = useState(editor.rendering.background?.rotation ?? 0);
    const [backgroundIntensity, setBackgroundIntensity] = useState(editor.rendering.background?.intensity ?? 1);
    const [backgroundBlurriness, setBackgroundBlurriness] = useState(editor.rendering.background?.blurriness ?? 0);
    const [backgroundGradient, setBackgroundGradient] = useState(
        editor.rendering.background?.gradient ||
            "linear-gradient(0deg, #3e4455 0%, #3e4455 65%, #4f576d 85%, #59677f 100%)",
    );
    const [backgroundGradientMode, setBackgroundGradientMode] = useState<BackgroundGradientMode>(
        toGradientMode(initialBackground?.gradientMode),
    );

    // Color picker visibility state
    const [showBackgroundColorPicker, setShowBackgroundColorPicker] = useState(false);
    const [showGradientPicker, setShowGradientPicker] = useState(false);
    const gradientPickerRef = useRef<HTMLDivElement>(null);

    useOnClickOutside(gradientPickerRef as RefObject<HTMLElement>, () => setShowGradientPicker(false));

    // Comparison functions to check if values differ from defaults

    const isBackgroundModified = () =>
        backgroundType !== DEFAULT_BACKGROUND.type ||
        backgroundColor.toLowerCase() !== DEFAULT_BACKGROUND.color.toLowerCase() ||
        backgroundTexture !== DEFAULT_BACKGROUND.texture ||
        Boolean(backgroundTextureAsset) ||
        backgroundCubemapAssets.some(Boolean) ||
        backgroundRotation !== DEFAULT_BACKGROUND.rotation ||
        backgroundIntensity !== DEFAULT_BACKGROUND.intensity ||
        backgroundBlurriness !== DEFAULT_BACKGROUND.blurriness ||
        backgroundGradient !== DEFAULT_BACKGROUND.gradient ||
        backgroundGradientMode !== DEFAULT_BACKGROUND.gradientMode;

    // Reset handlers
    const resetBackground = () => {
        setBackgroundType(DEFAULT_BACKGROUND.type);
        setBackgroundColor(DEFAULT_BACKGROUND.color);
        setBackgroundTexture(DEFAULT_BACKGROUND.texture);
        setBackgroundTextureAsset(undefined);
        setBackgroundCubemap(DEFAULT_BACKGROUND.cubemap);
        setBackgroundCubemapAssets(EMPTY_CUBEMAP_ASSETS);
        setBackgroundRotation(DEFAULT_BACKGROUND.rotation);
        setBackgroundIntensity(DEFAULT_BACKGROUND.intensity);
        setBackgroundBlurriness(DEFAULT_BACKGROUND.blurriness);
        setBackgroundGradient(DEFAULT_BACKGROUND.gradient);
        setBackgroundGradientMode(DEFAULT_BACKGROUND.gradientMode);
    };

    const handleBackgroundTypeChange = useCallback((key: string) => {
        setBackgroundType(toBackgroundType(key));
    }, []);

    useEffect(() => {
        void environmentManager.updateEnvironmentSettings({
            background: {
                type: backgroundType,
                color: backgroundColor,
                texture: backgroundTexture,
                textureAsset: backgroundTextureAsset,
                cubemap: backgroundCubemap as [string, string, string, string, string, string],
                cubemapAssets: backgroundCubemapAssets,
                rotation: backgroundRotation,
                intensity: backgroundIntensity,
                blurriness: backgroundBlurriness,
                gradient: backgroundGradient,
                gradientMode: backgroundGradientMode,
            },
        });
    }, [
        backgroundType,
        backgroundColor,
        backgroundTexture,
        backgroundTextureAsset,
        backgroundCubemap,
        backgroundCubemapAssets,
        backgroundRotation,
        backgroundIntensity,
        backgroundBlurriness,
        backgroundGradient,
        backgroundGradientMode,
        environmentManager,
    ]);

    const update = useCallback(() => {
        try {
            if (!app?.editor?.scene?.userData) {
                console.warn("GameSettings: Scene userData not available during update");
                return;
            }
            setUseShadows(!!app.editor?.useShadows);
            setShadowMapType(app.editor?.rendering.shadowMapType ?? PCFSoftShadowMap);

            const bg = app.editor?.rendering.background;
            if (bg) {
                setBackgroundType(toBackgroundType(bg.type));
                setBackgroundColor(bg.color || "#27272a");
                setBackgroundTexture(bg.texture || "");
                setBackgroundTextureAsset(bg.textureAsset);
                setBackgroundCubemap(bg.cubemap || ["", "", "", "", "", ""]);
                setBackgroundCubemapAssets(
                    (bg.cubemapAssets) || EMPTY_CUBEMAP_ASSETS,
                );
                setBackgroundGradient(
                    bg.gradient || "linear-gradient(0deg, #3e4455 0%, #3e4455 65%, #4f576d 85%, #59677f 100%)",
                );
                setBackgroundGradientMode(toGradientMode(bg.gradientMode));
                setBackgroundRotation(bg.rotation ?? 0);
                setBackgroundIntensity(bg.intensity ?? 1);
                setBackgroundBlurriness(bg.blurriness ?? 0);
            }
        } catch (error) {
            console.error("GameSettings: Error during update:", error);
        }
    }, [app]);

    useEffect(() => {
        app.on("sceneSaved.GameSettings", update);
        app.on("sceneLoaded.GameSettings", update);
        app.on("clear.GameSettings", update);

        return () => {
            app.on("sceneSaved.GameSettings", null);
            app.on("sceneLoaded.GameSettings", null);
            app.on("clear.GameSettings", null);
        };
    }, [app, update]);

    useEffect(() => {
        update();
    }, [activeRightPanel, update]);

    return (
        <div className="Section">
            <CheckboxGrid style={{gap: 8}}>
                <Lighting />
                <FogSettings />
                <div className="box">
                    <SectionHeader
                        title="Scene Background"
                        showReset={isBackgroundModified()}
                        onReset={resetBackground}
                        tooltip="Controls the scene backdrop. Choose a solid color, equirectangular image, cubemap, or gradient."
                    />
                </div>
                <div className="box" style={{display: "flex", alignItems: "center", gap: 8}}>
                    <FieldLabel
                        label="Type"
                        tooltip="Chooses how the scene backdrop is generated. Color is cheapest, gradients are great for stylized skies, equirectangular textures are good for panoramic environments, and cubemaps work best for authored skyboxes."
                    />
                    <SelectRow
                        label=""
                        data={[
                            {key: "Color", value: "Color"},
                            {key: "Texture", value: "Equirectangular"},
                            {key: "Cubemap", value: "Cubemap"},
                            {key: "Gradient", value: "Gradient"},
                        ]}
                        value={{
                            key: backgroundType,
                            value: backgroundType === "Texture" ? "Equirectangular" : backgroundType,
                        }}
                        onChange={item => handleBackgroundTypeChange(item.key)}
                        disableTyping
                        width="110px"
                    />
                </div>

                {backgroundType === "Color" && (
                    <>
                        <div className="box" style={{display: "flex", alignItems: "center", gap: 8}}>
                            <FieldLabel
                                label="Color"
                                tooltip="Base backdrop color when no image is used. Mid-to-dark neutrals are typical for editing, while lighter colors work well for flat stylized scenes or bright product shots."
                            />
                            <div
                                className="color-box"
                                style={{backgroundColor: backgroundColor}}
                                onClick={() => setShowBackgroundColorPicker(true)}
                            />
                        </div>
                    </>
                )}

                {showBackgroundColorPicker && (
                    <StyledColorPicker
                        color={backgroundColor}
                        setColor={value => {
                            setBackgroundColor(value);
                        }}
                        hide={() => setShowBackgroundColorPicker(false)}
                    />
                )}

                {backgroundType === "Texture" && (
                    <div className="box column">
                        <SimpleTextureUpload
                            label="Equirectangular Texture"
                            url={backgroundTexture}
                            assetRef={backgroundTextureAsset}
                            onChange={url => {
                                setBackgroundTexture(url);
                                setBackgroundTextureAsset(undefined);
                            }}
                        />
                        <div style={{display: "flex", gap: 8, width: "100%", marginTop: 4}}>
                            <div style={{flex: 1, display: "flex", flexDirection: "column", gap: 4}}>
                                <FieldLabel
                                    label="Rotation"
                                    tooltip="Rotates the panorama around the scene. Use this to line up the horizon or brightest area with your main camera and key light. Typical adjustments are small, usually within 0-180 degrees."
                                />
                                <NumericInput
                                    className="numeric-input"
                                    value={MathUtils.radToDeg(Number(backgroundRotation))}
                                    setValue={v => setBackgroundRotation(MathUtils.degToRad(Number(v)))}
                                    decimalPlaces={2}
                                    dragStep={0.1}
                                    width="100%"
                                />
                            </div>
                            <div style={{flex: 1, display: "flex", flexDirection: "column", gap: 4}}>
                                <FieldLabel
                                    label="Intensity"
                                    tooltip="Brightness multiplier for the equirectangular background. Typical values are 0.5-2. Raise it when the backdrop looks too dim, but avoid very high values unless you want a blown-out sky."
                                />
                                <NumericInput
                                    className="numeric-input"
                                    value={Number(backgroundIntensity)}
                                    setValue={v => setBackgroundIntensity(Number(v))}
                                    min={0}
                                    max={20}
                                    decimalPlaces={3}
                                    width="100%"
                                    dragStep={0.05}
                                />
                            </div>
                            <div style={{flex: 1, display: "flex", flexDirection: "column", gap: 4}}>
                                <FieldLabel
                                    label="Blurriness"
                                    tooltip="Softens the background image without changing the environment source. Use 0 for a crisp visible skybox and 0.1-0.5 when you want a softer backdrop that competes less with foreground content."
                                />
                                <NumericInput
                                    className="numeric-input"
                                    value={Number(backgroundBlurriness)}
                                    setValue={v => setBackgroundBlurriness(Number(v))}
                                    min={0}
                                    max={1}
                                    decimalPlaces={3}
                                    dragStep={0.01}
                                    width="100%"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {backgroundType === "Cubemap" && (
                    <div className="box column">
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(4, 1fr)",
                                width: "100%",
                            }}>
                            {/* Standard Cubemap Layout (T-shape/Cross)
                                   PY
                                NX PZ PX NZ
                                   NY
                             */}

                            {/* Row 1: PY (Top) at column 2 */}
                            <div style={{gridColumn: "2"}}>
                                <SimpleTextureUpload
                                    label="PY"
                                    placeholder="Click to upload the PY side"
                                    hideTitle
                                    url={backgroundCubemap[2]}
                                    assetRef={backgroundCubemapAssets[2]}
                                    onChange={url => {
                                        const newCubemap = [...backgroundCubemap];
                                        const newCubemapAssets = [...backgroundCubemapAssets];
                                        newCubemap[2] = url;
                                        newCubemapAssets[2] = undefined;
                                        setBackgroundCubemap(newCubemap);
                                        setBackgroundCubemapAssets(newCubemapAssets);
                                    }}
                                    aspectRatio="1/1"
                                />
                            </div>

                            {/* Row 2: NX, PZ, PX, NZ */}

                            {/* Left (NX) at column 1 */}
                            <div style={{gridColumn: "1", gridRow: "2"}}>
                                <SimpleTextureUpload
                                    label="NX"
                                    placeholder="Click to upload the NX side"
                                    hideTitle
                                    url={backgroundCubemap[1]}
                                    assetRef={backgroundCubemapAssets[1]}
                                    onChange={url => {
                                        const newCubemap = [...backgroundCubemap];
                                        const newCubemapAssets = [...backgroundCubemapAssets];
                                        newCubemap[1] = url;
                                        newCubemapAssets[1] = undefined;
                                        setBackgroundCubemap(newCubemap);
                                        setBackgroundCubemapAssets(newCubemapAssets);
                                    }}
                                    aspectRatio="1/1"
                                />
                            </div>

                            {/* Front (PZ) at column 2 */}
                            <div style={{gridColumn: "2", gridRow: "2"}}>
                                <SimpleTextureUpload
                                    label="PZ"
                                    placeholder="Click to upload the PZ side"
                                    hideTitle
                                    url={backgroundCubemap[4]}
                                    assetRef={backgroundCubemapAssets[4]}
                                    onChange={url => {
                                        const newCubemap = [...backgroundCubemap];
                                        const newCubemapAssets = [...backgroundCubemapAssets];
                                        newCubemap[4] = url;
                                        newCubemapAssets[4] = undefined;
                                        setBackgroundCubemap(newCubemap);
                                        setBackgroundCubemapAssets(newCubemapAssets);
                                    }}
                                    aspectRatio="1/1"
                                />
                            </div>

                            {/* Right (PX) at column 3 */}
                            <div style={{gridColumn: "3", gridRow: "2"}}>
                                <SimpleTextureUpload
                                    label="PX"
                                    placeholder="Click to upload the PX side"
                                    hideTitle
                                    url={backgroundCubemap[0]}
                                    assetRef={backgroundCubemapAssets[0]}
                                    onChange={url => {
                                        const newCubemap = [...backgroundCubemap];
                                        const newCubemapAssets = [...backgroundCubemapAssets];
                                        newCubemap[0] = url;
                                        newCubemapAssets[0] = undefined;
                                        setBackgroundCubemap(newCubemap);
                                        setBackgroundCubemapAssets(newCubemapAssets);
                                    }}
                                    aspectRatio="1/1"
                                />
                            </div>

                            {/* Back (NZ) at column 4 */}
                            <div style={{gridColumn: "4", gridRow: "2"}}>
                                <SimpleTextureUpload
                                    label="NZ"
                                    placeholder="Click to upload the NZ side"
                                    hideTitle
                                    url={backgroundCubemap[5]}
                                    assetRef={backgroundCubemapAssets[5]}
                                    onChange={url => {
                                        const newCubemap = [...backgroundCubemap];
                                        const newCubemapAssets = [...backgroundCubemapAssets];
                                        newCubemap[5] = url;
                                        newCubemapAssets[5] = undefined;
                                        setBackgroundCubemap(newCubemap);
                                        setBackgroundCubemapAssets(newCubemapAssets);
                                    }}
                                    aspectRatio="1/1"
                                />
                            </div>

                            {/* Row 3: NY (Bottom) at column 2 */}
                            <div style={{gridColumn: "2", gridRow: "3"}}>
                                <SimpleTextureUpload
                                    label="NY"
                                    placeholder="Click to upload the NY side"
                                    hideTitle
                                    url={backgroundCubemap[3]}
                                    assetRef={backgroundCubemapAssets[3]}
                                    onChange={url => {
                                        const newCubemap = [...backgroundCubemap];
                                        const newCubemapAssets = [...backgroundCubemapAssets];
                                        newCubemap[3] = url;
                                        newCubemapAssets[3] = undefined;
                                        setBackgroundCubemap(newCubemap);
                                        setBackgroundCubemapAssets(newCubemapAssets);
                                    }}
                                    aspectRatio="1/1"
                                />
                            </div>
                        </div>
                        <div style={{display: "flex", gap: 8, width: "100%", marginTop: 4}}>
                            <div style={{flex: 1, display: "flex", flexDirection: "column", gap: 4}}>
                                <FieldLabel
                                    label="Rotation"
                                    tooltip="Rotates the cubemap environment around the scene. Use this to align the brightest face or horizon with the primary viewing direction."
                                />
                                <NumericInput
                                    className="numeric-input"
                                    value={MathUtils.radToDeg(Number(backgroundRotation))}
                                    setValue={v => setBackgroundRotation(MathUtils.degToRad(Number(v)))}
                                    decimalPlaces={2}
                                    width="100%"
                                />
                            </div>
                            <div style={{flex: 1, display: "flex", flexDirection: "column", gap: 4}}>
                                <FieldLabel
                                    label="Intensity"
                                    tooltip="Brightness multiplier for the cubemap background. Typical values are 0.5-2. Increase carefully because bright skyboxes can dominate the scene."
                                />
                                <NumericInput
                                    className="numeric-input"
                                    value={Number(backgroundIntensity)}
                                    setValue={v => setBackgroundIntensity(Number(v))}
                                    min={0}
                                    max={10}
                                    decimalPlaces={2}
                                    width="100%"
                                />
                            </div>
                            <div style={{flex: 1, display: "flex", flexDirection: "column", gap: 4}}>
                                <FieldLabel
                                    label="Blurriness"
                                    tooltip="Softens the visible cubemap. Typical values are 0-0.3 for subtle softening and 0.3-1 for heavily diffused background-only skies."
                                />
                                <NumericInput
                                    className="numeric-input"
                                    value={Number(backgroundBlurriness)}
                                    setValue={v => setBackgroundBlurriness(Number(v))}
                                    min={0}
                                    max={1}
                                    decimalPlaces={2}
                                    width="100%"
                                />
                            </div>
                        </div>
                    </div>
                )}
                {backgroundType === "Gradient" && (
                    <div className="box column">
                        <div style={{display: "flex", alignItems: "center", gap: 8, width: "100%", marginBottom: 4}}>
                            <FieldLabel
                                label="Gradient"
                                tooltip="Procedural background gradient. Use 2D for a flat screen-space gradient or 3D for a sky-like world-space backdrop that reacts more like an environment."
                            />
                            <div style={{flex: 1}} />
                            <SelectRow
                                label=""
                                data={gradientModeOptions}
                                value={
                                    gradientModeOptions.find(opt => opt.key === backgroundGradientMode) ||
                                    gradientModeOptions[0]
                                }
                                onChange={item => {
                                    const mode = item.key as "2d" | "3d";
                                    setBackgroundGradientMode(mode);
                                    if (mode === "3d" && backgroundGradient.includes("radial-gradient")) {
                                        // Convert to default linear gradient if switching to 3d from radial
                                        setBackgroundGradient(
                                            "linear-gradient(0deg, #3e4455 0%, #3e4455 65%, #4f576d 85%, #59677f 100%)",
                                        );
                                    }
                                }}
                                disableTyping
                                width="60px"
                                $margin="0"
                            />
                        </div>
                        <GradientPreview
                            $gradient={backgroundGradient}
                            onClick={() => setShowGradientPicker(!showGradientPicker)}
                        />
                        {showGradientPicker && (
                            <StyledGradientPicker ref={gradientPickerRef}>
                                <ReactGradientPicker
                                    value={backgroundGradient}
                                    onChange={setBackgroundGradient}
                                    className="gradient-picker"
                                    hideGradientType={backgroundGradientMode === "3d"}
                                    hideGradientAngle={backgroundGradientMode === "3d"}
                                    hideGradientStop={backgroundGradientMode === "3d"}
                                    hideColorTypeBtns={backgroundGradientMode === "3d"}
                                />
                            </StyledGradientPicker>
                        )}
                        {backgroundGradientMode === "3d" && (
                            <div style={{display: "flex", gap: 8, width: "100%", marginTop: 8}}>
                            <div style={{flex: 1, display: "flex", flexDirection: "column", gap: 4}}>
                                    <FieldLabel
                                        label="Intensity"
                                        tooltip="Brightness multiplier for the 3D gradient sky. Typical values are 0.5-1.5. Increase it when the procedural sky feels too dark compared with your scene lighting."
                                    />
                                    <NumericInput
                                        className="numeric-input"
                                        value={Number(backgroundIntensity)}
                                        setValue={v => setBackgroundIntensity(Number(v))}
                                        min={0}
                                        max={20}
                                        decimalPlaces={2}
                                        width="100%"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <ToneMapping />
                <Shadows
                    setShadowMapType={setShadowMapType}
                    setUseShadows={setUseShadows}
                    shadowMapType={shadowMapType}
                    useShadows={useShadows}
                />
            </CheckboxGrid>
        </div>
    );
};
