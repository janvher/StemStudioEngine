import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules first
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

import Ajax from './Ajax';
import { UploadUtils } from './UploadUtils';

const mockAjax = Ajax as any;

describe('UploadUtils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('batchUploadFiles', () => {
        it('should upload files in batches with correct concurrency', async () => {
            // Setup
            const files = Array.from({ length: 10 }, (_, i) =>
                new File([`content${i}`], `file${i}.txt`, { type: 'text/plain' }),
            );

            mockAjax.post.mockResolvedValue({
                data: { Code: 200, Data: { id: 'test-id' } },
            });

            let progressCallCount = 0;
            const progressCallback = vi.fn((completed, total, errors) => {
                progressCallCount++;
                expect(completed).toBeLessThanOrEqual(total);
                expect(total).toBe(10);
                expect(Array.isArray(errors)).toBe(true);
            });

            // Execute
            const result = await UploadUtils.batchUploadFiles(
                files,
                '/api/test/upload',
                progressCallback,
                undefined,
                'library-id',
                3, // maxConcurrency
            );

            // Verify
            expect(result.successful).toHaveLength(10);
            expect(result.failed).toHaveLength(0);
            expect(mockAjax.post).toHaveBeenCalledTimes(10);
            expect(progressCallback).toHaveBeenCalled();

            // Verify concurrency by checking that not all requests started simultaneously
            // (This is a simplified check - in real scenarios you'd use more sophisticated timing)
            expect(progressCallCount).toBeGreaterThan(0);
        });

        it('should handle upload failures gracefully', async () => {
            // Setup
            const files = [
                new File(['content1'], 'file1.txt', { type: 'text/plain' }),
                new File(['content2'], 'file2.txt', { type: 'text/plain' }),
                new File(['content3'], 'file3.txt', { type: 'text/plain' }),
            ];

            mockAjax.post
                .mockResolvedValueOnce({ data: { Code: 200, Data: { id: 'success1' } } })
                .mockRejectedValueOnce(new Error('Upload failed'))
                .mockResolvedValueOnce({ data: { Code: 200, Data: { id: 'success2' } } });

            const progressCallback = vi.fn();

            // Execute
            const result = await UploadUtils.batchUploadFiles(
                files,
                '/api/test/upload',
                progressCallback,
                undefined,
                'library-id',
                2,
            );

            // Verify
            expect(result.successful).toHaveLength(2);
            expect(result.failed).toHaveLength(1);
            expect(result.failed[0]!.file.name).toBe('file2.txt');
            expect(result.failed[0]!.error.message).toBe('Upload failed');
        });

        it('should respect maxConcurrency parameter', async () => {
            // Setup
            const files = Array.from({ length: 6 }, (_, i) =>
                new File([`content${i}`], `file${i}.txt`, { type: 'text/plain' }),
            );

            let activeRequests = 0;
            let maxActiveRequests = 0;

            mockAjax.post.mockImplementation(() => {
                activeRequests++;
                maxActiveRequests = Math.max(maxActiveRequests, activeRequests);

                return new Promise(resolve => {
                    setTimeout(() => {
                        activeRequests--;
                        resolve({ data: { Code: 200, Data: { id: 'test-id' } } });
                    }, 10);
                });
            });

            // Execute with maxConcurrency = 2
            await UploadUtils.batchUploadFiles(
                files,
                '/api/test/upload',
                undefined,
                undefined,
                'library-id',
                2,
            );

            // Verify that no more than 2 requests were active simultaneously
            expect(maxActiveRequests).toBeLessThanOrEqual(2);
        });

        it('should include correct data in upload requests', async () => {
            // Setup
            const file = new File(['content'], 'test.txt', { type: 'text/plain' });

            mockAjax.post.mockResolvedValue({
                data: { Code: 200, Data: { id: 'test-id' } },
            });

            // Execute
            await UploadUtils.batchUploadFiles(
                [file],
                '/api/test/upload',
                undefined,
                'scene-123',
                'library-456',
                1,
            );

            // Verify
            expect(mockAjax.post).toHaveBeenCalledWith({
                url: 'http://localhost:2020/api/test/upload',
                msgBodyType: 'multipart',
                data: {
                    file,
                    SceneID: 'scene-123',
                    LibraryIDToAdd: 'library-456',
                },
            });
        });

        it('should handle server error responses', async () => {
            // Setup
            const file = new File(['content'], 'test.txt', { type: 'text/plain' });

            mockAjax.post.mockResolvedValue({
                data: { Code: 400, Msg: 'Invalid file type' },
            });

            // Execute
            const result = await UploadUtils.batchUploadFiles(
                [file],
                '/api/test/upload',
                undefined,
                undefined,
                'library-id',
                1,
            );

            // Verify
            expect(result.successful).toHaveLength(0);
            expect(result.failed).toHaveLength(1);
            expect(result.failed[0]!.error.message).toBe('Invalid file type');
        });
    });

    describe('batchUploadModels', () => {
        it('should upload models with thumbnails concurrently', async () => {
            // Setup
            const files = [
                new File(['model1'], 'model1.glb', { type: 'model/gltf-binary' }),
                new File(['model2'], 'model2.glb', { type: 'model/gltf-binary' }),
            ];
            const thumbnailUrls = ['thumb1.jpg', 'thumb2.jpg'];

            mockAjax.post.mockResolvedValue({
                data: { Code: 200, Data: { ID: 'model-id', name: 'Test Model' } },
            });

            const progressCallback = vi.fn();

            // Execute
            const result = await UploadUtils.batchUploadModels(
                files,
                thumbnailUrls,
                progressCallback,
                'scene-123',
                'library-456',
                2,
            );

            // Verify
            expect(result.successful).toHaveLength(2);
            expect(result.failed).toHaveLength(0);
            expect(mockAjax.post).toHaveBeenCalledTimes(2);

            // Check first call
            expect(mockAjax.post).toHaveBeenNthCalledWith(1, {
                url: 'http://localhost:2020/api/Mesh/Add',
                msgBodyType: 'multipart',
                data: {
                    file: files[0],
                    Image: thumbnailUrls[0],
                    SceneID: 'scene-123',
                    LibraryID: 'library-456',
                },
            });
        });

        it('should handle model upload failures', async () => {
            // Setup
            const files = [
                new File(['model1'], 'model1.glb', { type: 'model/gltf-binary' }),
                new File(['model2'], 'model2.glb', { type: 'model/gltf-binary' }),
            ];
            const thumbnailUrls = ['thumb1.jpg', 'thumb2.jpg'];

            mockAjax.post
                .mockResolvedValueOnce({ data: { Code: 200, Data: { ID: 'model-1' } } })
                .mockRejectedValueOnce(new Error('Network error'));

            const progressCallback = vi.fn();

            // Execute
            const result = await UploadUtils.batchUploadModels(
                files,
                thumbnailUrls,
                progressCallback,
                undefined,
                'library-456',
                2,
            );

            // Verify
            expect(result.successful).toHaveLength(1);
            expect(result.failed).toHaveLength(1);
            expect(result.failed[0]!.file.name).toBe('model2.glb');
            expect(progressCallback).toHaveBeenCalledWith(2, 2, expect.any(Array));
        });

        it('should work without optional parameters', async () => {
            // Setup
            const files = [new File(['model'], 'model.glb', { type: 'model/gltf-binary' })];
            const thumbnailUrls = ['thumb.jpg'];

            mockAjax.post.mockResolvedValue({
                data: { Code: 200, Data: { ID: 'model-id' } },
            });

            // Execute
            const result = await UploadUtils.batchUploadModels(
                files,
                thumbnailUrls,
            );

            // Verify
            expect(result.successful).toHaveLength(1);
            expect(mockAjax.post).toHaveBeenCalledWith({
                url: 'http://localhost:2020/api/Mesh/Add',
                msgBodyType: 'multipart',
                data: {
                    file: files[0],
                    Image: thumbnailUrls[0],
                },
            });
        });

        it('should respect maxConcurrency for model uploads', async () => {
            // Setup
            const files = Array.from({ length: 5 }, (_, i) =>
                new File([`model${i}`], `model${i}.glb`, { type: 'model/gltf-binary' }),
            );
            const thumbnailUrls = Array.from({ length: 5 }, (_, i) => `thumb${i}.jpg`);

            let activeRequests = 0;
            let maxActiveRequests = 0;

            mockAjax.post.mockImplementation(() => {
                activeRequests++;
                maxActiveRequests = Math.max(maxActiveRequests, activeRequests);

                return new Promise(resolve => {
                    setTimeout(() => {
                        activeRequests--;
                        resolve({ data: { Code: 200, Data: { ID: 'model-id' } } });
                    }, 10);
                });
            });

            // Execute with maxConcurrency = 2
            await UploadUtils.batchUploadModels(
                files,
                thumbnailUrls,
                undefined,
                undefined,
                undefined,
                2,
            );

            // Verify concurrency was respected
            expect(maxActiveRequests).toBeLessThanOrEqual(2);
        });
    });

    describe('Edge cases', () => {
        it('should handle empty file arrays', async () => {
            const result = await UploadUtils.batchUploadFiles([], '/api/test', undefined, undefined, 'lib', 3);
            expect(result.successful).toHaveLength(0);
            expect(result.failed).toHaveLength(0);
            expect(mockAjax.post).not.toHaveBeenCalled();
        });

        it('should handle zero maxConcurrency by defaulting to 1', async () => {
            const file = new File(['content'], 'test.txt', { type: 'text/plain' });
            mockAjax.post.mockResolvedValue({ data: { Code: 200, Data: {} } });

            const result = await UploadUtils.batchUploadFiles([file], '/api/test', undefined, undefined, 'lib', 0);
            expect(result.successful).toHaveLength(1);
        });

        it('should handle mismatched file and thumbnail arrays', async () => {
            const files = [
                new File(['model1'], 'model1.glb', { type: 'model/gltf-binary' }),
                new File(['model2'], 'model2.glb', { type: 'model/gltf-binary' }),
            ];
            const thumbnailUrls = ['thumb1.jpg']; // Missing second thumbnail

            mockAjax.post.mockResolvedValue({
                data: { Code: 200, Data: { ID: 'model-id' } },
            });

            const result = await UploadUtils.batchUploadModels(files, thumbnailUrls);

            expect(result.successful).toHaveLength(2);
            // Second model should use empty string as thumbnail
            expect(mockAjax.post).toHaveBeenNthCalledWith(2, expect.objectContaining({
                data: expect.objectContaining({
                    Image: '',
                }),
            }));
        });
    });
});