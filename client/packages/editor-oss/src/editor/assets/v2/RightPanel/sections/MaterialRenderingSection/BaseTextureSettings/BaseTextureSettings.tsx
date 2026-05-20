import React from "react";
import * as THREE from "three";

import {ColorSetting} from "./ColorSetting";
import {RangeComponent} from "./RangeComponent";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import {PanelCheckbox} from "../../../common/PanelCheckbox";
import {Separator} from "../../../common/Separator";
import {ResetBtn, RowTitle} from "../../../panels/Panels/Panels.styled";
import {
    EMPTY_TEXTURE_SETTINGS,
    IMaterialSettings,
    IMaterialSettingsTextures,
    ITexturesSettings,
    SELECTED_TEXTURE_LABELS,
} from "../types";
import {FlexContainer} from "./BaseTextureSettings.style";

const TEXTURE_SETTINGS_UI: Record<
    keyof IMaterialSettingsTextures,
    {
        showOpacity?: boolean;
        showUseBaseAlpha?: boolean;
        showColor?: boolean;
        showMetalness?: boolean;
        showStrength?: boolean;
        showORM?: boolean;
        showEmissiveIntensity?: boolean;
        showNormalScale?: boolean;
        showSpecularIntensity?: boolean;
        showRoughness?: boolean;
        showAo?: boolean;
        showSpecularColor?: boolean;
        showEmissiveColor?: boolean;
    }
> = {
    base: {
        showOpacity: true,
        showUseBaseAlpha: true,
        showColor: true,
    },
    specular: {
        showSpecularColor: true,
        showSpecularIntensity: true,
    },
    emissive: {
        showEmissiveColor: true,
        showEmissiveIntensity: true,
    },
    ambient: {
        showAo: true,
    },
    roughness: {
        showRoughness: true,
    },
    normal: {
        showNormalScale: true,
    },
    metallic: {
        showMetalness: true,
    },
    orm: {
        showORM: true,
    },
};

interface Props {
    selectedTexture: keyof IMaterialSettingsTextures | undefined;
    setMaterialSettings: React.Dispatch<React.SetStateAction<IMaterialSettings>>;
    materialSettings: IMaterialSettings;
    saveMaterialSettingsToUserData: (selected: THREE.Object3D, settings: IMaterialSettings) => void;
}

export const BaseTextureSettings = ({
    materialSettings,
    setMaterialSettings,
    saveMaterialSettingsToUserData,
    selectedTexture,
}: Props) => {
    const app = global.app as EngineRuntime;
    const editor = app.editor;
    const selected = editor?.getSelectedObject();

    const handleSettingsChange = <K extends keyof ITexturesSettings>(key: K, value: ITexturesSettings[K]) => {
        if (selected) {
            const materialSettingsHolder: IMaterialSettings = {
                ...materialSettings,
                texturesSettings: {
                    ...materialSettings.texturesSettings,
                    [key]: value,
                },
            };
            setMaterialSettings(materialSettingsHolder);
            saveMaterialSettingsToUserData(selected, materialSettingsHolder);
        }
    };

    const resetTextureSettings = () => {
        if (selected) {
            const materialSettingsHolder: IMaterialSettings = {
                ...materialSettings,
            };
            if (selectedTexture === "base") {
                materialSettingsHolder.texturesSettings.opacity = EMPTY_TEXTURE_SETTINGS.opacity;
                materialSettingsHolder.texturesSettings.useBaseAlpha = EMPTY_TEXTURE_SETTINGS.useBaseAlpha;
                materialSettingsHolder.texturesSettings.color = EMPTY_TEXTURE_SETTINGS.color;
            }
            if (selectedTexture === "emissive") {
                materialSettingsHolder.texturesSettings.emissiveColor = EMPTY_TEXTURE_SETTINGS.emissiveColor;
                materialSettingsHolder.texturesSettings.emissiveIntensity = EMPTY_TEXTURE_SETTINGS.emissiveIntensity;
            }
            if (selectedTexture === "ambient") {
                materialSettingsHolder.texturesSettings.ao = EMPTY_TEXTURE_SETTINGS.ao;
            }
            if (selectedTexture === "roughness") {
                materialSettingsHolder.texturesSettings.normalScale = EMPTY_TEXTURE_SETTINGS.roughness;
            }
            if (selectedTexture === "normal") {
                materialSettingsHolder.texturesSettings.normalScale = EMPTY_TEXTURE_SETTINGS.normalScale;
            }
            if (selectedTexture === "metallic") {
                materialSettingsHolder.texturesSettings.metallic = EMPTY_TEXTURE_SETTINGS.metallic;
            }
            if (selectedTexture === "orm") {
                materialSettingsHolder.texturesSettings.ao = EMPTY_TEXTURE_SETTINGS.ao;
                materialSettingsHolder.texturesSettings.metallic = EMPTY_TEXTURE_SETTINGS.metallic;
                materialSettingsHolder.texturesSettings.roughness = EMPTY_TEXTURE_SETTINGS.roughness;
            }
            if (selectedTexture === "specular") {
                materialSettingsHolder.texturesSettings.specularColor = EMPTY_TEXTURE_SETTINGS.specularColor;
                materialSettingsHolder.texturesSettings.specularIntensity = EMPTY_TEXTURE_SETTINGS.specularIntensity;
            }

            setMaterialSettings(materialSettingsHolder);
            saveMaterialSettingsToUserData(selected, materialSettingsHolder);
        }
    };

    const uiConfig = selectedTexture ? TEXTURE_SETTINGS_UI[selectedTexture] : {};
    if (!selectedTexture) return;
    return (
        <>
            <RowTitle style={{justifyContent: "flex-start"}}>
                {SELECTED_TEXTURE_LABELS[selectedTexture]}
                <ResetBtn onClick={resetTextureSettings}>Reset</ResetBtn>
            </RowTitle>
            <Separator
                invisible
                margin="12px 0 0"
            />
            <FlexContainer>
                {uiConfig.showORM && (
                    <>
                        <RangeComponent
                            label="AO"
                            min={0}
                            max={1}
                            step={0.1}
                            value={materialSettings.texturesSettings.ao}
                            handleChange={value => handleSettingsChange("ao", value)}
                            tooltip="Ambient Occlusion intensity from the ORM packed texture."
                        />
                        <RangeComponent
                            label="M"
                            min={0}
                            max={1}
                            step={0.1}
                            value={materialSettings.texturesSettings.metallic}
                            handleChange={value => handleSettingsChange("metallic", value)}
                            tooltip="Metalness factor. 0 = dielectric, 1 = fully metallic."
                        />
                        <RangeComponent
                            label="R"
                            min={0}
                            max={1}
                            step={0.1}
                            value={materialSettings.texturesSettings.roughness}
                            handleChange={value => handleSettingsChange("roughness", value)}
                            tooltip="Surface roughness. 0 = mirror-smooth, 1 = fully diffuse."
                        />
                    </>
                )}

                {uiConfig.showStrength && (
                    <RangeComponent
                        label="Strength"
                        min={0}
                        max={1}
                        step={0.1}
                        value={materialSettings.texturesSettings.strength}
                        handleChange={value => handleSettingsChange("strength", value)}
                        tooltip="Overall influence of this texture map on the material."
                    />
                )}

                {uiConfig.showMetalness && (
                    <RangeComponent
                        label="Metalness"
                        min={0}
                        max={1}
                        step={0.1}
                        value={materialSettings.texturesSettings.metallic}
                        handleChange={value => handleSettingsChange("metallic", value)}
                        tooltip="Metalness factor. 0 = dielectric, 1 = fully metallic."
                    />
                )}

                {uiConfig.showEmissiveIntensity && (
                    <RangeComponent
                        label="Intensity"
                        min={0}
                        max={10}
                        step={0.1}
                        value={
                            materialSettings.texturesSettings.emissiveIntensity ??
                            materialSettings.texturesSettings.strength
                        }
                        handleChange={value => handleSettingsChange("emissiveIntensity", value)}
                        tooltip="Multiplier for emissive glow brightness. Higher values produce stronger bloom."
                    />
                )}

                {uiConfig.showNormalScale && (
                    <RangeComponent
                        label="Scale"
                        min={0}
                        max={5}
                        step={0.1}
                        value={
                            materialSettings.texturesSettings.normalScale ?? materialSettings.texturesSettings.strength
                        }
                        handleChange={value => handleSettingsChange("normalScale", value)}
                        tooltip="Strength of the normal map bump effect. Higher values create deeper surface detail."
                    />
                )}

                {uiConfig.showSpecularIntensity && (
                    <RangeComponent
                        label="Intensity"
                        min={0}
                        max={10}
                        step={0.1}
                        value={
                            materialSettings.texturesSettings.specularIntensity ??
                            materialSettings.texturesSettings.strength
                        }
                        handleChange={value => handleSettingsChange("specularIntensity", value)}
                        tooltip="Strength of specular highlights. Controls how shiny the surface appears."
                    />
                )}

                {uiConfig.showRoughness && (
                    <RangeComponent
                        label="Roughness"
                        min={0}
                        max={1}
                        step={0.1}
                        value={
                            materialSettings.texturesSettings.roughness ?? materialSettings.texturesSettings.strength
                        }
                        handleChange={value => handleSettingsChange("roughness", value)}
                        tooltip="Surface roughness. 0 = mirror-smooth, 1 = fully diffuse."
                    />
                )}

                {uiConfig.showAo && (
                    <RangeComponent
                        label="AO"
                        min={0}
                        max={1}
                        step={0.1}
                        value={materialSettings.texturesSettings.ao ?? materialSettings.texturesSettings.strength}
                        handleChange={value => handleSettingsChange("ao", value)}
                        tooltip="Ambient Occlusion intensity. Darkens creases and contact areas for depth."
                    />
                )}

                {uiConfig.showOpacity && (
                    <RangeComponent
                        label="Opacity"
                        min={0}
                        max={1}
                        step={0.1}
                        value={materialSettings.texturesSettings.opacity}
                        handleChange={value => handleSettingsChange("opacity", value)}
                        tooltip="Overall material transparency. 0 = invisible, 1 = fully opaque."
                    />
                )}

                {uiConfig.showUseBaseAlpha && (
                    <PanelCheckbox
                        v2
                        text="Transparency"
                        checked={materialSettings.texturesSettings.useBaseAlpha}
                        isGray
                        regular
                        onChange={() =>
                            handleSettingsChange("useBaseAlpha", !materialSettings.texturesSettings.useBaseAlpha)
                        }
                        tooltipText="Uses the base texture alpha channel for transparency. Enable for glass, foliage, or decals."
                    />
                )}

                {uiConfig.showColor && (
                    <ColorSetting
                        materialSettings={materialSettings}
                        handleSettingsChange={handleSettingsChange}
                        tooltip="Base diffuse color tint applied to the surface."
                    />
                )}

                {uiConfig.showSpecularColor && (
                    <ColorSetting
                        materialSettings={materialSettings}
                        handleSettingsChange={handleSettingsChange}
                        property="specularColor"
                        label="Specular Color"
                        tooltip="Tint color for specular highlights at glancing angles."
                    />
                )}

                {uiConfig.showEmissiveColor && (
                    <ColorSetting
                        materialSettings={materialSettings}
                        handleSettingsChange={handleSettingsChange}
                        property="emissiveColor"
                        label="Emissive Color"
                        tooltip="Color of light emitted by the surface, independent of scene lighting."
                    />
                )}
            </FlexContainer>
        </>
    );
};
