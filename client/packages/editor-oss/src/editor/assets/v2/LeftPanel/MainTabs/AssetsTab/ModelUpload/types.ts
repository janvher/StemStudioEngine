import type {AssetSource} from "../../../../../../asset-management/AssetSource";

export enum LodLevel {
    Original = 0,
    Lod1 = 1,
    Lod2 = 2,
    Lod3 = 3,
}

export type LodSettings = {
    vertexRetention: number;
    textureScale: number;
};

export type UploadSettings = {
    compressModel?: boolean;
    simplifyModel?: boolean;
    compressTextures?: boolean;
    limitTextureSize?: boolean;
    maxTextureSize?: number;
    isHumanoid?: boolean;
    voxelize?: boolean;
    voxelResolution?: number;
    removeHiddenFaces?: boolean;
    assetSource?: AssetSource;
    /**
     * If updateModelId is set, a new revision will be created for the model
     * asset instead of creating a new model asset.
     */
    updateModelId?: string;
    thumbnailFile?: File;
    lodSettings: LodSettings[];
    /** Generate texture atlas from multiple textures */
    generateAtlas?: boolean;
    /** Maximum atlas texture size in pixels (default 4096) */
    atlasMaxSize?: number;
};
