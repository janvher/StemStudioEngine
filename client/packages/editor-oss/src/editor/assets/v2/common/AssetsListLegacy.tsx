 
import classNames from "classnames";
import {debounce} from "lodash";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {useOnClickOutside} from "usehooks-ts";

import {SoundIcon} from "./SoundIcon";
import {backendUrlFromPath} from "@stem/editor-oss/utils/UrlUtils";
import defaultAssetIcon from "../icons/default-asset-icon.svg";
import deleteIcon from "../icons/delete-icon-new.svg";
import editIcon from "../icons/edit-icon.svg";
import plusIcon from "../icons/plus-icon.svg";
import sceneDefaultImage from "../icons/scene-default.png";
import "./css/AssetsList.css";
import {useCanEditAsset} from "./hooks/useCanEditAsset";
import {StyledSoundImageWrapper} from "../LeftPanel/MainTabs/AssetsTab/AssetsTab.style";

export type AssetItem = {
    ID: string;
    Name: string;
    Type: string;
    UserId?: string;
    Thumbnail?: string;
    IsAvatar?: boolean;
    NewApi?: boolean;
};

type Props = {
    data: AssetItem[];
    onClick: (id: string) => void;
    selectedItemsIds?: string[];
    onDelete?: (arg: AssetItem) => void;
    onReplace?: (args: {ID: string; Name: string}) => void;
    className?: string;
    maxHeight?: string;
    onEmptyAssetClick?: () => void;
    isScene?: boolean;
    isSound?: boolean;
    is3DModel?: boolean;
    currentlyPlayingSoundId?: string | null;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
};

const AssetsListItemComponent = ({
    onClick,
    onDelete,
    onReplace,
    selectedItemsIds,
    item,
    isScene,
    isSound,
    currentlyPlayingSoundId,
    draggable,
    onDragStart,
}: Partial<Props> & {item: AssetItem}) => {
    const isSelected = selectedItemsIds?.includes(item.ID);
    const [, setIsMenuOpen] = useState(false);
    const ref = useRef(null);
    useOnClickOutside(ref as any, () => setIsMenuOpen(false));
    const {canEdit} = useCanEditAsset({
        assetOwnerId: item.UserId,
    });

    const debouncedOnClick = useCallback(
        debounce((id: string) => {
            if (onClick) onClick(id);
        }, 200),
        [onClick],
    );

    useEffect(() => {
        return () => {
            debouncedOnClick.cancel();
        };
    }, [debouncedOnClick]);

    const handleDelete = (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
        e.stopPropagation();
        onDelete?.(item);
    };

    const handleReplace = (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
        e.stopPropagation();
        onReplace?.({ID: item.ID, Name: item.Name});
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        if (draggable) {
            onDragStart?.(e, item.ID);
        }
    };

    const trimSceneName = (name: string) => {
        const allowedLength = 60;
        return name.length > allowedLength ? name.substring(0, allowedLength) + "..." : name;
    };

    return (
        <div
            className={classNames("assets-item", isSelected ? "selected" : "")}
            onClick={() => debouncedOnClick(item.ID)}
            draggable={!!draggable}
            onDragStart={handleDragStart}
            onContextMenu={onReplace ? () => setIsMenuOpen(true) : () => undefined}>
            {isSelected && <div className="select-border" />}
            {!isSound && !isScene && (
                <img
                    src={
                        item.Thumbnail
                            ? item.Thumbnail.includes("data:image") || item.Thumbnail.includes("src/editor")
                                ? item.Thumbnail
                                : backendUrlFromPath(item.Thumbnail)
                            : sceneDefaultImage
                    }
                    alt={item.Name}
                    className={isSelected ? "selected" : ""}
                />
            )}
            {isScene && (
                <div className="thumbnail-placeholder">
                    <img
                        src={
                            item.Thumbnail
                                ? item.Thumbnail.includes("data:image") || item.Thumbnail.includes("src/editor")
                                    ? item.Thumbnail
                                    : backendUrlFromPath(item.Thumbnail)
                                : defaultAssetIcon
                        }
                        alt={item.Name}
                        className={!item.Thumbnail ? "icon-thumbnail" : "image-thumbnail"}
                    />
                </div>
            )}
            {isSound && (
                <StyledSoundImageWrapper
                    className="sound-image-wrapper"
                    $isPlaying={item.ID === currentlyPlayingSoundId}>
                    <SoundIcon />
                </StyledSoundImageWrapper>
            )}

            <span className="assets-item-name">{trimSceneName(item.Name)}</span>
            {((onDelete && !item?.IsAvatar) || onReplace) && (
                <div className="assets-item-menu">
                    {onDelete && !item?.IsAvatar && <img src={deleteIcon} alt="delete" onClick={handleDelete} />}

                    {onReplace && canEdit && <img src={editIcon} alt="replace" onClick={handleReplace} />}
                </div>
            )}
        </div>
    );
};

const AssetsListItem = React.memo(AssetsListItemComponent, (prevProps, nextProps) => {
    // Custom comparison function for better performance
    return (
        prevProps.onClick === nextProps.onClick &&
        prevProps.onDelete === nextProps.onDelete &&
        prevProps.onReplace === nextProps.onReplace &&
        prevProps.onEmptyAssetClick === nextProps.onEmptyAssetClick &&
        prevProps.onDragStart === nextProps.onDragStart &&
        prevProps.item.ID === nextProps.item.ID &&
        prevProps.item.Name === nextProps.item.Name &&
        prevProps.item.Thumbnail === nextProps.item.Thumbnail &&
        prevProps.item.IsAvatar === nextProps.item.IsAvatar &&
        prevProps.selectedItemsIds?.includes(prevProps.item.ID) ===
            nextProps.selectedItemsIds?.includes(nextProps.item.ID) &&
        prevProps.isScene === nextProps.isScene &&
        prevProps.isSound === nextProps.isSound &&
        prevProps.currentlyPlayingSoundId === nextProps.currentlyPlayingSoundId &&
        prevProps.draggable === nextProps.draggable
    );
});

AssetsListItem.displayName = "AssetsListItem";

const EmptyAsset = ({onClick}: {onClick: () => void}) => {
    return (
        <div className="assets-item" onClick={onClick}>
            <div className="thumbnail-placeholder">
                <img src={plusIcon} alt="plus" />
            </div>

            <span className="assets-item-name">Default</span>
        </div>
    );
};

export const AssetsListLegacy = ({
    data,
    selectedItemsIds,
    onClick,
    onDelete,
    onReplace,
    className = "",
    onEmptyAssetClick,
    isScene,
    is3DModel,
    isSound,
    currentlyPlayingSoundId,
    draggable,
    onDragStart,
}: Props) => {
    return (
        <div className={classNames("assets-list", className)} style={data.length === 0 ? {padding: 0} : undefined}>
            {onEmptyAssetClick && <EmptyAsset onClick={onEmptyAssetClick} />}
            {data.map(item => (
                <AssetsListItem
                    key={item.ID}
                    onClick={onClick}
                    onDelete={onDelete}
                    onReplace={onReplace}
                    is3DModel={is3DModel}
                    selectedItemsIds={selectedItemsIds}
                    item={item}
                    isScene={isScene}
                    isSound={isSound}
                    currentlyPlayingSoundId={currentlyPlayingSoundId}
                    draggable={draggable}
                    onDragStart={onDragStart}
                />
            ))}
        </div>
    );
};
