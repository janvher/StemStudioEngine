import {renderHook} from "@testing-library/react";
import {Object3D, Scene} from "three";
import {beforeEach, describe, expect, it, vi} from "vitest";

const hoisted = vi.hoisted(() => ({
    createAssetRevisionMutateAsync: vi.fn(),
    createThumbnailDerivative: vi.fn(),
    forkAsset: vi.fn(),
    getAsset: vi.fn(),
    replaceAsset: vi.fn(),
    saveScene: vi.fn(),
    setAssetRevision: vi.fn(),
    updatePrefabInstances: vi.fn(),
    canConvertToPrefab: vi.fn(),
    getPrefabId: vi.fn(),
    getPrefabEditRevisionId: vi.fn(),
    lockPrefab: vi.fn(),
    getScene: vi.fn(),
    serializePrefab: vi.fn(),
    showToast: vi.fn(),
    canFork: true,
    globalMock: {
        app: {
            editor: {
                projectUserId: "scene-owner",
                select: vi.fn(),
            },
            call: vi.fn(),
        },
    },
}));

vi.mock("@stem/network/api/asset", () => ({
    AssetType: {Prefab: "prefab"},
    forkAsset: (...args: unknown[]) => hoisted.forkAsset(...args),
    getAsset: (...args: unknown[]) => hoisted.getAsset(...args),
}));
vi.mock("@stem/network/api/scene", () => ({
    saveScene: (...args: unknown[]) => hoisted.saveScene(...args),
}));
vi.mock("../../asset-management/hooks/assets", () => ({
    useAddEditorDependencies: () => ({mutateAsync: vi.fn()}),
    useCreateAssetRevisionWithData: () => ({mutateAsync: hoisted.createAssetRevisionMutateAsync}),
    useCreateAssetWithData: () => ({mutateAsync: vi.fn()}),
}));
vi.mock("../../asset-management/hooks/useReplaceAsset", () => ({
    useReplaceAsset: () => hoisted.replaceAsset,
}));
vi.mock("../../assets/v2/common/hooks/useCanEditAsset", () => ({
    useCanEditAsset: () => ({canFork: hoisted.canFork}),
}));
vi.mock("../../models/hooks/models", () => ({
    useCreateThumbnailDerivative: () => hoisted.createThumbnailDerivative,
    useUpdateModelInstances: () => vi.fn(),
}));
vi.mock("../../../context/AssetResolutionContext", () => ({
    useAssetResolutionContext: () => ({setAssetRevision: hoisted.setAssetRevision}),
}));
vi.mock("../../../prefab/util", () => ({
    canConvertToPrefab: (...args: unknown[]) => hoisted.canConvertToPrefab(...args),
    checkPrefabUnlock: vi.fn(() => ({canUnlock: true, conflicts: [], newDependencies: {}})),
    PrefabConversionError: {None: "none"},
    getPrefabId: (...args: unknown[]) => hoisted.getPrefabId(...args),
    getPrefabEditRevisionId: (...args: unknown[]) => hoisted.getPrefabEditRevisionId(...args),
    isPrefab: vi.fn(() => false),
    isPrefabUnlocked: vi.fn(() => true),
    isPrefabUnlockedInScene: vi.fn(() => false),
    loadPrefab: vi.fn(),
    lockPrefab: (...args: unknown[]) => hoisted.lockPrefab(...args),
    setPrefabId: vi.fn(),
    unlockPrefab: vi.fn(),
}));
vi.mock("../../../prefab/serialization", () => ({
    serializePrefab: (...args: unknown[]) => hoisted.serializePrefab(...args),
}));
vi.mock("../../../showToast", () => ({
    showToast: (...args: unknown[]) => hoisted.showToast(...args),
}));
vi.mock("../../../global", () => ({default: hoisted.globalMock}));
vi.mock("../../../utils/SceneUtil", () => ({
    getScene: (...args: unknown[]) => hoisted.getScene(...args),
    traverseSceneDepthFirst: vi.fn(),
}));
vi.mock("../../../utils/ElementsUtils", () => ({
    ElementsUtils: {
        // Auto-confirm so the save flow runs synchronously in the test.
        confirm: ({onOK}: {onOK: () => void}) => onOK(),
    },
}));
vi.mock("../../../utils/MeshUtils", () => ({
    default: {dispose: vi.fn()},
}));
vi.mock("../../../utils/Converter", () => ({
    default: {dataURLtoFile: vi.fn(() => new File([""], "thumb"))},
}));
vi.mock("../../../utils/ModelUtils", () => ({
    ModelUtils: {createThumbnailFromModel: vi.fn(() => "data:image/png;base64,abc")},
}));
vi.mock("../../../utils/ObjectUtils", () => ({
    cloneObject: vi.fn(o => o),
}));
vi.mock("../../../v2/pages/services", () => ({
    generateUniqueName: vi.fn((n: string) => n),
    getObjectNamesInScene: vi.fn(() => new Set<string>()),
}));
vi.mock("../../assets/v2/LeftPanel/MainTabs/AssetsTab/ModelUpload/constants", () => ({
    THUMBNAIL_SIZE: 256,
}));
vi.mock("../../../command/Commands", () => ({
    AddObjectCommand: vi.fn(),
    RemoveObjectCommand: vi.fn(),
}));

// useUpdatePrefabInstances and useCreatePrefabRevision are defined in the
// same module under test, so we can't mock them at import boundaries. The
// mocks above stub their internal dependencies (createAssetRevisionMutateAsync,
// createThumbnailDerivative, etc.) so the real wrappers behave predictably.
import {useSavePrefab} from "./prefabs";

const flush = () => new Promise(resolve => setImmediate(resolve));

describe("useSavePrefab", () => {
    let scene: Scene;
    let selected: Object3D;

    beforeEach(() => {
        vi.clearAllMocks();
        hoisted.canFork = true;
        hoisted.globalMock.app.editor.projectUserId = "scene-owner";
        hoisted.canConvertToPrefab.mockReturnValue("none");
        hoisted.serializePrefab.mockReturnValue({
            data: "{}",
            assetResolutionContext: {assetIdToRevisionId: {}, logicalIdToAssetId: {}},
        });
        hoisted.createAssetRevisionMutateAsync.mockResolvedValue({id: "rev-saved"});
        hoisted.createThumbnailDerivative.mockResolvedValue(undefined);
        hoisted.replaceAsset.mockResolvedValue(undefined);
        hoisted.updatePrefabInstances.mockResolvedValue(undefined);
        hoisted.saveScene.mockResolvedValue(undefined);

        scene = {} as Scene;
        selected = {uuid: "edited", userData: {}, name: "stem"} as unknown as Object3D;
        hoisted.getScene.mockReturnValue(scene);
        hoisted.getPrefabId.mockReturnValue("prefab-1");
        hoisted.getPrefabEditRevisionId.mockReturnValue("rev-edit");
    });

    it("same-id save (asset owned by scene owner): no fork, just createRevision + setAssetRevision + lock", async () => {
        hoisted.getAsset.mockResolvedValue({userId: "scene-owner", headRevisionId: "rev-edit"});

        const {result} = renderHook(() => useSavePrefab());
        await result.current(selected);
        await flush();
        await flush();

        expect(hoisted.forkAsset).not.toHaveBeenCalled();
        expect(hoisted.replaceAsset).not.toHaveBeenCalled();
        // createPrefabRevision called against the original prefab id with
        // the user's edit-base revision as parent.
        expect(hoisted.createAssetRevisionMutateAsync).toHaveBeenCalledWith(
            expect.objectContaining({assetId: "prefab-1", parentRevisionId: "rev-edit"}),
        );
        expect(hoisted.setAssetRevision).toHaveBeenCalledWith("prefab-1", "rev-saved");
        expect(hoisted.lockPrefab).toHaveBeenCalledWith(selected);
    });

    it("fork-on-save: forks → creates revision on fork id → replaceAsset with saved revision + excludeUuids", async () => {
        hoisted.getAsset.mockResolvedValue({userId: "someone-else", headRevisionId: "rev-edit"});
        hoisted.forkAsset.mockResolvedValue({assetId: "fork-1", revisionId: "fork-head"});

        const callOrder: string[] = [];
        hoisted.forkAsset.mockImplementation(async () => {
            callOrder.push("fork");
            return {assetId: "fork-1", revisionId: "fork-head"};
        });
        hoisted.createAssetRevisionMutateAsync.mockImplementation(async () => {
            callOrder.push("createRevision");
            return {id: "rev-saved"};
        });
        hoisted.replaceAsset.mockImplementation(async () => {
            callOrder.push("replace");
        });

        const {result} = renderHook(() => useSavePrefab());
        await result.current(selected);
        await flush();
        await flush();

        // Order: fork → createRevision against fork id → replaceAsset with
        // the actually-saved revision id (so reloaded instances pick up the
        // edit, not the byte-identical fork.head).
        expect(callOrder).toEqual(["fork", "createRevision", "replace"]);

        expect(hoisted.forkAsset).toHaveBeenCalledWith({
            assetId: "prefab-1",
            revisionId: "rev-edit",
        });
        expect(hoisted.createAssetRevisionMutateAsync).toHaveBeenCalledWith(
            expect.objectContaining({assetId: "fork-1", parentRevisionId: "fork-head"}),
        );
        expect(hoisted.replaceAsset).toHaveBeenCalledWith({
            originalAssetId: "prefab-1",
            newAssetId: "fork-1",
            newRevisionId: "rev-saved",
            assetType: "prefab",
            excludeUuids: ["edited"],
        });
        // Non-fork pin path is bypassed when forking — replaceAsset handles
        // the pin update via useChangePrefabRevision.
        expect(hoisted.setAssetRevision).not.toHaveBeenCalled();
        expect(hoisted.lockPrefab).toHaveBeenCalledWith(selected);
    });

    it("non-owned + !canFork: skips fork, falls back to same-id save (back-end will reject)", async () => {
        hoisted.canFork = false;
        hoisted.getAsset.mockResolvedValue({userId: "someone-else", headRevisionId: "rev-edit"});

        const {result} = renderHook(() => useSavePrefab());
        await result.current(selected);
        await flush();
        await flush();

        expect(hoisted.forkAsset).not.toHaveBeenCalled();
        expect(hoisted.replaceAsset).not.toHaveBeenCalled();
        expect(hoisted.createAssetRevisionMutateAsync).toHaveBeenCalledWith(
            expect.objectContaining({assetId: "prefab-1"}),
        );
    });

    it("fork failure: surfaces toast and skips createRevision + replaceAsset", async () => {
        hoisted.getAsset.mockResolvedValue({userId: "someone-else", headRevisionId: "rev-edit"});
        hoisted.forkAsset.mockRejectedValue(new Error("fork failed"));

        const {result} = renderHook(() => useSavePrefab());
        await result.current(selected);
        await flush();
        await flush();

        expect(hoisted.createAssetRevisionMutateAsync).not.toHaveBeenCalled();
        expect(hoisted.replaceAsset).not.toHaveBeenCalled();
        expect(hoisted.showToast).toHaveBeenCalledWith(expect.objectContaining({type: "error"}));
    });

    it("asset fetch failure: bails before any save action", async () => {
        hoisted.getAsset.mockRejectedValue(new Error("network down"));

        const {result} = renderHook(() => useSavePrefab());
        await result.current(selected);

        expect(hoisted.forkAsset).not.toHaveBeenCalled();
        expect(hoisted.createAssetRevisionMutateAsync).not.toHaveBeenCalled();
        expect(hoisted.showToast).toHaveBeenCalledWith(expect.objectContaining({type: "error"}));
    });
});
