import {useEffect, useState} from "react";

import {EmptyAssetsState} from "./EmptyAssetsState";
import {AssetType, getAssetDerivatives, getAssetRevision} from "@stem/network/api/asset";
import {useAppGlobalContext} from "@stem/editor-oss/context";
import {RIGHT_PANEL_VERSIONS} from "@stem/editor-oss/context/appStateTypes";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {useListEditorAssets, useUpdateAsset} from "../../../../../../asset-management/hooks/assets";
import {useRemoveAssetsAndInstancesFromScene} from "../../../../../../asset-management/hooks/scene";
import {AssetsList, AssetItem} from "../../../../common/AssetsList";
import {MediaPlayerDialog} from "../../../../common/MediaPlayerDialog";
import {showRenameModal} from "../../../../VFXEditor/showRenameModal";

interface Props {
    search: string;
}

export const SoundsTab = ({search}: Props) => {
    const {activeRightPanel, setActiveRightPanel} = useAppGlobalContext();
    const [filteredData, setFilteredData] = useState<AssetItem[]>();
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);
    const [playerUrl, setPlayerUrl] = useState("");
    const [playerName, setPlayerName] = useState("");
    const [currentlyPlayingSoundId, setCurrentlyPlayingSoundId] = useState<string | null>(null);
    const updateAsset = useUpdateAsset();

    const removeAssetsAndInstancesFromScene = useRemoveAssetsAndInstancesFromScene();
    const {data: soundsData, isLoading} = useListEditorAssets({types: [AssetType.Audio], includeThumbnails: true});
    const sounds = soundsData?.assets;

    const saveNewName = async (e: React.MouseEvent<HTMLElement, MouseEvent>, args: {id: string; name: string}) => {
        e.stopPropagation();
        const {id, name} = args;
        let soundName = name;

        const newName = await showRenameModal(soundName);
        if (!newName) return;
        soundName = newName;
        await updateAsset.mutateAsync({
            assetId: id,
            name: newName,
        });
        const isSoundPanelOpen = activeRightPanel === RIGHT_PANEL_VERSIONS.GenericSound;
        if (isSoundPanelOpen) {
            setActiveRightPanel(RIGHT_PANEL_VERSIONS.None);
            requestAnimationFrame(() => setActiveRightPanel(RIGHT_PANEL_VERSIONS.GenericSound));
        }
    };

    const closePlayer = () => {
        setIsPlayerOpen(false);
        setCurrentlyPlayingSoundId(null);
    };

    const handleClick = async (id: string) => {
        const obj = sounds?.find(item => item.id === id);
        if (obj) {
            global.app?.call(`selectAudio`, obj, obj);
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
                    showToast({type: "error", title: "Invalid sound url"});
                    return;
                }
                setCurrentlyPlayingSoundId(id);
                setPlayerUrl(url);
                setPlayerName(obj.name);
                setIsPlayerOpen(true);
            } catch (error) {
                showToast({type: "error", body: "Failed to load sound. Please try again later."});
                console.error("Sound load error:", error);
            }
        }
    };

    const handleDelete = (args: {id: string; name: string}) => {
        removeAssetsAndInstancesFromScene([args.id]).catch(console.error);
    };

    useEffect(() => {
        if (!search) {
            setFilteredData(sounds);
            return;
        } else {
            setFilteredData(
                sounds?.filter(n => {
                    return n.name.toLowerCase().indexOf(search.toLowerCase()) > -1;
                }),
            );
        }
    }, [search, sounds]);

    if (isLoading) {
        return <div>Loading sounds...</div>;
    }

    if (!filteredData || filteredData.length === 0) {
        return (
            <EmptyAssetsState
                search={search}
                label="sounds"
            />
        );
    }

    return (
        <>
            {filteredData && (
                <AssetsList
                    data={filteredData}
                    onClick={handleClick}
                    isSound
                    onDelete={handleDelete}
                    currentlyPlayingSoundId={currentlyPlayingSoundId}
                    onEditName={saveNewName}
                />
            )}
            <MediaPlayerDialog
                isOpen={isPlayerOpen}
                onClose={closePlayer}
                url={playerUrl}
                name={playerName}
                type="audio"
            />
        </>
    );
};
