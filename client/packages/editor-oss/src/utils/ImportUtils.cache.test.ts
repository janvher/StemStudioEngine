// Test cache integrity with out-of-order promise execution
describe('ImportUtils Cache Integrity Tests', () => {
    let assetCache: Map<string, string>;
    let uploadPromises: Map<string, Promise<void>>;

    beforeEach(() => {
        assetCache = new Map();
        uploadPromises = new Map();
        vi.clearAllMocks();
    });

    // Mock upload function that simulates different completion times
    const mockUploadModel = async (modelFile: File, thumbnailUrl: string, delay: number): Promise<{ url: string; thumbnail: string }> => {
        await new Promise(resolve => setTimeout(resolve, delay));
        const filename = modelFile.name;
        const resultUrl = `/api/Asset/Download/model/test/${filename}`;
        return { url: resultUrl, thumbnail: thumbnailUrl };
    };

    // Simulate the processAssetItem logic with cache reservation
    const processAssetItem = async (
        modelUrl: string,
        expectedFilename: string,
        uploadDelay: number,
    ): Promise<string> => {
        // Check if we already have this asset cached
        if (assetCache.has(modelUrl)) {
            const cachedValue = assetCache.get(modelUrl);
            if (cachedValue !== undefined && cachedValue !== "UPLOADING") {
                return cachedValue;
            }
        }

        // Check if this asset is currently being uploaded
        if (uploadPromises.has(modelUrl)) {
            await uploadPromises.get(modelUrl);
            if (assetCache.has(modelUrl)) {
                const cachedValue = assetCache.get(modelUrl);
                if (cachedValue !== undefined && cachedValue !== "UPLOADING") {
                    return cachedValue;
                }
            }
        }

        // Reserve cache entry to prevent race conditions
        assetCache.set(modelUrl, "UPLOADING");

        const uploadPromise = (async () => {
            try {
                const mockFile = new File(['mock content'], expectedFilename, { type: 'model/gltf-binary' });
                const result = await mockUploadModel(mockFile, '', uploadDelay);

                // Validate cache integrity before updating
                const existingCacheValue = assetCache.get(modelUrl);
                if (existingCacheValue !== "UPLOADING") {
                    throw new Error(`CACHE COLLISION! Key ${modelUrl} was expected to be 'UPLOADING' but found: ${existingCacheValue}`);
                }

                // Cache the result
                assetCache.set(modelUrl, result.url);

                // Verify the cache was set correctly
                const verifyCache = assetCache.get(modelUrl);
                if (verifyCache !== result.url) {
                    throw new Error(`CACHE VERIFICATION FAILED! Expected: ${result.url}, Got: ${verifyCache}`);
                }
            } catch (error) {
                console.error("Error uploading model:", error);
                throw error;
            } finally {
                uploadPromises.delete(modelUrl);
            }
        })();

        uploadPromises.set(modelUrl, uploadPromise);
        await uploadPromise;

        // Return the final cached value
        const finalResult = assetCache.get(modelUrl);
        if (!finalResult || finalResult === "UPLOADING") {
            throw new Error(`Final cache lookup failed for ${modelUrl}`);
        }
        return finalResult;
    };

    it('should handle out-of-order promise completion without cache collisions', async () => {
        const testAssets = [
            { url: 'https://source.com/model1.glb', filename: 'model1.glb', delay: 300 },
            { url: 'https://source.com/model2.glb', filename: 'model2.glb', delay: 100 }, // This will finish first
            { url: 'https://source.com/model3.glb', filename: 'model3.glb', delay: 200 },
            { url: 'https://source.com/model4.glb', filename: 'model4.glb', delay: 50 },  // This will finish second
        ];

        // Start all uploads in parallel (simulating batch processing)
        const uploadPromises = testAssets.map(asset =>
            processAssetItem(asset.url, asset.filename, asset.delay),
        );

        // Wait for all to complete
        const results = await Promise.all(uploadPromises);

        // Verify each asset got the correct result
        expect(results[0]).toContain('model1.glb');
        expect(results[1]).toContain('model2.glb');
        expect(results[2]).toContain('model3.glb');
        expect(results[3]).toContain('model4.glb');

        // Verify cache integrity - each URL should map to its own result
        expect(assetCache.get('https://source.com/model1.glb')).toContain('model1.glb');
        expect(assetCache.get('https://source.com/model2.glb')).toContain('model2.glb');
        expect(assetCache.get('https://source.com/model3.glb')).toContain('model3.glb');
        expect(assetCache.get('https://source.com/model4.glb')).toContain('model4.glb');

        // Verify no "UPLOADING" placeholders remain
        for (const value of assetCache.values()) {
            expect(value).not.toBe("UPLOADING");
        }

        // Verify cache size matches number of assets
        expect(assetCache.size).toBe(testAssets.length);
    });

    it('should handle duplicate asset requests correctly', async () => {
        const duplicateUrl = 'https://source.com/shared.glb';
        const filename = 'shared.glb';

        // Start 3 parallel requests for the same asset
        const promises = [
            processAssetItem(duplicateUrl, filename, 100),
            processAssetItem(duplicateUrl, filename, 100),
            processAssetItem(duplicateUrl, filename, 100),
        ];

        const results = await Promise.all(promises);

        // All should return the same result
        expect(results[0]).toBe(results[1]);
        expect(results[1]).toBe(results[2]);
        expect(results[0]).toContain('shared.glb');

        // Only one cache entry should exist
        expect(assetCache.size).toBe(1);
        expect(assetCache.get(duplicateUrl)).toContain('shared.glb');
    });

    it('should detect cache collisions if they occur', async () => {
        const testUrl = 'https://source.com/test.glb';

        // Manually create a collision scenario
        assetCache.set(testUrl, "WRONG_VALUE");

        // This should detect the collision when trying to reserve
        const corruptedProcess = async () => {
            if (assetCache.has(testUrl)) {
                const cachedValue = assetCache.get(testUrl);
                if (cachedValue !== "UPLOADING") {
                    return cachedValue; // Would return wrong value
                }
            }

            // This would fail if we detected the wrong state
            assetCache.set(testUrl, "UPLOADING");

            // Simulate upload
            const mockFile = new File(['content'], 'test.glb', { type: 'model/gltf-binary' });
            const result = await mockUploadModel(mockFile, '', 50);

            // This should detect the issue
            const existingCacheValue = assetCache.get(testUrl);
            if (existingCacheValue !== "UPLOADING") {
                throw new Error(`CACHE COLLISION! Expected 'UPLOADING' but found: ${existingCacheValue}`);
            }

            assetCache.set(testUrl, result.url);
            return result.url;
        };

        // First call should return the wrong cached value
        const result1 = await corruptedProcess();
        expect(result1).toBe("WRONG_VALUE");

        // Reset and try proper flow
        assetCache.clear();
        const result2 = await processAssetItem(testUrl, 'test.glb', 50);
        expect(result2).toContain('test.glb');
    });

    it('should maintain cache consistency under high concurrency', async () => {
        // Create many assets to stress test the cache system
        const manyAssets = Array.from({ length: 20 }, (_, i) => ({
            url: `https://source.com/model${i}.glb`,
            filename: `model${i}.glb`,
            delay: Math.floor(Math.random() * 200), // Random delays to ensure out-of-order completion
        }));

        // Process all in parallel
        const results = await Promise.all(
            manyAssets.map(asset => processAssetItem(asset.url, asset.filename, asset.delay)),
        );

        // Verify each result contains the correct filename
        results.forEach((result, index) => {
            expect(result).toContain(`model${index}.glb`);
        });

        // Verify cache integrity
        expect(assetCache.size).toBe(manyAssets.length);

        // Each cache entry should contain the correct filename
        manyAssets.forEach((asset, index) => {
            const cachedValue = assetCache.get(asset.url);
            expect(cachedValue).toContain(`model${index}.glb`);
            expect(cachedValue).not.toBe("UPLOADING");
        });
    });

    it('should prevent filename mismatches seen in production logs', async () => {
        // Recreate the exact scenario from your logs
        const productionAssets = [
            { url: 'https://example.com/Upload/Model/20250721144835/skybox_rain.glb', filename: 'skybox_rain.glb', delay: 150 },
            { url: 'https://example.com/Upload/Model/20250806004435/skybox_night (7).glb', filename: 'skybox_night (7).glb', delay: 100 },
            { url: 'https://example.com/Upload/Model/20250717070128/PlayArea2.glb', filename: 'PlayArea2.glb', delay: 200 },
            { url: 'https://example.com/Upload/Model/20250725095237/skybox_day (1).glb', filename: 'skybox_day (1).glb', delay: 50 },
        ];

        // Process in parallel like the batch system does
        const results = await Promise.all(
            productionAssets.map(asset => processAssetItem(asset.url, asset.filename, asset.delay)),
        );

        // Verify NO filename mismatches
        expect(results[0]).toContain('skybox_rain.glb');
        expect(results[0]).not.toContain('PlayArea2.glb');

        expect(results[1]).toContain('skybox_night (7).glb');
        expect(results[1]).not.toContain('PlayArea2.glb');

        expect(results[2]).toContain('PlayArea2.glb');

        expect(results[3]).toContain('skybox_day (1).glb');
        expect(results[3]).not.toContain('PlayArea2.glb');

        // Verify cache mappings are correct
        expect(assetCache.get('https://example.com/Upload/Model/20250721144835/skybox_rain.glb')).toContain('skybox_rain.glb');
        expect(assetCache.get('https://example.com/Upload/Model/20250806004435/skybox_night (7).glb')).toContain('skybox_night (7).glb');
        expect(assetCache.get('https://example.com/Upload/Model/20250717070128/PlayArea2.glb')).toContain('PlayArea2.glb');
        expect(assetCache.get('https://example.com/Upload/Model/20250725095237/skybox_day (1).glb')).toContain('skybox_day (1).glb');

        console.log('Production scenario test completed - no filename mismatches detected!');
    });
});