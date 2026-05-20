import {Asset, AssetType} from "@stem/network/api/asset";
import {FOLDERS} from "@stem/editor-oss/context/LibrariesContext";

export type FolderAssetType = (typeof AssetType)[keyof typeof AssetType];

export type ImportableAsset = Asset & {
    importRevisionId: string;
};

export const folderToAssetTypes: Record<FOLDERS, FolderAssetType[]> = {
    [FOLDERS.STEMS]: [AssetType.Prefab],
    [FOLDERS.ASSETS_3D]: [AssetType.Animation, AssetType.Model, AssetType.Npc],
    [FOLDERS.VFX]: [AssetType.Quarks],
    [FOLDERS.MEDIA]: [AssetType.Audio, AssetType.Image, AssetType.Video],
    [FOLDERS.BEHAVIORS]: [AssetType.Behavior, AssetType.Lambda],
    [FOLDERS.SCRIPTS]: [AssetType.Script],
    [FOLDERS.FILES]: [AssetType.File],
};

export const getFolderAssetCounts = (assets: Asset[]): Record<FOLDERS, number> =>
    Object.fromEntries(
        Object.entries(folderToAssetTypes).map(([folder, assetTypes]) => [
            folder,
            assets.filter(asset => assetTypes.includes(asset.type)).length,
        ]),
    ) as Record<FOLDERS, number>;

export const getImportRevisionId = (asset: Asset): string =>
    asset.revisionId || asset.latestRelease?.revisionId || asset.headRevisionId;

export const toImportableAsset = (asset: Asset): ImportableAsset => ({
    ...asset,
    importRevisionId: getImportRevisionId(asset),
});
