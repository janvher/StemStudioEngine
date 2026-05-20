import {MATERIAL_TYPES} from "@stem/editor-oss/types/editor";

export interface IMaterialSettingsTextures {
    base: string;
    ambient: string;
    specular: string;
    metallic: string;
    roughness: string;
    normal: string;
    emissive: string;
    orm: string;
}

export const EMPTY_TEXTURES: IMaterialSettingsTextures = {
    base: "",
    ambient: "",
    specular: "",
    metallic: "",
    roughness: "",
    normal: "",
    emissive: "",
    orm: "",
};

export interface ITexturesSettings {
    opacity: number;
    useBaseAlpha: boolean;
    color: string;
    specularColor?: string;
    emissiveColor?: string;
    /**
     * @deprecated Use specific intensity/scale parameters instead (emissiveIntensity, normalScale, specularIntensity).
     * Kept for backward compatibility.
     */
    strength: number;
    metallic: number;
    roughness: number;
    ao: number;
    emissiveIntensity?: number;
    normalScale?: number;
    specularIntensity?: number;
}

export const EMPTY_TEXTURE_SETTINGS: ITexturesSettings = {
    opacity: 1,
    useBaseAlpha: false,
    color: "#fff",
    strength: 1,
    metallic: 0,
    roughness: 1,
    ao: 1,
    emissiveIntensity: 1,
    emissiveColor: "#000000",
    normalScale: 1,
    specularIntensity: 1,
};

export enum MATERIAL_SETTING_KEY {
    IS_DOUBLE_SIDED = "isDoubleSided",
    TILE_AMOUNT_X = "tileAmountX",
    TILE_AMOUNT_Y = "tileAmountY",
    PANNING_SPEED_X = "panningSpeedX",
    PANNING_SPEED_Y = "panningSpeedY",
    MATERIAL_TYPE = "materialType",
}

export interface IMaterialSettings {
    isDoubleSided: boolean;
    tileAmountX: number;
    tileAmountY: number;
    panningSpeedX: number;
    panningSpeedY: number;
    textures: IMaterialSettingsTextures;
    materialType: MATERIAL_TYPES;
    texturesSettings: ITexturesSettings;
}

export type IMaterialSettingsMap = Record<string, IMaterialSettings>;

export enum TEXTURE_SETTINGS_LABELS {
    IS_DOUBLE_SIDED = "Double Sided",
    TILE_AMOUNT_X = "Tile Amount (X)",
    TILE_AMOUNT_Y = "Tile Amount (Y)",
    PANNING_SPEED_X = "Panning Speed (X)",
    PANNING_SPEED_Y = "Panning Speed (Y)",
}

export const TEXTURE_SETTINGS_MAPS: {key: keyof IMaterialSettingsTextures; label: string}[] = [
    {key: "base", label: "Base"},
    {key: "orm", label: "AO, Met, Rough"},
    {key: "specular", label: "Specular"},
    {key: "metallic", label: "Metallic"},
    {key: "ambient", label: "Ambient"},
    {key: "roughness", label: "Roughness"},
    {key: "normal", label: "Normal"},
    {key: "emissive", label: "Emissive"},
] as const;

export const VISIBLE_TEXTURES_BY_TYPE: Record<MATERIAL_TYPES, string[]> = {
    [MATERIAL_TYPES.SPECULAR]: ["base", "ambient", "specular", "roughness", "normal", "emissive"],
    [MATERIAL_TYPES.METALLIC]: ["base", "ambient", "metallic", "roughness", "normal", "emissive"],
    [MATERIAL_TYPES.PBR]: ["base", "orm", "normal", "emissive"],
};

export const SELECTED_TEXTURE_LABELS: Record<keyof IMaterialSettingsTextures, string> = {
    base: "Base Texture",
    specular: "Specular Texture",
    ambient: "Ambient Occlusion Texture",
    roughness: "Roughness Texture",
    normal: "Normal Texture",
    emissive: "Emissive Texture",
    metallic: "Metallic Texture",
    orm: "A0, Metallic, Roughness Texture",
};
