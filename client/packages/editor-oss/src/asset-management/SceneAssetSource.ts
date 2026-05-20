import {
    type Asset,
    type AssetRevision,
    type CreateAssetRevisionWithDataParams,
    type CreateAssetWithDataParams,
    createAssetRevisionWithData as rawCreateAssetRevisionWithData,
    getSceneAssets,
} from "@stem/network/api/asset";
import type {DomainAssetType} from "@stem/network/api/client/api";
import {createSceneAssetWithData as rawCreateSceneAssetWithData, removeAssetsFromScene, updateSceneDependencies} from "@stem/network/api/scene/v2";
import {
    getAssetResolutionContext,
    removeAssetRevision as removeAssetRevisionOnObject,
    setAssetRevision as setAssetRevisionOnObject,
} from "./AssetResolutionContext";
import global from "../global";

export type AssetSourceResponse = {
    assets: Asset[];
};

export type AssetSourceQueryOptions = {
    types?: DomainAssetType[];
    includeDerivatives?: boolean;
    includeDerivativeDataUrl?: boolean;
    includeLatestRelease?: boolean;
    includeThumbnails?: boolean;
};

export interface AssetSource {
    readonly kind: "scene" | "stem";
    readonly id: string;
    getAssets(options?: AssetSourceQueryOptions): Promise<AssetSourceResponse>;
    addDependencies(dependencies: Record<string, string>): Promise<void>;
    removeDependencies(assetIds: string[]): Promise<void>;
    createAsset(params: CreateAssetWithDataParams): Promise<Asset>;
    createAssetRevision(params: CreateAssetRevisionWithDataParams): Promise<AssetRevision>;
}

export class SceneAssetSource implements AssetSource {
    readonly kind = "scene" as const;

    constructor(readonly id: string) {}

    async getAssets(options?: AssetSourceQueryOptions): Promise<AssetSourceResponse> {
        return getSceneAssets(this.id, options);
    }

    async addDependencies(dependencies: Record<string, string>): Promise<void> {
        const scene = global.app?.scene;
        const existing = scene ? (getAssetResolutionContext(scene)?.assetIdToRevisionId || {}) : {};
        const merged = {...existing, ...dependencies};
        await updateSceneDependencies(this.id, merged);

        if (scene) {
            for (const [assetId, revisionId] of Object.entries(dependencies)) {
                setAssetRevisionOnObject(scene, assetId, revisionId);
            }
            global.app?.call("objectChanged", null, scene);
        }
    }

    async removeDependencies(assetIds: string[]): Promise<void> {
        await removeAssetsFromScene(this.id, assetIds);

        const scene = global.app?.scene;
        if (scene) {
            for (const assetId of assetIds) {
                removeAssetRevisionOnObject(scene, assetId);
            }
            global.app?.call("objectChanged", null, scene);
        }
    }

    async createAsset(params: CreateAssetWithDataParams): Promise<Asset> {
        const asset = await rawCreateSceneAssetWithData({...params, sceneId: this.id});

        const scene = global.app?.scene;
        if (scene) {
            setAssetRevisionOnObject(scene, asset.id, asset.headRevisionId);
            global.app?.call("objectChanged", null, scene);
        }

        return asset;
    }

    async createAssetRevision(params: CreateAssetRevisionWithDataParams): Promise<AssetRevision> {
        return rawCreateAssetRevisionWithData(params);
    }
}
