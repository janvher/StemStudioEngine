import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AssetLoader } from "./AssetLoader";
import { AssetType, type Asset, type AssetDerivative } from "@stem/network/api/asset";

const { mockGetAsset, mockGetAssetDerivatives, mockGetAssetRevision } = vi.hoisted(() => ({
    mockGetAsset: vi.fn(),
    mockGetAssetDerivatives: vi.fn(),
    mockGetAssetRevision: vi.fn(),
}));

vi.mock("@stem/network/api/asset", () => ({
    getAsset: mockGetAsset,
    getAssetDerivatives: mockGetAssetDerivatives,
    getAssetRevision: mockGetAssetRevision,
    AssetType: {
        Model: "model",
    },
    AssetDerivativeType: {
        Model: "model",
        Image: "image",
    },
}));

const STORAGE_KEY = "stemstudio_url_cache";

/**
 * Create a future ISO date string offset by the given minutes from now.
 *
 * @param minutes - Number of minutes in the future
 * @returns ISO 8601 date string
 */
function futureDate(minutes: number): string {
    return new Date(Date.now() + minutes * 60_000).toISOString();
}

/**
 * Create a past ISO date string offset by the given minutes before now.
 *
 * @param minutes - Number of minutes in the past
 * @returns ISO 8601 date string
 */
function pastDate(minutes: number): string {
    return new Date(Date.now() - minutes * 60_000).toISOString();
}

/**
 * Create a test AssetDerivative with sensible defaults.
 *
 * @param overrides - Fields to override on the default derivative
 * @returns A complete AssetDerivative object
 */
function makeDerivative(overrides: Partial<AssetDerivative> = {}): AssetDerivative {
    return {
        assetId: "a1",
        revisionId: "r1",
        id: "d1",
        type: AssetType.Model,
        format: "glb",
        contentType: "model/gltf-binary",
        createTime: new Date().toISOString(),
        metadata: {},
        dataUrl: "https://cdn/model.glb?sig=seed",
        expiresAt: futureDate(60),
        lodLevel: 1,
        ...overrides,
    };
}

/**
 * Create a test Asset with sensible defaults.
 *
 * @param overrides - Fields to override; `id` and `revisionId` are required
 * @returns A complete Asset object
 */
function makeAsset(overrides: Partial<Asset> & { id: string; revisionId: string }): Asset {
    return {
        contentType: "model/gltf-binary",
        createTime: new Date().toISOString(),
        description: "",
        format: "glb",
        headRevisionId: overrides.revisionId,
        name: "test",
        type: AssetType.Model,
        userId: "u1",
        ...overrides,
    } as Asset;
}

describe("AssetLoader.prefetchAssets", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it("deduplicates duplicate refs before prefetching", async () => {
        mockGetAsset.mockImplementation((assetId: string) => Promise.resolve({
            id: assetId,
            revisionId: "r1",
            derivatives: [],
        }));

        const loader = new AssetLoader();
        await loader.prefetchAssets([
            { assetId: "a1", revisionId: "r1" },
            { assetId: "a1", revisionId: "r1" },
            { assetId: "a2", revisionId: "r2" },
        ]);

        expect(mockGetAsset).toHaveBeenCalledTimes(2);
        expect(mockGetAsset).toHaveBeenCalledWith("a1");
        expect(mockGetAsset).toHaveBeenCalledWith("a2");
    });

    it("warms derivatives when includeDerivatives is enabled", async () => {
        mockGetAsset.mockResolvedValue({
            id: "a1",
            revisionId: "r1",
            derivatives: undefined,
        });
        mockGetAssetDerivatives.mockResolvedValue([
            { type: "model", dataUrl: "https://cdn/model.glb", lodLevel: 1, expiresAt: new Date().toISOString() },
        ]);

        const loader = new AssetLoader();
        await loader.prefetchAssets([{ assetId: "a1", revisionId: "r1" }], {
            includeDerivatives: true,
        });

        expect(mockGetAssetDerivatives).toHaveBeenCalledTimes(1);
        expect(mockGetAssetDerivatives).toHaveBeenCalledWith("a1", "r1", { includeDataUrl: true });
    });

    it("throws when continueOnError is false and a fetch fails", async () => {
        mockGetAsset.mockRejectedValue(new Error("boom"));

        const loader = new AssetLoader();
        await expect(
            loader.prefetchAssets([{ assetId: "bad", revisionId: "r1" }], {
                continueOnError: false,
            }),
        ).rejects.toThrow("boom");
    });
});

describe("AssetLoader URL caching", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("seedFromAssets", () => {
        it("stores derivative URLs in localStorage on first seed", () => {
            const d = makeDerivative();
            const asset = makeAsset({ id: "a1", revisionId: "r1", derivatives: [d] });
            const loader = new AssetLoader();
            loader.seedFromAssets([asset]);

            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
            expect(stored[`d:a1:r1:d1`]).toEqual({
                url: d.dataUrl,
                expiresAt: d.expiresAt,
            });
        });

        it("reuses cached URL and stores seed URL as next on re-seed", () => {
            const cachedUrl = "https://cdn/model.glb?sig=cached";
            const cachedExpiry = futureDate(30);
            // Pre-populate localStorage as if a previous session cached this
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ "d:a1:r1:d1": { url: cachedUrl, expiresAt: cachedExpiry } }),
            );

            const seedUrl = "https://cdn/model.glb?sig=new-seed";
            const seedExpiry = futureDate(60);
            const d = makeDerivative({ dataUrl: seedUrl, expiresAt: seedExpiry });
            const asset = makeAsset({ id: "a1", revisionId: "r1", derivatives: [d] });

            const loader = new AssetLoader();
            loader.seedFromAssets([asset]);

            // Derivative should now have the cached URL (tier 1 hit)
            expect(d.dataUrl).toBe(cachedUrl);
            expect(d.expiresAt).toBe(cachedExpiry);

            // localStorage should still hold the cached URL (not overwritten)
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
            expect(stored["d:a1:r1:d1"].url).toBe(cachedUrl);
        });

        it("skips derivatives without dataUrl or expiresAt", () => {
            const d1 = makeDerivative({ dataUrl: undefined });
            const d2 = makeDerivative({ id: "d2", expiresAt: undefined });
            const asset = makeAsset({ id: "a1", revisionId: "r1", derivatives: [d1, d2] });

            const loader = new AssetLoader();
            loader.seedFromAssets([asset]);

            const raw = localStorage.getItem(STORAGE_KEY);
            const stored = raw ? JSON.parse(raw) : {};
            expect(Object.keys(stored)).toHaveLength(0);
        });
    });

    describe("getModelDataUrl — tier 2 (nextUrls)", () => {
        it("uses tier 2 URL when tier 1 expires", async () => {
            // Set up: cached URL that is about to expire, seed URL that is fresh
            const cachedUrl = "https://cdn/model.glb?sig=cached";
            const cachedExpiry = futureDate(3); // within 5-min buffer → treated as expired
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ "d:a1:r1:d1": { url: cachedUrl, expiresAt: cachedExpiry } }),
            );

            const seedUrl = "https://cdn/model.glb?sig=seed";
            const seedExpiry = futureDate(60);
            const d = makeDerivative({ dataUrl: seedUrl, expiresAt: seedExpiry });
            const asset = makeAsset({ id: "a1", revisionId: "r1", derivatives: [d] });

            const loader = new AssetLoader({ preferredLodLevel: 1 });
            loader.seedFromAssets([asset]);

            // Derivative was rewritten to cached URL by seed, and seed stored as next.
            // But cached URL is within expiry buffer, so on get it should fail tier 1
            // lookup and the derivative will show the cached (expired) URL.
            // Now simulate the cached URL expiring in the urlCache get():
            // The derivative has cachedExpiry which is within buffer.
            // resolveDerivativeUrl sees isUrlExpired → true → checks nextUrls → seed URL is fresh.

            mockGetAsset.mockResolvedValue(asset);

            const result = await loader.getModelDataUrl({ assetId: "a1", revisionId: "r1" });
            expect(result.url).toBe(seedUrl);
            // Should NOT have hit the network for derivatives
            expect(mockGetAssetDerivatives).not.toHaveBeenCalled();
        });
    });

    describe("getModelDataUrl — tier 3 (network)", () => {
        it("refreshes from network when both tier 1 and tier 2 are expired", async () => {
            const expiredUrl = "https://cdn/model.glb?sig=old";
            const expiredExpiry = pastDate(10);
            const d = makeDerivative({ dataUrl: expiredUrl, expiresAt: expiredExpiry });
            const asset = makeAsset({ id: "a1", revisionId: "r1", derivatives: [d] });

            const freshUrl = "https://cdn/model.glb?sig=fresh";
            const freshExpiry = futureDate(60);
            mockGetAsset.mockResolvedValue(asset);
            mockGetAssetDerivatives.mockResolvedValue([
                makeDerivative({ dataUrl: freshUrl, expiresAt: freshExpiry }),
            ]);

            const loader = new AssetLoader({ preferredLodLevel: 1 });
            const result = await loader.getModelDataUrl({ assetId: "a1", revisionId: "r1" });

            expect(result.url).toBe(freshUrl);
            expect(mockGetAssetDerivatives).toHaveBeenCalledTimes(1);

            // Fresh URL should be persisted in localStorage
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
            expect(stored["d:a1:r1:d1"].url).toBe(freshUrl);
        });

        it("returns revision metadata when falling back to original model data", async () => {
            const asset = makeAsset({ id: "a1", revisionId: "r1", derivatives: [], format: "ply" });
            const revisionUrl = "https://cdn/model.ply?sig=rev";
            mockGetAsset.mockResolvedValue(asset);
            mockGetAssetDerivatives.mockResolvedValue([]);
            mockGetAssetRevision.mockResolvedValue({
                id: "r1",
                assetId: "a1",
                dataUrl: revisionUrl,
                expiresAt: futureDate(60),
                format: "ply",
                contentType: "application/octet-stream",
                createTime: new Date().toISOString(),
                parentIds: [],
                userId: "u1",
                metadata: {
                    gaussianSplatPly: true,
                },
            });

            const loader = new AssetLoader();
            const result = await loader.getModelDataUrl({ assetId: "a1", revisionId: "r1" });

            expect(result.url).toBe(revisionUrl);
            expect(result.format).toBe("ply");
            expect(result.metadata).toEqual({ gaussianSplatPly: true });
        });
    });

    describe("getImageDataUrl — tiered caching", () => {
        it("uses tier 2 URL for images when tier 1 expires", async () => {
            const cachedUrl = "https://cdn/img.png?sig=cached";
            const cachedExpiry = futureDate(3); // within buffer
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ "d:a1:r1:d1": { url: cachedUrl, expiresAt: cachedExpiry } }),
            );

            const seedUrl = "https://cdn/img.png?sig=seed";
            const seedExpiry = futureDate(60);
            const d = makeDerivative({
                type: "image",
                format: "png",
                dataUrl: seedUrl,
                expiresAt: seedExpiry,
                lodLevel: 0,
            });
            const asset = makeAsset({ id: "a1", revisionId: "r1", derivatives: [d] });

            const loader = new AssetLoader();
            loader.seedFromAssets([asset]);

            mockGetAsset.mockResolvedValue(asset);
            const result = await loader.getImageDataUrl({ assetId: "a1", revisionId: "r1" });

            expect(result.url).toBe(seedUrl);
            expect(mockGetAssetDerivatives).not.toHaveBeenCalled();
        });
    });

    describe("refreshAssetDerivatives — updates URL cache", () => {
        it("persists fresh URLs to localStorage after network refresh", async () => {
            const freshUrl = "https://cdn/model.glb?sig=refreshed";
            const freshExpiry = futureDate(60);
            const asset = makeAsset({ id: "a1", revisionId: "r1", derivatives: undefined });

            mockGetAsset.mockResolvedValue(asset);
            mockGetAssetDerivatives.mockResolvedValue([
                makeDerivative({ dataUrl: freshUrl, expiresAt: freshExpiry }),
            ]);

            const loader = new AssetLoader({ preferredLodLevel: 1 });
            const result = await loader.getModelDataUrl({ assetId: "a1", revisionId: "r1" });

            expect(result.url).toBe(freshUrl);
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
            expect(stored["d:a1:r1:d1"].url).toBe(freshUrl);
        });
    });

    describe("getAssetRevision — URL caching", () => {
        it("caches revision URL to localStorage after fetch", async () => {
            const revisionUrl = "https://cdn/rev.glb?sig=rev";
            const expiresAt = futureDate(60);
            mockGetAssetRevision.mockResolvedValue({
                id: "r1",
                assetId: "a1",
                dataUrl: revisionUrl,
                expiresAt,
                format: "glb",
                contentType: "model/gltf-binary",
                createTime: new Date().toISOString(),
                parentIds: [],
                userId: "u1",
            });

            const loader = new AssetLoader();
            const revision = await loader.getAssetRevision({ assetId: "a1", revisionId: "r1" });

            expect(revision.dataUrl).toBe(revisionUrl);
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
            expect(stored["r:a1:r1"].url).toBe(revisionUrl);
        });

        it("returns cached revision without re-fetching", async () => {
            const networkRevision = {
                id: "r1",
                assetId: "a1",
                dataUrl: "https://cdn/rev.glb?sig=network",
                expiresAt: futureDate(60),
                format: "glb",
                contentType: "model/gltf-binary",
                createTime: new Date().toISOString(),
                parentIds: [],
                userId: "u1",
            };
            mockGetAssetRevision.mockResolvedValue(networkRevision);

            const loader = new AssetLoader();
            // First call — fetches from network, caches revision
            const first = await loader.getAssetRevision({ assetId: "a1", revisionId: "r1" });
            expect(first.dataUrl).toBe(networkRevision.dataUrl);
            expect(mockGetAssetRevision).toHaveBeenCalledTimes(1);
            mockGetAssetRevision.mockClear();

            // Second call — revision metadata is immutable, so the cached
            // revision is returned without hitting the network.  The URL is
            // still valid in the SignedUrlCache so no network call needed.
            const second = await loader.getAssetRevision({ assetId: "a1", revisionId: "r1" });
            expect(second.dataUrl).toBe(networkRevision.dataUrl);
            expect(mockGetAssetRevision).not.toHaveBeenCalled();
        });

        it("re-fetches when cached URL expires", async () => {
            const originalUrl = "https://cdn/rev.glb?sig=original";
            const originalExpiry = futureDate(60);
            mockGetAssetRevision.mockResolvedValue({
                id: "r1",
                assetId: "a1",
                dataUrl: originalUrl,
                expiresAt: originalExpiry,
                format: "glb",
                contentType: "model/gltf-binary",
                createTime: new Date().toISOString(),
                parentIds: [],
                userId: "u1",
            });

            const loader = new AssetLoader();
            const first = await loader.getAssetRevision({ assetId: "a1", revisionId: "r1" });
            expect(first.dataUrl).toBe(originalUrl);
            expect(mockGetAssetRevision).toHaveBeenCalledTimes(1);
            mockGetAssetRevision.mockClear();

            // Advance time past expiry (60 min URL + buffer consumed)
            vi.advanceTimersByTime(61 * 60_000);

            const freshUrl = "https://cdn/rev.glb?sig=fresh";
            const freshExpiry = futureDate(60);
            mockGetAssetRevision.mockResolvedValue({
                id: "r1",
                assetId: "a1",
                dataUrl: freshUrl,
                expiresAt: freshExpiry,
                format: "glb",
                contentType: "model/gltf-binary",
                createTime: new Date().toISOString(),
                parentIds: [],
                userId: "u1",
            });

            // Cached metadata exists but URL expired — should re-fetch
            const second = await loader.getAssetRevision({ assetId: "a1", revisionId: "r1" });
            expect(second.dataUrl).toBe(freshUrl);
            expect(mockGetAssetRevision).toHaveBeenCalledTimes(1);
        });

        it("prefers cached URL over fresh URL for browser cache benefit", async () => {
            // Pre-populate localStorage with a still-valid URL
            const cachedUrl = "https://cdn/rev.glb?sig=cached";
            const cachedExpiry = futureDate(30);
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ "r:a1:r1": { url: cachedUrl, expiresAt: cachedExpiry } }),
            );

            const freshUrl = "https://cdn/rev.glb?sig=fresh";
            mockGetAssetRevision.mockResolvedValue({
                id: "r1",
                assetId: "a1",
                dataUrl: freshUrl,
                expiresAt: futureDate(60),
                format: "glb",
                contentType: "model/gltf-binary",
                createTime: new Date().toISOString(),
                parentIds: [],
                userId: "u1",
            });

            const loader = new AssetLoader();
            const revision = await loader.getAssetRevision({ assetId: "a1", revisionId: "r1" });

            // Should use the cached URL (from previous reload) for HTTP cache benefit
            expect(revision.dataUrl).toBe(cachedUrl);
        });
    });
});
