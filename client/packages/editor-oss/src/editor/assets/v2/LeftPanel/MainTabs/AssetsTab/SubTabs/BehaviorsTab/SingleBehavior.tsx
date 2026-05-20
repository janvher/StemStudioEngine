import {useEffect, useMemo, useRef, useState} from "react";

import {
    AssetName,
    InfoPopup,
    Overlay,
    PopupContainer,
    PopupDescription,
    Preview,
    StyledOutOfDateBadge,
} from "./BehaviorsTab.style";
import {resolveAssetRevisionId} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {isLegacyBehaviorId} from "../../../../../../../../behaviors/util";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {RightClickMenu, ItemMenuText} from "../../../../../../../../ui/common/RightClickMenu/RightClickMenu";
import {useRemoveAssetsAndInstancesFromScene} from "../../../../../../../asset-management/hooks/scene";
import {confirmRevisionRollback} from "../../../../../../../assets/v2/AssetsLibrary/RevisionSection/RevisionList";
import {useApplySceneBehaviorRevision} from "../../../../../../../behaviors/hooks/useApplySceneBehaviorRevision";
import {IconButton} from "../../../../../AssetsLibrary/AssetsLibrary.style";
import behaviorIcon from "../../../../../AssetsLibrary/FoldersView/icons/behavior-icon.svg";
import editIcon from "../../../../../AssetsLibrary/images/edit.svg";
import historyIcon from "../../../../../AssetsLibrary/images/manage-history.svg";
import trashIcon from "../../../../../AssetsLibrary/images/trash.svg";

type SingleBehaviorProps = {
    id: string;
    name: string;
    description?: string;
    headRevisionId: string;
};

export const SingleBehavior = ({id, name, description, headRevisionId}: SingleBehaviorProps) => {
    const editor = global.app?.editor;
    const removeAssetsAndInstancesFromScene = useRemoveAssetsAndInstancesFromScene();
    const applySceneBehaviorRevision = useApplySceneBehaviorRevision();
    const {context} = useAssetResolutionContext();
    const revisionId = useMemo(() => resolveAssetRevisionId(id, context), [id, context]);
    const [hovered, setHovered] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState<{x: number; y: number}>({x: 0, y: 0});
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setShowInfo(false);
            }
        };

        if (showInfo) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showInfo]);

    const openEditBehaviorCreator = () => {
        try {
            global.app?.editor?.component?.closeRevisionPopup();
            // Keep the editor mounted at EditorComponent level; fork-on-edit can
            // remove this row from the dependency list while the modal is open.
            global.app?.editor?.component?.openCodeEditor({kind: "behavior", id});
        } catch (error) {
            console.error("Error fetching behavior data:", error);
            return;
        }
    };

    const removeFromScene = () => {
        const sceneId = global.app?.editor?.sceneID;
        if (!sceneId) {
            showToast({
                type: "error",
                title: "Failed to remove behavior from scene.",
            });
            console.error("Scene id is missing");
            return;
        }

        const behaviorConfigRegistry = global.app?.editor?.behaviorConfigRegistry;
        const behaviorScriptRegistry = global.app?.editor?.behaviorScriptRegistry;

        const handleDelete = async () => {
            try {
                // remove behavior from scene in backend
                await removeAssetsAndInstancesFromScene([id]);

                // remove behavior from scene in editor
                behaviorConfigRegistry?.unregisterConfig(id);
                behaviorScriptRegistry?.unregisterScript(id);
                showToast({type: "success", title: "Behavior removed from scene successfully."});
            } catch (error) {
                console.error("Error removing behavior from scene:", error);
                showToast({type: "error", title: "Failed to remove behavior from scene."});
            }
        };

        handleDelete().catch(console.error);
    };

    const handleLoadRevisionClick = (event: React.MouseEvent, revisionId: string) => {
        event.stopPropagation();
        event.preventDefault();

        applySceneBehaviorRevision(id, revisionId)
            .then(() => {
                showToast({type: "success", title: "Loaded revision"});
                editor?.component?.updatePopupRevisionId(revisionId);
            })
            .catch(error => {
                console.error("Error loading behavior revision:", error);
                showToast({type: "error", title: "Failed to load behavior revision"});
            });
    };

    const openRevisionPanel = () => {
        global.app?.editor?.component?.openRevisionPopup({
            assetId: id,
            getLoadActions: ({revision, isCurrent, isOlderThanCurrent}) =>
                isCurrent
                    ? []
                    : [{
                        key: "load",
                        tooltip: isOlderThanCurrent ? "Roll back to this revision" : "Switch to this revision",
                        icon: "apply",
                        onClick: event => {
                            confirmRevisionRollback(revision, isOlderThanCurrent, () => {
                                handleLoadRevisionClick(event, revision.id);
                            });
                        },
                    }],
            currentRevisionId: revisionId,
            showDiffOption: true,
        });
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuPos({x: e.clientX, y: e.clientY});
        setMenuOpen(true);
    };

    return (
        <>
            <PopupContainer ref={popupRef}>
                {showInfo &&
                    <InfoPopup>
                        <PopupDescription>{description || "No description available"}</PopupDescription>
                    </InfoPopup>
                }
                <Preview
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    key={id}
                    onClick={() => setShowInfo(!showInfo)}
                    onContextMenu={handleContextMenu}
                >
                    <img src={behaviorIcon}
                        alt=""
                        className="icon"
                    />
                    {headRevisionId !== revisionId && <StyledOutOfDateBadge />}
                    <AssetName>{name}</AssetName>
                    {hovered && 
                        <Overlay>
                            <>
                                <IconButton
                                    className="reset-css"
                                    onClick={e => {
                                        e.stopPropagation();
                                        openEditBehaviorCreator();
                                    }}
                                >
                                    <img className="editIcon"
                                        src={editIcon}
                                        alt="edit behavior"
                                    />
                                </IconButton>
                                <IconButton
                                    className="reset-css"
                                    onClick={e => {
                                        e.stopPropagation();
                                        removeFromScene();
                                    }}
                                >
                                    <img className="deleteIcon"
                                        src={trashIcon}
                                        alt="delete from this project"
                                    />
                                </IconButton>
                                {!isLegacyBehaviorId(id) && 
                                    <IconButton
                                        className="reset-css"
                                        onClick={e => {
                                            e.stopPropagation();
                                            openRevisionPanel();
                                        }}
                                    >
                                        <img className="revisionsIcon"
                                            src={historyIcon}
                                            alt="see revisions"
                                        />
                                    </IconButton>
                                }
                            </>
                        </Overlay>
                    }
                </Preview>
            </PopupContainer>
            {menuOpen && (
                <RightClickMenu
                    left={menuPos.x}
                    top={menuPos.y}
                    onClickoutsideCallback={() => setMenuOpen(false)}
                >
                    <ItemMenuText onClick={() => { setMenuOpen(false); openEditBehaviorCreator(); }}>
                        Edit
                    </ItemMenuText>
                    <ItemMenuText $red onClick={() => { setMenuOpen(false); removeFromScene(); }}>
                        Delete from Project
                    </ItemMenuText>
                    {!isLegacyBehaviorId(id) && (
                        <ItemMenuText onClick={() => { setMenuOpen(false); openRevisionPanel(); }}>
                            Revisions
                        </ItemMenuText>
                    )}
                </RightClickMenu>
            )}
        </>
    );
};
