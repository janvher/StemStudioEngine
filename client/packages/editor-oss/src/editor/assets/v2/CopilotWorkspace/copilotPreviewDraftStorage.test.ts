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

    it("never falls back to localStorage when IndexedDB is unavailable", async () => {
        // Preview drafts carry a full scene snapshot and must NOT be mirrored
        // into localStorage (that bloated storage and threw QuotaExceededError).
        // With IndexedDB unavailable, persist/read/clear are graceful no-ops and
        // localStorage stays untouched.
        await expect(persistCopilotPreviewDraft(makeApp() as any, makeSession())).resolves.toBeUndefined();
        expect(window.localStorage.length).toBe(0);

        await expect(readCopilotPreviewDraft("scene-1")).resolves.toBeNull();
        await expect(clearCopilotPreviewDraft("scene-1")).resolves.toBeUndefined();
        expect(window.localStorage.length).toBe(0);
    });
});
