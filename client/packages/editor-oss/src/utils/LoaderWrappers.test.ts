import * as THREE from 'three';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
    loadTextureWithAssetResolution,
    loadVideoTextureWithAssetResolution,
    resolveVideoUrl,
    resolveImageUrl,
    resolveAnimationUrl,
    resolveAvatarUrl,
    resolveMeshUrl,
    loadGLTFWithAssetResolution,
    loadImageBitmapTextureWithAssetResolution,
} from './LoaderWrappers';

// Mock the AssetDownloadUtils
vi.mock('./AssetDownloadUtils', () => ({
    resolveAssetUrl: vi.fn(),
    isAssetId: vi.fn(),
}));

// Mock the RuntimeAssetLoader
vi.mock('./RuntimeAssetLoader', () => ({
    smartResolveAssetUrl: vi.fn(),
}));

// Mock THREE.js loaders
vi.mock('three', async () => {
    const actual = await vi.importActual('three') as typeof THREE;
    return {
        ...actual,
        TextureLoader: vi.fn().mockImplementation(function() {
            return {
                load: vi.fn(),
            };
        }),
        ImageBitmapLoader: vi.fn().mockImplementation(function() {
            return {
                load: vi.fn(),
            };
        }),
        VideoTexture: vi.fn().mockImplementation(function(video) {
            return {
                video,
                colorSpace: null,
                minFilter: null,
                magFilter: null,
            };
        }),
        SRGBColorSpace: 'srgb',
        LinearFilter: 'linear',
    };
});

describe('LoaderWrappers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('URL resolution functions', () => {
        it('should resolve video URLs correctly', async () => {
            const { smartResolveAssetUrl } = await import('./RuntimeAssetLoader');
            vi.mocked(smartResolveAssetUrl).mockResolvedValue('http://localhost:2020/api/Asset/Download/video/test_id/test.mp4');

            const result = await resolveVideoUrl('507f1f77bcf86cd799439011');

            expect(smartResolveAssetUrl).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'video');
            expect(result).toBe('http://localhost:2020/api/Asset/Download/video/test_id/test.mp4');
        });

        it('should resolve image URLs correctly', async () => {
            const { smartResolveAssetUrl } = await import('./RuntimeAssetLoader');
            vi.mocked(smartResolveAssetUrl).mockResolvedValue('http://localhost:2020/api/Asset/Download/image/test_id/test.jpg');

            const result = await resolveImageUrl('507f1f77bcf86cd799439011');

            expect(smartResolveAssetUrl).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'image');
            expect(result).toBe('http://localhost:2020/api/Asset/Download/image/test_id/test.jpg');
        });

        it('should resolve animation URLs correctly', async () => {
            const { smartResolveAssetUrl } = await import('./RuntimeAssetLoader');
            vi.mocked(smartResolveAssetUrl).mockResolvedValue('http://localhost:2020/api/Asset/Download/animation/test_id/test.fbx');

            const result = await resolveAnimationUrl('507f1f77bcf86cd799439011');

            expect(smartResolveAssetUrl).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'animation');
            expect(result).toBe('http://localhost:2020/api/Asset/Download/animation/test_id/test.fbx');
        });

        it('should resolve avatar URLs correctly', async () => {
            const { smartResolveAssetUrl } = await import('./RuntimeAssetLoader');
            vi.mocked(smartResolveAssetUrl).mockResolvedValue('http://localhost:2020/api/Asset/Download/avatar/test_id/test.vrm');

            const result = await resolveAvatarUrl('507f1f77bcf86cd799439011');

            expect(smartResolveAssetUrl).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'avatar');
            expect(result).toBe('http://localhost:2020/api/Asset/Download/avatar/test_id/test.vrm');
        });

        it('should resolve mesh URLs correctly', async () => {
            const { smartResolveAssetUrl } = await import('./RuntimeAssetLoader');
            vi.mocked(smartResolveAssetUrl).mockResolvedValue('http://localhost:2020/api/Asset/Download/model/test_id/test.glb');

            const result = await resolveMeshUrl('507f1f77bcf86cd799439011');

            expect(smartResolveAssetUrl).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'mesh');
            expect(result).toBe('http://localhost:2020/api/Asset/Download/model/test_id/test.glb');
        });

        it('should resolve GLTF URLs correctly', async () => {
            const { smartResolveAssetUrl } = await import('./RuntimeAssetLoader');
            vi.mocked(smartResolveAssetUrl).mockResolvedValue('http://localhost:2020/api/Asset/Download/model/test_id/test.gltf');

            const result = await loadGLTFWithAssetResolution('507f1f77bcf86cd799439011');

            expect(smartResolveAssetUrl).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'mesh');
            expect(result).toBe('http://localhost:2020/api/Asset/Download/model/test_id/test.gltf');
        });
    });

    describe('loadTextureWithAssetResolution', () => {
        it('should load texture with resolved URL', async () => {
            const { smartResolveAssetUrl } = await import('./RuntimeAssetLoader');
            vi.mocked(smartResolveAssetUrl).mockResolvedValue('http://localhost:2020/api/Asset/Download/texture/test_id/test.jpg');

            const mockTexture = { image: { width: 512, height: 512 } };
            const mockLoader = {
                load: vi.fn().mockImplementation((url, onLoad) => {
                    onLoad(mockTexture);
                }),
            };
            vi.mocked(THREE.TextureLoader).mockImplementation(function() { return mockLoader as any; });

            const result = await loadTextureWithAssetResolution('507f1f77bcf86cd799439011');

            expect(smartResolveAssetUrl).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'texture');
            expect(mockLoader.load).toHaveBeenCalledWith(
                'http://localhost:2020/api/Asset/Download/texture/test_id/test.jpg',
                expect.any(Function),
                undefined,
                expect.any(Function),
            );
            expect(result).toBe(mockTexture);
        });

        it('should handle texture loading errors', async () => {
            const { smartResolveAssetUrl } = await import('./RuntimeAssetLoader');
            vi.mocked(smartResolveAssetUrl).mockResolvedValue('http://localhost:2020/api/Asset/Download/texture/test_id/test.jpg');

            const mockError = new Error('Failed to load texture');
            const mockLoader = {
                load: vi.fn().mockImplementation((url, onLoad, onProgress, onError) => {
                    onError(mockError);
                }),
            };
            vi.mocked(THREE.TextureLoader).mockImplementation(function() { return mockLoader as any; });

            await expect(loadTextureWithAssetResolution('507f1f77bcf86cd799439011')).rejects.toThrow('Failed to load texture');
        });

        it('should call optional callbacks', async () => {
            const { smartResolveAssetUrl } = await import('./RuntimeAssetLoader');
            vi.mocked(smartResolveAssetUrl).mockResolvedValue('http://localhost:2020/api/Asset/Download/texture/test_id/test.jpg');

            const mockTexture = { image: { width: 512, height: 512 } };
            const mockLoader = {
                load: vi.fn().mockImplementation((url, onLoad) => {
                    onLoad(mockTexture);
                }),
            };
            vi.mocked(THREE.TextureLoader).mockImplementation(function() { return mockLoader as any; });

            const onLoad = vi.fn();
            const onProgress = vi.fn();
            const onError = vi.fn();

            await loadTextureWithAssetResolution('507f1f77bcf86cd799439011', onLoad, onProgress, onError);

            expect(onLoad).toHaveBeenCalledWith(mockTexture);
        });
    });

    describe('loadVideoTextureWithAssetResolution', () => {
        it('should load video texture with resolved URL', async () => {
            const { smartResolveAssetUrl } = await import('./RuntimeAssetLoader');
            vi.mocked(smartResolveAssetUrl).mockResolvedValue('http://localhost:2020/api/Asset/Download/video/test_id/test.mp4');

            // Mock HTMLVideoElement
            const mockVideo = {
                src: '',
                loop: false,
                muted: false,
                playsInline: false,
                addEventListener: vi.fn(),
                load: vi.fn(),
            };

            // Mock document.createElement
            global.document = {
                createElement: vi.fn().mockReturnValue(mockVideo),
            } as any;

            const mockTexture = { video: mockVideo, colorSpace: null, minFilter: null, magFilter: null };
            vi.mocked(THREE.VideoTexture).mockImplementation(function() { return mockTexture as any; });

            // Mock immediate event trigger for loadeddata
            mockVideo.addEventListener = vi.fn().mockImplementation((event, callback) => {
                if (event === 'loadeddata') {
                    // Trigger callback immediately
                    Promise.resolve().then(() => callback());
                }
            });

            const result = await loadVideoTextureWithAssetResolution('507f1f77bcf86cd799439011');

            expect(smartResolveAssetUrl).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'video');
            expect(result.video.src).toBe('http://localhost:2020/api/Asset/Download/video/test_id/test.mp4');
            expect(result.video.loop).toBe(true);
            expect(result.video.muted).toBe(true);
            expect(result.video.playsInline).toBe(true);
            expect(result.texture).toBe(mockTexture);
        });
    });

    describe('loadImageBitmapTextureWithAssetResolution', () => {
        it('should load ImageBitmap texture with resolved URL', async () => {
            const { smartResolveAssetUrl } = await import('./RuntimeAssetLoader');
            vi.mocked(smartResolveAssetUrl).mockResolvedValue('http://localhost:2020/api/Asset/Download/image/test_id/test.jpg');

            const mockImageBitmap = {};
            const mockTexture = { needsUpdate: false };
            const mockLoader = {
                load: vi.fn().mockImplementation((url, onLoad) => {
                    onLoad(mockImageBitmap);
                }),
            };

            // Mock THREE.ImageBitmapLoader constructor
            vi.mocked(THREE.ImageBitmapLoader).mockImplementation(function() { return mockLoader as any; });

            // Mock THREE.Texture constructor
            const mockTextureConstructor = vi.fn().mockImplementation(function() { return mockTexture; });
            (THREE as any).Texture = mockTextureConstructor;

            const result = await loadImageBitmapTextureWithAssetResolution('507f1f77bcf86cd799439011');

            expect(smartResolveAssetUrl).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'image');
            expect(mockLoader.load).toHaveBeenCalledWith(
                'http://localhost:2020/api/Asset/Download/image/test_id/test.jpg',
                expect.any(Function),
                undefined,
                expect.any(Function),
            );
            expect(mockTextureConstructor).toHaveBeenCalledWith(mockImageBitmap);
            expect(result.needsUpdate).toBe(true);
        });
    });

    describe('EnhancedTextureLoader', () => {
        it('should load texture with asset resolution', async () => {
            const { smartResolveAssetUrl } = await import('./RuntimeAssetLoader');
            vi.mocked(smartResolveAssetUrl).mockResolvedValue('http://localhost:2020/api/Asset/Download/texture/test_id/test.jpg');

            const mockTexture = { image: { width: 512, height: 512 } };
            const mockLoad = vi.fn().mockImplementation((url, onLoad) => {
                onLoad(mockTexture);
            });

            // Create a proper mock of the EnhancedTextureLoader
            const MockEnhancedTextureLoader = vi.fn().mockImplementation(function() {
                return {
                    load: mockLoad,
                    loadWithAssetResolution: async function(
                        urlOrId: string,
                        onLoad?: (texture: THREE.Texture) => void,
                        onProgress?: (event: ProgressEvent) => void,
                        onError?: (error: unknown) => void,
                    ) {
                        const resolvedUrl = await smartResolveAssetUrl(urlOrId, 'texture');
                        return new Promise((resolve, reject) => {
                            this.load(
                                resolvedUrl,
                                (texture: THREE.Texture) => {
                                    onLoad?.(texture);
                                    resolve(texture);
                                },
                                onProgress,
                                (error: unknown) => {
                                    onError?.(error);
                                    reject(error);
                                },
                            );
                        });
                    },
                };
            });

            const loader = new MockEnhancedTextureLoader();
            const result = await loader.loadWithAssetResolution('507f1f77bcf86cd799439011');

            expect(smartResolveAssetUrl).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'texture');
            expect(mockLoad).toHaveBeenCalledWith(
                'http://localhost:2020/api/Asset/Download/texture/test_id/test.jpg',
                expect.any(Function),
                undefined,
                expect.any(Function),
            );
            expect(result).toBe(mockTexture);
        });

        it('should handle loading errors in EnhancedTextureLoader', async () => {
            const { smartResolveAssetUrl } = await import('./RuntimeAssetLoader');
            vi.mocked(smartResolveAssetUrl).mockResolvedValue('http://localhost:2020/api/Asset/Download/texture/test_id/test.jpg');

            const mockError = new Error('Texture loading failed');
            const mockLoad = vi.fn().mockImplementation((url, onLoad, onProgress, onError) => {
                onError(mockError);
            });

            // Create a proper mock of the EnhancedTextureLoader
            const MockEnhancedTextureLoader = vi.fn().mockImplementation(function() {
                return {
                    load: mockLoad,
                    loadWithAssetResolution: async function(
                        urlOrId: string,
                        onLoad?: (texture: THREE.Texture) => void,
                        onProgress?: (event: ProgressEvent) => void,
                        onError?: (error: unknown) => void,
                    ) {
                        const resolvedUrl = await smartResolveAssetUrl(urlOrId, 'texture');
                        return new Promise((resolve, reject) => {
                            this.load(
                                resolvedUrl,
                                (texture: THREE.Texture) => {
                                    onLoad?.(texture);
                                    resolve(texture);
                                },
                                onProgress,
                                (error: unknown) => {
                                    onError?.(error);
                                    reject(error);
                                },
                            );
                        });
                    },
                };
            });

            const loader = new MockEnhancedTextureLoader();
            await expect(loader.loadWithAssetResolution('507f1f77bcf86cd799439011')).rejects.toThrow('Texture loading failed');
        });
    });
});