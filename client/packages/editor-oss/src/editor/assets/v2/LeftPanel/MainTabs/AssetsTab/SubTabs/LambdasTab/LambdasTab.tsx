 
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {MathUtils} from "three";
import {toast} from "toastywave";

import {AssetType} from "@stem/network/api/asset";
import type {Asset} from "@stem/network/api/asset";
import global from "@stem/editor-oss/global";
import type {LambdaInstanceData} from "../../../../../../../../lambdas/Lambda";
import {RightClickMenu, ItemMenuText} from "../../../../../../../../ui/common/RightClickMenu/RightClickMenu";
import {useListEditorAssets, useAssetRevisions} from "../../../../../../../asset-management/hooks/assets";
import {useRemoveAssetsAndInstancesFromScene} from "../../../../../../../asset-management/hooks/scene";
import {useLambdaData} from "../../../../../../../lambdas/hooks/lambdas";
import {IconButton} from "../../../../../AssetsLibrary/AssetsLibrary.style";
import lambdaIcon from "../../../../../AssetsLibrary/FoldersView/icons/lambda-icon.svg";
import editIcon from "../../../../../AssetsLibrary/images/edit.svg";
import historyIcon from "../../../../../AssetsLibrary/images/manage-history.svg";
import trashIcon from "../../../../../AssetsLibrary/images/trash.svg";
import {confirmRevisionRollback} from "../../../../../AssetsLibrary/RevisionSection/RevisionList";
import {Tooltip} from "../../../../../common/Tooltip";
import {
    AssetName,
    InfoPopup,
    Overlay,
    PopupContainer,
    PopupDescription,
    Preview,
    StyledOutOfDateBadge,
    Wrapper,
} from "../BehaviorsTab/BehaviorsTab.style";
import {EmptyAssetsState} from "../EmptyAssetsState";

interface Props {
    search: string;
    /** Pre-fetched assets from parent. If provided, skips internal fetch. */
    assets?: Asset[];
}

export const LambdasTab = ({search, assets: propAssets}: Props) => {
    // Only fetch if assets not provided from parent
    const {data: lambdaAssetData} = useListEditorAssets({
        types: [AssetType.Lambda],
        enabled: !propAssets,
    });

    const lambdas = useMemo(() => {
        const assets = propAssets ?? lambdaAssetData?.assets ?? [];
        return assets.map(asset => ({
            id: asset.id,
            name: asset.name,
            revisionId: asset.headRevisionId,
        }));
    }, [propAssets, lambdaAssetData]);

    const filtered = useMemo(() => {
        if (!search) return lambdas;
        return lambdas.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
    }, [search, lambdas]);

    if (!filtered || filtered.length === 0) {
        return (
            <EmptyAssetsState
                search={search}
                label="lambdas"
            />
        );
    }

    return (
        <Wrapper>
            {filtered.map(lambda => (
                <SingleLambda
                    key={lambda.id}
                    assetId={lambda.id}
                    name={lambda.name}
                    revisionId={lambda.revisionId}
                />
            ))}
        </Wrapper>
    );
};

const SingleLambda = ({assetId, name, revisionId}: {assetId: string; name: string; revisionId?: string}) => {
    const app = global.app;
    const editor = app?.editor;
    const {config} = useLambdaData(assetId, revisionId);
    const removeAssetsAndInstancesFromScene = useRemoveAssetsAndInstancesFromScene();
    const revisionsQuery = useAssetRevisions(assetId);

    const [hovered, setHovered] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [instanceVersion, setInstanceVersion] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState<{x: number; y: number}>({x: 0, y: 0});
    const popupRef = useRef<HTMLDivElement>(null);

    const isInstantiated = useMemo(() => {
        const instances = editor?.scene?.userData?.projectLambdaInstances as LambdaInstanceData[] | undefined;
        return instances?.some(inst => inst.lambdaId === config?.id) ?? false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config?.id, instanceVersion]);

    // Reset hover when the scroll container scrolls
    useEffect(() => {
        const container = document.getElementById("scrollContainer");
        if (!container) return;
        const onScroll = () => setHovered(false);
        container.addEventListener("scroll", onScroll, {passive: true});
        return () => container.removeEventListener("scroll", onScroll);
    }, []);

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

    const handleEdit = () => {
        editor?.component?.closeRevisionPopup();
        editor?.component?.openCodeEditor({kind: "lambda", id: assetId});
    };

    const handleAddToProject = () => {
        if (!config || !editor) return;
        const scene = editor.scene;
        if (!scene.userData.projectLambdaInstances) {
            scene.userData.projectLambdaInstances = [];
        }
        const instances = scene.userData.projectLambdaInstances as LambdaInstanceData[];
        if (instances.some(inst => inst.lambdaId === config.id)) return;

        const instanceData: LambdaInstanceData = {
            lambdaId: config.id,
            instanceId: MathUtils.generateUUID(),
            enabled: true,
            attributes: {},
        };
        instances.push(instanceData);

        app?.call("objectChanged", editor, editor.selected);
        setInstanceVersion(v => v + 1);
        toast.success(`Lambda "${config.name}" added to project`);
    };

    const handleDelete = async () => {
        try {
            // Detach this lambda from every object in the scene
            if (config && editor) {
                const lambdaIdToRemove = config.id;
                editor.scene.traverse(obj => {
                    const components = obj.userData?.lambdaComponents as
                        | import("../../../../../../../../lambdas/Lambda").LambdaComponentData[]
                        | undefined;
                    if (!components) return;
                    for (let i = components.length - 1; i >= 0; i--) {
                        if (components[i]!.lambdaId === lambdaIdToRemove) {
                            const comp = components[i]!;
                            if (comp.enabled) {
                                app?.game?.lambdaManager?.deregisterObject(comp.instanceId, obj);
                            }
                            components.splice(i, 1);
                        }
                    }
                });
                // Remove from scene-level instances
                const sceneInstances = editor.scene.userData?.lambdaInstances as LambdaInstanceData[] | undefined;
                if (sceneInstances) {
                    for (let i = sceneInstances.length - 1; i >= 0; i--) {
                        if (sceneInstances[i]!.lambdaId === lambdaIdToRemove) {
                            app?.game?.lambdaManager?.destroyInstance(sceneInstances[i]!.instanceId);
                            sceneInstances.splice(i, 1);
                        }
                    }
                }
                // Remove from project-level instances
                const projectInstances = editor.scene.userData?.projectLambdaInstances as
                    | LambdaInstanceData[]
                    | undefined;
                if (projectInstances) {
                    for (let i = projectInstances.length - 1; i >= 0; i--) {
                        if (projectInstances[i]!.lambdaId === lambdaIdToRemove) {
                            app?.game?.lambdaManager?.destroyInstance(projectInstances[i]!.instanceId);
                            projectInstances.splice(i, 1);
                        }
                    }
                }

                editor.lambdaConfigRegistry?.unregisterConfig(lambdaIdToRemove);
                app?.call("objectChanged", editor, editor.selected);
            }

            await removeAssetsAndInstancesFromScene([assetId]);
            toast.success("Lambda removed from scene");
        } catch (error) {
            console.error("[LambdasTab] Failed to delete lambda:", error);
            toast.error("Failed to remove lambda");
        }
    };

    const handleLoadRevisionClick = useCallback(() => {
        editor?.component?.closeRevisionPopup();
        editor?.component?.openCodeEditor({kind: "lambda", id: assetId});
    }, [assetId, editor]);

    const openRevisionPanel = () => {
        editor?.component?.openRevisionPopup({
            assetId,
            getLoadActions: ({revision, isCurrent, isOlderThanCurrent}) =>
                isCurrent
                    ? []
                    : [{
                        key: "load",
                        tooltip: isOlderThanCurrent ? "Roll back to this revision" : "Switch to this revision",
                        icon: "apply",
                        onClick: () => {
                            confirmRevisionRollback(revision, isOlderThanCurrent, () => {
                                // handleLoadRevisionClick handles its own errors via toast.
                                void handleLoadRevisionClick();
                            });
                        },
                    }],
            currentRevisionId: revisionId,
            showDiffOption: true,
        });
    };

    const isOutOfDate = revisionsQuery.data?.revisions[0]?.id !== revisionId;

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuPos({x: e.clientX, y: e.clientY});
        setMenuOpen(true);
    };

    return (
        <>
        <PopupContainer ref={popupRef}>
            {showInfo && (
                <InfoPopup>
                    <PopupDescription>{config?.description || "No description available"}</PopupDescription>
                </InfoPopup>
            )}
            <Preview
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onClick={() => setShowInfo(!showInfo)}
                onContextMenu={handleContextMenu}
                title={config?.description || ""}
            >
                <img
                    src={lambdaIcon}
                    alt=""
                    className="icon"
                />
                {isOutOfDate && <StyledOutOfDateBadge />}
                <AssetName>{name}</AssetName>
                {hovered && (
                    <Overlay>
                        <Tooltip
                            text={isInstantiated ? "Already in Project" : "Add to Project"}
                            height="auto"
                        >
                            <IconButton
                                className="reset-css"
                                style={
                                    isInstantiated
                                        ? {opacity: 0.35, cursor: "default", pointerEvents: "none"}
                                        : undefined
                                }
                                onClick={e => {
                                    e.stopPropagation();
                                    handleAddToProject();
                                }}
                            >
                                <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 14 14"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    style={{display: "block"}}
                                >
                                    <path
                                        d="M7 1v12M1 7h12"
                                        stroke="#ffffff"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </IconButton>
                        </Tooltip>
                        <Tooltip
                            text="Edit"
                            height="auto"
                        >
                            <IconButton
                                className="reset-css"
                                onClick={e => {
                                    e.stopPropagation();
                                    handleEdit();
                                }}
                            >
                                <img
                                    className="editIcon"
                                    src={editIcon}
                                    alt="edit lambda"
                                />
                            </IconButton>
                        </Tooltip>
                        <Tooltip
                            text="Delete"
                            height="auto"
                        >
                            <IconButton
                                className="reset-css"
                                onClick={e => {
                                    e.stopPropagation();
                                    handleDelete().catch(console.error);
                                }}
                            >
                                <img
                                    className="deleteIcon"
                                    src={trashIcon}
                                    alt="delete lambda"
                                />
                            </IconButton>
                        </Tooltip>
                        <Tooltip
                            text="Version History"
                            height="auto"
                        >
                            <IconButton
                                className="reset-css"
                                onClick={e => {
                                    e.stopPropagation();
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
                )}
            </Preview>
        </PopupContainer>
        {menuOpen && (
            <RightClickMenu
                left={menuPos.x}
                top={menuPos.y}
                onClickoutsideCallback={() => setMenuOpen(false)}
            >
                <ItemMenuText onClick={() => { setMenuOpen(false); handleEdit(); }}>
                    Edit
                </ItemMenuText>
                <ItemMenuText $red onClick={() => { setMenuOpen(false); void handleDelete(); }}>
                    Delete from Project
                </ItemMenuText>
                <ItemMenuText onClick={() => { setMenuOpen(false); openRevisionPanel(); }}>
                    Revisions
                </ItemMenuText>
            </RightClickMenu>
        )}
    </>
    );
};
