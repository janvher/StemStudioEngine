import * as THREE from "three";

import {resolveAssetUrl} from "./AssetDownloadUtils";
import {smartResolveAssetUrl} from "./RuntimeAssetLoader";

/**
 * Wrapper utilities for Three.js loaders that automatically resolve asset IDs
 * to download URLs using the new dedicated download endpoints
 */

/**
 * Load a texture with automatic asset ID resolution
 * Uses optimized loading in play mode, design-time loading in editor mode
 * @param urlOrId Either a regular URL or an asset ID
 * @param onLoad Optional callback when texture is loaded
 * @param onProgress Optional progress callback
 * @param onError Optional error callback
 * @returns Promise resolving to the loaded texture
 */
export async function loadTextureWithAssetResolution(
    urlOrId: string,
    onLoad?: (texture: THREE.Texture) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: any) => void,
): Promise<THREE.Texture> {
    const resolvedUrl = await smartResolveAssetUrl(urlOrId, "texture");

    return new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(
            resolvedUrl,
            texture => {
                onLoad?.(texture);
                resolve(texture);
            },
            onProgress,
            error => {
                onError?.(error);
                reject(error);
            },
        );
    });
}

/**
 * Load a video texture with automatic asset ID resolution
 * Uses optimized loading in play mode, design-time loading in editor mode
 * @param urlOrId Either a regular URL or an asset ID
 * @returns Promise resolving to the video element and texture
 */
export async function loadVideoTextureWithAssetResolution(
    urlOrId: string,
): Promise<{video: HTMLVideoElement; texture: THREE.VideoTexture}> {
    const resolvedUrl = await smartResolveAssetUrl(urlOrId, "video");

    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.src = resolvedUrl;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;

        video.addEventListener("loadeddata", () => {
            const texture = new THREE.VideoTexture(video);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            resolve({video, texture});
        });

        video.addEventListener("error", error => {
            reject(error);
        });

        video.load();
    });
}

/**
 * Resolve a video URL for direct assignment to video elements
 * Uses optimized loading in play mode, design-time loading in editor mode
 * @param urlOrId Either a regular URL or an asset ID
 * @returns Promise resolving to the final URL
 */
export async function resolveVideoUrl(urlOrId: string): Promise<string> {
    return smartResolveAssetUrl(urlOrId, "video");
}

/**
 * Resolve an image URL for direct assignment to image elements
 * Uses optimized loading in play mode, design-time loading in editor mode
 * @param urlOrId Either a regular URL or an asset ID
 * @returns Promise resolving to the final URL
 */
export async function resolveImageUrl(urlOrId: string): Promise<string> {
    return smartResolveAssetUrl(urlOrId, "image");
}

/**
 * Resolve an animation URL for MMD or other animation loaders
 * Uses optimized loading in play mode, design-time loading in editor mode
 * @param urlOrId Either a regular URL or an asset ID
 * @returns Promise resolving to the final URL
 */
export async function resolveAnimationUrl(urlOrId: string): Promise<string> {
    return smartResolveAssetUrl(urlOrId, "animation");
}

/**
 * Resolve an avatar URL for VRM or other avatar loaders
 * Uses optimized loading in play mode, design-time loading in editor mode
 * @param urlOrId Either a regular URL or an asset ID
 * @returns Promise resolving to the final URL
 */
export async function resolveAvatarUrl(urlOrId: string): Promise<string> {
    return smartResolveAssetUrl(urlOrId, "avatar");
}

/**
 * Resolve a mesh URL for GLTF, GLB, or other 3D model loaders
 * Uses optimized loading in play mode, design-time loading in editor mode
 * @param urlOrId Either a regular URL or an asset ID
 * @returns Promise resolving to the final URL
 */
export async function resolveMeshUrl(urlOrId: string): Promise<string> {
    return smartResolveAssetUrl(urlOrId, "mesh");
}

/**
 * Resolve an audio URL for direct assignment to audio elements
 * Uses optimized loading in play mode, design-time loading in editor mode
 * @param urlOrId Either a regular URL or an asset ID
 * @returns Promise resolving to the final URL
 */
export async function resolveAudioUrl(urlOrId: string): Promise<string> {
    return smartResolveAssetUrl(urlOrId, "audio");
}

/**
 * Load an ImageBitmap texture with automatic asset ID resolution
 * @param urlOrId Either a regular URL or an asset ID
 * @returns Promise resolving to the loaded texture
 */
export async function loadImageBitmapTextureWithAssetResolution(urlOrId: string): Promise<THREE.Texture> {
    const resolvedUrl = await smartResolveAssetUrl(urlOrId, "image");

    return new Promise((resolve, reject) => {
        const loader = new THREE.ImageBitmapLoader();
        loader.load(
            resolvedUrl,
            imageBitmap => {
                const texture = new THREE.Texture(imageBitmap);
                texture.needsUpdate = true;
                resolve(texture);
            },
            undefined,
            reject,
        );
    });
}

/**
 * Load a GLTF model with automatic asset ID resolution
 * @param urlOrId Either a regular URL or an asset ID
 * @returns Promise resolving to the resolved URL for GLTF loading
 */
export async function loadGLTFWithAssetResolution(urlOrId: string): Promise<string> {
    return smartResolveAssetUrl(urlOrId, "mesh");
}

/**
 * Enhanced TextureLoader wrapper that automatically detects and resolves asset IDs
 * This can be used as a drop-in replacement for THREE.TextureLoader().load()
 */
export class EnhancedTextureLoader extends THREE.TextureLoader {
    async loadWithAssetResolution(
        urlOrId: string,
        onLoad?: (texture: THREE.Texture) => void,
        onProgress?: (event: ProgressEvent) => void,
        onError?: (error: any) => void,
    ): Promise<THREE.Texture> {
        const resolvedUrl = await smartResolveAssetUrl(urlOrId, "texture");

        return new Promise((resolve, reject) => {
            this.load(
                resolvedUrl,
                texture => {
                    onLoad?.(texture);
                    resolve(texture);
                },
                onProgress,
                error => {
                    onError?.(error);
                    reject(error);
                },
            );
        });
    }
}
