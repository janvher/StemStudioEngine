import type {AssetRevision} from "@stem/network/api/asset";
import type {SceneRevisionCapture} from "@stem/network/api/scene/v2";
import type {CopilotPreviewSession} from "../../CopilotWorkspace/copilotPreviewSession";

export type CopilotVersionTimelineBadgeKind = "current" | "preview" | "published" | "head" | "release";

export type CopilotVersionTimelineBadge = {
    label: string;
    kind: CopilotVersionTimelineBadgeKind;
};

export type CopilotVersionTimelineRow = {
    id: string;
    revisionId?: string;
    isPreview?: boolean;
    title: string;
    description: string;
    timestamp: string | null;
    authorLabel: string;
    badges: CopilotVersionTimelineBadge[];
};

export type BuildCopilotVersionTimelineRowsInput = {
    revisions: AssetRevision[];
    currentRevisionId?: string | null;
    publishRevisionId?: string | null;
    previewSession?: CopilotPreviewSession | null;
    isPreviewActive?: boolean;
    currentUserId?: string | null;
    capturesByRevisionId?: Record<string, SceneRevisionCapture>;
    maxRevisionRows?: number;
};

export type CanShowPlayableUrlActionInput = {
    isPublic?: boolean | null;
    isPublished?: boolean | null;
    publishRevisionId?: string | null;
};

export const canShowPlayableUrlAction = ({
    isPublic,
    isPublished,
    publishRevisionId,
}: CanShowPlayableUrlActionInput): boolean =>
    Boolean(isPublic && (isPublished || publishRevisionId?.trim()));

export const getVersionLabelForRevision = (
    revisions: Pick<AssetRevision, "id">[],
    revisionId?: string | null,
): string => {
    if (!revisionId) return "Unsaved Draft";

    const index = revisions.findIndex(revision => revision.id === revisionId);
    if (index < 0) return "Current Version";

    return `v${revisions.length - index}`;
};

const shortRevisionId = (revisionId: string): string => {
    if (revisionId.length <= 12) return revisionId;
    return `${revisionId.slice(0, 6)}...${revisionId.slice(-6)}`;
};

const formatAuthorLabel = (revision: AssetRevision, currentUserId?: string | null): string => {
    if (currentUserId && revision.userId === currentUserId) return "You";
    return revision.userId ? "Collaborator" : "Unknown";
};

const formatReleaseLabel = (revision: AssetRevision): string | null => {
    const release = revision.release;
    if (!release) return null;
    return `${release.versionMajor}.${release.versionMinor}.${release.versionPatch}`;
};

export const buildCopilotVersionTimelineRows = ({
    revisions,
    currentRevisionId,
    publishRevisionId,
    previewSession,
    isPreviewActive = false,
    currentUserId,
    capturesByRevisionId = {},
    maxRevisionRows = 4,
}: BuildCopilotVersionTimelineRowsInput): CopilotVersionTimelineRow[] => {
    const rows: CopilotVersionTimelineRow[] = [];

    if (isPreviewActive && previewSession) {
        rows.push({
            id: previewSession.previewId,
            isPreview: true,
            title: `Preview from ${getVersionLabelForRevision(revisions, previewSession.baseRevisionId)}`,
            description: previewSession.summary || "Temporary Copilot preview branch",
            timestamp: previewSession.lastAppliedAt || previewSession.startedAt,
            authorLabel: "Copilot",
            badges: [{label: "Preview", kind: "preview"}],
        });
    }

    const visibleRevisions = revisions.slice(0, maxRevisionRows);
    for (const [index, revision] of visibleRevisions.entries()) {
        const capture = capturesByRevisionId[revision.id];
        const badges: CopilotVersionTimelineBadge[] = [];
        if (revision.id === currentRevisionId) {
            badges.push({label: "Current", kind: "current"});
        }
        if (index === 0) {
            badges.push({label: "Head", kind: "head"});
        }
        if (revision.id === publishRevisionId) {
            badges.push({label: "Published", kind: "published"});
        }
        const releaseLabel = formatReleaseLabel(revision);
        if (releaseLabel) {
            badges.push({label: releaseLabel, kind: "release"});
        }

        rows.push({
            id: revision.id,
            revisionId: revision.id,
            isPreview: false,
            title: capture?.name?.trim() || getVersionLabelForRevision(revisions, revision.id),
            description: capture?.summary?.trim() || revision.description?.trim() || `Revision ${shortRevisionId(revision.id)}`,
            timestamp: revision.createTime,
            authorLabel: capture?.source === "copilot" ? "Copilot" : formatAuthorLabel(revision, currentUserId),
            badges,
        });
    }

    return rows;
};
