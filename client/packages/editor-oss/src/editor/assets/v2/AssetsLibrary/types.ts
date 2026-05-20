import {SUPPORTED_MODEL_FORMATS} from "@stem/network/api/asset";

export enum TABS {
    STEMS = "Stems",
    MODELS = "Models",
    Projects = "Projects",
    ASSET_PACK = "Asset Pack",
    VFX = "VFX",
    MEDIA = "Media",
    BEHAVIORS = "Behaviors",
}

export interface ILibraryAsset {
    Name: string;
    Thumbnail: string;
    ID: string;
    ERTHLibrary: boolean;
}

export const AUDIO_SUPPORTED_FILETYPES = ".MP3, .WAV, .OGG";
export const MODELS_SUPPORTED_FILETYPES = [
    ...SUPPORTED_MODEL_FORMATS.map(format => `.${format.toUpperCase()}`),
    ".ZIP",
    "or multiple files (model + textures)",
].join(", ");
export const PARTICLE_EFFECT_SUPPORTED_FILETYPES = ".JSON";
