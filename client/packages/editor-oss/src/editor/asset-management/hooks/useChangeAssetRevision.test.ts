import {renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

const hoisted = vi.hoisted(() => ({
    setAssetRevision: vi.fn(),
    removeAssetRevision: vi.fn(),
    mapAssetIds: vi.fn(),
    resolveAllSceneAssetRefs: vi.fn(),
    getAssetResolutionContext: vi.fn(),
    updateAssetRefs: vi.fn(),
    globalMock: {app: {editor: null}},
}));

vi.mock("../../../global", () => ({
    default: hoisted.globalMock,
}));

vi.mock("../../../context/AssetResolutionContext", () => ({
    useAssetResolutionContext: () => ({
        setAssetRevision: hoisted.setAssetRevision,
        removeAssetRevision: hoisted.removeAssetRevision,
    }),
}));

vi.mock("../../../asset-management/dependencies", () => ({
    mapAssetIds: (...args: unknown[]) => hoisted.mapAssetIds(...args),
    resolveAllSceneAssetRefs: (...args: unknown[]) => hoisted.resolveAllSceneAssetRefs(...args),
}));

vi.mock("../../../asset-management/AssetResolutionContext", () => ({
    getAssetResolutionContext: (...args: unknown[]) => hoisted.getAssetResolutionContext(...args),
}));

import {useChangeAssetRevision} from "./useChangeAssetRevision";

const sceneContext = {assetIdToRevisionId: {old: "rev-1"}};
const scene = {} as object;

const setupEditor = () => {
    hoisted.globalMock.app = {
        editor: {
            scene,
            behaviorPluginManager: {updateAssetRefs: hoisted.updateAssetRefs},
        },
    } as never;
};

describe("useChangeAssetRevision", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setupEditor();
        hoisted.getAssetResolutionContext.mockReturnValue(sceneContext);
    });

    it("warns and returns when no scene is available", async () => {
        hoisted.globalMock.app = {editor: {scene: null}} as never;
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const {result} = renderHook(() => useChangeAssetRevision());
        await result.current("asset-1", "rev-2");

        expect(warn).toHaveBeenCalledWith("[useChangeAssetRevision] No scene available.");
        expect(hoisted.setAssetRevision).not.toHaveBeenCalled();
        expect(hoisted.mapAssetIds).not.toHaveBeenCalled();
        expect(hoisted.resolveAllSceneAssetRefs).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it("same-id revision change: pins new revision, runs updateInstances, resolves refs, skips remap", async () => {
        const updateInstances = vi.fn().mockResolvedValue(undefined);

        const {result} = renderHook(() => useChangeAssetRevision());
        await result.current("asset-1", "rev-2", updateInstances);

        expect(hoisted.setAssetRevision).toHaveBeenCalledWith("asset-1", "rev-2");
        expect(updateInstances).toHaveBeenCalledTimes(1);
        expect(hoisted.mapAssetIds).not.toHaveBeenCalled();
        expect(hoisted.removeAssetRevision).not.toHaveBeenCalled();
        expect(hoisted.resolveAllSceneAssetRefs).toHaveBeenCalledWith(scene, sceneContext);
        expect(hoisted.updateAssetRefs).toHaveBeenCalledWith(scene, "asset-1");
    });

    it("treats newAssetId equal to assetId as a same-id change", async () => {
        const {result} = renderHook(() => useChangeAssetRevision());
        await result.current("asset-1", "rev-2", undefined, "asset-1");

        expect(hoisted.setAssetRevision).toHaveBeenCalledWith("asset-1", "rev-2");
        expect(hoisted.mapAssetIds).not.toHaveBeenCalled();
        expect(hoisted.removeAssetRevision).not.toHaveBeenCalled();
    });

    it("id swap: pins new id, remaps scene refs, removes old context entry, then resolves", async () => {
        const callOrder: string[] = [];
        hoisted.setAssetRevision.mockImplementation(() => callOrder.push("setAssetRevision"));
        const updateInstances = vi.fn().mockImplementation(async () => {
            callOrder.push("updateInstances");
        });
        hoisted.mapAssetIds.mockImplementation(() => callOrder.push("mapAssetIds"));
        hoisted.removeAssetRevision.mockImplementation(() => callOrder.push("removeAssetRevision"));
        hoisted.resolveAllSceneAssetRefs.mockImplementation(() => callOrder.push("resolveAllSceneAssetRefs"));
        hoisted.updateAssetRefs.mockImplementation(() => callOrder.push("updateAssetRefs"));

        const {result} = renderHook(() => useChangeAssetRevision());
        await result.current("old-id", "rev-new", updateInstances, "new-id");

        // Pin under the EFFECTIVE (new) id so loaders called from updateInstances
        // resolve to the forked revision.
        expect(hoisted.setAssetRevision).toHaveBeenCalledWith("new-id", "rev-new");
        expect(hoisted.mapAssetIds).toHaveBeenCalledTimes(1);
        expect(hoisted.mapAssetIds.mock.calls[0]?.[0]).toBe(scene);
        expect(hoisted.mapAssetIds.mock.calls[0]?.[1]).toBe(sceneContext);
        expect(hoisted.removeAssetRevision).toHaveBeenCalledWith("old-id");
        expect(hoisted.resolveAllSceneAssetRefs).toHaveBeenCalledWith(scene, sceneContext);
        expect(hoisted.updateAssetRefs).toHaveBeenCalledWith(scene, "new-id");

        expect(callOrder).toEqual([
            "setAssetRevision",
            "updateInstances",
            "mapAssetIds",
            "removeAssetRevision",
            "resolveAllSceneAssetRefs",
            "updateAssetRefs",
        ]);
    });

    it("remap callback rewrites old→new only for scene-level refs and only for the swapped id", async () => {
        let capturedCallback:
            | ((id: string, ctx: object, source?: unknown) => string)
            | undefined;
        hoisted.mapAssetIds.mockImplementation(
            (_scene: unknown, _ctx: unknown, cb: (id: string, ctx: object) => string) => {
                capturedCallback = cb;
            },
        );

        const {result} = renderHook(() => useChangeAssetRevision());
        await result.current("old-id", "rev-new", undefined, "new-id");

        expect(capturedCallback).toBeDefined();
        const cb = capturedCallback!;

        // Scene-level ref to the swapped id: rewritten.
        expect(cb("old-id", sceneContext)).toBe("new-id");

        // Scene-level ref to a different id: untouched.
        expect(cb("other-id", sceneContext)).toBe("other-id");

        // Inside-a-prefab ref (different context object) to the swapped id:
        // untouched, because the prefab carries its own resolution context
        // and should keep referencing the original asset.
        const prefabContext = {assetIdToRevisionId: {"old-id": "prefab-pinned-rev"}};
        expect(cb("old-id", prefabContext)).toBe("old-id");
    });

    it("falls back to an empty context when the scene has none", async () => {
        hoisted.getAssetResolutionContext.mockReturnValue(undefined);

        const {result} = renderHook(() => useChangeAssetRevision());
        await result.current("asset-1", "rev-2");

        expect(hoisted.resolveAllSceneAssetRefs).toHaveBeenCalledTimes(1);
        const ctxArg = hoisted.resolveAllSceneAssetRefs.mock.calls[0]?.[1];
        expect(ctxArg).toEqual({});
    });

    it("works without an updateInstances callback", async () => {
        const {result} = renderHook(() => useChangeAssetRevision());
        await expect(result.current("asset-1", "rev-2")).resolves.toBeUndefined();

        expect(hoisted.setAssetRevision).toHaveBeenCalledWith("asset-1", "rev-2");
        expect(hoisted.resolveAllSceneAssetRefs).toHaveBeenCalledWith(scene, sceneContext);
    });
});
