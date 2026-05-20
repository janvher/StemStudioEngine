import {UploadSettings} from "./types";

export const DEFAULT_UPLOAD_SETTINGS: UploadSettings = {
    compressModel: true,
    simplifyModel: false,
    compressTextures: true,
    limitTextureSize: true,
    maxTextureSize: 1024,
    voxelize: false,
    voxelResolution: 32,
    removeHiddenFaces: true,
    lodSettings: [
        {
            vertexRetention: 80,
            textureScale: 75,
        },
        {
            vertexRetention: 50,
            textureScale: 50,
        },
        {
            vertexRetention: 30,
            textureScale: 25,
        },
    ],
};

export const MAX_POLYGON_COUNT = 20000;

export const THUMBNAIL_SIZE = 512;
