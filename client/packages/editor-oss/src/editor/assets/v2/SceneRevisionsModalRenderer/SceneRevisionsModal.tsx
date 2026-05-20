import {Dispatch, SetStateAction, useEffect, useMemo, useState} from "react";
import {ClipLoader} from "react-spinners";

import {Footer} from "./Footer";
import {
    Cell,
    EmptyState,
    EmptyStateBody,
    EmptyStateTitle,
    Header,
    ModalOverlay,
    Popup,
    SceneData,
    SecondaryHeader,
    TableContainer,
    TableHeader,
    TableRow,
} from "./SceneRevisionsModal.style";
import {AssetRevision} from "@stem/network/api/asset";
import {getScene} from "@stem/network/api/scene/v2";
import {useAppGlobalContext, useAuthorizationContext} from "@stem/editor-oss/context";
import {IEditorUser} from "../../../../v2/pages/types";
import {useAssetRevisions} from "../../../asset-management/hooks/assets";
import {Avatar} from "../Avatar/Avatar";
import {Tooltip} from "../common";
import publishedStatusIcon from "../CreateDashboard/icons/published-status.svg";
import unpublishedStatusIcon from "../CreateDashboard/icons/unpublished-status.svg";
import xIcon from "../icons/close-panel.svg";

export const SceneRevisionsModal = () => {
    const {closeSceneHistoryModal, sceneRevisionModalSceneData} = useAppGlobalContext();
    const {dbUser, getUser} = useAuthorizationContext();
    const [resolvedAssetId, setResolvedAssetId] = useState(sceneRevisionModalSceneData?.assetID ?? "");
    const [isResolvingAssetId, setIsResolvingAssetId] = useState(false);
    const [assetIdError, setAssetIdError] = useState<string | null>(null);
    const {data: revisionsData, isLoading: isLoadingRevisions} = useAssetRevisions(resolvedAssetId);
    const [selectedRevisionId, setSelectedRevisionId] = useState("");
    const [userMap, setUserMap] = useState<Map<string, IEditorUser>>(new Map());
    const revisions = useMemo(() => revisionsData?.revisions ?? [], [revisionsData?.revisions]);
    const shouldResolveAssetId = Boolean(
        !resolvedAssetId && sceneRevisionModalSceneData && "ID" in sceneRevisionModalSceneData.scene,
    );
    const isLoadingVersionHistory = shouldResolveAssetId || isResolvingAssetId || isLoadingRevisions;

    useEffect(() => {
        setResolvedAssetId(sceneRevisionModalSceneData?.assetID ?? "");
        setAssetIdError(null);
    }, [sceneRevisionModalSceneData?.assetID]);

    useEffect(() => {
        if (!shouldResolveAssetId || !sceneRevisionModalSceneData || !("ID" in sceneRevisionModalSceneData.scene)) return;

        let cancelled = false;

        void (async () => {
            setIsResolvingAssetId(true);
            try {
                const dashboardScene = sceneRevisionModalSceneData.scene as {ID: string};
                const sceneResponse = await getScene(dashboardScene.ID, {revision: "head"});
                if (cancelled) return;

                const fetchedAssetId = sceneResponse.asset?.id ?? "";
                if (!fetchedAssetId) {
                    setAssetIdError("Version history is unavailable for this project.");
                    return;
                }

                setResolvedAssetId(fetchedAssetId);
            } catch (error) {
                if (cancelled) return;
                setAssetIdError(error instanceof Error ? error.message : "Failed to load version history.");
            } finally {
                if (!cancelled) {
                    setIsResolvingAssetId(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [shouldResolveAssetId, sceneRevisionModalSceneData]);

    useEffect(() => {
        if (revisions.length === 0) return;
        const uniqueUserIds = [...new Set(revisions.map(r => r.userId))];
        void Promise.all(
            uniqueUserIds.map(async (userId): Promise<[string, IEditorUser] | null> => {
                if (dbUser?.id === userId) return [userId, dbUser];
                const user = await getUser(userId);
                return user ? [userId, user] : null;
            }),
        ).then(entries => {
            setUserMap(new Map(entries.filter((e): e is [string, IEditorUser] => e !== null)));
        });
    }, [revisions, dbUser, getUser]);

    useEffect(() => {
        if (revisions.length === 0) {
            setSelectedRevisionId("");
            return;
        }

        setSelectedRevisionId(currentSelection => {
            const selectionStillExists = revisions.some(revision => revision.id === currentSelection);
            if (selectionStillExists) return currentSelection;

            return sceneRevisionModalSceneData?.scene.publishRevisionId || revisions[0]?.id || "";
        });
    }, [revisions, sceneRevisionModalSceneData?.scene.publishRevisionId]);

    return (
        <ModalOverlay onClick={closeSceneHistoryModal}>
            <Popup onClick={e => e.stopPropagation()}>
                <Header>
                    Version History
                    <button
                        className="reset-css closeBtn"
                        onClick={closeSceneHistoryModal}
                    >
                        <img
                            src={xIcon}
                            alt="close"
                        />
                    </button>
                </Header>
                <SecondaryHeader>
                    Browse previous versions of this project or choose which version other users access.
                </SecondaryHeader>

                <SceneData>
                    <TableContainer>
                        {isLoadingVersionHistory ? (
                            <EmptyState>
                                <ClipLoader
                                    loading
                                    size={28}
                                    color="var(--theme-font-main-selected-color)"
                                />
                                <EmptyStateTitle>Loading version history</EmptyStateTitle>
                                <EmptyStateBody>
                                    Resolving this project&apos;s saved versions. You can close this panel at any time.
                                </EmptyStateBody>
                            </EmptyState>
                        ) : assetIdError ? (
                            <EmptyState>
                                <EmptyStateTitle>Version history unavailable</EmptyStateTitle>
                                <EmptyStateBody>{assetIdError}</EmptyStateBody>
                            </EmptyState>
                        ) : revisions.length > 0 ? (
                            <>
                                <TableHeader>
                                    <Cell $flex={2}>Date:Time</Cell>
                                    <Cell $flex={2}>User</Cell>
                                    <Cell $flex={2}>Version ID</Cell>
                                    <Cell $flex={1}>
                                        Live
                                        <Tooltip
                                            text="When published, the indicated version will be the one that loads for non-owner/collaborator users"
                                            width="200px"
                                        />
                                    </Cell>
                                </TableHeader>

                                {revisions.map(revision => (
                                    <Row
                                        key={revision.id}
                                        revision={revision}
                                        author={userMap.get(revision.userId) ?? null}
                                        setSelectedRevisionId={setSelectedRevisionId}
                                        selectedRevisionId={selectedRevisionId}
                                    />
                                ))}
                            </>
                        ) : (
                            <EmptyState>
                                <EmptyStateTitle>No saved versions yet</EmptyStateTitle>
                                <EmptyStateBody>
                                    Publish or save edits to create the first entry in this project&apos;s version history.
                                </EmptyStateBody>
                            </EmptyState>
                        )}
                    </TableContainer>
                </SceneData>

                <Footer
                    selectedRevisionId={selectedRevisionId}
                    headRevisionId={revisions[0]?.id ?? ""}
                    assetId={resolvedAssetId}
                />
            </Popup>
        </ModalOverlay>
    );
};

const Row = ({
    revision,
    author,
    setSelectedRevisionId,
    selectedRevisionId,
}: {
    revision: AssetRevision;
    author: IEditorUser | null;
    setSelectedRevisionId: Dispatch<SetStateAction<string>>;
    selectedRevisionId: string;
}) => {
    const {sceneRevisionModalSceneData} = useAppGlobalContext();
    const isPublished = sceneRevisionModalSceneData?.scene.publishRevisionId === revision.id;

    return (
        <TableRow
            key={revision.id}
            $active={selectedRevisionId === revision.id}
            onClick={() => setSelectedRevisionId(revision.id)}
        >
            <Cell $flex={2} data-label="Saved">
                {new Date(revision.createTime)
                    .toLocaleString("en-US", {
                        year: "2-digit",
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                    })
                    .replace(",", "")}
            </Cell>
            <Cell $flex={2} data-label="Editor">
                <Avatar
                    name={author?.username || undefined}
                    image={author?.avatar || undefined}
                    size={32}
                />
                {author?.username || author?.name || author?.email}
            </Cell>
            <Cell $flex={2} data-label="Version ID">{`${revision.id.slice(0, 6)}...${revision.id.slice(-6)}`}</Cell>
            <Cell $flex={1} data-label="Live">
                <img
                    src={isPublished ? publishedStatusIcon : unpublishedStatusIcon}
                    alt={isPublished ? "published version" : "unpublished version"}
                    className="publishedIcon"
                />
            </Cell>
        </TableRow>
    );
};
