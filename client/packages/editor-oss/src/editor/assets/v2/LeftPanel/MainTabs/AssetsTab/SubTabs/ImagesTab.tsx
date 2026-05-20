import {useEffect, useMemo, useState} from "react";

import {EmptyAssetsState} from "./EmptyAssetsState";
import {AssetType} from "@stem/network/api/asset";
import global from "@stem/editor-oss/global";
import {useListEditorAssets} from "../../../../../../asset-management/hooks/assets";
import {useRemoveAssetsAndInstancesFromScene} from "../../../../../../asset-management/hooks/scene";
import {AssetsList} from "../../../../common/AssetsList";

interface ImagesTabProps {
    search: string;
}

export const ImagesTab = ({search}: ImagesTabProps) => {
    const removeAssetsAndInstancesFromScene = useRemoveAssetsAndInstancesFromScene();
    const [queryEnabled, setQueryEnabled] = useState<boolean>(true);
    const {data: assetData} = useListEditorAssets({
        types: [AssetType.Image],
        includeThumbnails: true,
        enabled: queryEnabled,
    });

    const filteredAssets = useMemo(() => {
        if (!search) return assetData?.assets;
        return assetData?.assets.filter(asset => asset.name.toLowerCase().includes(search.toLowerCase()));
    }, [assetData, search]);

    const handleClick = async () => {};

    const handleDelete = (item: {id: string; name: string}) => {
        removeAssetsAndInstancesFromScene([item.id]).catch(console.error);
    };

    useEffect(() => {
        const app = global.app!;
        app.on("generatingThumbnail.ImagesTab", () => setQueryEnabled(false));
        app.on("generatingThumbnailDone.ImagesTab", () => setQueryEnabled(true));
        return () => {
            app.on("generatingThumbnail.ImagesTab", null);
            app.on("generatingThumbnailDone.ImagesTab", null);
        };
    }, []);

    if (!filteredAssets || filteredAssets.length === 0) {
        return (
            <EmptyAssetsState
                search={search}
                label="images"
            />
        );
    }

    return (
        filteredAssets && (
            <AssetsList
                data={filteredAssets}
                onClick={handleClick}
                onDelete={handleDelete}
            />
        )
    );
};
