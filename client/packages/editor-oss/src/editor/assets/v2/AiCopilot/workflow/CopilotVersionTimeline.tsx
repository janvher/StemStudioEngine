import {useEffect, useMemo, useState} from "react";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {HiChevronRight} from "react-icons/hi2";

import {
    PanelEyebrow,
    VersionTimelineActions,
    VersionTimelineActionButton,
    VersionTimelineBadge,
    VersionTimelineBadgeList,
    VersionTimelineEmpty,
    VersionTimelineHeader,
    VersionTimelineItem,
    VersionTimelineList,
    VersionTimelineMeta,
    VersionTimelinePanel,
    VersionTimelineText,
    VersionTimelineTitle,
    VersionTimelineToggle,
} from "../AiCopilot.styles";
import {publishCurrentScene, saveScene} from "@stem/network/api/scene";
import {forkScene, listSceneRevisionCaptures, upsertSceneRevisionCapture} from "@stem/network/api/scene/v2";
import type EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {showToast} from "@stem/editor-oss/showToast";
import {openEditorRoute} from "../../../../../v2/pages/editorHandoff";
import {generateProjectLink, getGameUrl} from "../../../../../v2/pages/links";
import {assetKeys, useAssetRevisions} from "../../../../asset-management/hooks/assets";
import type {CopilotPreviewSession} from "../../CopilotWorkspace/copilotPreviewSession";
import {buildCopilotVersionTimelineRows, canShowPlayableUrlAction} from "./copilotVersionTimelineModel";

type SceneVersionState = {
    sceneId: string;
    sceneAssetId: string;
    currentRevisionId: string;
    publishRevisionId: string;
    isPublic: boolean;
    isPublished: boolean;
};

type Props = {
    app: EngineRuntime;
    previewSession: CopilotPreviewSession | null;
    isPreviewActive: boolean;
    currentUserId?: string | null;
};

const readSceneVersionState = (app: EngineRuntime): SceneVersionState => ({
    sceneId: app.editor?.sceneID ?? "",
    sceneAssetId: app.editor?.sceneAssetId ?? "",
    currentRevisionId: app.editor?.sceneRevisionId ?? "",
    publishRevisionId: app.editor?.publishRevisionId ?? "",
    isPublic: !!app.editor?.isPublic,
    isPublished: !!app.editor?.isPublished,
});

const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return "Pending";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "Pending";

    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export const CopilotVersionTimeline = ({
    app,
    previewSession,
    isPreviewActive,
    currentUserId,
}: Props) => {
    const queryClient = useQueryClient();
    const [isExpanded, setIsExpanded] = useState(false);
    const [sceneVersionState, setSceneVersionState] = useState(() => readSceneVersionState(app));
    const {sceneId, sceneAssetId, currentRevisionId, publishRevisionId, isPublic, isPublished} = sceneVersionState;
    const {data: revisionsData, isLoading, isError} = useAssetRevisions(sceneAssetId, {
        includeMetadata: true,
        includeRelease: true,
    });
    const captureQueryKey = useMemo(() => ["sceneRevisionCaptures", sceneId] as const, [sceneId]);
    const {data: captures = []} = useQuery({
        queryKey: captureQueryKey,
        queryFn: () => listSceneRevisionCaptures(sceneId),
        enabled: Boolean(sceneId),
    });

    useEffect(() => {
        const syncVersionState = () => {
            const nextState = readSceneVersionState(app);
            setSceneVersionState(nextState);
            if (nextState.sceneAssetId) {
                void queryClient.invalidateQueries({queryKey: assetKeys.revisionLists(nextState.sceneAssetId)});
            }
            if (nextState.sceneId) {
                void queryClient.invalidateQueries({queryKey: ["sceneRevisionCaptures", nextState.sceneId]});
            }
        };

        app.on("sceneLoaded.CopilotVersionTimeline", syncVersionState);
        app.on("sceneSaved.CopilotVersionTimeline", syncVersionState);
        app.on("scenePublished.CopilotVersionTimeline", syncVersionState);
        app.on("scenePublishStateUpdated.CopilotVersionTimeline", syncVersionState);
        app.on("currentRevisionUpdated.CopilotVersionTimeline", syncVersionState);
        syncVersionState();

        return () => {
            app.on("sceneLoaded.CopilotVersionTimeline", null);
            app.on("sceneSaved.CopilotVersionTimeline", null);
            app.on("scenePublished.CopilotVersionTimeline", null);
            app.on("scenePublishStateUpdated.CopilotVersionTimeline", null);
            app.on("currentRevisionUpdated.CopilotVersionTimeline", null);
        };
    }, [app, queryClient]);

    const rows = useMemo(() => buildCopilotVersionTimelineRows({
        revisions: revisionsData?.revisions ?? [],
        currentRevisionId,
        publishRevisionId,
        previewSession,
        isPreviewActive,
        currentUserId,
        capturesByRevisionId: Object.fromEntries(captures.map(capture => [capture.revisionId, capture])),
        maxRevisionRows: 4,
    }), [
        captures,
        currentRevisionId,
        currentUserId,
        isPreviewActive,
        previewSession,
        publishRevisionId,
        revisionsData?.revisions,
    ]);
    const showCopyPlayableUrl = canShowPlayableUrlAction({isPublic, isPublished, publishRevisionId});

    const handleRestoreVersion = async (revisionId?: string, title?: string) => {
        const activeSceneId = app.editor?.sceneID;
        if (!activeSceneId || !revisionId || isPreviewActive) return;

        try {
            await app.setUpScene(activeSceneId, {revisionId});
            await saveScene(false, false);
            const restoredRevisionId = app.editor?.sceneRevisionId;
            if (restoredRevisionId) {
                await upsertSceneRevisionCapture(activeSceneId, restoredRevisionId, {
                    name: `Restored ${title || "version"}`,
                    summary: `Restored from revision ${revisionId}.`,
                    source: "user",
                    restoredFromRevisionId: revisionId,
                });
            }
            showToast({type: "success", title: "Version restored"});
            app.call("currentRevisionUpdated", null, {
                sceneId: activeSceneId,
                revisionId: restoredRevisionId || revisionId,
            });
            void queryClient.invalidateQueries({queryKey: captureQueryKey});
        } catch (error: any) {
            showToast({type: "error", title: error?.message || "Failed to restore version"});
        }
    };

    const handleDuplicateScene = async () => {
        const sceneId = app.editor?.sceneID;
        if (!sceneId) return;

        try {
            const result = await forkScene(sceneId, {name: `${app.editor?.sceneName || "Game"} Copy`});
            showToast({type: "success", title: "Version duplicated"});
            openEditorRoute(generateProjectLink(result.newSceneId));
        } catch (error: any) {
            showToast({type: "error", title: error?.message || "Failed to duplicate version"});
        }
    };

    const handlePublishCurrentVersion = async (revisionId?: string) => {
        if (!revisionId || revisionId !== app.editor?.sceneRevisionId) {
            showToast({type: "info", title: "Restore this version before publishing it."});
            return;
        }

        await publishCurrentScene("publish");
    };

    const handleCopyPlayableUrl = async () => {
        const sceneId = app.editor?.sceneID;
        if (!sceneId) return;

        const url = getGameUrl(sceneId, app.editor?.sceneAlias || null) || window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            showToast({type: "success", title: "Playable URL copied"});
        } catch {
            showToast({type: "error", title: "Failed to copy playable URL"});
        }
    };

    const handleRenameVersion = async (revisionId?: string, currentName?: string) => {
        const activeSceneId = app.editor?.sceneID;
        if (!activeSceneId || !revisionId) return;

        const nextName = window.prompt("Version name", currentName || "");
        if (!nextName?.trim()) return;

        try {
            await upsertSceneRevisionCapture(activeSceneId, revisionId, {
                name: nextName.trim(),
                source: "user",
            });
            showToast({type: "success", title: "Version renamed"});
            void queryClient.invalidateQueries({queryKey: captureQueryKey});
        } catch (error: any) {
            showToast({type: "error", title: error?.message || "Failed to rename version"});
        }
    };

    const header = (
        <VersionTimelineHeader>
            <PanelEyebrow>Version Timeline</PanelEyebrow>
            <VersionTimelineToggle
                type="button"
                $expanded={isExpanded}
                aria-label={isExpanded ? "Collapse version timeline" : "Expand version timeline"}
                aria-expanded={isExpanded}
                title={isExpanded ? "Collapse version timeline" : "Expand version timeline"}
                onClick={() => setIsExpanded(value => !value)}
            >
                <HiChevronRight aria-hidden="true" />
            </VersionTimelineToggle>
        </VersionTimelineHeader>
    );

    if (!sceneAssetId && !isPreviewActive) {
        return (
            <VersionTimelinePanel>
                {header}
                {isExpanded && (
                    <VersionTimelineEmpty>Save this project to create version history.</VersionTimelineEmpty>
                )}
            </VersionTimelinePanel>
        );
    }

    return (
        <VersionTimelinePanel>
            {header}
            {isExpanded && (
                isLoading ? (
                    <VersionTimelineEmpty>Loading saved versions...</VersionTimelineEmpty>
                ) : isError ? (
                    <VersionTimelineEmpty>Version history is unavailable.</VersionTimelineEmpty>
                ) : rows.length === 0 ? (
                    <VersionTimelineEmpty>No saved versions yet.</VersionTimelineEmpty>
                ) : (
                    <VersionTimelineList>
                        {rows.map(row => (
                            <VersionTimelineItem key={row.id}>
                                <VersionTimelineTitle>
                                    <span>{row.title}</span>
                                    <VersionTimelineBadgeList>
                                        {row.badges.map(badge => (
                                            <VersionTimelineBadge
                                                key={`${row.id}-${badge.kind}-${badge.label}`}
                                                $kind={badge.kind}
                                            >
                                                {badge.label}
                                            </VersionTimelineBadge>
                                        ))}
                                    </VersionTimelineBadgeList>
                                </VersionTimelineTitle>
                                <VersionTimelineText>{row.description}</VersionTimelineText>
                                <VersionTimelineMeta>
                                    <span>{formatTimestamp(row.timestamp)}</span>
                                    <span>{row.authorLabel}</span>
                                </VersionTimelineMeta>
                                <VersionTimelineActions>
                                    <VersionTimelineActionButton
                                        type="button"
                                        disabled={row.isPreview || row.revisionId === currentRevisionId || isPreviewActive}
                                        onClick={() => void handleRestoreVersion(row.revisionId, row.title)}
                                        title={row.isPreview ? "Preview branches cannot be restored from history." : "Restore this saved version"}
                                    >
                                        Restore
                                    </VersionTimelineActionButton>
                                    <VersionTimelineActionButton
                                        type="button"
                                        disabled={row.isPreview}
                                        onClick={() => void handleDuplicateScene()}
                                        title="Duplicate this project"
                                    >
                                        Duplicate
                                    </VersionTimelineActionButton>
                                    <VersionTimelineActionButton
                                        type="button"
                                        disabled={row.isPreview}
                                        onClick={() => void handleRenameVersion(row.revisionId, row.title)}
                                        title="Rename this saved version"
                                    >
                                        Rename
                                    </VersionTimelineActionButton>
                                    <VersionTimelineActionButton
                                        type="button"
                                        disabled
                                        title="Version compare is not wired yet."
                                    >
                                        Compare
                                    </VersionTimelineActionButton>
                                    <VersionTimelineActionButton
                                        type="button"
                                        disabled={row.isPreview}
                                        onClick={() => void handlePublishCurrentVersion(row.revisionId)}
                                        title="Publish the current restored version"
                                    >
                                        Publish
                                    </VersionTimelineActionButton>
                                    {showCopyPlayableUrl && !row.isPreview && (
                                        <VersionTimelineActionButton
                                            type="button"
                                            onClick={() => void handleCopyPlayableUrl()}
                                            title="Copy playable URL"
                                        >
                                            Copy URL
                                        </VersionTimelineActionButton>
                                    )}
                                </VersionTimelineActions>
                            </VersionTimelineItem>
                        ))}
                    </VersionTimelineList>
                )
            )}
        </VersionTimelinePanel>
    );
};
