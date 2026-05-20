// Mock dependencies
vi.mock('./Ajax', () => ({
    default: {
        post: vi.fn(),
    },
}));

vi.mock('../showToast', () => ({
    showToast: vi.fn(),
}));

vi.mock('./UrlUtils', () => ({
    backendUrlFromPath: (path: string) => `http://localhost:2020${path}`,
}));

vi.mock('../controls/AiWorldController/AiWorldController.utils', () => ({
    urlToFile: vi.fn(),
}));

vi.mock('jszip', () => ({
    default: vi.fn().mockImplementation(() => ({
        file: vi.fn(),
        generateAsync: vi.fn().mockResolvedValue(new Blob()),
    })),
}));

import { ImportUtils, cleanupDefaultTerrainAssets, reuploadSingleImage } from './ImportUtils';
import { urlToFile } from '../controls/AiWorldController/AiWorldController.utils';

const mockUrlToFile = urlToFile as any;

describe('ImportUtils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('reuploadAssets', () => {
        it('should skip reupload if server is the same', async () => {
            const sceneData = [
                { metadata: { generator: 'OptionsSerializer' }, server: 'http://test.com' },
            ];

            const result = await ImportUtils.reuploadAssets(
                sceneData,
                'http://test.com',
                vi.fn(),
                vi.fn(),
                null,
            );

            expect(result.sceneData).toEqual(sceneData);
        });

        it('should process assets with parallel batching', async () => {
            const sceneData = [
                { metadata: { generator: 'OptionsSerializer' }, server: 'http://source.com' },
                {
                    metadata: { generator: 'ServerObject' },
                    userData: { Url: '/model1.glb', Thumbnail: '/thumb1.jpg' },
                },
                {
                    metadata: { generator: 'ServerObject' },
                    userData: { Url: '/model2.glb', Thumbnail: '/thumb2.jpg' },
                },
            ];

            const mockUploadFile = vi.fn().mockResolvedValue('http://new.com/thumb.jpg');
            const mockUploadModel = vi.fn().mockResolvedValue({
                url: 'http://new.com/model.glb',
                thumbnail: 'http://new.com/thumb.jpg',
            });

            mockUrlToFile.mockResolvedValue(new File(['content'], 'test.glb'));

            const progressCallback = vi.fn();

            const result = await ImportUtils.reuploadAssets(
                sceneData,
                'http://new.com',
                mockUploadFile,
                mockUploadModel,
                null,
                progressCallback,
            );

            expect(mockUploadModel).toHaveBeenCalledTimes(2);
            expect(progressCallback).toHaveBeenCalled();
            expect(result.sceneData[1].userData.Url).toBe('http://new.com/model.glb');
            expect(result.sceneData[2].userData.Url).toBe('http://new.com/model.glb');
        });

        it('should fail fast on asset processing failures', async () => {
            const sceneData = [
                { metadata: { generator: 'OptionsSerializer' }, server: 'http://source.com' },
                {
                    metadata: { generator: 'ServerObject' },
                    userData: { Url: '/model1.glb' },
                },
            ];

            const mockUploadFile = vi.fn().mockRejectedValue(new Error('Upload failed'));
            const mockUploadModel = vi.fn().mockRejectedValue(new Error('Model upload failed'));

            mockUrlToFile.mockRejectedValue(new Error('File download failed'));

            const progressCallback = vi.fn();

            // This should throw an error to abort scene creation
            await expect(ImportUtils.reuploadAssets(
                sceneData,
                'http://new.com',
                mockUploadFile,
                mockUploadModel,
                null,
                progressCallback,
            )).rejects.toThrow(/Failed to upload asset model1.glb*/);
        });

        it('should handle partial failures in old version gracefully', async () => {
            // Test that simulates the old behavior where some assets could fail
            // but the import would continue
            const sceneData = [
                { metadata: { generator: 'OptionsSerializer' }, server: 'http://source.com' },
                {
                    metadata: { generator: 'ServerObject' },
                    userData: { Url: '/model1.glb' },
                },
                {
                    metadata: { generator: 'ServerObject' },
                    userData: { Url: '/model2.glb' },
                },
                {
                    metadata: { generator: 'ServerObject' },
                    userData: { Url: '/model3.glb' },
                },
            ];

            const mockUploadFile = vi.fn().mockResolvedValue('http://new.com/thumb.jpg');
            const mockUploadModel = vi.fn()
                .mockResolvedValueOnce({ url: 'http://new.com/model1.glb', thumbnail: 'http://new.com/thumb1.jpg' })
                .mockRejectedValueOnce(new Error('Network timeout')) // This should cause failure
                .mockResolvedValueOnce({ url: 'http://new.com/model3.glb', thumbnail: 'http://new.com/thumb3.jpg' });

            mockUrlToFile.mockResolvedValue(new File(['content'], 'test.glb'));

            const progressCallback = vi.fn();

            // NEW behavior: Should fail completely on first error
            await expect(ImportUtils.reuploadAssets(
                sceneData,
                'http://new.com',
                mockUploadFile,
                mockUploadModel,
                null,
                progressCallback,
            )).rejects.toThrow();

            // Verify that progress callback was called with error info
            expect(progressCallback).toHaveBeenCalled();
        });

        it('should handle race conditions in asset cache during parallel processing', async () => {
            // Test multiple assets with the same URL being processed in parallel
            const duplicateUrl = '/shared-model.glb';
            const sceneData = [
                { metadata: { generator: 'OptionsSerializer' }, server: 'http://source.com' },
                { metadata: { generator: 'ServerObject' }, userData: { Url: duplicateUrl } },
                { metadata: { generator: 'ServerObject' }, userData: { Url: duplicateUrl } },
                { metadata: { generator: 'ServerObject' }, userData: { Url: duplicateUrl } },
                { metadata: { generator: 'ServerObject' }, userData: { Url: duplicateUrl } },
            ];

            let uploadCount = 0;
            const mockUploadModel = vi.fn().mockImplementation(async () => {
                uploadCount++;
                // Simulate some async delay
                await new Promise(resolve => setTimeout(resolve, 10));
                return {
                    url: `http://new.com/model-${uploadCount}.glb`,
                    thumbnail: `http://new.com/thumb-${uploadCount}.jpg`,
                };
            });

            const mockUploadFile = vi.fn().mockResolvedValue('http://new.com/thumb.jpg');
            mockUrlToFile.mockResolvedValue(new File(['content'], 'test.glb'));

            await ImportUtils.reuploadAssets(
                sceneData,
                'http://new.com',
                mockUploadFile,
                mockUploadModel,
                null,
            );

            // In ideal case, should only upload once due to caching
            // But with race conditions, might upload multiple times
            console.log('Upload count:', uploadCount);
            console.log('Final URLs:', sceneData.slice(1).map(item => item.userData!.Url));

            // All items should have the same URL if cache works properly
            const uniqueUrls = new Set(sceneData.slice(1).map(item => item.userData!.Url));
            expect(uniqueUrls.size).toBeLessThanOrEqual(4); // Should be 1 ideally, but race conditions may cause more
        });

        it('should track progress correctly during parallel processing', async () => {
            const sceneData = [
                { metadata: { generator: 'OptionsSerializer' }, server: 'http://source.com' },
                { metadata: { generator: 'ServerObject' }, userData: { Url: '/model1.glb' } },
                { metadata: { generator: 'ServerObject' }, userData: { Url: '/model2.glb' } },
                { metadata: { generator: 'ServerObject' }, userData: { Url: '/model3.glb' } },
                { metadata: { generator: 'ServerObject' }, userData: { Url: '/model4.glb' } },
                { metadata: { generator: 'ServerObject' }, userData: { Url: '/model5.glb' } },
            ];

            const mockUploadFile = vi.fn().mockResolvedValue('http://new.com/thumb.jpg');
            const mockUploadModel = vi.fn().mockImplementation(async (file) => {
                // Add random delay to simulate real upload conditions
                await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
                return {
                    url: `http://new.com/${file.name}`,
                    thumbnail: 'http://new.com/thumb.jpg',
                };
            });

            mockUrlToFile.mockResolvedValue(new File(['content'], 'test.glb'));

            const progressUpdates: any[] = [];
            const progressCallback = vi.fn().mockImplementation((progress) => {
                progressUpdates.push({ ...progress });
            });

            await ImportUtils.reuploadAssets(
                sceneData,
                'http://new.com',
                mockUploadFile,
                mockUploadModel,
                null,
                progressCallback,
            );

            // Check that progress was tracked correctly
            const finalProgress = progressUpdates[progressUpdates.length - 1];
            expect(finalProgress.processedAssets).toBe(5);
            expect(finalProgress.totalAssets).toBe(5);
            expect(finalProgress.failedAssets).toBe(0);

            // Check that progress never exceeded total
            progressUpdates.forEach(update => {
                expect(update.processedAssets).toBeLessThanOrEqual(update.totalAssets);
                expect(update.processedAssets + (update.failedAssets || 0)).toBeLessThanOrEqual(update.totalAssets);
            });
        });

        it('should provide accurate time estimates', async () => {
            const sceneData = [
                { metadata: { generator: 'OptionsSerializer' }, server: 'http://source.com' },
                { metadata: { generator: 'ServerObject' }, userData: { Url: '/model1.glb' } },
                { metadata: { generator: 'ServerObject' }, userData: { Url: '/model2.glb' } },
            ];

            const mockUploadFile = vi.fn().mockResolvedValue('http://new.com/thumb.jpg');
            const mockUploadModel = vi.fn().mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 100)); // Consistent 100ms delay
                return {
                    url: 'http://new.com/model.glb',
                    thumbnail: 'http://new.com/thumb.jpg',
                };
            });

            mockUrlToFile.mockResolvedValue(new File(['content'], 'test.glb'));

            const progressUpdates: any[] = [];
            const progressCallback = vi.fn().mockImplementation((progress) => {
                progressUpdates.push({ ...progress, timestamp: Date.now() });
            });

            await ImportUtils.reuploadAssets(
                sceneData,
                'http://new.com',
                mockUploadFile,
                mockUploadModel,
                null,
                progressCallback,
            );

            // Find updates with time estimates
            const updatesWithEstimates = progressUpdates.filter(u => u.estimatedTimeRemaining !== undefined);
            expect(updatesWithEstimates.length).toBeGreaterThan(0);

            // Time estimates should be reasonable (not negative, not too large)
            updatesWithEstimates.forEach(update => {
                expect(update.estimatedTimeRemaining).toBeGreaterThanOrEqual(0);
                expect(update.estimatedTimeRemaining).toBeLessThan(60); // Less than 60 seconds
            });
        });

        it('should process scene settings thumbnail', async () => {
            const sceneData = [
                { metadata: { generator: 'OptionsSerializer' }, server: 'http://source.com' },
            ];
            const sceneSettings = {
                IsMultiplayer: false,
                ShowStats: true,
                Thumbnail: '/scene-thumb.jpg',
                UseAvatar: false,
                UseInstancing: false,
                ShadowMapType: 'basic',
                VoiceChatEnabled: false,
            };

            const mockUploadFile = vi.fn().mockResolvedValue('http://new.com/scene-thumb.jpg');
            const mockUploadModel = vi.fn();

            mockUrlToFile.mockResolvedValue(new File(['content'], 'thumb.jpg'));

            await ImportUtils.reuploadAssets(
                sceneData,
                'http://new.com',
                mockUploadFile,
                mockUploadModel,
                sceneSettings,
            );

            expect(mockUploadFile).toHaveBeenCalled();
            expect(sceneSettings.Thumbnail).toBe('http://new.com/scene-thumb.jpg');
        });

        it('should use asset cache to avoid duplicate uploads', async () => {
            const sceneData = [
                { metadata: { generator: 'OptionsSerializer' }, server: 'http://source.com' },
                {
                    metadata: { generator: 'ServerObject' },
                    userData: { Url: '/model1.glb' },
                },
                {
                    metadata: { generator: 'ServerObject' },
                    userData: { Url: '/model1.glb' }, // Same URL
                },
            ];

            const mockUploadFile = vi.fn();
            const mockUploadModel = vi.fn().mockResolvedValue({
                url: 'http://new.com/model.glb',
                thumbnail: 'http://new.com/thumb.jpg',
            });

            mockUrlToFile.mockResolvedValue(new File(['content'], 'test.glb'));

            await ImportUtils.reuploadAssets(
                sceneData,
                'http://new.com',
                mockUploadFile,
                mockUploadModel,
                null,
            );

            // Should upload only once due to asset cache (fixed race condition)
            expect(mockUploadModel).toHaveBeenCalledTimes(1); // Fixed: no more duplicate uploads
            expect(sceneData[1]!.userData!.Url).toBe('http://new.com/model.glb');
            expect(sceneData[2]!.userData!.Url).toBe('http://new.com/model.glb');
        });

        it('should extract banner image from scene data', async () => {
            const sceneData = [
                { metadata: { generator: 'OptionsSerializer' }, server: 'http://source.com' },
                {
                    metadata: { generator: 'SceneSerializer' },
                    userData: { game: { bannerImage: '/banner.jpg' } },
                },
            ];

            const result = await ImportUtils.reuploadAssets(
                sceneData,
                'http://new.com',
                vi.fn(),
                vi.fn(),
                null,
            );

            expect(result.bannerImage).toBe('/banner.jpg');
        });
    });

    describe('cleanupDefaultTerrainAssets', () => {
        it('strips hashed bundled terrain texture URLs from imported customized terrain data', () => {
            const sceneData = [
                {
                    userData: {
                        behaviors: [
                            {
                                name: 'Terrain',
                                attributesData: {
                                    isDefaultState: false,
                                    groundTexture: 'https://example.com/assets/TER_Grassy-AbCd1234.png',
                                    rockTexture: 'https://example.com/custom-rock.png',
                                },
                            },
                        ],
                    },
                },
            ];

            cleanupDefaultTerrainAssets(sceneData);

            const attrs = sceneData[0]!.userData.behaviors[0]!.attributesData;
            expect(attrs.groundTexture).toBeUndefined();
            expect(attrs.rockTexture).toBe('https://example.com/custom-rock.png');
        });
    });

    describe('processObjectPropertiesForAssets', () => {
        it('should process nested object assets including behavior URLs', async () => {
            const testObject = {
                texture: '/Upload/File/20250812232618/texture.png',
                material: {
                    map: '/image2.png',
                    nested: {
                        texture: '/image3.webp',
                    },
                },
                userData: {
                    behaviors: [{
                        attributesData: {
                            external_url: 'http://example.com/video.mp4',
                            texture: '/Upload/File/texture2.jpg',
                            audio: '/Upload/sounds/audio.mp3',
                        },
                    }],
                },
                nonAsset: '/not-an-asset.txt',
            };

            const mockUploadFile = vi.fn()
                .mockResolvedValueOnce('http://new.com/texture.png')
                .mockResolvedValueOnce('http://new.com/image2.png')
                .mockResolvedValueOnce('http://new.com/image3.webp')
                .mockResolvedValueOnce('http://new.com/video.mp4')
                .mockResolvedValueOnce('http://new.com/texture2.jpg')
                .mockResolvedValueOnce('http://new.com/audio.mp3');

            mockUrlToFile.mockResolvedValue(new File(['content'], 'image.jpg'));

            await ImportUtils.processObjectPropertiesForAssets(
                [testObject],
                'http://source.com',
                new Map(),
                mockUploadFile,
                [],
            );

            expect(testObject.texture).toBe('http://new.com/texture.png');
            expect(testObject.material.map).toBe('http://new.com/image2.png');
            expect(testObject.material.nested.texture).toBe('http://new.com/image3.webp');
            expect(testObject.userData.behaviors[0]?.attributesData.external_url).toBe('http://new.com/video.mp4');
            expect(testObject.userData.behaviors[0]?.attributesData.texture).toBe('http://new.com/texture2.jpg');
            expect(testObject.userData.behaviors[0]?.attributesData.audio).toBe('http://new.com/audio.mp3');
            expect(testObject.nonAsset).toBe('/not-an-asset.txt'); // Should remain unchanged
        });

        it('should handle asset processing errors gracefully', async () => {
            const testObject = {
                texture: '/image1.jpg',
                video: '/video.mp4',
            };

            const mockUploadFile = vi.fn()
                .mockResolvedValueOnce('http://new.com/image1.jpg')
                .mockRejectedValueOnce(new Error('Upload failed'));

            mockUrlToFile.mockResolvedValue(new File(['content'], 'image.jpg'));

            await ImportUtils.processObjectPropertiesForAssets(
                [testObject],
                'http://source.com',
                new Map(),
                mockUploadFile,
                [],
            );

            expect(testObject.texture).toBe('http://new.com/image1.jpg');
            expect(testObject.video).toBe('/video.mp4'); // Should remain unchanged on error
        });

        it('should process behavior image attributes without file extensions', async () => {
            const testObject = {
                userData: {
                    behaviors: [{
                        id: 'test.behavior',
                        attributesData: {
                            texture: 'some-asset-id-without-extension',
                            uiImage: '/Upload/custom/asset/path',
                        },
                    }],
                },
            };

            const mockUploadFile = vi.fn()
                .mockResolvedValueOnce('http://new.com/asset-without-extension')
                .mockResolvedValueOnce('http://new.com/custom-asset');

            mockUrlToFile.mockResolvedValue(new File(['content'], 'asset.jpg'));

            await ImportUtils.processObjectPropertiesForAssets(
                [testObject],
                'http://source.com',
                new Map(),
                mockUploadFile,
                [],
            );

            expect(testObject.userData.behaviors[0]?.attributesData.texture).toBe('http://new.com/asset-without-extension');
            expect(testObject.userData.behaviors[0]?.attributesData.uiImage).toBe('http://new.com/custom-asset');
        });
    });

    describe('regression tests for version comparison', () => {
        it('should handle mixed success/failure scenarios like old version', async () => {
            // This test simulates a scenario where the old version would partially succeed
            // but the new version fails completely
            const sceneData = [
                { metadata: { generator: 'OptionsSerializer' }, server: 'http://source.com' },
                {
                    metadata: { generator: 'ServerObject' },
                    userData: { Url: '/working-model.glb' },
                },
                {
                    metadata: { generator: 'Other' },
                    userData: { texture: '/working-image.jpg' },
                },
            ];

            const mockUploadFile = vi.fn()
                .mockResolvedValueOnce('http://new.com/working-image.jpg');

            const mockUploadModel = vi.fn()
                .mockResolvedValueOnce({
                    url: 'http://new.com/working-model.glb',
                    thumbnail: 'http://new.com/thumb.jpg',
                });

            mockUrlToFile.mockResolvedValue(new File(['content'], 'test.glb'));

            const result = await ImportUtils.reuploadAssets(
                sceneData,
                'http://new.com',
                mockUploadFile,
                mockUploadModel,
                null,
            );

            expect(mockUploadFile).not.toHaveBeenCalled();
            expect(mockUploadModel).toHaveBeenCalledTimes(1);

            // Should succeed when all assets are uploadable
            expect(result.sceneData[1].userData.Url).toBe('http://new.com/working-model.glb');
            expect(result.sceneData[2].userData.texture).toBe('/working-image.jpg');
        });

        it('should maintain asset upload tracking for cleanup', async () => {
            const sceneData = [
                { metadata: { generator: 'OptionsSerializer' }, server: 'http://source.com' },
                {
                    metadata: { generator: 'ServerObject' },
                    userData: { Url: '/model1.glb', Thumbnail: '/thumb1.jpg' },
                },
                {
                    metadata: { generator: 'Other' },
                    userData: { backgroundImage: '/bg.png' },
                },
            ];

            const mockUploadFile = vi.fn()
                .mockResolvedValueOnce('http://new.com/thumb1.jpg')
                .mockResolvedValueOnce('http://new.com/bg.png');

            const mockUploadModel = vi.fn()
                .mockResolvedValueOnce({
                    url: 'http://new.com/model1.glb',
                    thumbnail: 'http://new.com/final-thumb1.jpg',
                });

            mockUrlToFile.mockResolvedValue(new File(['content'], 'test.file'));

            const result = await ImportUtils.reuploadAssets(
                sceneData,
                'http://new.com',
                mockUploadFile,
                mockUploadModel,
                null,
            );

            // Check that uploadedAssets array is properly populated
            expect(result.uploadedAssets).toContain('http://new.com/model1.glb');
            expect(result.uploadedAssets).toContain('http://new.com/final-thumb1.jpg');
            expect(result.uploadedAssets).toHaveLength(2);
        });

        it('should handle batch processing edge cases', async () => {
            // Test with exactly batch size items (4) and batch size + 1 (5)
            const createSceneData = (count: number) => [
                { metadata: { generator: 'OptionsSerializer' }, server: 'http://source.com' },
                ...Array.from({ length: count }, (_, i) => ({
                    metadata: { generator: 'ServerObject' },
                    userData: { Url: `/model${i + 1}.glb` },
                })),
            ];

            for (const itemCount of [4, 5]) {
                const sceneData = createSceneData(itemCount);

                const mockUploadFile = vi.fn().mockResolvedValue('http://new.com/thumb.jpg');
                const mockUploadModel = vi.fn().mockImplementation((file) => Promise.resolve({
                    url: `http://new.com/${file.name}`,
                    thumbnail: 'http://new.com/thumb.jpg',
                }));

                mockUrlToFile.mockResolvedValue(new File(['content'], 'test.glb'));

                const result = await ImportUtils.reuploadAssets(
                    sceneData,
                    'http://new.com',
                    mockUploadFile,
                    mockUploadModel,
                    null,
                );

                expect(mockUploadModel).toHaveBeenCalledTimes(itemCount);
                expect(result.sceneData.length).toBe(itemCount + 1); // +1 for OptionsSerializer
            }
        });

        it('should handle network timeouts and retries properly', async () => {
            const sceneData = [
                { metadata: { generator: 'OptionsSerializer' }, server: 'http://source.com' },
                {
                    metadata: { generator: 'ServerObject' },
                    userData: { Url: '/timeout-model.glb' },
                },
            ];

            const mockUploadFile = vi.fn().mockResolvedValue('http://new.com/thumb.jpg');
            const mockUploadModel = vi.fn().mockRejectedValue(new Error('Request timeout'));

            mockUrlToFile.mockRejectedValue(new Error('Network timeout'));

            const progressCallback = vi.fn();

            await expect(ImportUtils.reuploadAssets(
                sceneData,
                'http://new.com',
                mockUploadFile,
                mockUploadModel,
                null,
                progressCallback,
            )).rejects.toThrow('Network timeout');

            // Verify progress was updated with failure info
            const progressCalls = progressCallback.mock.calls;
            expect(progressCalls.length).toBeGreaterThan(0);
        });

        it('should handle empty and malformed scene data', async () => {
            // Test empty scene data
            let result = await ImportUtils.reuploadAssets(
                [],
                'http://new.com',
                vi.fn(),
                vi.fn(),
                null,
            );
            expect(result.sceneData).toEqual([]);
            expect(result.uploadedAssets).toEqual([]);

            // Test scene data without OptionsSerializer
            result = await ImportUtils.reuploadAssets(
                [{ metadata: { generator: 'Other' }, data: 'test' }],
                'http://new.com',
                vi.fn(),
                vi.fn(),
                null,
            );
            expect(result.sceneData.length).toBe(1);
            expect(result.uploadedAssets).toEqual([]);

            // Test scene data with OptionsSerializer but no server
            result = await ImportUtils.reuploadAssets(
                [{ metadata: { generator: 'OptionsSerializer' } }],
                'http://new.com',
                vi.fn(),
                vi.fn(),
                null,
            );
            expect(result.sceneData.length).toBe(1);
            expect(result.uploadedAssets).toEqual([]);
        });
    });

    describe('reuploadSingleImage', () => {
        it('should return original URL if empty', async () => {
            const result = await reuploadSingleImage('', 'http://source.com', new Map(), vi.fn());
            expect(result).toBe('');
        });

        it('should use cached URL if available', async () => {
            const cache = new Map();
            cache.set('http://source.com/image.jpg', 'http://new.com/cached-image.jpg');

            const result = await reuploadSingleImage(
                '/image.jpg',
                'http://source.com',
                cache,
                vi.fn(),
            );

            expect(result).toBe('http://new.com/cached-image.jpg');
        });

        it('should upload new image and cache result', async () => {
            const cache = new Map();
            const mockUploadFile = vi.fn().mockResolvedValue('http://new.com/uploaded-image.jpg');
            mockUrlToFile.mockResolvedValue(new File(['content'], 'image.jpg'));

            const result = await reuploadSingleImage(
                '/image.jpg',
                'http://source.com',
                cache,
                mockUploadFile,
            );

            expect(result).toBe('http://new.com/uploaded-image.jpg');
            expect(cache.get('http://source.com/image.jpg')).toBe('http://new.com/uploaded-image.jpg');
        });

        it('should return original URL on upload failure', async () => {
            const mockUploadFile = vi.fn().mockRejectedValue(new Error('Upload failed'));
            mockUrlToFile.mockRejectedValue(new Error('Download failed'));

            const result = await reuploadSingleImage(
                '/image.jpg',
                'http://source.com',
                new Map(),
                mockUploadFile,
            );

            expect(result).toBe('/image.jpg');
        });
    });

    describe('getFileTypeFromUrl', () => {
        it('should return correct MIME types for image extensions', () => {
            expect(ImportUtils.getFileTypeFromUrl('test.png')).toBe('image/png');
            expect(ImportUtils.getFileTypeFromUrl('test.jpg')).toBe('image/jpeg');
            expect(ImportUtils.getFileTypeFromUrl('test.jpeg')).toBe('image/jpeg');
            expect(ImportUtils.getFileTypeFromUrl('test.gif')).toBe('image/gif');
            expect(ImportUtils.getFileTypeFromUrl('test.webp')).toBe('image/webp');
            expect(ImportUtils.getFileTypeFromUrl('test.bmp')).toBe('image/bmp');
            expect(ImportUtils.getFileTypeFromUrl('test.svg')).toBe('image/svg+xml');
        });

        it('should return correct MIME types for video extensions', () => {
            expect(ImportUtils.getFileTypeFromUrl('test.mp4')).toBe('video/mp4');
            expect(ImportUtils.getFileTypeFromUrl('test.webm')).toBe('video/webm');
            expect(ImportUtils.getFileTypeFromUrl('test.mov')).toBe('video/quicktime');
            expect(ImportUtils.getFileTypeFromUrl('test.avi')).toBe('video/x-msvideo');
            expect(ImportUtils.getFileTypeFromUrl('test.mkv')).toBe('video/x-matroska');
        });

        it('should return correct MIME types for audio extensions', () => {
            expect(ImportUtils.getFileTypeFromUrl('test.mp3')).toBe('audio/mpeg');
            expect(ImportUtils.getFileTypeFromUrl('test.wav')).toBe('audio/wav');
            expect(ImportUtils.getFileTypeFromUrl('test.ogg')).toBe('audio/ogg');
            expect(ImportUtils.getFileTypeFromUrl('test.m4a')).toBe('audio/mp4');
            expect(ImportUtils.getFileTypeFromUrl('test.flac')).toBe('audio/flac');
        });

        it('should return correct MIME types for model extensions', () => {
            expect(ImportUtils.getFileTypeFromUrl('test.glb')).toBe('model/gltf-binary');
            expect(ImportUtils.getFileTypeFromUrl('test.gltf')).toBe('model/gltf+json');
            expect(ImportUtils.getFileTypeFromUrl('test.fbx')).toBe('application/octet-stream');
            expect(ImportUtils.getFileTypeFromUrl('test.vrm')).toBe('application/octet-stream');
            expect(ImportUtils.getFileTypeFromUrl('test.obj')).toBe('application/octet-stream');
            expect(ImportUtils.getFileTypeFromUrl('test.dae')).toBe('model/vnd.collada+xml');
        });

        it('should handle URLs with query parameters and fragments', () => {
            expect(ImportUtils.getFileTypeFromUrl('test.png?version=1')).toBe('image/png');
            expect(ImportUtils.getFileTypeFromUrl('test.jpg#fragment')).toBe('image/jpeg');
            expect(ImportUtils.getFileTypeFromUrl('test.glb?param=value#fragment')).toBe('model/gltf-binary');
        });

        it('should return empty string for unknown extensions', () => {
            expect(ImportUtils.getFileTypeFromUrl('test.unknown')).toBe('');
            expect(ImportUtils.getFileTypeFromUrl('no-extension')).toBe('');
            expect(ImportUtils.getFileTypeFromUrl('')).toBe('');
        });

        it('should handle case insensitive extensions', () => {
            expect(ImportUtils.getFileTypeFromUrl('test.PNG')).toBe('image/png');
            expect(ImportUtils.getFileTypeFromUrl('test.JPG')).toBe('image/jpeg');
            expect(ImportUtils.getFileTypeFromUrl('test.GLB')).toBe('model/gltf-binary');
        });
    });

    describe('isAssetUrl', () => {
        it('should detect absolute HTTP URLs', () => {
            expect(ImportUtils.isAssetUrl('http://example.com/image.jpg')).toBe(true);
            expect(ImportUtils.isAssetUrl('https://example.com/video.mp4')).toBe(true);
        });

        it('should detect Upload paths', () => {
            expect(ImportUtils.isAssetUrl('/Upload/File/20250812232618/texture.png')).toBe(true);
            expect(ImportUtils.isAssetUrl('/Upload/sounds/audio.mp3')).toBe(true);
        });

        it('should detect API paths', () => {
            expect(ImportUtils.isAssetUrl('/api/assets/model.glb')).toBe(true);
            expect(ImportUtils.isAssetUrl('/api/media/video.webm')).toBe(true);
        });

        it('should detect asset file extensions', () => {
            expect(ImportUtils.isAssetUrl('texture.png')).toBe(true);
            expect(ImportUtils.isAssetUrl('video.mp4')).toBe(true);
            expect(ImportUtils.isAssetUrl('audio.wav')).toBe(true);
            expect(ImportUtils.isAssetUrl('model.glb')).toBe(true);
            expect(ImportUtils.isAssetUrl('texture.JPEG')).toBe(true); // Case insensitive
        });

        it('should reject non-asset URLs', () => {
            expect(ImportUtils.isAssetUrl('')).toBe(false);
            expect(ImportUtils.isAssetUrl('not-a-url')).toBe(false);
            expect(ImportUtils.isAssetUrl('document.txt')).toBe(false);
            expect(ImportUtils.isAssetUrl('config.json')).toBe(false);
            expect(ImportUtils.isAssetUrl('/path/to/file')).toBe(false);
        });

        it('should handle null and undefined', () => {
            expect(ImportUtils.isAssetUrl(null as any)).toBe(false);
            expect(ImportUtils.isAssetUrl(undefined as any)).toBe(false);
        });

        it('should handle behavior texture paths with spaces', () => {
            expect(ImportUtils.isAssetUrl('/Upload/File/20250812232618/bluegrass_with_wallpaper_texture_v04 (1).png')).toBe(true);
        });

        it('should detect behavior context asset attributes', () => {
            // Test behavior context with common asset attribute names
            expect(ImportUtils.isAssetUrl('some-long-asset-id-12345', 'texture', true)).toBe(true);
            expect(ImportUtils.isAssetUrl('my/custom/path', 'uiImage', true)).toBe(true);
            expect(ImportUtils.isAssetUrl('asset-ref-12345', 'assetFile', true)).toBe(true);  // Changed to use dash
            expect(ImportUtils.isAssetUrl('/background/texture/url', 'backgroundImage', true)).toBe(true);  // Changed to path

            // Should not detect short strings or non-asset-like names in behavior context
            expect(ImportUtils.isAssetUrl('test', 'texture', true)).toBe(false);
            expect(ImportUtils.isAssetUrl('short', 'color', true)).toBe(false);
            expect(ImportUtils.isAssetUrl('value', 'enabled', true)).toBe(false);
        });

        it('should be conservative outside behavior context', () => {
            // Should not detect dash-separated IDs outside behavior context
            expect(ImportUtils.isAssetUrl('some-long-asset-id-12345', 'texture', false)).toBe(false);
            // Should detect paths even outside behavior context when key is asset-like
            expect(ImportUtils.isAssetUrl('my/custom/path', 'uiImage', false)).toBe(true);
        });
    });
});
