import {describe, expect, it} from "vitest";

import type {AssetRevision} from "@stem/network/api/asset";
import type {CopilotPreviewSession} from "../../CopilotWorkspace/copilotPreviewSession";
import {buildCopilotVersionTimelineRows, canShowPlayableUrlAction, getVersionLabelForRevision} from "./copilotVersionTimelineModel";

const makeRevision = (id: string, index: number, overrides: Partial<AssetRevision> = {}): AssetRevision => ({
    id,
    assetId: "scene-asset",
    contentType: "application/json",
    createTime: `2026-05-05T00:0${index}:00.000Z`,
    format: "json",
    parentIds: [],
    userId: "user-1",
    ...overrides,
});

const makePreviewSession = (): CopilotPreviewSession => ({
    previewId: "preview-1",
    status: "ready",
    baseSceneId: "scene-1",
    baseRevisionId: "rev-2",
    baseVersionLabel: "Current Version",
    startedAt: "2026-05-05T00:04:00.000Z",
    lastAppliedAt: "2026-05-05T00:05:00.000Z",
    summary: "Adjusted jump physics.",
    affectedSystems: ["player"],
    validationResults: [],
    changedAssetRefs: [],
    snapshot: {
        id: "snapshot-1",
        capturedAt: "2026-05-05T00:03:00.000Z",
        sceneJson: [],
        baseSceneId: "scene-1",
        baseSceneAssetId: "scene-asset",
        baseRevisionId: "rev-2",
        baseVersionLabel: "Current Version",
        sceneName: "Test Scene",
        assetResolutionContext: {
            logicalIdToAssetId: {},
            assetIdToRevisionId: {},
            nameToAssetId: {},
        },
    },
});

describe("getVersionLabelForRevision", () => {
    it("numbers newest-first revisions as user-facing versions", () => {
        const revisions = [makeRevision("rev-3", 3), makeRevision("rev-2", 2), makeRevision("rev-1", 1)];

        expect(getVersionLabelForRevision(revisions, "rev-3")).toBe("v3");
        expect(getVersionLabelForRevision(revisions, "rev-2")).toBe("v2");
        expect(getVersionLabelForRevision(revisions, "rev-1")).toBe("v1");
    });

    it("uses stable fallback labels when revision context is missing", () => {
        expect(getVersionLabelForRevision([], null)).toBe("Unsaved Draft");
        expect(getVersionLabelForRevision([], "unknown")).toBe("Current Version");
    });
});

describe("buildCopilotVersionTimelineRows", () => {
    it("prepends an active preview row and marks current, head, and published revisions", () => {
        const revisions = [
            makeRevision("rev-3", 3),
            makeRevision("rev-2", 2),
            makeRevision("rev-1", 1),
        ];

        const rows = buildCopilotVersionTimelineRows({
            revisions,
            currentRevisionId: "rev-2",
            publishRevisionId: "rev-1",
            previewSession: makePreviewSession(),
            isPreviewActive: true,
            currentUserId: "user-1",
        });

        expect(rows[0]?.title).toBe("Preview from v2");
        expect(rows[0]?.badges.map(badge => badge.label)).toEqual(["Preview"]);
        expect(rows[1]?.badges.map(badge => badge.label)).toEqual(["Head"]);
        expect(rows[2]?.badges.map(badge => badge.label)).toEqual(["Current"]);
        expect(rows[3]?.badges.map(badge => badge.label)).toEqual(["Published"]);
        expect(rows[2]?.authorLabel).toBe("You");
    });

    it("limits saved revision rows without hiding the preview row", () => {
        const revisions = [
            makeRevision("rev-4", 4),
            makeRevision("rev-3", 3),
            makeRevision("rev-2", 2),
            makeRevision("rev-1", 1),
        ];

        const rows = buildCopilotVersionTimelineRows({
            revisions,
            previewSession: makePreviewSession(),
            isPreviewActive: true,
            maxRevisionRows: 2,
        });

        expect(rows.map(row => row.id)).toEqual(["preview-1", "rev-4", "rev-3"]);
    });

    it("uses backend capture names, summaries, and Copilot authors when available", () => {
        const revisions = [makeRevision("rev-2", 2, {description: "raw commit"}), makeRevision("rev-1", 1)];

        const rows = buildCopilotVersionTimelineRows({
            revisions,
            capturesByRevisionId: {
                "rev-2": {
                    id: "capture-1",
                    sceneId: "scene-1",
                    revisionId: "rev-2",
                    name: "Floatier Jump",
                    summary: "Accepted Copilot jump tuning preview.",
                    source: "copilot",
                    createTime: "2026-05-05T00:02:00.000Z",
                    updateTime: "2026-05-05T00:02:00.000Z",
                },
            },
        });

        expect(rows[0]?.title).toBe("Floatier Jump");
        expect(rows[0]?.description).toBe("Accepted Copilot jump tuning preview.");
        expect(rows[0]?.authorLabel).toBe("Copilot");
    });
});

describe("canShowPlayableUrlAction", () => {
    it("requires public visibility and a published state", () => {
        expect(canShowPlayableUrlAction({
            isPublic: true,
            isPublished: true,
            publishRevisionId: "",
        })).toBe(true);
        expect(canShowPlayableUrlAction({
            isPublic: true,
            isPublished: false,
            publishRevisionId: "rev-1",
        })).toBe(true);
        expect(canShowPlayableUrlAction({
            isPublic: false,
            isPublished: true,
            publishRevisionId: "rev-1",
        })).toBe(false);
        expect(canShowPlayableUrlAction({
            isPublic: true,
            isPublished: false,
            publishRevisionId: "",
        })).toBe(false);
    });
});
