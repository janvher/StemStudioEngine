import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateSceneRevisionApi = vi.fn();
const mockUploadScenePayload = vi.fn();

vi.mock("../client", () => ({
    getScenesApiClient: () => ({
        createSceneRevision: (...args: any[]) => mockCreateSceneRevisionApi(...args),
    }),
    getJobsApiClient: vi.fn(),
}));

vi.mock("../asset", () => ({
    isConflictError: (err: any) => err?.statusCode === 409,
    createAssetUpload: vi.fn(),
    dataToBase64: vi.fn(),
    getDataByteLength: vi.fn(),
    gzipData: vi.fn(),
    INLINE_DATA_MAX_BYTES: 0,
    uploadAssetData: vi.fn(),
}));

vi.mock("@web-shared/global", () => ({ default: { app: null } }));

import { createSceneRevision, sceneSettingsToCreateRequest } from "./v2";
import type { SceneSettings } from "./index";

beforeEach(() => {
    vi.clearAllMocks();
    // Stub uploadScenePayload by spying on createAssetUpload chain isn't trivial;
    // instead, mock the API client directly and let the upload path run with mocked deps.
    mockUploadScenePayload.mockResolvedValue("upload-1");
});

// Helper: mock the upload path by stubbing createAssetUpload + uploadAssetData to no-ops
const setupUploadMock = async () => {
    const asset = await import("../asset");
    vi.mocked(asset.createAssetUpload).mockResolvedValue({
        upload: { id: "upload-1" },
        uploadUrl: "https://example.com/upload",
    } as any);
    vi.mocked(asset.uploadAssetData).mockResolvedValue(undefined as any);
};

describe("createSceneRevision", () => {
    beforeEach(async () => {
        await setupUploadMock();
    });

    it("returns the created revision on success", async () => {
        mockCreateSceneRevisionApi.mockResolvedValue({
            status: 201,
            data: { revisionId: "rev-1" },
        });

        const result = await createSceneRevision("scene-1", "{}", { metadata: {} as any });

        expect(result).toEqual({ revisionId: "rev-1" });
        expect(mockCreateSceneRevisionApi).toHaveBeenCalledTimes(1);
    });

    it("retries once on 409 when retryOnConflict is true", async () => {
        mockCreateSceneRevisionApi
            .mockRejectedValueOnce({ statusCode: 409 })
            .mockResolvedValueOnce({ status: 201, data: { revisionId: "rev-2" } });

        const result = await createSceneRevision("scene-1", "{}", {
            metadata: {} as any,
            retryOnConflict: true,
        });

        expect(result).toEqual({ revisionId: "rev-2" });
        expect(mockCreateSceneRevisionApi).toHaveBeenCalledTimes(2);
    });

    it("reuses the same uploadId on retry (does not re-upload)", async () => {
        const asset = await import("../asset");
        mockCreateSceneRevisionApi
            .mockRejectedValueOnce({ statusCode: 409 })
            .mockResolvedValueOnce({ status: 201, data: { revisionId: "rev-2" } });

        await createSceneRevision("scene-1", "{}", {
            metadata: {} as any,
            retryOnConflict: true,
        });

        // Upload helper should be called only once even though the API call ran twice
        expect(asset.createAssetUpload).toHaveBeenCalledTimes(1);
        expect(mockCreateSceneRevisionApi).toHaveBeenCalledTimes(2);
        // Both API calls should use the same uploadId
        const firstCallRequest = mockCreateSceneRevisionApi.mock.calls[0]![1];
        const secondCallRequest = mockCreateSceneRevisionApi.mock.calls[1]![1];
        expect(firstCallRequest.uploadId).toBe("upload-1");
        expect(secondCallRequest.uploadId).toBe("upload-1");
    });

    it("does not retry on 409 when retryOnConflict is false", async () => {
        mockCreateSceneRevisionApi.mockRejectedValue({ statusCode: 409 });

        await expect(
            createSceneRevision("scene-1", "{}", { metadata: {} as any }),
        ).rejects.toMatchObject({ statusCode: 409 });

        expect(mockCreateSceneRevisionApi).toHaveBeenCalledTimes(1);
    });

    it("does not retry on non-409 errors even when retryOnConflict is true", async () => {
        mockCreateSceneRevisionApi.mockRejectedValue({ statusCode: 500, message: "Server error" });

        await expect(
            createSceneRevision("scene-1", "{}", {
                metadata: {} as any,
                retryOnConflict: true,
            }),
        ).rejects.toMatchObject({ statusCode: 500 });

        expect(mockCreateSceneRevisionApi).toHaveBeenCalledTimes(1);
    });
});

describe("sceneSettingsToCreateRequest", () => {
    it("maps PascalCase SceneSettings to v2 createScene request fields", () => {
        const settings: SceneSettings = {
            Alias: "alpha",
            AllowAnonymousFirebase: true,
            Dependencies: {"asset-1": "rev-1"},
            Description: "desc",
            IsAssetPack: true,
            IsCloneable: true,
            IsCollaborative: false,
            IsMultiplayer: true,
            IsSandbox: false,
            IsTopPick: true,
            LockedItems: "abc",
            MaxCollaboratorsInRoom: 8,
            MaxMultiplayerClientsPerRoom: 4,
            MultiplayerAutoJoin: true,
            ShowHUD: true,
            ShowStats: false,
            Thumbnail: "https://example.com/t.png",
            UseAvatar: true,
            UseInstancing: false,
            VFXOnMobile: true,
            VoiceChatEnabled: true,
        };

        const result = sceneSettingsToCreateRequest(settings, "My Scene");

        expect(result).toEqual({
            name: "My Scene",
            alias: "alpha",
            allowAnonymousFirebase: true,
            dependencies: {"asset-1": "rev-1"},
            description: "desc",
            isAssetPack: true,
            isCloneable: true,
            isCollaborative: false,
            isMultiplayer: true,
            isSandbox: false,
            isTopPick: true,
            lockedItems: "abc",
            maxCollaboratorsInRoom: 8,
            maxMultiplayerClientsPerRoom: 4,
            multiplayerAutoJoin: true,
            rendering: undefined,
            showHUD: true,
            showStats: false,
            tags: undefined,
            thumbnail: "https://example.com/t.png",
            useAvatar: true,
            useInstancing: false,
            vfxOnMobile: true,
            voiceChatEnabled: true,
        });
    });

    it("joins Tags array into a comma-separated string", () => {
        const result = sceneSettingsToCreateRequest({Tags: ["a", "b", "c"]}, "n");
        expect(result.tags).toBe("a, b, c");
    });

    it("leaves tags undefined when Tags is missing", () => {
        const result = sceneSettingsToCreateRequest({}, "n");
        expect(result.tags).toBeUndefined();
    });

    it("drops IsPublic, IsPublished, ID, AssetsCount, MajorVersion, MinorVersion, ProductionMode, CompartmentsEnabled", () => {
        const result = sceneSettingsToCreateRequest(
            {
                ID: "abc",
                IsPublic: true,
                IsPublished: true,
                AssetsCount: true,
                MajorVersion: 5,
                MinorVersion: 2,
                ProductionMode: true,
                CompartmentsEnabled: true,
            },
            "n",
        );

        expect(result).not.toHaveProperty("id");
        expect(result).not.toHaveProperty("isPublic");
        expect(result).not.toHaveProperty("isPublished");
        expect(result).not.toHaveProperty("assetsCount");
        expect(result).not.toHaveProperty("majorVersion");
        expect(result).not.toHaveProperty("minorVersion");
        expect(result).not.toHaveProperty("productionMode");
        expect(result).not.toHaveProperty("compartmentsEnabled");
    });

    it("uses the provided name even when SceneSettings.Name is set", () => {
        const result = sceneSettingsToCreateRequest({Name: "from-settings"}, "from-arg");
        expect(result.name).toBe("from-arg");
    });

    it("returns an object with only the name field for empty input", () => {
        const result = sceneSettingsToCreateRequest({}, "Untitled");
        expect(result.name).toBe("Untitled");
        const definedKeys = Object.entries(result)
            .filter(([, v]) => v !== undefined)
            .map(([k]) => k);
        expect(definedKeys).toEqual(["name"]);
    });

    it("passes Rendering through unchanged (PascalCase shape matches DomainRendering)", () => {
        const rendering = {
            ShadowMapType: 2,
            Ambient: {Color: "#fff", Intensity: 1},
        };
        const result = sceneSettingsToCreateRequest({Rendering: rendering as any}, "n");
        expect(result.rendering).toBe(rendering);
    });
});
