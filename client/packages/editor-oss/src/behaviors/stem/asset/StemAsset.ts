import { Texture } from 'three';

import { Asset, AssetDerivative, AssetRelease } from '@stem/network/api/asset';
import { DomainAssetType } from '@stem/network/api/client/api';
import { AssetRef } from '@stem/editor-oss/asset-management/AssetRef';
import { GameObject } from '../core/GameObject';

/**
 * 3D model asset operations: loading, instancing, and lookup.
 */
export interface StemAssetModel {
    /**
     * Create a new model asset from an external URL.
     *
     * @param params - URL, name, format, and content type for the new asset
     * @returns The created asset metadata
     */
    createFromUrl(params: CreateFromUrlParams): Promise<Asset>;

    /**
     * Preload a model asset into cache for faster instancing later.
     *
     * @param assetRef - The asset reference (assetId + revisionId) to preload
     */
    preload(assetRef: AssetRef): Promise<void>;

    /**
     * Create a new instance of a model asset in the scene.
     * 
     * @example
     * ```typescript
     * this.erth.asset.model.createInstance(this.attributes.myModel).then((model) => {
     *     this.erth.scene.addObject(model);
     * });
     * ```
     *
     * @param assetRef - The asset reference to instantiate
     * @returns A GameObject wrapping the loaded 3D model
     */
    createInstance(assetRef: AssetRef): Promise<GameObject>;

    /**
     * Unload a model asset from cache, freeing memory.
     *
     * @param assetRef - The asset reference to unload
     */
    unload(assetRef: AssetRef): void;

    /**
     * Find a model asset by name among the scene's assets.
     *
     * @param name - The asset name to search for
     * @returns The matching asset reference, or null if not found
     */
    findByName(name: string): Promise<AssetRef | null>;
}

/**
 * Image asset operations: textures, URLs, and lookup.
 */
export interface StemAssetImage {
    /**
     * Load a texture from an image asset.
     * 
     * @remarks
     * Textures are cached and reused across behaviors.
     *
     * @example
     * ```typescript
     * this.erth.asset.image.createTexture(this.attributes.myImage).then((texture) => {
     *     this.material.map = texture;
     * });
     * ```
     *
     * @param assetRef - The image asset reference
     * @returns A Three.js Texture loaded from the image
     */
    createTexture(assetRef: AssetRef): Promise<Texture>;

    /**
     * Find an image asset by name among the scene's assets.
     *
     * @param name - The asset name to search for
     * @returns The matching asset reference, or null if not found
     */
    findByName(name: string): Promise<AssetRef | null>;

    /**
     * Get the most appropriate URL for an image asset (using derivatives when available).
     *
     * @param assetRef - The image asset reference
     * @returns A signed URL for the image data
     */
    getUrl(assetRef: AssetRef): Promise<string>;
}

/**
 * Audio asset operations: URLs and lookup.
 */
export interface StemAssetAudio {
    /**
     * Get the most appropriate URL for an audio asset (using derivatives when available).
     *
     * @param assetRef - The audio asset reference
     * @returns A signed URL for the audio data
     */
    getUrl(assetRef: AssetRef): Promise<string>;

    /**
     * Get a signed URL for an audio asset by name.
     *
     * @param name - The asset name to search for
     * @returns A signed URL for the audio data
     */
    getUrlByName(name: string): Promise<string>;

    /**
     * Find an audio asset by name among the scene's assets.
     *
     * @param name - The asset name to search for
     * @returns The matching asset reference, or null if not found
     */
    findByName(name: string): Promise<AssetRef | null>;
}

/**
 * Video asset operations: URLs and lookup.
 */
export interface StemAssetVideo {
    /**
     * Get the most appropriate URL for a video asset (using derivatives when available).
     *
     * @param assetRef - The video asset reference
     * @returns A signed URL for the video data
     */
    getUrl(assetRef: AssetRef): Promise<string>;

    /**
     * Get a signed URL for a video asset by name.
     *
     * @param name - The asset name to search for
     * @returns A signed URL for the video data
     */
    getUrlByName(name: string): Promise<string>;

    /**
     * Find a video asset by name among the scene's assets.
     *
     * @param name - The asset name to search for
     * @returns The matching asset reference, or null if not found
     */
    findByName(name: string): Promise<AssetRef | null>;
}

/**
 * Script asset operations: URLs (for Web Worker / dynamic-import use) and lookup.
 *
 * Script assets are normally consumed by behaviors via the `@import` directive,
 * which evaluates the source inside the behavior compartment. When a behavior
 * needs the source as a *URL* — for example to construct a Web Worker via
 * `new Worker(url)` — use `getUrl(ref)` to receive a Blob URL pointing at the
 * script body with `@import` directives stripped (since they are not valid JS
 * outside the behavior runtime).
 *
 * @example
 * ```typescript
 * const ref = await this.erth.asset.script.findByName("myWorker");
 * const url = await this.erth.asset.script.getUrl(ref);
 * const worker = new Worker(url);
 * ```
 */
export interface StemAssetScript {
    /**
     * Get a Blob URL containing the script asset's source. `@import` directives
     * are stripped (they are behavior-runtime sugar and would be syntax errors
     * in a worker realm). Cached by `(assetId, revisionId)` so repeat calls
     * return the same URL.
     *
     * @param assetRef - The script asset reference
     * @returns A `blob:` URL the caller can pass to `new Worker(url)` etc.
     */
    getUrl(assetRef: AssetRef): Promise<string>;

    /**
     * Resolve a script asset by name and return its Blob URL in one call.
     *
     * @param name - The asset name to search for
     * @returns A `blob:` URL for the script body
     */
    getUrlByName(name: string): Promise<string>;

    /**
     * Find a script asset by name among the scene's assets.
     *
     * @param name - The asset name to search for
     * @returns The matching asset reference, or null if not found
     */
    findByName(name: string): Promise<AssetRef | null>;
}

/**
 * Generic file asset operations: URLs and lookup.
 */
export interface StemAssetFile {
    /**
     * Get a signed URL for a file asset.
     *
     * @param assetRef - The file asset reference
     * @returns A signed URL for the file data
     */
    getUrl(assetRef: AssetRef): Promise<string>;

    /**
     * Get a signed URL for a file asset by name.
     *
     * @param name - The asset name to search for
     * @returns A signed URL for the file data
     */
    getUrlByName(name: string): Promise<string>;

    /**
     * Find a file asset by name among the scene's assets.
     *
     * @param name - The asset name to search for
     * @returns The matching asset reference, or null if not found
     */
    findByName(name: string): Promise<AssetRef | null>;
}

/**
 * Stem (prefab) asset operations: loading, instancing, and lookup.
 */
export interface StemAssetStem {
    /**
     * Preload a stem asset into cache for faster instancing later.
     *
     * @param assetRef - The stem asset reference to preload
     */
    preload(assetRef: AssetRef): Promise<void>;

    /**
     * Create a new instance of a stem asset in the scene.
     * 
     * @example
     * ```typescript
     * this.erth.asset.stem.createInstance(this.attributes.myStem).then((stem) => {
     *     this.erth.scene.addObject(stem);
     * });
     * ```
     *
     * @param assetRef - The stem asset reference to instantiate
     * @returns A GameObject wrapping the instantiated stem
     */
    createInstance(assetRef: AssetRef): Promise<GameObject>;

    /**
     * Unload a stem asset from cache, freeing memory.
     *
     * @param assetRef - The stem asset reference to unload
     */
    unload(assetRef: AssetRef): void;

    /**
     * Find a stem asset by name among the scene's assets.
     *
     * @param name - The asset name to search for
     * @returns The matching asset reference, or null if not found
     */
    findByName(name: string): Promise<AssetRef | null>;
}

/** Parameters for fetching asset derivatives. */
export interface AssetDerivativesParams {
    /** The asset ID. */
    assetId: string;
    /** The revision ID. */
    revisionId: string;
}

/** Parameters for creating an asset from an external URL. */
export interface CreateFromUrlParams {
    /** Display name for the asset. */
    name: string;
    /** Optional description of the asset. */
    description?: string;
    /** File format (e.g., "glb", "png"). */
    format: string;
    /** MIME content type (e.g., "model/gltf-binary"). */
    contentType: string;
    /** URL to download the asset data from. */
    url: string;
}

/** Parameters for creating a published release of an asset. */
export interface CreateAssetReleaseParams {
    /** The asset ID to release. */
    assetId: string;
    /** The revision ID to release. */
    revisionId: string;
    /** Semantic version for the release. */
    version: {
        major: number;
        minor: number;
        patch: number;
    };
    /** Human-readable release description. */
    description: string;
}

/** Options for filtering the current user's assets. */
export interface GetMyAssetsOptions {
    /** Filter by asset types. */
    types?: DomainAssetType[];
    /** Include the latest release info for each asset. */
    includeLatestRelease?: boolean;
}

/**
 * Asset management subsystem: CRUD, derivatives, releases, and
 * type-specific sub-interfaces for models, images, audio, video, and stems.
 */
export interface StemAsset {
    /**
     * Create a published release for an asset revision.
     *
     * @param params - Asset ID, revision ID, version, and description
     * @returns The created release metadata
     */
    createAssetRelease(params: CreateAssetReleaseParams): Promise<AssetRelease>;

    /**
     * Get all derivatives (LODs, thumbnails, etc.) for an asset revision.
     *
     * @param params - Asset ID and revision ID to query
     * @returns Array of derivative metadata
     */
    getAssetDerivatives(params: AssetDerivativesParams): Promise<AssetDerivative[]>;

    /**
     * Get all assets owned by the current user.
     *
     * @param options - Optional filters (types, include releases)
     * @returns Array of the user's assets
     */
    getMyAssets(options?: GetMyAssetsOptions): Promise<Asset[]>;

    /** 3D model asset operations. */
    model: StemAssetModel;
    /** Image asset operations. */
    image: StemAssetImage;
    /** Audio asset operations. */
    audio: StemAssetAudio;
    /** Video asset operations. */
    video: StemAssetVideo;
    /** Stem (prefab) asset operations. */
    stem: StemAssetStem;
    /** Generic file asset operations. */
    file: StemAssetFile;
    /** Script asset operations (URLs for Worker construction + lookup). */
    script: StemAssetScript;
}
