import {BasicShadowMap, PCFShadowMap, PCFSoftShadowMap, VSMShadowMap} from "three";

// ShadowMapType options
export const shadowMapTypeOptions: {key: any; value: string}[] = [
    {key: BasicShadowMap, value: "Basic"},
    {key: PCFShadowMap, value: "PCF"},
    {key: PCFSoftShadowMap, value: "PCF Soft"},
    {key: VSMShadowMap, value: "VSM"},
];
// Fog type options
export const fogTypeOptions = [
    {key: "none", value: "None"},
    {key: "linear", value: "Linear"},
    {key: "exp", value: "Exponential"},
    {key: "height", value: "Height"},
];
// Tonemapping type options
export const toneMappingTypeOptions = [
    {key: "None", value: "None"},
    {key: "Linear", value: "Linear"},
    {key: "Reinhard", value: "Reinhard"},
    {key: "Cineon", value: "Cineon"},
    {key: "ACESFilmic", value: "ACESFilmic"},
];

export const gradientModeOptions = [
    {key: '2d', value: '2D'},
    {key: '3d', value: '3D'},
];

// Default values for scene settings
export const DEFAULT_AMBIENT = {
    color: "#ffffff",
    intensity: 0,
};

export const DEFAULT_HEMISPHERE = {
    skyColor: "#ffffff",
    groundColor: "#888888",
    intensity: 0,
};

export const DEFAULT_FOG = {
    type: "none",
    color: "#aaaaaa",
    near: 5,
    far: 150,
    density: 0.011,
    heightMin: 50.0,
    heightMax: 150.0,
    heightFalloff: 'linear' as const,
};

export const DEFAULT_BACKGROUND = {
    type: "Color" as const,
    color: "#27272a",
    texture: "",
    cubemap: ["", "", "", "", "", ""],
    rotation: 0,
    intensity: 1,
    blurriness: 0,
    gradient: "linear-gradient(0deg, #3e4455 0%, #3e4455 65%, #4f576d 85%, #59677f 100%)",
    gradientMode: "2d" as const,
};

export const DEFAULT_TONE_MAPPING = {
    type: "None",
    exposure: 1.0,
};

export const DEFAULT_SHADOWS = {
    enabled: false,
    mapType: PCFShadowMap,
};
