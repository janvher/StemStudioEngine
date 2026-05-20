import {renderHook} from "@testing-library/react";
import {Object3D} from "three";
import {beforeEach, describe, expect, it, vi} from "vitest";

const hoisted = vi.hoisted(() => ({
    forkAsset: vi.fn(),
    getAsset: vi.fn(),
    replaceAsset: vi.fn(),
    updateVFXInstances: vi.fn(),
    uploadVFX: vi.fn(),
    setAssetRevision: vi.fn(),
    showToast: vi.fn(),
    canFork: true,
    globalMock: {
        app: {
            editor: {
                projectUserId: "scene-owner",
                scene: {} as Object3D,
                serializeObject: vi.fn(() => [{}]),
            },
        },
    },
}));

vi.mock("@stem/network/api/asset", () => ({
    AssetType: {Quarks: "quarks"},
    forkAsset: (...args: unknown[]) => hoisted.forkAsset(...args),
    getAsset: (...args: unknown[]) => hoisted.getAsset(...args),
}));
vi.mock("../util", () => ({
    useUpdateVFXInstances: () => hoisted.updateVFXInstances,
}));
vi.mock("../../../context/AssetResolutionContext", () => ({
    useAssetResolutionContext: () => ({setAssetRevision: hoisted.setAssetRevision}),
}));
vi.mock("../../../global", () => ({default: hoisted.globalMock}));
vi.mock("../../../showToast", () => ({showToast: hoisted.showToast}));
vi.mock("../../../vfx/util", () => ({
    getVfxId: (obj: Object3D) => {
        const id = obj.userData?.vfxAssetId;
        return typeof id === "string" ? id : null;
    },
    setVfxId: (obj: Object3D, id: string | null) => {
        if (!id) delete obj.userData.vfxAssetId;
        else obj.userData.vfxAssetId = id;
    },
}));
vi.mock("../../asset-management/hooks/useReplaceAsset", () => ({
    useReplaceAsset: () => hoisted.replaceAsset,
}));
vi.mock("../../assets/v2/common/hooks/useCanEditAsset", () => ({
    useCanEditAsset: () => ({canFork: hoisted.canFork}),
}));
vi.mock("../../assets/v2/LeftPanel/MainTabs/AssetsTab/SubTabs/hooks/useVFXUploader", () => ({
    useVFXUploader: () => ({uploadVFX: hoisted.uploadVFX}),
}));

import {useSaveVfx} from "./vfx";

const makeFakeObject = (overrides: {uuid?: string; vfxAssetId?: string} = {}): Object3D => {
    const userData: Record<string, unknown> = {};
    if (overrides.vfxAssetId) userData.vfxAssetId = overrides.vfxAssetId;
    return {uuid: overrides.uuid ?? "obj-1", userData} as unknown as Object3D;
};

describe("useSaveVfx", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hoisted.canFork = true;
        hoisted.globalMock.app.editor.projectUserId = "scene-owner";
        hoisted.uploadVFX.mockResolvedValue({assetId: "asset-1", revisionId: "rev-1"});
        hoisted.replaceAsset.mockResolvedValue(undefined);
        hoisted.updateVFXInstances.mockResolvedValue(undefined);
    });

    it("brand-new VFX: uploads, sets vfxAssetId, no fork, no replaceAsset, no updateVFXInstances", async () => {
        const obj = makeFakeObject();
        hoisted.uploadVFX.mockResolvedValue({assetId: "new-asset", revisionId: "new-rev"});

        const {result} = renderHook(() => useSaveVfx());
        const saveResult = await result.current({selectedObject: obj, name: "fire"});

        expect(saveResult).toEqual({assetId: "new-asset", revisionId: "new-rev"});
        expect(hoisted.uploadVFX).toHaveBeenCalledWith("fire", [{}], {updateAssetId: undefined});
        expect(hoisted.forkAsset).not.toHaveBeenCalled();
        expect(hoisted.replaceAsset).not.toHaveBeenCalled();
        expect(hoisted.updateVFXInstances).not.toHaveBeenCalled();
        expect(obj.userData.vfxAssetId).toBe("new-asset");
    });

    it("same-id save (asset owned by scene owner): no fork, reloads OTHER instances after upload", async () => {
        const obj = makeFakeObject({uuid: "edited", vfxAssetId: "asset-1"});
        hoisted.getAsset.mockResolvedValue({userId: "scene-owner", headRevisionId: "rev-old"});
        hoisted.uploadVFX.mockResolvedValue({assetId: "asset-1", revisionId: "rev-new"});

        const {result} = renderHook(() => useSaveVfx());
        await result.current({selectedObject: obj, name: "fire"});

        expect(hoisted.forkAsset).not.toHaveBeenCalled();
        expect(hoisted.replaceAsset).not.toHaveBeenCalled();
        expect(hoisted.uploadVFX).toHaveBeenCalledWith("fire", [{}], {updateAssetId: "asset-1"});
        // Other instances of the same asset get reloaded with the just-saved
        // content; the edited one is excluded by uuid.
        expect(hoisted.updateVFXInstances).toHaveBeenCalledWith(expect.any(Object), "asset-1", {
            excludeUuids: ["edited"],
        });
    });

    it("fork-on-save: forks, pins fork.head, uploads to fork id, then replaceAsset with uploaded revision", async () => {
        const obj = makeFakeObject({uuid: "edited", vfxAssetId: "asset-1"});
        hoisted.getAsset.mockResolvedValue({userId: "someone-else", headRevisionId: "rev-old"});
        hoisted.forkAsset.mockResolvedValue({assetId: "fork-1", revisionId: "fork-head"});
        hoisted.uploadVFX.mockResolvedValue({assetId: "fork-1", revisionId: "rev-saved"});

        const callOrder: string[] = [];
        hoisted.forkAsset.mockImplementation(async () => {
            callOrder.push("fork");
            return {assetId: "fork-1", revisionId: "fork-head"};
        });
        hoisted.setAssetRevision.mockImplementation(() => callOrder.push("pin"));
        hoisted.uploadVFX.mockImplementation(async () => {
            callOrder.push("upload");
            return {assetId: "fork-1", revisionId: "rev-saved"};
        });
        hoisted.replaceAsset.mockImplementation(async () => {
            callOrder.push("replace");
        });

        const {result} = renderHook(() => useSaveVfx());
        await result.current({selectedObject: obj, name: "fire"});

        // Order is load-bearing: fork → pin fork.head so uploadVFX can resolve
        // parentRevisionId → upload → replaceAsset with the actually-saved
        // revision id (not fork.head) so other instances reload with the new
        // content.
        expect(callOrder).toEqual(["fork", "pin", "upload", "replace"]);

        expect(hoisted.forkAsset).toHaveBeenCalledWith({
            assetId: "asset-1",
            revisionId: "rev-old",
        });
        expect(hoisted.setAssetRevision).toHaveBeenCalledWith("fork-1", "fork-head");
        expect(hoisted.uploadVFX).toHaveBeenCalledWith("fire", [{}], {updateAssetId: "fork-1"});
        expect(hoisted.replaceAsset).toHaveBeenCalledWith({
            originalAssetId: "asset-1",
            newAssetId: "fork-1",
            newRevisionId: "rev-saved",
            assetType: "quarks",
            excludeUuids: ["edited"],
        });
        // updateVFXInstances is NOT called separately — replaceAsset handles
        // the reload via useChangeQuarksRevision in the fork path.
        expect(hoisted.updateVFXInstances).not.toHaveBeenCalled();
    });

    it("non-owned + !canFork: skips fork, uploads against the original id (back-end will reject)", async () => {
        const obj = makeFakeObject({vfxAssetId: "asset-1"});
        hoisted.getAsset.mockResolvedValue({userId: "someone-else", headRevisionId: "rev-old"});
        hoisted.canFork = false;

        const {result} = renderHook(() => useSaveVfx());
        await result.current({selectedObject: obj, name: "fire"});

        expect(hoisted.forkAsset).not.toHaveBeenCalled();
        expect(hoisted.replaceAsset).not.toHaveBeenCalled();
        expect(hoisted.uploadVFX).toHaveBeenCalledWith("fire", [{}], {updateAssetId: "asset-1"});
    });

    it("fork failure: returns null, surfaces toast, does NOT upload or swap", async () => {
        const obj = makeFakeObject({vfxAssetId: "asset-1"});
        hoisted.getAsset.mockResolvedValue({userId: "someone-else", headRevisionId: "rev-old"});
        hoisted.forkAsset.mockRejectedValue(new Error("fork failed"));

        const {result} = renderHook(() => useSaveVfx());
        const saveResult = await result.current({selectedObject: obj, name: "fire"});

        expect(saveResult).toBeNull();
        expect(hoisted.uploadVFX).not.toHaveBeenCalled();
        expect(hoisted.replaceAsset).not.toHaveBeenCalled();
        expect(hoisted.showToast).toHaveBeenCalledWith(expect.objectContaining({type: "error"}));
    });

    it("asset fetch failure: returns null without uploading", async () => {
        const obj = makeFakeObject({vfxAssetId: "asset-1"});
        hoisted.getAsset.mockRejectedValue(new Error("network down"));

        const {result} = renderHook(() => useSaveVfx());
        const saveResult = await result.current({selectedObject: obj, name: "fire"});

        expect(saveResult).toBeNull();
        expect(hoisted.uploadVFX).not.toHaveBeenCalled();
        expect(hoisted.forkAsset).not.toHaveBeenCalled();
    });

    it("upload returns null: returns null and does NOT mutate vfxAssetId", async () => {
        const obj = makeFakeObject({vfxAssetId: "asset-1"});
        hoisted.getAsset.mockResolvedValue({userId: "scene-owner", headRevisionId: "rev-old"});
        hoisted.uploadVFX.mockResolvedValue(null);

        const {result} = renderHook(() => useSaveVfx());
        const saveResult = await result.current({selectedObject: obj, name: "fire"});

        expect(saveResult).toBeNull();
        expect(obj.userData.vfxAssetId).toBe("asset-1");
        expect(hoisted.replaceAsset).not.toHaveBeenCalled();
        expect(hoisted.updateVFXInstances).not.toHaveBeenCalled();
    });

    it("post-fork swap failure: returns null", async () => {
        const obj = makeFakeObject({uuid: "edited", vfxAssetId: "asset-1"});
        hoisted.getAsset.mockResolvedValue({userId: "someone-else", headRevisionId: "rev-old"});
        hoisted.forkAsset.mockResolvedValue({assetId: "fork-1", revisionId: "fork-head"});
        hoisted.uploadVFX.mockResolvedValue({assetId: "fork-1", revisionId: "rev-saved"});
        hoisted.replaceAsset.mockRejectedValue(new Error("swap failed"));

        const {result} = renderHook(() => useSaveVfx());
        const saveResult = await result.current({selectedObject: obj, name: "fire"});

        expect(saveResult).toBeNull();
        expect(hoisted.showToast).toHaveBeenCalledWith(expect.objectContaining({type: "error"}));
    });
});
