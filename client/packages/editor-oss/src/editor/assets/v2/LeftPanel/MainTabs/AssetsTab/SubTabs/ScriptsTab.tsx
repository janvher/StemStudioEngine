import {useMemo} from "react";

import {
    AssetName,
    Overlay,
    PopupContainer,
    Preview,
    StyledOutOfDateBadge,
    Wrapper,
} from "./BehaviorsTab/BehaviorsTab.style";
import {EmptyAssetsState} from "./EmptyAssetsState";
import {AssetType} from "@stem/network/api/asset";
import type {Asset} from "@stem/network/api/asset";
import {resolveAssetRevisionId} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {isScriptsEnabled} from "@stem/editor-oss/utils/featureFlags";
import {useAssetRevisions, useListSceneAssets} from "../../../../../../asset-management/hooks/assets";
import {useRemoveAssetsAndInstancesFromScene} from "../../../../../../asset-management/hooks/scene";
import {IconButton} from "../../../../AssetsLibrary/AssetsLibrary.style";
import lambdaIcon from "../../../../AssetsLibrary/FoldersView/icons/lambda-icon.svg";
import editIcon from "../../../../AssetsLibrary/images/edit.svg";
import historyIcon from "../../../../AssetsLibrary/images/manage-history.svg";
import trashIcon from "../../../../AssetsLibrary/images/trash.svg";
import {confirmRevisionRollback} from "../../../../AssetsLibrary/RevisionSection/RevisionList";
import {Tooltip} from "../../../../common/Tooltip";

interface Props {
    search: string;
    assets?: Asset[];
}

export const ScriptsTab = ({search, assets: propAssets}: Props) => {
    const sceneID = global.app?.editor?.sceneID || "missing-scene-id";
    const {data} = useListSceneAssets(sceneID, {
        enabled: isScriptsEnabled() && !propAssets && Boolean(global.app?.editor?.sceneID),
        types: [AssetType.Script],
    });

    const assets = propAssets ?? data?.assets ?? [];
    const filtered = useMemo(() => {
        if (!search) return assets;
        return assets.filter(asset => asset.name.toLowerCase().includes(search.toLowerCase()));
    }, [assets, search]);

    if (filtered.length === 0) {
        return (
            <EmptyAssetsState
                search={search}
                label="scripts"
            />
        );
    }

    return (
        <Wrapper>
            {filtered.map(asset => (
                <SingleScript
                    key={asset.id}
                    asset={asset}
                />
            ))}
        </Wrapper>
    );
};

const SingleScript = ({asset}: {asset: Asset}) => {
    const editor = global.app?.editor;
    const {context} = useAssetResolutionContext();
    const revisionsQuery = useAssetRevisions(asset.id);
    const removeAssetsAndInstancesFromScene = useRemoveAssetsAndInstancesFromScene();
    const revisionId = useMemo(
        () => resolveAssetRevisionId(asset.id, context) || asset.headRevisionId,
        [asset.headRevisionId, asset.id, context],
    );

    const handleEdit = () => {
        editor?.component?.closeRevisionPopup();
        editor?.component?.openCodeEditor({kind: "script", id: asset.id});
    };

    const handleDelete = () => {
        removeAssetsAndInstancesFromScene([asset.id])
            .catch(error => {
                console.error("[ScriptsTab] Failed to delete script:", error);
                showToast({type: "error", title: "Failed to remove script"});
            });
    };

    const openRevisionPanel = () => {
        editor?.component?.openRevisionPopup({
            assetId: asset.id,
            getLoadActions: ({revision, isCurrent, isOlderThanCurrent}) =>
                isCurrent
                    ? []
                    : [{
                        key: "load",
                        tooltip: isOlderThanCurrent ? "Roll back to this revision" : "Switch to this revision",
                        icon: "apply",
                        onClick: event => {
                            confirmRevisionRollback(revision, isOlderThanCurrent, () => {
                                event.stopPropagation();
                                editor?.component?.closeRevisionPopup();
                                editor?.component?.openCodeEditor({kind: "script", id: asset.id});
                            });
                        },
                    }],
            currentRevisionId: revisionId,
            showDiffOption: true,
        });
    };

    const isOutOfDate = revisionsQuery.data?.revisions[0]?.id !== revisionId;

    return (
        <PopupContainer>
            <Preview
                onClick={handleEdit}
                title={asset.description || ""}
            >
                <img
                    src={lambdaIcon}
                    alt=""
                    className="icon"
                />
                {isOutOfDate && <StyledOutOfDateBadge />}
                <AssetName>{asset.name}</AssetName>
                <Overlay>
                    <Tooltip
                        text="Edit"
                        height="auto"
                    >
                        <IconButton
                            className="reset-css"
                            onClick={event => {
                                event.stopPropagation();
                                handleEdit();
                            }}
                        >
                            <img
                                className="editIcon"
                                src={editIcon}
                                alt="edit script"
                            />
                        </IconButton>
                    </Tooltip>
                    <Tooltip
                        text="Delete"
                        height="auto"
                    >
                        <IconButton
                            className="reset-css"
                            onClick={event => {
                                event.stopPropagation();
                                handleDelete();
                            }}
                        >
                            <img
                                className="deleteIcon"
                                src={trashIcon}
                                alt="delete script"
                            />
                        </IconButton>
                    </Tooltip>
                    <Tooltip
                        text="Version History"
                        height="auto"
                    >
                        <IconButton
                            className="reset-css"
                            onClick={event => {
                                event.stopPropagation();
                                openRevisionPanel();
                            }}
                        >
                            <img
                                className="revisionsIcon"
                                src={historyIcon}
                                alt="see revisions"
                            />
                        </IconButton>
                    </Tooltip>
                </Overlay>
            </Preview>
        </PopupContainer>
    );
};
