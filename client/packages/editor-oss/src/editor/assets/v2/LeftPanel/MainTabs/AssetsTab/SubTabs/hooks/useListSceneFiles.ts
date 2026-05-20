import {AssetType} from "@stem/network/api/asset";
import {useListSceneAssets} from "../../../../../../../asset-management/hooks/assets";

export const useListSceneFiles = (sceneId: string) => {
    const {data, isLoading} = useListSceneAssets(sceneId, {
        types: [AssetType.File],
    });

    return {assets: data?.assets, isLoading};
};
