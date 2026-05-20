import {Scene} from "three";

import {getAssetResolutionContext, resolveAssetRevisionId} from "@web-shared/asset-management/AssetResolutionContext";
import type {LambdaConfig} from "@web-shared/lambdas/Lambda";
import {
    AssetType,
    getAssetRevisionData,
    GetAssetRevisionDataOptions,
    getSceneAssets,
} from "../asset";

export type LambdaBackendData = {
    ID: string;
    RevisionID: string;
    Config: LambdaConfig;
    Code: string;
};

export const getLambdaRevisionData = async (
    id: string,
    revisionId: string,
    options?: GetAssetRevisionDataOptions,
): Promise<{config: LambdaConfig; code: string}> => {
    const data = await getAssetRevisionData(id, revisionId, "json", options);
    const parsedConfig = JSON.parse(data.config);
    const resolvedId = parsedConfig.id || id;
    console.log(`[Lambda] Loading revision for asset "${id}": config.id="${parsedConfig.id}", resolved="${resolvedId}"`);
    return {
        config: {
            ...parsedConfig,
            // Use the lambda's own id from config (e.g. "handle.name"),
            // falling back to asset id only if config has no id
            id: resolvedId,
        },
        code: data.code,
    };
};

/**
 * Load lambda configs and code from a pre-fetched list of lambda assets.
 *
 * @param lambdaAssets - The lambda assets to load (must already be filtered to type Lambda)
 * @param scene - The scene whose AssetResolutionContext determines which revision to load
 * @returns Parsed lambda data ready for registry registration
 */
export const getLambdasFromAssets = async (
    lambdaAssets: {id: string}[],
    scene: Scene,
): Promise<LambdaBackendData[]> => {
    const context = getAssetResolutionContext(scene);
    if (!context) return [];

    const lambdaData = await Promise.all(
        lambdaAssets.map(async asset => {
            const revisionId = resolveAssetRevisionId(asset.id, context);
            if (!revisionId) {
                console.warn(`[Lambda] No revision found for lambda ${asset.id}`);
                return null;
            }
            const {config, code} = await getLambdaRevisionData(asset.id, revisionId);
            return {
                ID: asset.id,
                RevisionID: revisionId,
                Config: config,
                Code: code,
            };
        }),
    );

    return lambdaData.filter((data): data is LambdaBackendData => data !== null);
};

export const getLambdasListForScene = async (
    sceneId: string,
    scene: Scene,
): Promise<LambdaBackendData[]> => {
    const {assets: lambdaAssets} = await getSceneAssets(sceneId, {
        types: [AssetType.Lambda],
    });
    return getLambdasFromAssets(lambdaAssets, scene);
};
