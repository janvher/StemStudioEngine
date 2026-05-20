import classNames from "classnames";
import {debounce} from "lodash";
import React, {useCallback, useEffect, useRef, useState} from "react";
import styled from "styled-components";
import {useOnClickOutside} from "usehooks-ts";

import {useCanEditAsset} from "./hooks/useCanEditAsset";
import OutOfDateBadge from "./OutOfDateBadge";
import {SoundIcon} from "./SoundIcon";
import {AssetType} from "@stem/network/api/asset";
import {DomainAssetDto} from "@stem/network/api/client/api";
import {resolveAssetRevisionId} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {flexCenter} from "../../../../assets/style";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import {ModelData} from "../../../../editor/models/hooks/models";
import global from "@stem/editor-oss/global";
import {backendUrlFromPath} from "@stem/editor-oss/utils/UrlUtils";
import revisionIcon from "../AssetsLibrary/images/manage-history.svg";
import {confirmRevisionRollback} from "../AssetsLibrary/RevisionSection/RevisionList";
import defaultAssetIcon from "../icons/default-asset-icon.svg";
import deleteIcon from "../icons/delete-icon-new.svg";
import editIcon from "../icons/edit-icon.svg";
import noImageIcon from "../icons/no-image.png";
import plusIcon from "../icons/plus-icon.svg";
import "./css/AssetsList.css";
import {StyledSoundImageWrapper} from "../LeftPanel/MainTabs/AssetsTab/AssetsTab.style";

export type AssetItem = DomainAssetDto | ModelData;

type Props = {
    data: AssetItem[];
    onClick: (id: string) => void;
    onEditName?: (e: React.MouseEvent<HTMLElement, MouseEvent>, arg: {id: string; name: string}) => void;
    selectedItemsIds?: string[];
    onDelete?: (arg: any) => void;
    onReplace?: (args: {id: string; name: string}) => void;
    className?: string;
    maxHeight?: string;
    onEmptyAssetClick?: () => void;
    isScene?: boolean;
    isSound?: boolean;
    currentlyPlayingSoundId?: string | null;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
    onLoadRevision?: ({asset, revisionId}: {asset: DomainAssetDto; revisionId: string}) => void | Promise<void>;
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
    onLoadRevision,
    onEditName,
}: Partial<Props> & {item: AssetItem}) => {
    const app = global.app!;
    const isSelected = selectedItemsIds?.includes(item.id);
    const {context} = useAssetResolutionContext();

    const [, setIsMenuOpen] = useState(false);
    const ref = useRef(null);
    useOnClickOutside(ref as any, () => setIsMenuOpen(false));
    const {canEdit} = useCanEditAsset({
        assetOwnerId: item.userId,
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

    const asset = "headRevisionId" in item && "headRevisionId" in item ? item : null;
    const isAvatar = "isAvatar" in item ? item.isAvatar : false;
    const itemRevisionId = asset ? resolveAssetRevisionId(asset.id, context) : undefined;

    const handleDelete = (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
        e.stopPropagation();
        onDelete?.(item);
    };

    const handleReplace = (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
        e.stopPropagation();
        onReplace?.({id: item.id, name: item.name});
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        if (draggable) {
            onDragStart?.(e, item.id);
        }
    };

    const trimSceneName = (name: string) => {
        const allowedLength = 60;
        return name.length > allowedLength ? name.substring(0, allowedLength) + "..." : name;
    };

    const openRevisionPanel = () => {
        const assetId = item.id;
        const currentRevisionId = itemRevisionId;

        app.editor?.component?.openRevisionPopup({
            assetId,
            getLoadActions: ({revision, isCurrent, isOlderThanCurrent}) =>
                isCurrent
                    ? []
                    : [{
                        key: "load",
                        tooltip: isOlderThanCurrent ? "Roll back to this revision" : "Switch to this revision",
                        icon: "apply",
                        onClick: () => {
                            if (!app.editor?.scene) return;
                            confirmRevisionRollback(revision, isOlderThanCurrent, () => {
                                void onLoadRevision?.({asset: item as DomainAssetDto, revisionId: revision.id});
                                app.editor?.component?.updatePopupRevisionId(revision.id);
                            });
                        },
                    }],
            currentRevisionId,
            showDiffOption: false,
        });
    };

    return (
        <div
            className={classNames("assets-item", isSelected ? "selected" : "")}
            onClick={() => debouncedOnClick(item.id)}
            draggable={!!draggable}
            onDragStart={handleDragStart}
            onContextMenu={onReplace ? () => setIsMenuOpen(true) : () => undefined}
        >
            {asset && asset.type !== AssetType.File && itemRevisionId !== undefined && asset.headRevisionId !== itemRevisionId && (
                <OutOfDateBadge tooltipStyle={{transform: "translate(100%, 0)"}} />
            )}
            {isSelected && <div className="select-border" />}
            {!isSound && !isScene && (
                <>
                    {item.thumbnailUrl ? (
                        <img
                            src={
                                item.thumbnailUrl.includes("data:image") || item.thumbnailUrl.includes("src/editor")
                                    ? item.thumbnailUrl
                                    : backendUrlFromPath(item.thumbnailUrl)
                            }
                            alt={item.name}
                            className={isSelected ? "selected" : ""}
                        />
                    ) : (
                        <NoImg>
                            <img
                                src={noImageIcon}
                                alt=""
                            />
                        </NoImg>
                    )}
                </>
            )}
            {isScene && (
                <div className="thumbnail-placeholder">
                    <img
                        src={
                            item.thumbnailUrl
                                ? item.thumbnailUrl.includes("data:image") || item.thumbnailUrl.includes("src/editor")
                                    ? item.thumbnailUrl
                                    : backendUrlFromPath(item.thumbnailUrl)
                                : defaultAssetIcon
                        }
                        alt={item.name}
                        className={!item.thumbnailUrl ? "icon-thumbnail" : "image-thumbnail"}
                    />
                </div>
            )}
            {isSound && (
                <StyledSoundImageWrapper
                    className="sound-image-wrapper"
                    $isPlaying={item.id === currentlyPlayingSoundId}
                >
                    <SoundIcon />
                </StyledSoundImageWrapper>
            )}

            <span className="assets-item-name">{trimSceneName(item.name)}</span>
            {((onDelete && !isAvatar) || onReplace || onEditName) && (
                <div className="assets-item-menu">
                    {onDelete && !isAvatar && (
                        <img
                            src={deleteIcon}
                            alt="delete"
                            onClick={handleDelete}
                        />
                    )}
                    {onLoadRevision && asset && (
                        <img
                            className="revisionIcon"
                            src={revisionIcon}
                            alt="revision list"
                            onClick={openRevisionPanel}
                        />
                    )}
                    {onReplace && canEdit && (
                        <img
                            src={editIcon}
                            alt="replace"
                            onClick={handleReplace}
                        />
                    )}
                    {onEditName && canEdit && (
                        <img
                            src={editIcon}
                            alt="name"
                            onClick={e => onEditName(e, {id: item.id, name: item.name})}
                        />
                    )}
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
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.name === nextProps.item.name &&
        prevProps.item.thumbnailUrl === nextProps.item.thumbnailUrl &&
        ("isAvatar" in prevProps.item ? prevProps.item.isAvatar : undefined) ===
            ("isAvatar" in nextProps.item ? nextProps.item.isAvatar : undefined) &&
        prevProps.onLoadRevision === nextProps.onLoadRevision &&
        prevProps.selectedItemsIds?.includes(prevProps.item.id) ===
            nextProps.selectedItemsIds?.includes(nextProps.item.id) &&
        prevProps.isScene === nextProps.isScene &&
        prevProps.isSound === nextProps.isSound &&
        prevProps.currentlyPlayingSoundId === nextProps.currentlyPlayingSoundId &&
        prevProps.draggable === nextProps.draggable
    );
});

AssetsListItem.displayName = "AssetsListItem";

const EmptyAsset = ({onClick}: {onClick: () => void}) => {
    return (
        <div
            className="assets-item"
            onClick={onClick}
        >
            <div className="thumbnail-placeholder">
                <img
                    src={plusIcon}
                    alt="plus"
                />
            </div>

            <span className="assets-item-name">Default</span>
        </div>
    );
};

export const AssetsList = ({
    data,
    selectedItemsIds,
    onClick,
    onDelete,
    onReplace,
    className = "",
    onEmptyAssetClick,
    isScene,
    isSound,
    currentlyPlayingSoundId,
    draggable,
    onDragStart,
    onLoadRevision,
    onEditName,
}: Props) => {
    return (
        <div
            className={classNames("assets-list", className)}
            style={data.length === 0 ? {padding: 0} : undefined}
        >
            {onEmptyAssetClick && <EmptyAsset onClick={onEmptyAssetClick} />}
            {data.map(item => (
                <AssetsListItem
                    key={item.id}
                    onClick={onClick}
                    onDelete={onDelete}
                    onReplace={onReplace}
                    selectedItemsIds={selectedItemsIds}
                    item={item}
                    isScene={isScene}
                    isSound={isSound}
                    currentlyPlayingSoundId={currentlyPlayingSoundId}
                    draggable={draggable}
                    onDragStart={onDragStart}
                    onLoadRevision={onLoadRevision}
                    onEditName={onEditName}
                />
            ))}
        </div>
    );
};

const NoImg = styled.div`
    width: 108px;
    height: 108px;
    background: var(--theme-editor-box-bg);
    ${flexCenter};
    border-radius: 8px;
    img {
        width: 65px;
        height: 65px;
    }
`;
