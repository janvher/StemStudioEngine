import {useMemo} from "react";

import {AssetType} from "@stem/network/api/asset";
import {useListEditorAssets} from "../../../../../../../asset-management/hooks/assets";

export type NpcData = {
    ID: string;
    Name: string;
    Type: string;
    Thumbnail?: string;
    CreateTime: string;
    UpdateTime: string;
    UserID: string;
    headRevisionId: string;
    NewApi: boolean;
};

export const useListEditorNpcs = () => {
    const {data, isLoading} = useListEditorAssets({
        types: [AssetType.Npc],
        includeThumbnails: true,
    });

    const assets = useMemo<NpcData[]>(() => {
        return (data?.assets || []).map((npc) => ({
            ID: npc.id,
            Name: npc.name,
            Type: npc.type || "npc",
            Thumbnail: npc.thumbnailUrl,
            CreateTime: npc.createTime,
            UpdateTime: npc.updateTime,
            UserID: npc.userId || "",
            headRevisionId: npc.headRevisionId,
            NewApi: true,
        }));
    }, [data?.assets]);

    return {assets, isLoading};
};
