import {beforeEach, describe, expect, it, vi} from "vitest";

import type {CopilotPreviewSnapshot} from "./copilotPreviewSession";

const hoisted = vi.hoisted(() => ({
    updateSceneDependencies: vi.fn(),
}));

vi.mock("@stem/network/api/scene/v2", () => ({
    updateSceneDependencies: hoisted.updateSceneDependencies,
}));

import {
    cleanupSceneDependenciesForSnapshot,
    planDependencyCleanupForSnapshot,
} from "./copilotPreviewDependencyCleanup";

const makeSnapshot = (dependencies: Record<string, string>): CopilotPreviewSnapshot => ({
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
        assetIdToRevisionId: dependencies,
        nameToAssetId: {},
    },
});

describe("planDependencyCleanupForSnapshot", () => {
    beforeEach(() => {
        hoisted.updateSceneDependencies.mockReset();
    });

    it("detects preview-only assets and revision changes that need restoring", () => {
        const plan = planDependencyCleanupForSnapshot(makeSnapshot({
            "asset-a": "rev-a1",
            "asset-b": "rev-b1",
        }), {
            assetIdToRevisionId: {
                "asset-a": "rev-a2",
                "asset-b": "rev-b1",
                "asset-c": "rev-c1",
            },
        });

        expect(plan.needsSync).toBe(true);
        expect(plan.dependencies).toEqual({
            "asset-a": "rev-a1",
            "asset-b": "rev-b1",
        });
        expect(plan.removedAssetIds).toEqual(["asset-c"]);
        expect(plan.restoredAssetIds).toEqual(["asset-a"]);
    });

    it("does not request backend sync when dependencies already match", () => {
        const plan = planDependencyCleanupForSnapshot(makeSnapshot({"asset-a": "rev-a1"}), {
            assetIdToRevisionId: {"asset-a": "rev-a1"},
        });

        expect(plan.needsSync).toBe(false);
        expect(plan.removedAssetIds).toEqual([]);
        expect(plan.restoredAssetIds).toEqual([]);
    });

    it("syncs scene dependencies and emits one removal event per preview-only asset", async () => {
        const call = vi.fn();
        const app = {
            editor: {
                sceneID: "scene-1",
                assetSource: {kind: "scene"},
            },
            scene: {
                userData: {
                    assetResolutionContext: {
                        logicalIdToAssetId: {},
                        assetIdToRevisionId: {
                            "asset-a": "rev-a2",
                            "asset-c": "rev-c1",
                        },
                        nameToAssetId: {},
                    },
                },
            },
            call,
        };

        const plan = await cleanupSceneDependenciesForSnapshot(app as any, makeSnapshot({
            "asset-a": "rev-a1",
        }));

        expect(plan.needsSync).toBe(true);
        expect(hoisted.updateSceneDependencies).toHaveBeenCalledWith("scene-1", {
            "asset-a": "rev-a1",
        });
        expect(call).toHaveBeenCalledWith("assetRemoved", null, {assetId: "asset-c"});
        expect(call).toHaveBeenCalledWith("copilotPreviewDependenciesRestored", null, expect.objectContaining({
            sceneId: "scene-1",
            removedAssetIds: ["asset-c"],
            restoredAssetIds: ["asset-a"],
        }));
    });
});
