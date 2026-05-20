import {describe, expect, it} from "vitest";

import {
    type CopilotPreviewSession,
    copilotPreviewReducer,
    initialCopilotPreviewState,
} from "./copilotPreviewSession";

const makeSession = (): CopilotPreviewSession => ({
    previewId: "preview-1",
    status: "ready",
    baseSceneId: "scene-1",
    baseRevisionId: "rev-1",
    baseVersionLabel: "Current Version",
    startedAt: "2026-05-05T00:00:00.000Z",
    lastAppliedAt: null,
    summary: "Updated jump physics.",
    affectedSystems: ["player"],
    validationResults: [],
    changedAssetRefs: [],
    snapshot: {
        id: "snapshot-1",
        capturedAt: "2026-05-05T00:00:00.000Z",
        sceneJson: [],
        baseSceneId: "scene-1",
        baseSceneAssetId: "asset-1",
        baseRevisionId: "rev-1",
        baseVersionLabel: "Current Version",
        sceneName: "Test Scene",
        assetResolutionContext: {
            logicalIdToAssetId: {},
            assetIdToRevisionId: {},
            nameToAssetId: {},
        },
    },
});

describe("copilotPreviewReducer", () => {
    it("clears active preview and keeps accepted session history", () => {
        const session = makeSession();
        const state = copilotPreviewReducer(initialCopilotPreviewState, {
            type: "previewStarted",
            session,
        });

        const accepted = copilotPreviewReducer(state, {
            type: "previewAccepted",
            at: "2026-05-05T00:01:00.000Z",
        });

        expect(accepted.sceneState).toBe("confirmed");
        expect(accepted.session).toBeNull();
        expect(accepted.lastSession?.previewId).toBe("preview-1");
        expect(accepted.lastSession?.status).toBe("accepted");
        expect(accepted.lastSession?.lastAppliedAt).toBe("2026-05-05T00:01:00.000Z");
    });
});
