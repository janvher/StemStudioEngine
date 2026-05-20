import {Object3D} from "three";
import {describe, expect, it, vi, beforeEach} from "vitest";

vi.mock("@stem/network/api/asset", () => ({
    createAssetRevisionWithData: vi.fn(),
    getAsset: vi.fn(),
    isNoChangesError: (err: unknown) => (err as {kind?: string})?.kind === "no-changes",
    isConflictError: (err: unknown) => (err as {kind?: string})?.kind === "conflict",
}));

vi.mock("../../utils/ElementsUtils", () => ({
    ElementsUtils: {
        confirm: vi.fn(),
    },
}));

vi.mock("../../asset-management/AssetResolutionContext", () => ({
    getAssetResolutionContext: vi.fn(),
    resolveAssetRevisionId: (assetId: string, context: {assetIdToRevisionId?: Record<string, string>}) =>
        context.assetIdToRevisionId?.[assetId],
    setAssetRevision: vi.fn(),
}));

vi.mock("../../prefab/serialization", () => ({
    serializePrefab: vi.fn(),
}));

vi.mock("../../prefab/util", () => ({
    getPrefabId: (obj: any) => obj.userData?.prefabId ?? null,
}));

vi.mock("../../showToast", () => ({
    showToast: vi.fn(),
}));

vi.mock("../../utils/TimeUtils", () => ({
    default: {getServerUTCTime: () => "2026-01-01T00:00:00Z"},
}));

vi.mock("../../global", () => ({
    default: {app: null},
}));

import {createAssetRevisionWithData, getAsset} from "@stem/network/api/asset";
import {getAssetResolutionContext, setAssetRevision} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {serializePrefab} from "@stem/editor-oss/prefab/serialization";
import {showToast} from "@stem/editor-oss/showToast";
import {ElementsUtils} from "@stem/editor-oss/utils/ElementsUtils";
import global from "@stem/editor-oss/global";
import {saveStemEditor} from "./saveStemEditor";

// --- Helpers ---

const stemAssetId = "stem-1";
const baseRevisionId = "base-rev-1";
const newRevisionId = "new-rev-1";

const createMockScene = () => {
    const scene = new Object3D();
    scene.userData.stemEditor = {
        assetId: stemAssetId,
    };

    const stemInstance = new Object3D();
    stemInstance.userData.prefabId = stemAssetId;
    stemInstance.userData.prefabEditRevisionId = baseRevisionId;
    scene.add(stemInstance);

    return {scene, stemInstance};
};

// Default context: stem's own revision is always present (setUpStemEditor
// always seeds it). Tests that need different deps override this per-test.
const mockContextWithStem = (extra: Record<string, string> = {}) => ({
    assetIdToRevisionId: {
        [stemAssetId]: baseRevisionId,
        ...extra,
    },
});

const setupApp = (scene: Object3D) => {
    (global as any).app = {
        scene,
        editor: {
            selected: null,
            select: vi.fn(),
            assetSource: {},
        },
        call: vi.fn(),
    };
};

// --- Tests ---

describe("saveStemEditor", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("reads dependencies from local context excluding stem's own ID", async () => {
        const {scene} = createMockScene();
        setupApp(scene);

        vi.mocked(getAssetResolutionContext).mockReturnValue(
            mockContextWithStem({"dep-1": "rev-1", "dep-2": "rev-2"}),
        );
        vi.mocked(serializePrefab).mockReturnValue({
            data: "{}",
            assetResolutionContext: {logicalIdToAssetId: {}},
        });
        vi.mocked(createAssetRevisionWithData).mockResolvedValue({id: newRevisionId} as any);

        await saveStemEditor();

        expect(createAssetRevisionWithData).toHaveBeenCalledWith(
            expect.objectContaining({
                assetId: stemAssetId,
                parentRevisionId: baseRevisionId,
                options: expect.objectContaining({
                    dependencies: {"dep-1": "rev-1", "dep-2": "rev-2"},
                }),
            }),
        );
        const callArgs = vi.mocked(createAssetRevisionWithData).mock.calls[0]![0] as any;
        expect(callArgs.options.dependencies).not.toHaveProperty(stemAssetId);
    });

    it("updates scene context with new stem revision after save", async () => {
        const {scene} = createMockScene();
        setupApp(scene);

        vi.mocked(getAssetResolutionContext).mockReturnValue(mockContextWithStem());
        vi.mocked(serializePrefab).mockReturnValue({
            data: "{}",
            assetResolutionContext: {logicalIdToAssetId: {}},
        });
        vi.mocked(createAssetRevisionWithData).mockResolvedValue({id: newRevisionId} as any);

        await saveStemEditor();

        expect(setAssetRevision).toHaveBeenCalledWith(scene, stemAssetId, newRevisionId);
    });

    it("updates stem instance prefabEditRevisionId", async () => {
        const {scene, stemInstance} = createMockScene();
        setupApp(scene);

        vi.mocked(getAssetResolutionContext).mockReturnValue(mockContextWithStem());
        vi.mocked(serializePrefab).mockReturnValue({
            data: "{}",
            assetResolutionContext: {logicalIdToAssetId: {}},
        });
        vi.mocked(createAssetRevisionWithData).mockResolvedValue({id: newRevisionId} as any);

        await saveStemEditor();

        expect(stemInstance.userData.prefabEditRevisionId).toBe(newRevisionId);
    });

    it("deselects before serialization and restores after", async () => {
        const {scene} = createMockScene();
        setupApp(scene);
        const mockSelected = new Object3D();
        (global as any).app.editor.selected = mockSelected;

        vi.mocked(getAssetResolutionContext).mockReturnValue(mockContextWithStem());
        vi.mocked(serializePrefab).mockReturnValue({
            data: "{}",
            assetResolutionContext: {logicalIdToAssetId: {}},
        });
        vi.mocked(createAssetRevisionWithData).mockResolvedValue({id: newRevisionId} as any);

        await saveStemEditor();

        const selectCalls = (global as any).app.editor.select.mock.calls;
        expect(selectCalls[0][0]).toBeNull();
        expect(selectCalls[1][0]).toBe(mockSelected);
    });

    it("shows error toast when not in stem editor mode", async () => {
        const scene = new Object3D();
        setupApp(scene);

        await saveStemEditor();

        expect(showToast).toHaveBeenCalledWith(
            expect.objectContaining({type: "error", title: "Cannot save: not in stem editor mode."}),
        );
        expect(createAssetRevisionWithData).not.toHaveBeenCalled();
        expect((global as any).app.call).toHaveBeenCalledWith("sceneSaveFailed");
    });

    it("shows error toast when stem instance not found", async () => {
        const scene = new Object3D();
        scene.userData.stemEditor = {assetId: "nonexistent"};
        setupApp(scene);

        await saveStemEditor();

        expect(showToast).toHaveBeenCalledWith(
            expect.objectContaining({title: "Cannot save: stem instance not found in scene."}),
        );
        expect((global as any).app.call).toHaveBeenCalledWith("sceneSaveFailed");
    });

    it("shows error toast when stem revision is missing from context", async () => {
        const {scene} = createMockScene();
        setupApp(scene);

        vi.mocked(getAssetResolutionContext).mockReturnValue({assetIdToRevisionId: {}});

        await saveStemEditor();

        expect(showToast).toHaveBeenCalledWith(
            expect.objectContaining({title: "Cannot save: stem base revision not resolved."}),
        );
        expect(createAssetRevisionWithData).not.toHaveBeenCalled();
        expect((global as any).app.call).toHaveBeenCalledWith("sceneSaveFailed");
    });

    it("fires sceneSaveFailed when serialization throws", async () => {
        const {scene} = createMockScene();
        setupApp(scene);

        vi.mocked(getAssetResolutionContext).mockReturnValue(mockContextWithStem());
        vi.mocked(serializePrefab).mockImplementation(() => {
            throw new Error("boom");
        });

        await saveStemEditor();

        expect(showToast).toHaveBeenCalledWith(
            expect.objectContaining({type: "error", title: "Failed to serialize stem."}),
        );
        expect((global as any).app.call).toHaveBeenCalledWith("sceneSaveFailed");
        expect(createAssetRevisionWithData).not.toHaveBeenCalled();
    });

    it("treats a no-changes error as a successful no-op save", async () => {
        const {scene} = createMockScene();
        setupApp(scene);

        vi.mocked(getAssetResolutionContext).mockReturnValue(mockContextWithStem());
        vi.mocked(serializePrefab).mockReturnValue({
            data: "{}",
            assetResolutionContext: {logicalIdToAssetId: {}},
        });
        vi.mocked(createAssetRevisionWithData).mockRejectedValue({kind: "no-changes"});

        await saveStemEditor();

        expect(showToast).toHaveBeenCalledWith(
            expect.objectContaining({type: "info", title: "No changes to save."}),
        );
        expect((global as any).app.call).toHaveBeenCalledWith("sceneSaved", null, {showToast: false});
        expect((global as any).app.call).not.toHaveBeenCalledWith("sceneSaveFailed");
        // Nothing updated because there's no new revision.
        expect(setAssetRevision).not.toHaveBeenCalled();
    });

    it("prompts the user to overwrite when the server returns a conflict", async () => {
        const {scene} = createMockScene();
        setupApp(scene);

        vi.mocked(getAssetResolutionContext).mockReturnValue(mockContextWithStem());
        vi.mocked(serializePrefab).mockReturnValue({
            data: "{}",
            assetResolutionContext: {logicalIdToAssetId: {}},
        });
        vi.mocked(createAssetRevisionWithData).mockRejectedValue({kind: "conflict"});

        await saveStemEditor();

        expect(ElementsUtils.confirm).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "Stem has been updated elsewhere",
                okText: "Overwrite",
                cancelText: "Cancel",
            }),
        );
        // Dialog is still open; sceneSaveFailed hasn't fired yet.
        expect((global as any).app.call).not.toHaveBeenCalledWith("sceneSaveFailed");
    });

    it("re-anchors on the current head and retries the save when the user chooses to overwrite", async () => {
        const {scene} = createMockScene();
        setupApp(scene);

        vi.mocked(getAssetResolutionContext).mockReturnValue(mockContextWithStem());
        vi.mocked(serializePrefab).mockReturnValue({
            data: "{}",
            assetResolutionContext: {logicalIdToAssetId: {}},
        });
        // First call conflicts, second (retry) succeeds.
        vi.mocked(createAssetRevisionWithData)
            .mockRejectedValueOnce({kind: "conflict"})
            .mockResolvedValueOnce({id: newRevisionId} as any);
        vi.mocked(getAsset).mockResolvedValue({
            id: stemAssetId,
            headRevisionId: "server-head-rev",
        } as any);

        await saveStemEditor();

        // Trigger the overwrite path.
        const confirmCall = vi.mocked(ElementsUtils.confirm).mock.calls[0]![0];
        await confirmCall!.onOK!();

        // Waited out the async retry. The overwrite fetched the server's
        // head, wrote it into the context, then the retry succeeded.
        expect(getAsset).toHaveBeenCalledWith(stemAssetId);
        expect(setAssetRevision).toHaveBeenCalledWith(scene, stemAssetId, "server-head-rev");
        expect(createAssetRevisionWithData).toHaveBeenCalledTimes(2);
        expect(showToast).toHaveBeenCalledWith(expect.objectContaining({title: "Stem saved."}));
    });

    it("fires sceneSaveFailed and shows a cancel toast when the user cancels the overwrite", async () => {
        const {scene} = createMockScene();
        setupApp(scene);

        vi.mocked(getAssetResolutionContext).mockReturnValue(mockContextWithStem());
        vi.mocked(serializePrefab).mockReturnValue({
            data: "{}",
            assetResolutionContext: {logicalIdToAssetId: {}},
        });
        vi.mocked(createAssetRevisionWithData).mockRejectedValue({kind: "conflict"});

        await saveStemEditor();

        const confirmCall = vi.mocked(ElementsUtils.confirm).mock.calls[0]![0];
        confirmCall!.onCancel!();

        expect((global as any).app.call).toHaveBeenCalledWith("sceneSaveFailed");
        expect(showToast).toHaveBeenCalledWith(
            expect.objectContaining({type: "info", title: "Save canceled."}),
        );
    });

    it("passes logicalIdToAssetId in metadata", async () => {
        const {scene} = createMockScene();
        setupApp(scene);

        const logicalMap = {"logical-1": "real-1"};
        vi.mocked(getAssetResolutionContext).mockReturnValue(mockContextWithStem());
        vi.mocked(serializePrefab).mockReturnValue({
            data: "{}",
            assetResolutionContext: {logicalIdToAssetId: logicalMap},
        });
        vi.mocked(createAssetRevisionWithData).mockResolvedValue({id: newRevisionId} as any);

        await saveStemEditor();

        expect(createAssetRevisionWithData).toHaveBeenCalledWith(
            expect.objectContaining({
                options: expect.objectContaining({
                    metadata: {logicalAssetIdMap: logicalMap},
                }),
            }),
        );
    });
});
