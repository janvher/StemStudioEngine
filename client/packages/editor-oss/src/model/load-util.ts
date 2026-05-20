import { Object3D } from 'three';

import { AssetLoader } from '../asset-management/AssetLoader';
import { AssetResolutionContext, resolveAssetId, resolveAssetRevisionId } from '../asset-management/AssetResolutionContext';
import ModelLoader from '../assets/js/loaders/ModelLoader';
import { UploadSettings } from '../editor/assets/v2/LeftPanel/MainTabs/AssetsTab/ModelUpload/types';
import global from '../global';
import { DetectDevice } from '../utils/DetectDevice';
import { getModelStats, optimizeGlbFile } from '../utils/ModelUtils';
import { hasGaussianSplatPlyMetadata } from './gaussianSplats';
import { LOD_LEVEL_DESKTOP, LOD_LEVEL_MOBILE, setModelId, setModelRevisionId } from './util';

const replaceExtension = (name: string, ext: string) => name.replace(/\.[^/.]+$/, "") + ext;

export const createLods = async (
    sourceBuffer: ArrayBuffer,
    fileName: string,
    settings: UploadSettings,
    signal: AbortSignal,
) => {
    if (!settings.lodSettings?.length) {
        return [];
    }

    const modelBuffer = sourceBuffer;
    signal.throwIfAborted();
    const lodPromises = settings.lodSettings.map(async (lodSettings, idx) => {
        if (!lodSettings) return null;
        const level = idx + 1;

        const targetReduction = lodSettings.vertexRetention / 100;

        signal.throwIfAborted();

        const optimizedBuffer = await optimizeGlbFile(modelBuffer, {
            simplifyRatio: targetReduction,
            simplifyError: 0.001,
            compressTextures: settings.compressTextures,
            maxTextureSize: settings.maxTextureSize || undefined,
            textureScale: lodSettings.textureScale / 100,
            removeMorphTargets: true,
            useMeshopt: true,
        });

        signal.throwIfAborted();

        const stats = await getModelStats(optimizedBuffer);

        return {
            level,
            file: new File([optimizedBuffer], `${replaceExtension(fileName, "")}_${level}.glb`, {
                type: "model/gltf-binary",
            }),
            vertexCount: stats.vertexCount,
            polygonCount: stats.triangleCount,
            compression: {
                vertexRetention: targetReduction,
                textureScale: lodSettings.textureScale / 100,
                method: "meshopt",
            },
        };
    });

    const results = await Promise.all(lodPromises);
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
};

export const getBestLodForPlatform = (): number => {
    return DetectDevice.isMobile() ? LOD_LEVEL_MOBILE : LOD_LEVEL_DESKTOP;
};

type LoadModelOptions = {
    priority?: number;
    preferLod?: number;
};

export const loadModel = async (
    modelId: string,
    context: AssetResolutionContext,
    options: LoadModelOptions = {},
    useDefault: boolean = false,
): Promise<Object3D> => {
    const resolvedModelId = resolveAssetId(modelId, context);
    const revisionId = useDefault ? resolvedModelId : resolveAssetRevisionId(modelId, context);
    if (!revisionId) {
        throw new Error(`Failed to resolve revision ID for model ID ${modelId}`);
    }
    const appAssetLoader = global.app?.assetLoader;
    if (!appAssetLoader) {
        // AssetLoader should always be available since we await seeding before scene load.
        // If we somehow get here, throw rather than silently making N API calls.
        throw new Error(
            `[loadModel] AssetLoader not available for model ${resolvedModelId}. ` +
            `Ensure createAssetLoader() is awaited before scene deserialization.`,
        );
    }
    return loadModelWithLoader(modelId, context, appAssetLoader, options);
};

/** Options for loading a model with an AssetLoader. */
type LoadModelWithLoaderOptions = {
    /** Loading priority for the model loader (higher = more urgent) */
    priority?: number;
    /** Override the automatic LOD level selection */
    preferLod?: number;
};

/**
 * Load a model using an AssetLoader for efficient caching.
 * This avoids redundant API calls when the asset is already cached.
 * Uses the AssetLoader to get signed CDN URLs and select the best LOD
 * derivative for the current device.
 *
 * @param modelId - The model asset ID (may be a logical ID that gets resolved)
 * @param context - Asset resolution context for mapping logical IDs to real asset/revision IDs
 * @param assetLoader - The AssetLoader instance to use for caching and URL retrieval
 * @param options - Optional loading options
 * @param options.priority - Loading priority for the model loader
 * @param options.preferLod - Override the automatic LOD level selection
 * @returns Promise resolving to the loaded Object3D with modelId and revisionId set in userData
 * @throws Error if the revision ID cannot be resolved or the model fails to load
 */
export const loadModelWithLoader = async (
    modelId: string,
    context: AssetResolutionContext,
    assetLoader: AssetLoader,
    options: LoadModelWithLoaderOptions = {},
): Promise<Object3D> => {
    const resolvedModelId = resolveAssetId(modelId, context);
    const revisionId = resolveAssetRevisionId(modelId, context);
    if (!revisionId) {
        throw new Error(`Failed to resolve revision ID for model ID ${modelId}`);
    }

    // Use the AssetLoader to get the data URL (from cache or fetch)
    const result = await assetLoader.getModelDataUrl(
        { assetId: resolvedModelId, revisionId },
        { preferLod: options.preferLod },
    );

    console.debug(
        `[loadModelWithLoader] Loading ${resolvedModelId} with LOD ${result.lodLevel ?? 'original'}`,
    );

    const loader = new ModelLoader();
    const object = await loader.load(
        result.url,
        {
            Type: result.format,
            ForceGaussianSplatPly: hasGaussianSplatPlyMetadata(result.metadata),
            DisableReupload: true,
            DisableDefaultPhysics: true,
            Priority: options.priority,
            CacheKey: `${resolvedModelId}:${revisionId}:${result.lodLevel ?? "original"}`,
        },
    );
    if (!object) {
        throw new Error(`Failed to load model ${resolvedModelId}`);
    }

    setModelId(object, modelId);
    setModelRevisionId(object, revisionId);

    return object;
};
