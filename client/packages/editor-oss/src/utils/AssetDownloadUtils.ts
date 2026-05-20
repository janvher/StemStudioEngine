import { shouldUseRuntimeOptimization, resolveRuntimeAssetUrl } from "./RuntimeAssetLoader";
import { backendUrlFromPath } from "./UrlUtils";
import { getAsset, getAssetRevision } from "@stem/network/api/asset";
import { downloadAudio, AudioDownloadResponse } from "@stem/network/api/audio";
import { downloadImage, ImageDownloadResponse } from "@stem/network/api/image";
import { downloadMesh, MeshDownloadResponse } from "@stem/network/api/mesh";
import { downloadTexture, TextureDownloadResponse } from "@stem/network/api/texture";
import { downloadVideo, VideoDownloadResponse } from "@stem/network/api/video";

/**
 * Utility for converting asset IDs to download URLs using dedicated endpoints
 */

export interface AssetDownloadResult {
    success: boolean;
    url: string;
    error?: string;
}

/**
 * Get a download URL for an image asset by ID
 * @param imageId The image asset ID
 * @returns Promise resolving to download URL or error
 */
export async function getImageDownloadUrl(imageId: string): Promise<AssetDownloadResult> {
    try {
        const response: ImageDownloadResponse = await downloadImage(imageId);

        if (response.Code === 200 && response.Path) {
            const fullUrl = backendUrlFromPath(response.Path);
            return {
                success: true,
                url: fullUrl!,
            };
        } else {
            return {
                success: false,
                url: "",
                error: response.Msg || "Failed to get image download URL",
            };
        }
    } catch (error) {
        return {
            success: false,
            url: "",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get a download URL for an audio asset by ID
 * @param audioId The audio asset ID
 * @returns Promise resolving to download URL or error
 */
export async function getAudioDownloadUrl(audioId: string): Promise<AssetDownloadResult> {
    try {
        const response: AudioDownloadResponse = await downloadAudio(audioId);

        if (response.Code === 200 && response.Path) {
            const fullUrl = backendUrlFromPath(response.Path);
            return {
                success: true,
                url: fullUrl!,
            };
        } else {
            return {
                success: false,
                url: "",
                error: response.Msg || "Failed to get audio download URL",
            };
        }
    } catch (error) {
        return {
            success: false,
            url: "",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get a download URL for a video asset by ID
 * @param videoId The video asset ID
 * @returns Promise resolving to download URL or error
 */
export async function getVideoDownloadUrl(videoId: string): Promise<AssetDownloadResult> {
    try {
        const response: VideoDownloadResponse = await downloadVideo(videoId);

        if (response.Code === 200 && response.Path) {
            const fullUrl = backendUrlFromPath(response.Path);
            return {
                success: true,
                url: fullUrl!,
            };
        } else {
            return {
                success: false,
                url: "",
                error: response.Msg || "Failed to get video download URL",
            };
        }
    } catch (error) {
        return {
            success: false,
            url: "",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get download URLs for a texture asset by ID (handles both regular and cube textures)
 * @param textureId The texture asset ID
 * @returns Promise resolving to download URL(s) or error
 */
export async function getTextureDownloadUrl(textureId: string): Promise<AssetDownloadResult> {
    try {
        const response: TextureDownloadResponse = await downloadTexture(textureId);

        if (response.Code === 200) {
            if (response.Path) {
                // Regular texture
                const fullUrl = backendUrlFromPath(response.Path);
                return {
                    success: true,
                    url: fullUrl!,
                };
            } else if (response.CubeUrls) {
                // Cube texture - return the first URL (PosX) as primary
                // TODO: Consider returning all URLs or handling cube textures differently
                const fullUrl = backendUrlFromPath(response.CubeUrls.posX);
                return {
                    success: true,
                    url: fullUrl!,
                };
            }
        }

        return {
            success: false,
            url: "",
            error: response.Msg || "Failed to get texture download URL",
        };
    } catch (error) {
        return {
            success: false,
            url: "",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get a download URL for an animation asset by ID
 * Uses the new Asset API system instead of legacy Animation API
 * @param animationId The animation asset ID
 * @returns Promise resolving to download URL or error
 */
export async function getAnimationDownloadUrl(animationId: string): Promise<AssetDownloadResult> {
    try {
        const asset = await getAsset(animationId);
        const revision = await getAssetRevision(animationId, asset.headRevisionId, {
            includeDataUrl: true,
        });

        if (revision.dataUrl) {
            return {
                success: true,
                url: revision.dataUrl,
            };
        }
        return {
            success: false,
            url: "",
            error: "No data URL available for animation",
        };
    } catch (error) {
        return {
            success: false,
            url: "",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * @deprecated Removed with legacy /api/Avatar/* system. Avatars are now
 * regular Model assets; resolve via getMeshDownloadUrl instead.
 */
export async function getAvatarDownloadUrl(_avatarId: string): Promise<AssetDownloadResult> {
    return {
        success: false,
        url: "",
        error: "Legacy avatar download removed; use mesh asset download path",
    };
}

/**
 * Get a download URL for a mesh asset by ID
 * @param meshId The mesh asset ID
 * @returns Promise resolving to download URL or error
 */
export async function getMeshDownloadUrl(meshId: string): Promise<AssetDownloadResult> {
    try {
        const response: MeshDownloadResponse = await downloadMesh(meshId);

        if (response.Code === 200 && response.Path) {
            const fullUrl = backendUrlFromPath(response.Path);
            return {
                success: true,
                url: fullUrl!,
            };
        } else {
            return {
                success: false,
                url: "",
                error: response.Msg || "Failed to get mesh download URL",
            };
        }
    } catch (error) {
        return {
            success: false,
            url: "",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Check if a URL is an asset ID (should use dedicated download endpoint)
 * Asset IDs are MongoDB ObjectId format: 24 character hex string
 * @param urlOrId The URL or asset ID to check
 * @returns true if it looks like an asset ID
 */
export function isAssetId(urlOrId: string): boolean {
    // MongoDB ObjectId format: 24 character hex string
    const objectIdRegex = /^[a-f\d]{24}$/i;
    return objectIdRegex.test(urlOrId.trim());
}

/**
 * Resolve an asset URL - converts asset IDs to download URLs, passes through regular URLs
 * @param urlOrId Either a regular URL or an asset ID
 * @param assetType The type of asset
 * @returns Promise resolving to the final URL
 */
export async function resolveAssetUrl(
    urlOrId: string,
    assetType: 'image' | 'audio' | 'video' | 'texture' | 'animation' | 'avatar' | 'mesh',
): Promise<string> {
    if (!isAssetId(urlOrId)) {
        // Already a URL, return as-is
        return urlOrId;
    }

    // Check if we should use runtime optimization (play mode)
    if (shouldUseRuntimeOptimization()) {
        // Use direct asset loading for better performance during gameplay
        return resolveRuntimeAssetUrl(urlOrId);
    }

    // Use design-time asset loading with metadata fetch (editor mode)
    let result: AssetDownloadResult;

    switch (assetType) {
        case 'image':
            result = await getImageDownloadUrl(urlOrId);
            break;
        case 'audio':
            result = await getAudioDownloadUrl(urlOrId);
            break;
        case 'video':
            result = await getVideoDownloadUrl(urlOrId);
            break;
        case 'texture':
            result = await getTextureDownloadUrl(urlOrId);
            break;
        case 'animation':
            result = await getAnimationDownloadUrl(urlOrId);
            break;
        case 'avatar':
            result = await getAvatarDownloadUrl(urlOrId);
            break;
        case 'mesh':
            result = await getMeshDownloadUrl(urlOrId);
            break;
        default:
            console.warn(`Unsupported asset type: ${assetType}`);
            return urlOrId;
    }

    if (result.success) {
        return result.url;
    } else {
        console.warn(`Failed to resolve ${assetType} asset ${urlOrId}:`, result.error);
        // Return original value as fallback
        return urlOrId;
    }
}