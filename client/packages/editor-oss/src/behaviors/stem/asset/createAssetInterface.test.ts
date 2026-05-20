import { describe, it, expect, vi, beforeEach } from "vitest";

import type EngineRuntime from '@stem/editor-oss/EngineRuntime';
import type { AssetRef } from '@stem/editor-oss/asset-management/AssetRef';

// Mock heavy transitive dependencies to avoid deep module resolution
vi.mock('../../../EngineRuntime', () => ({ default: vi.fn() }));
vi.mock('../../../behaviors/game/GameManager', () => ({ default: vi.fn() }));
vi.mock('../core/createGameObject', () => ({ createGameObject: vi.fn() }));

// Mock getSceneAssets (keep the lightweight exports from api/asset)
const mockGetSceneAssets = vi.fn();
vi.mock('@stem/network/api/asset', () => ({
    AssetType: {
        Audio: 'audio',
        Video: 'video',
        Model: 'model',
        Image: 'image',
        Prefab: 'prefab',
    },
    getSceneAssets: (...args: unknown[]) => mockGetSceneAssets(...args),
    createAsset: vi.fn(),
    createAssetImport: vi.fn(),
    waitForAssetImport: vi.fn(),
    createAssetRelease: vi.fn(),
    getAssetDerivatives: vi.fn(),
    getMyAssets: vi.fn(),
}));

import { createAssetInterface } from './createAssetInterface';

const makeApp = (overrides: Partial<{
    sceneID: string | null;
    getAssetRevision: (ref: AssetRef) => Promise<{ dataUrl?: string } | null>;
    getImageDataUrl: (ref: AssetRef) => Promise<{ url: string }>;
}> = {}) => {
    const sceneID = 'sceneID' in overrides ? overrides.sceneID : 'scene-123';
    const getAssetRevision = overrides.getAssetRevision ?? vi.fn().mockResolvedValue({ dataUrl: 'https://cdn.example.com/audio.mp3' });
    const getImageDataUrl = overrides.getImageDataUrl ?? vi.fn().mockResolvedValue({ url: 'https://cdn.example.com/image.webp' });

    return {
        editor: { sceneID },
        assetLoader: {
            getAssetRevision,
            getImageDataUrl,
            createTexture: vi.fn(),
        },
        assetInstanceManager: {
            preloadModel: vi.fn(),
            createModelInstance: vi.fn(),
            unloadModel: vi.fn(),
            preloadPrefab: vi.fn(),
            createPrefabInstance: vi.fn(),
            unloadPrefab: vi.fn(),
        },
    } as unknown as EngineRuntime;
};

describe("createAssetInterface", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("audio.getUrl", () => {
        it("resolves a valid AssetRef directly", async () => {
            const app = makeApp();
            const iface = createAssetInterface(app);

            const ref: AssetRef = { assetId: "a1", revisionId: "r1" };
            const url = await iface.audio.getUrl(ref);

            expect(url).toBe("https://cdn.example.com/audio.mp3");
            expect(mockGetSceneAssets).not.toHaveBeenCalled();
        });

        it("throws when no dataUrl is returned from revision", async () => {
            const app = makeApp({
                getAssetRevision: vi.fn().mockResolvedValue({ dataUrl: undefined }),
            });
            const iface = createAssetInterface(app);
            const ref: AssetRef = { assetId: "a1", revisionId: "r1" };

            await expect(iface.audio.getUrl(ref)).rejects.toThrow("No data URL for audio asset");
        });
    });

    describe("audio.getUrlByName", () => {
        it("resolves by name and returns URL", async () => {
            mockGetSceneAssets.mockResolvedValue({
                assets: [
                    { id: "asset-abc", name: "GameOverSound", headRevisionId: "head-1", revisionId: "rev-1", type: "audio" },
                ],
            });
            const app = makeApp();
            const iface = createAssetInterface(app);

            const url = await iface.audio.getUrlByName("GameOverSound");

            expect(mockGetSceneAssets).toHaveBeenCalledWith("scene-123", { types: ["audio"] });
            expect(app.assetLoader.getAssetRevision).toHaveBeenCalledWith({ assetId: "asset-abc", revisionId: "rev-1" });
            expect(url).toBe("https://cdn.example.com/audio.mp3");
        });

        it("uses headRevisionId when revisionId is not present on the asset", async () => {
            mockGetSceneAssets.mockResolvedValue({
                assets: [
                    { id: "asset-abc", name: "MySound", headRevisionId: "head-99", type: "audio" },
                ],
            });
            const app = makeApp();
            const iface = createAssetInterface(app);

            await iface.audio.getUrlByName("MySound");

            expect(app.assetLoader.getAssetRevision).toHaveBeenCalledWith({ assetId: "asset-abc", revisionId: "head-99" });
        });

        it("does case-insensitive name matching", async () => {
            mockGetSceneAssets.mockResolvedValue({
                assets: [
                    { id: "asset-abc", name: "GameOverSound", headRevisionId: "head-1", type: "audio" },
                ],
            });
            const app = makeApp();
            const iface = createAssetInterface(app);

            await iface.audio.getUrlByName("gameoversound");

            expect(app.assetLoader.getAssetRevision).toHaveBeenCalledWith({ assetId: "asset-abc", revisionId: "head-1" });
        });

        it("throws when name is not found in scene assets", async () => {
            mockGetSceneAssets.mockResolvedValue({ assets: [] });
            const app = makeApp();
            const iface = createAssetInterface(app);

            await expect(
                iface.audio.getUrlByName("NonExistent"),
            ).rejects.toThrow('Audio asset not found by name: "NonExistent"');
        });
    });

    describe("audio.findByName", () => {
        it("returns AssetRef when found", async () => {
            mockGetSceneAssets.mockResolvedValue({
                assets: [
                    { id: "asset-xyz", name: "BgMusic", headRevisionId: "head-5", revisionId: "rev-5", type: "audio" },
                ],
            });
            const app = makeApp();
            const iface = createAssetInterface(app);

            const result = await iface.audio.findByName("BgMusic");

            expect(result).toEqual({ assetId: "asset-xyz", revisionId: "rev-5" });
        });

        it("returns null when not found", async () => {
            mockGetSceneAssets.mockResolvedValue({ assets: [] });
            const app = makeApp();
            const iface = createAssetInterface(app);

            const result = await iface.audio.findByName("Missing");

            expect(result).toBeNull();
        });

        it("returns null when no sceneID", async () => {
            const app = makeApp({ sceneID: null });
            const iface = createAssetInterface(app);

            const result = await iface.audio.findByName("Anything");

            expect(result).toBeNull();
            expect(mockGetSceneAssets).not.toHaveBeenCalled();
        });
    });

    describe("video.getUrlByName", () => {
        it("resolves by name for video assets", async () => {
            mockGetSceneAssets.mockResolvedValue({
                assets: [
                    { id: "vid-1", name: "IntroVideo", headRevisionId: "h-1", revisionId: "r-1", type: "video" },
                ],
            });
            const app = makeApp();
            const iface = createAssetInterface(app);

            const url = await iface.video.getUrlByName("IntroVideo");

            expect(mockGetSceneAssets).toHaveBeenCalledWith("scene-123", { types: ["video"] });
            expect(url).toBe("https://cdn.example.com/audio.mp3");
        });

        it("throws when video name not found", async () => {
            mockGetSceneAssets.mockResolvedValue({ assets: [] });
            const app = makeApp();
            const iface = createAssetInterface(app);

            await expect(
                iface.video.getUrlByName("Missing"),
            ).rejects.toThrow('Video asset not found by name: "Missing"');
        });
    });

    describe("video.findByName", () => {
        it("returns AssetRef when found", async () => {
            mockGetSceneAssets.mockResolvedValue({
                assets: [
                    { id: "vid-2", name: "Outro", headRevisionId: "h-2", type: "video" },
                ],
            });
            const app = makeApp();
            const iface = createAssetInterface(app);

            const result = await iface.video.findByName("Outro");

            expect(result).toEqual({ assetId: "vid-2", revisionId: "h-2" });
        });
    });

    describe("model.findByName", () => {
        it("returns AssetRef when found", async () => {
            mockGetSceneAssets.mockResolvedValue({
                assets: [
                    { id: "mdl-1", name: "CarBody", headRevisionId: "h-1", revisionId: "r-1", type: "model" },
                ],
            });
            const app = makeApp();
            const iface = createAssetInterface(app);

            const result = await iface.model.findByName("CarBody");

            expect(result).toEqual({ assetId: "mdl-1", revisionId: "r-1" });
            expect(mockGetSceneAssets).toHaveBeenCalledWith("scene-123", { types: ["model"] });
        });

        it("returns null when not found", async () => {
            mockGetSceneAssets.mockResolvedValue({ assets: [] });
            const app = makeApp();
            const iface = createAssetInterface(app);

            const result = await iface.model.findByName("Missing");

            expect(result).toBeNull();
        });

        it("does case-insensitive matching", async () => {
            mockGetSceneAssets.mockResolvedValue({
                assets: [
                    { id: "mdl-2", name: "PlayerMesh", headRevisionId: "h-2", type: "model" },
                ],
            });
            const app = makeApp();
            const iface = createAssetInterface(app);

            const result = await iface.model.findByName("playermesh");

            expect(result).toEqual({ assetId: "mdl-2", revisionId: "h-2" });
        });
    });

    describe("image.findByName", () => {
        it("returns AssetRef when found", async () => {
            mockGetSceneAssets.mockResolvedValue({
                assets: [
                    { id: "img-1", name: "WaterNormal", headRevisionId: "h-1", revisionId: "r-1", type: "image" },
                ],
            });
            const app = makeApp();
            const iface = createAssetInterface(app);

            const result = await iface.image.findByName("WaterNormal");

            expect(result).toEqual({ assetId: "img-1", revisionId: "r-1" });
            expect(mockGetSceneAssets).toHaveBeenCalledWith("scene-123", { types: ["image"] });
        });

        it("returns null when not found", async () => {
            mockGetSceneAssets.mockResolvedValue({ assets: [] });
            const app = makeApp();
            const iface = createAssetInterface(app);

            const result = await iface.image.findByName("Missing");

            expect(result).toBeNull();
        });
    });

    describe("image.getUrl", () => {
        it("returns the resolved image url from the asset loader", async () => {
            const app = makeApp();
            const iface = createAssetInterface(app);
            const ref: AssetRef = { assetId: "img-1", revisionId: "rev-1" };

            const url = await iface.image.getUrl(ref);

            expect(app.assetLoader.getImageDataUrl).toHaveBeenCalledWith(ref);
            expect(url).toBe("https://cdn.example.com/image.webp");
        });
    });

    describe("stem.findByName", () => {
        it("returns AssetRef when found", async () => {
            mockGetSceneAssets.mockResolvedValue({
                assets: [
                    { id: "pfb-1", name: "EnemyPrefab", headRevisionId: "h-1", revisionId: "r-1", type: "prefab" },
                ],
            });
            const app = makeApp();
            const iface = createAssetInterface(app);

            const result = await iface.stem.findByName("EnemyPrefab");

            expect(result).toEqual({ assetId: "pfb-1", revisionId: "r-1" });
            expect(mockGetSceneAssets).toHaveBeenCalledWith("scene-123", { types: ["prefab"] });
        });

        it("returns null when no sceneID", async () => {
            const app = makeApp({ sceneID: null });
            const iface = createAssetInterface(app);

            const result = await iface.stem.findByName("Anything");

            expect(result).toBeNull();
            expect(mockGetSceneAssets).not.toHaveBeenCalled();
        });
    });
});
