import React, {useEffect} from "react";

import {CardBadges} from "./CardBadges/CardBadges";
import {CardMenu} from "./CardMenu/CardMenu";
import {LibraryCardBottom} from "./LibraryCardBottom";
import {AssetName, Bottom, DefaultImageWrapper, StyledCard} from "./StemCard.style";
import {DomainAssetDto} from "@stem/network/api/client/api";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {resolveAssetRevisionId} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {useAuthorizationContext, useLibrariesContext} from "@stem/editor-oss/context";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import global from "@stem/editor-oss/global";
import {useAddPrefabToScene} from "../../../../prefabs/hooks/prefabs";
import {SelectBox} from "../../AssetsLibrary/FoldersView/AssetCard/AssetCard.style";
import {getItemStatus} from "../../AssetsLibrary/services";
import prefabIcon from "../../icons/assetsTab/prefabs/prefab-placeholder.svg";
import {TagsList} from "../Tags/TagsList/TagsList";

interface Props {
    stem: DomainAssetDto;
    libraryView?: boolean;
}

export const StemCard = ({stem, libraryView}: Props) => {
    const addPrefabToScene = useAddPrefabToScene();
    const app = global.app as EngineRuntime;
    const {dbUser, isCollaborator, isAdmin} = useAuthorizationContext();
    const {setAssetsToAdd, assetsToAdd, allAssetsSelected, setAllAssetsSelected} = useLibrariesContext();
    const {context} = useAssetResolutionContext();
    const currentRevisionID = resolveAssetRevisionId(stem.id, context);

    const status = getItemStatus(stem, dbUser, isCollaborator);
    const selected = assetsToAdd.some(a => a.id === stem.id) || allAssetsSelected;

    const handleSelect = () => {
        if (selected && allAssetsSelected) {
            setAllAssetsSelected(false);
        }
        setAssetsToAdd(prev =>
            prev.some(a => a.id === stem.id) ? prev.filter(a => a.id !== stem.id) : [...prev, stem],
        );
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData("asset-id", stem.id);
        e.dataTransfer.setData("asset-type", "prefab");
    };

    useEffect(() => {
        app?.on(`dragEnd.PrefabsTab`, (type: string, id: string, position: any) => {
            if (type === "prefab") {
                addPrefabToScene(id, position).catch(console.error);
            }
        });
        return () => {
            app?.on(`dragEnd.PrefabsTab`, null);
        };
    }, [addPrefabToScene]);

    const thumbnail = stem.thumbnailUrl;
    const isOutdated = stem.headRevisionId !== currentRevisionID;

    return (
        <StyledCard draggable
            onDragStart={handleDragStart}
            $isHidden={isAdmin && stem.moderationStatus === "hidden"}
        >
            {libraryView && <SelectBox $selected={selected}
                onClick={handleSelect}
                style={{left: "4px"}}
                            />}
            <CardBadges status={status}
                isOutdated={isOutdated}
            />
            <DefaultImageWrapper>
                <img
                    className={thumbnail ? "stemThumbnail" : "placeholderImage"}
                    src={thumbnail || prefabIcon}
                    alt=""
                    onError={e => {
                        e.currentTarget.src = prefabIcon;
                    }}
                />
            </DefaultImageWrapper>
            <AssetName>
                <div className="text">{stem.name}</div>
            </AssetName>
            <Bottom>
                {!libraryView && 
                    <TagsList stemTags={stem.tags?.slice(0, 2) || []}
                        fullWidth={!!libraryView}
                        readOnly
                    />
                }
                {libraryView ? 
                    <LibraryCardBottom asset={stem}
                        thumbnail={thumbnail || prefabIcon}
                        defaultIcon={!thumbnail}
                    />
                 : 
                    <CardMenu
                        status={status}
                        stem={stem}
                        thumbnail={thumbnail || prefabIcon}
                        isDefaultThumbnail={!thumbnail}
                    />
                }
            </Bottom>
        </StyledCard>
    );
};
