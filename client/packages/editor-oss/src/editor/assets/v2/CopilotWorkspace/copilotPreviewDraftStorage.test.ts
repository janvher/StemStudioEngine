import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import type {CopilotPreviewSession} from "./copilotPreviewSession";

vi.mock("../../../../serialization/Converter", () => ({
    default: class MockConverter {
        toJSON() {
            return [{type: "Scene", uuid: "preview-scene"}];
        }
    },
}));

import {
    clearCopilotPreviewDraft,
    persistCopilotPreviewDraft,
    readCopilotPreviewDraft,
} from "./copilotPreviewDraftStorage";

const makeSession = (): CopilotPreviewSession => ({
    previewId: "preview-1",
    status: "ready",
    baseSceneId: "scene-1",
    baseRevisionId: "rev-1",
    baseVersionLabel: "Current Version",
    startedAt: "2026-05-05T00:00:00.000Z",
    lastAppliedAt: "2026-05-05T00:01:00.000Z",
    summary: "Make jumping floatier.",
    affectedSystems: ["player"],
    validationResults: [],
    changedAssetRefs: [],
    snapshot: {
        id: "snapshot-1",
        capturedAt: "2026-05-05T00:00:00.000Z",
        sceneJson: [],
        baseSceneId: "scene-1",
        baseSceneAssetId: "scene-asset-1",
        baseRevisionId: "rev-1",
        baseVersionLabel: "Current Version",
        sceneName: "Test Scene",
        assetResolutionContext: {
            logicalIdToAssetId: {},
            assetIdToRevisionId: {"asset-a": "rev-a1"},
            nameToAssetId: {},
        },
    },
});

const makeApp = () => ({
    options: {},
    camera: {},
    scripts: {},
    editor: {
        sceneID: "scene-1",
        sceneRevisionId: "rev-1",
    },
    scene: {
        userData: {
            assetResolutionContext: {
                logicalIdToAssetId: {player: "asset-player"},
                assetIdToRevisionId: {"asset-player": "rev-player-preview"},
                nameToAssetId: {Player: "asset-player"},
            },
        },
    },
});

describe("copilotPreviewDraftStorage", () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.stubGlobal("indexedDB", undefined);
    });

    afterEach(() => {
        window.localStorage.clear();
        vi.unstubAllGlobals();
    });

    it("persists, reads, and clears active preview drafts through the local fallback", async () => {
        await persistCopilotPreviewDraft(makeApp() as any, makeSession());

        const draft = await readCopilotPreviewDraft("scene-1");
        expect(draft?.sceneId).toBe("scene-1");
        expect(draft?.baseRevisionId).toBe("rev-1");
        expect(draft?.previewId).toBe("preview-1");
        expect(draft?.previewSceneJson).toEqual([{type: "Scene", uuid: "preview-scene"}]);
        expect(draft?.previewAssetResolutionContext.assetIdToRevisionId).toEqual({
            "asset-player": "rev-player-preview",
        });

        await clearCopilotPreviewDraft("scene-1");
        await expect(readCopilotPreviewDraft("scene-1")).resolves.toBeNull();
    });
});
