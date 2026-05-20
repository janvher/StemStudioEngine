import {useEffect, useState} from "react";

import {EmptyAssetsState} from "./EmptyAssetsState";
import {AssetType, getAssetDerivatives, getAssetRevision} from "@stem/network/api/asset";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {useListEditorAssets} from "../../../../../../asset-management/hooks/assets";
import {useRemoveAssetsAndInstancesFromScene} from "../../../../../../asset-management/hooks/scene";
import {AssetsList, AssetItem} from "../../../../common/AssetsList";
import {MediaPlayerDialog} from "../../../../common/MediaPlayerDialog";

interface Props {
    search: string;
}

export const VideosTab = ({search}: Props) => {
    const app = (global as any).app;
    const [filteredData, setFilteredData] = useState<AssetItem[]>();
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);
    const [playerUrl, setPlayerUrl] = useState("");
    const [playerName, setPlayerName] = useState("");

    const removeAssetsAndInstancesFromScene = useRemoveAssetsAndInstancesFromScene();
    const {data: videosData, isLoading} = useListEditorAssets({types: [AssetType.Video], includeThumbnails: true});
    const videos = videosData?.assets;

    const handleClick = async (id: string) => {
        const obj = videos?.find(item => item.id === id);
        if (obj) {
            app.call(`selectVideo`, obj, obj);
            try {
                const derivatives = await getAssetDerivatives(obj.id, obj.headRevisionId, {
                    includeDataUrl: true,
                });
                let url = derivatives[0]?.dataUrl || "";
                if (!url) {
                    const revision = await getAssetRevision(obj.id, obj.headRevisionId, {includeDataUrl: true});
                    url = revision?.dataUrl || "";
                }
                if (!url) {
                    showToast({type: "error", title: "Invalid video url"});
                    return;
                }
                setPlayerUrl(url);
                setPlayerName(obj.name);
                setIsPlayerOpen(true);
            } catch (error) {
                showToast({type: "error", body: "Failed to load video. Please try again later."});
                console.error("Video load error:", error);
            }
        }
    };

    const handleDelete = (args: {id: string; name: string}) => {
        removeAssetsAndInstancesFromScene([args.id]).catch(console.error);
    };

    useEffect(() => {
        if (!search) {
            setFilteredData(videos);
            return;
        } else {
            setFilteredData(
                videos?.filter(n => {
                    return n.name.toLowerCase().indexOf(search.toLowerCase()) > -1;
                }),
            );
        }
    }, [search, videos]);

    if (isLoading) {
        return <div>Loading videos...</div>;
    }

    if (!filteredData || filteredData.length === 0) {
        return (
            <EmptyAssetsState
                search={search}
                label="video assets"
            />
        );
    }

    return (
        <>
            {filteredData && (
                <AssetsList
                    data={filteredData}
                    onClick={handleClick}
                    onDelete={handleDelete}
                />
            )}
            <MediaPlayerDialog
                isOpen={isPlayerOpen}
                onClose={() => setIsPlayerOpen(false)}
                url={playerUrl}
                name={playerName}
                type="video"
            />
        </>
    );
};
