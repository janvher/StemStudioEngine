import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
    isAssetId,
    resolveAssetUrl,
    getImageDownloadUrl,
    getTextureDownloadUrl,
    getMeshDownloadUrl,
} from './AssetDownloadUtils';

// Mock the API functions
vi.mock('@stem/network/api/image', () => ({
    downloadImage: vi.fn(),
}));

vi.mock('@stem/network/api/video', () => ({
    downloadVideo: vi.fn(),
}));

vi.mock('@stem/network/api/texture', () => ({
    downloadTexture: vi.fn(),
}));

vi.mock('@stem/network/api/animation', () => ({
    downloadAnimation: vi.fn(),
}));

vi.mock('@stem/network/api/asset', () => ({
    getAsset: vi.fn(),
    getAssetRevision: vi.fn(),
}));


vi.mock('@stem/network/api/mesh', () => ({
    downloadMesh: vi.fn(),
}));

vi.mock('@stem/network/api/audio', () => ({
    downloadAudio: vi.fn(),
}));

vi.mock('./UrlUtils', () => ({
    backendUrlFromPath: (path: string) => `http://localhost:2020${path}`,
}));

describe('AssetDownloadUtils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('isAssetId', () => {
        it('should return true for valid MongoDB ObjectIds', () => {
            expect(isAssetId('507f1f77bcf86cd799439011')).toBe(true);
            expect(isAssetId('ABCDEF1234567890abcdef12')).toBe(true);
            expect(isAssetId('123456789012345678901234')).toBe(true);
        });

        it('should return false for invalid ObjectIds', () => {
            expect(isAssetId('507f1f77bcf86cd79943901')).toBe(false); // too short
            expect(isAssetId('507f1f77bcf86cd7994390112')).toBe(false); // too long
            expect(isAssetId('507f1f77bcf86cd79943901G')).toBe(false); // invalid char
            expect(isAssetId('http://example.com/file.png')).toBe(false); // URL
            expect(isAssetId('')).toBe(false); // empty
            expect(isAssetId('not-an-id')).toBe(false); // regular string
        });

        it('should handle whitespace correctly', () => {
            expect(isAssetId(' 507f1f77bcf86cd799439011 ')).toBe(true); // trimmed
            expect(isAssetId(' 507f1f77bcf86cd799439011')).toBe(true);
            expect(isAssetId('507f1f77bcf86cd799439011 ')).toBe(true);
        });
    });

    describe('getImageDownloadUrl', () => {
        it('should return success result for valid response', async () => {
            const mockResponse = {
                Code: 200,
                Path: '/api/Asset/Download/image/test_id/test.png',
                Msg: 'Success',
            };

            const { downloadImage } = await import('@stem/network/api/image');
            vi.mocked(downloadImage).mockResolvedValue(mockResponse);

            const result = await getImageDownloadUrl('507f1f77bcf86cd799439011');

            expect(result).toEqual({
                success: true,
                url: 'http://localhost:2020/api/Asset/Download/image/test_id/test.png',
            });
            expect(downloadImage).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
        });

        it('should return error result for failed response', async () => {
            const mockResponse = {
                Code: 404,
                Path: '',
                Msg: 'Image not found',
            };

            const { downloadImage } = await import('@stem/network/api/image');
            vi.mocked(downloadImage).mockResolvedValue(mockResponse);

            const result = await getImageDownloadUrl('507f1f77bcf86cd799439011');

            expect(result).toEqual({
                success: false,
                url: '',
                error: 'Image not found',
            });
        });

        it('should handle API errors', async () => {
            const { downloadImage } = await import('@stem/network/api/image');
            vi.mocked(downloadImage).mockRejectedValue(new Error('Network error'));

            const result = await getImageDownloadUrl('507f1f77bcf86cd799439011');

            expect(result).toEqual({
                success: false,
                url: '',
                error: 'Network error',
            });
        });
    });

    describe('getMeshDownloadUrl', () => {
        it('should return success result for valid mesh response', async () => {
            const mockResponse = {
                Code: 200,
                Path: '/api/Asset/Download/model/test_id/model.glb',
                Msg: 'Success',
            };

            const { downloadMesh } = await import('@stem/network/api/mesh');
            vi.mocked(downloadMesh).mockResolvedValue(mockResponse);

            const result = await getMeshDownloadUrl('507f1f77bcf86cd799439011');

            expect(result).toEqual({
                success: true,
                url: 'http://localhost:2020/api/Asset/Download/model/test_id/model.glb',
            });
            expect(downloadMesh).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
        });

        it('should return error result for failed mesh response', async () => {
            const mockResponse = {
                Code: 404,
                Path: '',
                Msg: 'Mesh not found',
            };

            const { downloadMesh } = await import('@stem/network/api/mesh');
            vi.mocked(downloadMesh).mockResolvedValue(mockResponse);

            const result = await getMeshDownloadUrl('507f1f77bcf86cd799439011');

            expect(result).toEqual({
                success: false,
                url: '',
                error: 'Mesh not found',
            });
        });
    });

    describe('getTextureDownloadUrl', () => {
        it('should handle regular texture response', async () => {
            const mockResponse = {
                Code: 200,
                Path: '/api/Asset/Download/texture/test_id/texture.jpg',
                Msg: 'Success',
            };

            const { downloadTexture } = await import('@stem/network/api/texture');
            vi.mocked(downloadTexture).mockResolvedValue(mockResponse);

            const result = await getTextureDownloadUrl('507f1f77bcf86cd799439011');

            expect(result).toEqual({
                success: true,
                url: 'http://localhost:2020/api/Asset/Download/texture/test_id/texture.jpg',
            });
        });

        it('should handle cube texture response', async () => {
            const mockResponse = {
                Code: 200,
                Path: undefined,
                CubeUrls: {
                    posX: '/api/Asset/Download/texture/cube_id/px.jpg',
                    negX: '/api/Asset/Download/texture/cube_id/nx.jpg',
                    posY: '/api/Asset/Download/texture/cube_id/py.jpg',
                    negY: '/api/Asset/Download/texture/cube_id/ny.jpg',
                    posZ: '/api/Asset/Download/texture/cube_id/pz.jpg',
                    negZ: '/api/Asset/Download/texture/cube_id/nz.jpg',
                },
                Msg: 'Success',
            };

            const { downloadTexture } = await import('@stem/network/api/texture');
            vi.mocked(downloadTexture).mockResolvedValue(mockResponse);

            const result = await getTextureDownloadUrl('507f1f77bcf86cd799439011');

            expect(result).toEqual({
                success: true,
                url: 'http://localhost:2020/api/Asset/Download/texture/cube_id/px.jpg',
            });
        });
    });

    describe('resolveAssetUrl', () => {
        it('should return URL as-is when not an asset ID', async () => {
            const url = 'https://example.com/image.png';
            const result = await resolveAssetUrl(url, 'image');
            expect(result).toBe(url);
        });

        it('should resolve asset ID for image type', async () => {
            const mockResponse = {
                Code: 200,
                Path: '/api/Asset/Download/image/test_id/test.png',
                Msg: 'Success',
            };

            const { downloadImage } = await import('@stem/network/api/image');
            vi.mocked(downloadImage).mockResolvedValue(mockResponse);

            const result = await resolveAssetUrl('507f1f77bcf86cd799439011', 'image');
            expect(result).toBe('http://localhost:2020/api/Asset/Download/image/test_id/test.png');
        });

        it('should resolve asset ID for mesh type', async () => {
            const mockResponse = {
                Code: 200,
                Path: '/api/Asset/Download/model/test_id/model.glb',
                Msg: 'Success',
            };

            const { downloadMesh } = await import('@stem/network/api/mesh');
            vi.mocked(downloadMesh).mockResolvedValue(mockResponse);

            const result = await resolveAssetUrl('507f1f77bcf86cd799439011', 'mesh');
            expect(result).toBe('http://localhost:2020/api/Asset/Download/model/test_id/model.glb');
        });

        it('should handle resolution errors by returning original URL', async () => {
            const { downloadImage } = await import('@stem/network/api/image');
            vi.mocked(downloadImage).mockRejectedValue(new Error('Network error'));

            const assetId = '507f1f77bcf86cd799439011';
            const result = await resolveAssetUrl(assetId, 'image');
            expect(result).toBe(assetId); // Returns original as fallback
        });

        it('should handle failed responses by returning original URL', async () => {
            const mockResponse = {
                Code: 404,
                Path: '',
                Msg: 'Not found',
            };

            const { downloadImage } = await import('@stem/network/api/image');
            vi.mocked(downloadImage).mockResolvedValue(mockResponse);

            const assetId = '507f1f77bcf86cd799439011';
            const result = await resolveAssetUrl(assetId, 'image');
            expect(result).toBe(assetId); // Returns original as fallback
        });

        it('should handle unsupported asset types', async () => {
            const assetId = '507f1f77bcf86cd799439011';
            const result = await resolveAssetUrl(assetId, 'unsupported' as any);
            expect(result).toBe(assetId);
        });

        it('should handle all supported asset types', async () => {
            // 'avatar' intentionally omitted: legacy avatar download path was removed; resolveAssetUrl returns the input id as fallback.
            const assetTypes = ['image', 'audio', 'video', 'texture', 'animation', 'mesh'] as const;

            for (const assetType of assetTypes) {
                // Mock each API function to return success
                const mockResponse = {
                    Code: 200,
                    Path: `/api/Asset/Download/${assetType}/test_id/test.file`,
                    Msg: 'Success',
                };

                switch (assetType) {
                    case 'image': {
                        const { downloadImage } = await import('@stem/network/api/image');
                        vi.mocked(downloadImage).mockResolvedValue(mockResponse);
                        break;
                    }
                    case 'audio': {
                        const { downloadAudio } = await import('@stem/network/api/audio');
                        vi.mocked(downloadAudio).mockResolvedValue(mockResponse);
                        break;
                    }
                    case 'video': {
                        const { downloadVideo } = await import('@stem/network/api/video');
                        vi.mocked(downloadVideo).mockResolvedValue(mockResponse);
                        break;
                    }
                    case 'texture': {
                        const { downloadTexture } = await import('@stem/network/api/texture');
                        vi.mocked(downloadTexture).mockResolvedValue(mockResponse);
                        break;
                    }
                    case 'animation': {
                        // Animation uses the new asset API
                        const { getAsset, getAssetRevision } = await import('@stem/network/api/asset');
                        vi.mocked(getAsset).mockResolvedValue({
                            id: 'test_id',
                            headRevisionId: 'test_revision',
                        } as any);
                        vi.mocked(getAssetRevision).mockResolvedValue({
                            dataUrl: `http://localhost:2020/api/Asset/Download/${assetType}/test_id/test.file`,
                        } as any);
                        break;
                    }
                    case 'mesh': {
                        const { downloadMesh } = await import('@stem/network/api/mesh');
                        vi.mocked(downloadMesh).mockResolvedValue(mockResponse);
                        break;
                    }
                }

                const result = await resolveAssetUrl('507f1f77bcf86cd799439011', assetType);
                expect(result).toBe(`http://localhost:2020/api/Asset/Download/${assetType}/test_id/test.file`);
            }
        });
    });
});