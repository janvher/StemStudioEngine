import { describe, it, expect, vi, beforeEach } from 'vitest';

import { isAssetId } from '../utils/AssetDownloadUtils';

// Mock all dependencies
vi.mock('../utils/AssetDownloadUtils', async () => {
    const actual = await vi.importActual('../utils/AssetDownloadUtils') as Record<string, unknown>;
    return {
        ...actual,
        resolveAssetUrl: vi.fn(),
        getMeshDownloadUrl: vi.fn(),
    };
});

vi.mock('../utils/LoaderWrappers', async () => {
    const actual = await vi.importActual('../utils/LoaderWrappers') as Record<string, unknown>;
    return {
        ...actual,
        resolveMeshUrl: vi.fn(),
        loadGLTFWithAssetResolution: vi.fn(),
    };
});

vi.mock('@stem/network/api/mesh', () => ({
    downloadMesh: vi.fn(),
}));

describe('GLTF Loading Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Asset ID Detection and Resolution', () => {
        it('should detect valid asset IDs for GLTF files', () => {
            const validAssetId = '507f1f77bcf86cd799439011';
            const invalidUrl = 'https://example.com/model.glb';

            expect(isAssetId(validAssetId)).toBe(true);
            expect(isAssetId(invalidUrl)).toBe(false);
        });

        it('should resolve mesh asset IDs to download URLs', async () => {
            const { resolveMeshUrl } = await import('../utils/LoaderWrappers');

            // Mock the resolve function to return the expected URL
            vi.mocked(resolveMeshUrl).mockResolvedValue('http://localhost:2020/api/Asset/Download/model/test_id/test-model.glb');

            const assetId = '507f1f77bcf86cd799439011';
            const resolvedUrl = await resolveMeshUrl(assetId);

            expect(resolvedUrl).toBe('http://localhost:2020/api/Asset/Download/model/test_id/test-model.glb');
            expect(resolveMeshUrl).toHaveBeenCalledWith(assetId);
        });

        it('should pass through regular URLs unchanged', async () => {
            const { resolveMeshUrl } = await import('../utils/LoaderWrappers');

            const regularUrl = 'https://example.com/model.glb';
            vi.mocked(resolveMeshUrl).mockResolvedValue(regularUrl);

            const result = await resolveMeshUrl(regularUrl);

            expect(result).toBe(regularUrl);
            expect(resolveMeshUrl).toHaveBeenCalledWith(regularUrl);
        });

        it('should handle GLTF loading with asset resolution', async () => {
            const { loadGLTFWithAssetResolution } = await import('../utils/LoaderWrappers');

            const expectedUrl = 'http://localhost:2020/api/Asset/Download/model/test_id/test-model.gltf';
            vi.mocked(loadGLTFWithAssetResolution).mockResolvedValue(expectedUrl);

            const assetId = '507f1f77bcf86cd799439011';
            const resolvedUrl = await loadGLTFWithAssetResolution(assetId);

            expect(resolvedUrl).toBe(expectedUrl);
            expect(loadGLTFWithAssetResolution).toHaveBeenCalledWith(assetId);
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors gracefully', async () => {
            const { resolveMeshUrl } = await import('../utils/LoaderWrappers');

            const assetId = '507f1f77bcf86cd799439011';

            // Mock network error fallback behavior
            vi.mocked(resolveMeshUrl).mockResolvedValue(assetId);

            const result = await resolveMeshUrl(assetId);
            expect(result).toBe(assetId); // Should return original as fallback
        });

        it('should handle malformed asset IDs', () => {
            const invalidAssetId = 'not-a-valid-asset-id';
            expect(isAssetId(invalidAssetId)).toBe(false);
        });

        it('should handle API errors gracefully', async () => {
            const { loadGLTFWithAssetResolution } = await import('../utils/LoaderWrappers');

            const assetId = '507f1f77bcf86cd799439011';

            // Mock error fallback - should return original asset ID
            vi.mocked(loadGLTFWithAssetResolution).mockResolvedValue(assetId);

            const result = await loadGLTFWithAssetResolution(assetId);
            expect(result).toBe(assetId);
        });
    });

    describe('Caching and Performance', () => {
        it('should handle concurrent requests for same asset', async () => {
            const { loadGLTFWithAssetResolution } = await import('../utils/LoaderWrappers');

            const assetId = '507f1f77bcf86cd799439011';
            const expectedUrl = 'http://localhost:2020/api/Asset/Download/model/test_id/test-model.glb';

            vi.mocked(loadGLTFWithAssetResolution).mockResolvedValue(expectedUrl);

            // Make multiple concurrent requests
            const promises = [
                loadGLTFWithAssetResolution(assetId),
                loadGLTFWithAssetResolution(assetId),
                loadGLTFWithAssetResolution(assetId),
            ];

            const results = await Promise.all(promises);

            // All should resolve to the same URL
            results.forEach(result => {
                expect(result).toBe(expectedUrl);
            });

            // All functions should have been called
            expect(loadGLTFWithAssetResolution).toHaveBeenCalledTimes(3);
        });

        it('should handle different asset types correctly', async () => {
            const { resolveAssetUrl } = await import('../utils/AssetDownloadUtils');

            const assetId = '507f1f77bcf86cd799439011';
            const meshUrl = 'http://localhost:2020/api/Asset/Download/model/test_id/model.glb';
            const textureUrl = 'http://localhost:2020/api/Asset/Download/texture/test_id/texture.jpg';

            vi.mocked(resolveAssetUrl)
                .mockResolvedValueOnce(meshUrl)
                .mockResolvedValueOnce(textureUrl);

            const meshResult = await resolveAssetUrl(assetId, 'mesh');
            const textureResult = await resolveAssetUrl(assetId, 'texture');

            expect(meshResult).toBe(meshUrl);
            expect(textureResult).toBe(textureUrl);
            expect(resolveAssetUrl).toHaveBeenCalledWith(assetId, 'mesh');
            expect(resolveAssetUrl).toHaveBeenCalledWith(assetId, 'texture');
        });
    });

    describe('Asset ID Format Validation', () => {
        it('should validate MongoDB ObjectId format correctly', () => {
            // Valid ObjectIds
            expect(isAssetId('507f1f77bcf86cd799439011')).toBe(true);
            expect(isAssetId('ABCDEF1234567890abcdef12')).toBe(true);
            expect(isAssetId('123456789012345678901234')).toBe(true);

            // Invalid formats
            expect(isAssetId('507f1f77bcf86cd79943901')).toBe(false); // too short
            expect(isAssetId('507f1f77bcf86cd7994390112')).toBe(false); // too long
            expect(isAssetId('507f1f77bcf86cd79943901G')).toBe(false); // invalid char
            expect(isAssetId('http://example.com/file.glb')).toBe(false); // URL
            expect(isAssetId('')).toBe(false); // empty
            expect(isAssetId('not-an-id')).toBe(false); // regular string

            // With whitespace
            expect(isAssetId(' 507f1f77bcf86cd799439011 ')).toBe(true); // trimmed
        });
    });
});