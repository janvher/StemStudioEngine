export type GenerateImageRequest = {
    modelId?: string;
    prompt: string;
    numSamples?: number;
    negativePrompt?: string;
    width?: string;
    height?: string;
    image?: string;
    style?: string;
};

export type RemoveImageBackgroundRequest = {
    assetId: string;
};

export type PixelateImageRequest = {
    assetId: string;
    pixelGridSize: number;
    removeNoise: boolean;
    removeBackground: boolean;
};

export type UpscaleImageRequest = {
    assetId: string;
    scalingFactor: number;
    style: IMAGE_STYLES;
    imageType: IMAGE_TYPES;
    prompt: string;
    negativePrompt?: string;
};

export type GenerateFillRequest = {
    assetId: string;
    mask: string;
    prompt: string;
    negativePrompt?: string;
};

export type GenerateResponse = {
    assetIds: string[];
    status: string | "success";
};

export type Asset = {
    metadata: Record<string, unknown>;
    nsfw: string[];
    automaticCaptioning: string;
    description: string;
    privacy: string;
    softDeletionOn: string;
    mimeType: string;
    authorId: string;
    ownerId: string;
    url: string;
    tags: string[];
    createdAt: string;
    collectionIds: string[];
    editCapabilities: string[];
    id: string;
    status: string;
    updatedAt: string;
};

export type Model = {
    id: string;
    userId: string;
    authorId: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
    parentModelId: string;
    name: string;
    type: string;
    privacy: "public" | "private";
    capabilities: string[];
    compliantModelIds: string[];
    source: string;
    status: string;
    trainingProgress: Record<string, unknown>;
    parameters: {
        rank: number;
        batchSize: number;
        conceptPrompt: string;
        maxTrainSteps: number;
        learningRate: number;
    };
    captionWords: string[];
    trainingImages: string[];
    trainingImagesNumber: number;
    tags: string[];
    collectionIds: string[];
    concepts: {
        modelId: string;
        scale: number;
    }[];
    exampleAssetIds: string[];
    thumbnail: {
        assetId: string;
        url: string;
    };
};

export type EditImageOptions =
    | RemoveImageBackgroundRequest
    | PixelateImageRequest
    | GenerateFillRequest
    | UpscaleImageRequest;

export enum EDIT_TYPES {
    REMOVE_BACKGROUND = "Remove Background",
    PIXELATE = "Pixelate",
    UPSCALE = "Upscale",
    REPLACE_MASK_AREA = "Replace Mask Area",
}

export enum IMAGE_STYLES {
    THREE_D_RENDERED = "3d-rendered",
    ANIME = "anime",
    CARTOON = "cartoon",
    COMIC = "comic",
    MINIMALIST = "minimalist",
    PHOTOGRAPHY = "photography",
    STANDARD = "standard",
}

export enum IMAGE_TYPES {
    CHARACTER = "Character",
    OBJECT = "Object",
    BACKDROP = "Backdrop",
    SKYBOX = "Skybox",
}

export enum MODEL_TYPES {
    CHARACTER = "Character",
    OBJECT = "Object",
}

export enum GENERATION_TYPES {
    TEXT_TO_IMAGE = "txt2img",
    IMAGE_TO_IMAGE = "img2img",
    IMAGE_TO_IMAGE_TEXTURE = "img2img_texture",
    TEXT_TO_IMAGE_TEXTURE = "txt2img_texture",
}

export enum SKYBOX_STYLES {
    THREE_D_CARTOON = "3d-cartoon",
    CARTOON = "cartoon",
    CINEMATIC = "cinematic",
    CLAYMATION = "claymation",
    CLOUD_SKYDOME = "cloud-skydome",
    COMIC = "comic",
    CYBERPUNK = "cyberpunk",
    ENCHANTED = "enchanted",
    FANTASY = "fantasy",
    INK = "ink",
    MANGA = "manga",
    MANGA_COLOR = "manga-color",
    NEON_TRON = "neon-tron",
    OIL_PAINTING = "oil-painting",
    PASTEL = "pastel",
    PHOTO = "photo",
    PSYCHEDELIC = "psychedelic",
    RETRO_FANTASY = "retro-fantasy",
    SCIFI_CONCEPT_ART = "scifi-concept-art",
    SPACE = "space",
    STANDARD = "standard",
    WHIMSICAL = "whimsical",
}
