import {useMemo} from "react";

import {ImportableAsset, toImportableAsset} from "./folderAssetTypes";
import {ListSceneAssetsOptions, useListSceneAssets} from "../../../../asset-management/hooks/assets";

export type {ImportableAsset};

export const useListImportableSceneAssets = (sceneId: string, options: ListSceneAssetsOptions) => {
    const {data, isLoading} = useListSceneAssets(sceneId, {
        ...options,
        includeLatestRelease: true, // we need release information to determine if an asset is importable
    });

    const importableAssets: ImportableAsset[] = useMemo(() => {
        if (!data) {
            return [];
        }

        return data.assets.map(toImportableAsset);
    }, [data]);

    return useMemo(() => ({assets: importableAssets, isLoading}), [importableAssets, isLoading]);
};
