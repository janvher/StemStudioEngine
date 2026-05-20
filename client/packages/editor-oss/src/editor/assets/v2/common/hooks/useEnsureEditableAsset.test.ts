import {renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

const hoisted = vi.hoisted(() => ({
    useCanEditAsset: vi.fn(),
    forkAsset: vi.fn(),
    replaceAsset: vi.fn(),
}));

vi.mock("./useCanEditAsset", () => ({
    useCanEditAsset: (...args: unknown[]) => hoisted.useCanEditAsset(...args),
}));

vi.mock("@stem/network/api/asset", () => ({
    AssetType: {Behavior: "behavior", Model: "model", Prefab: "prefab"},
    forkAsset: (...args: unknown[]) => hoisted.forkAsset(...args),
}));

vi.mock("../../../../asset-management/hooks/useReplaceAsset", () => ({
    useReplaceAsset: () => hoisted.replaceAsset,
}));

import {useEnsureEditableAsset} from "./useEnsureEditableAsset";

const baseParams = {
    assetId: "asset-1",
    assetOwnerId: "owner-1",
    assetType: "behavior" as const,
    revisionId: "rev-1",
};

const mockPermissions = (overrides: Partial<{
    canEdit: boolean;
    canFork: boolean;
    isCheckingCollaborator: boolean;
}> = {}) => {
    hoisted.useCanEditAsset.mockReturnValue({
        canEdit: false,
        canFork: false,
        isAdmin: false,
        isSceneOwner: false,
        isCollaborator: false,
        isCheckingCollaborator: false,
        ...overrides,
    });
};

describe("useEnsureEditableAsset", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPermissions();
        hoisted.forkAsset.mockResolvedValue({assetId: "fork-1", revisionId: "fork-rev-1"});
        hoisted.replaceAsset.mockResolvedValue(undefined);
    });

    it("exposes canEdit/canFork passthrough from useCanEditAsset", () => {
        mockPermissions({canEdit: true, canFork: true});
        const {result} = renderHook(() => useEnsureEditableAsset(baseParams));
        expect(result.current.canEdit).toBe(true);
        expect(result.current.canFork).toBe(true);
    });

    it("exposes isCheckingPermissions while the collaborator check is pending", () => {
        mockPermissions({isCheckingCollaborator: true});
        const {result} = renderHook(() => useEnsureEditableAsset(baseParams));
        expect(result.current.isCheckingPermissions).toBe(true);
    });

    it("fork(): forks the asset and dispatches the scene-ref swap", async () => {
        mockPermissions({canFork: true});

        const {result} = renderHook(() => useEnsureEditableAsset(baseParams));
        const editable = await result.current.fork();

        expect(hoisted.forkAsset).toHaveBeenCalledWith({assetId: "asset-1", revisionId: "rev-1"});
        expect(hoisted.replaceAsset).toHaveBeenCalledWith({
            originalAssetId: "asset-1",
            newAssetId: "fork-1",
            newRevisionId: "fork-rev-1",
            assetType: "behavior",
        });
        expect(editable).toEqual({assetId: "fork-1", revisionId: "fork-rev-1"});
    });

    it("fork(): throws when the user has no path to fork (not a contributor / read-only / template)", async () => {
        mockPermissions({canFork: false});

        const {result} = renderHook(() => useEnsureEditableAsset(baseParams));
        await expect(result.current.fork()).rejects.toThrow(/not a contributor/);

        expect(hoisted.forkAsset).not.toHaveBeenCalled();
        expect(hoisted.replaceAsset).not.toHaveBeenCalled();
    });

    it("fork(): dedupes concurrent calls so a double-click doesn't create two forks", async () => {
        mockPermissions({canFork: true});
        let resolveFork: ((v: {assetId: string; revisionId: string}) => void) | undefined;
        hoisted.forkAsset.mockImplementation(
            () => new Promise(resolve => {
                resolveFork = resolve;
            }),
        );

        const {result} = renderHook(() => useEnsureEditableAsset(baseParams));
        const a = result.current.fork();
        const b = result.current.fork();

        expect(hoisted.forkAsset).toHaveBeenCalledTimes(1);
        resolveFork?.({assetId: "fork-1", revisionId: "fork-rev-1"});

        const [resA, resB] = await Promise.all([a, b]);
        expect(resA).toEqual({assetId: "fork-1", revisionId: "fork-rev-1"});
        expect(resB).toEqual({assetId: "fork-1", revisionId: "fork-rev-1"});
        expect(hoisted.replaceAsset).toHaveBeenCalledTimes(1);
    });

    it("fork(): clears in-flight tracking on failure so retry can proceed", async () => {
        mockPermissions({canFork: true});
        hoisted.forkAsset.mockRejectedValueOnce(new Error("network glitch"));

        const {result} = renderHook(() => useEnsureEditableAsset(baseParams));
        await expect(result.current.fork()).rejects.toThrow("network glitch");

        hoisted.forkAsset.mockResolvedValueOnce({assetId: "fork-1", revisionId: "fork-rev-1"});
        const editable = await result.current.fork();
        expect(editable).toEqual({assetId: "fork-1", revisionId: "fork-rev-1"});
        expect(hoisted.forkAsset).toHaveBeenCalledTimes(2);
    });
});
