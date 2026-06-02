import {AssetType, type Asset} from "@stem/network/api/asset";

import EngineRuntime from "../../EngineRuntime";
import {CommandResult} from "../types/ACPTypes";

type SceneAssetType = typeof AssetType[keyof typeof AssetType];

type AssetSummary = {
    id: string;
    name: string;
    type: string;
    description?: string;
    tags?: string[];
    contentType?: string;
    format?: string;
    revisionId?: string;
    headRevisionId?: string;
    latestReleaseRevisionId?: string;
    hasThumbnail?: boolean;
    createTime?: string;
    updateTime?: string;
};

const ASSET_TYPE_ALIASES: Record<string, SceneAssetType[]> = {
    all: [],
    any: [],
    asset: [],
    assets: [],
    audio: [AssetType.Audio],
    behavior: [AssetType.Behavior],
    behaviors: [AssetType.Behavior],
    file: [AssetType.File],
    files: [AssetType.File],
    image: [AssetType.Image],
    images: [AssetType.Image],
    import: [AssetType.Script],
    imports: [AssetType.Script],
    lambda: [AssetType.Lambda],
    lambdas: [AssetType.Lambda],
    media: [AssetType.Audio, AssetType.Image, AssetType.Video],
    model: [AssetType.Model],
    models: [AssetType.Model],
    npc: [AssetType.Npc],
    npcs: [AssetType.Npc],
    pack: [AssetType.Behavior, AssetType.Lambda],
    packs: [AssetType.Behavior, AssetType.Lambda],
    prefab: [AssetType.Prefab],
    prefabs: [AssetType.Prefab],
    script: [AssetType.Script],
    scripts: [AssetType.Script],
    stem: [AssetType.Prefab],
    stems: [AssetType.Prefab],
    video: [AssetType.Video],
    videos: [AssetType.Video],
    vfx: [AssetType.Quarks],
};

export class AssetHandlers {
    constructor(private engine: EngineRuntime) {}

    async handleListSceneAssets({
        filter,
        limit,
        type,
    }: {
        filter?: string;
        limit?: number;
        type?: string;
    }): Promise<CommandResult> {
        try {
            const assetSource = this.engine.editor?.assetSource;
            if (!assetSource) {
                return {
                    status: "failed",
                    message: "No active editing context (scene or stem) available",
                    data: {assets: []},
                };
            }

            const types = resolveAssetTypes(type);
            const response = await assetSource.getAssets({
                types,
                includeLatestRelease: true,
                includeThumbnails: true,
            });
            let assets = response?.assets ?? [];

            const normalizedFilter = filter?.trim().toLowerCase();
            if (normalizedFilter && normalizedFilter !== "*") {
                assets = assets.filter(asset => {
                    const haystack = [
                        asset.id,
                        asset.name,
                        asset.description,
                        asset.type,
                        ...(asset.tags ?? []),
                    ].filter(Boolean).join(" ").toLowerCase();
                    return haystack.includes(normalizedFilter);
                });
            }

            const normalizedLimit = clampLimit(limit);
            const summarized = assets.slice(0, normalizedLimit).map(summarizeAsset);

            return {
                status: "success",
                message: `Retrieved ${summarized.length}/${assets.length} scene asset(s)`,
                data: {
                    assetSource: {kind: assetSource.kind, id: assetSource.id},
                    typeFilter: type || "all",
                    total: assets.length,
                    returned: summarized.length,
                    assets: summarized,
                },
            };
        } catch (error) {
            return {
                status: "failed",
                message: `Error listing scene assets: ${error instanceof Error ? error.message : String(error)}`,
                data: {assets: []},
            };
        }
    }

    async handleGetSceneAsset({
        assetId,
        name,
        type,
    }: {
        assetId?: string;
        name?: string;
        type?: string;
    }): Promise<CommandResult> {
        try {
            const target = assetId?.trim() || name?.trim();
            if (!target) {
                return {status: "failed", message: "No assetId or name provided", data: null};
            }

            const assetSource = this.engine.editor?.assetSource;
            if (!assetSource) {
                return {
                    status: "failed",
                    message: "No active editing context (scene or stem) available",
                    data: null,
                };
            }

            const types = resolveAssetTypes(type);
            const response = await assetSource.getAssets({
                types,
                includeLatestRelease: true,
                includeThumbnails: true,
            });
            const asset = findAsset(response?.assets ?? [], target);

            if (!asset) {
                return {
                    status: "failed",
                    message: `Scene asset "${target}" not found`,
                    data: null,
                };
            }

            return {
                status: "success",
                message: `Retrieved scene asset ${asset.name} (${asset.id})`,
                data: {
                    assetSource: {kind: assetSource.kind, id: assetSource.id},
                    asset: summarizeAsset(asset),
                },
            };
        } catch (error) {
            return {
                status: "failed",
                message: `Error getting scene asset: ${error instanceof Error ? error.message : String(error)}`,
                data: null,
            };
        }
    }
}

function resolveAssetTypes(type: string | undefined): SceneAssetType[] | undefined {
    if (!type?.trim()) return undefined;
    const types = type
        .split(",")
        .flatMap(part => ASSET_TYPE_ALIASES[part.trim().toLowerCase()] ?? [])
        .filter((item, index, array) => array.indexOf(item) === index);
    return types.length > 0 ? types : undefined;
}

function clampLimit(limit: number | undefined): number {
    if (!Number.isFinite(limit)) return 80;
    return Math.max(1, Math.min(200, Math.floor(limit!)));
}

function findAsset(assets: Asset[], target: string): Asset | undefined {
    const normalized = target.toLowerCase();
    return assets.find(asset =>
        asset.id === target ||
        asset.headRevisionId === target ||
        asset.revisionId === target ||
        asset.name === target ||
        asset.name?.toLowerCase() === normalized);
}

function summarizeAsset(asset: Asset): AssetSummary {
    const summary: AssetSummary = {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        revisionId: asset.revisionId,
        headRevisionId: asset.headRevisionId,
        latestReleaseRevisionId: asset.latestRelease?.revisionId,
        hasThumbnail: Boolean(asset.thumbnailUrl),
    };

    if (asset.description) summary.description = compactText(asset.description);
    if (asset.tags?.length) summary.tags = asset.tags.slice(0, 12);
    if (asset.contentType) summary.contentType = asset.contentType;
    if (asset.format) summary.format = asset.format;
    if (asset.createTime) summary.createTime = asset.createTime;
    if (asset.updateTime) summary.updateTime = asset.updateTime;

    return summary;
}

function compactText(value: string, maxLength = 220): string {
    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
}
