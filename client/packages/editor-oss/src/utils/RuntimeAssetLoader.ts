import { isAssetId, resolveAssetUrl } from "./AssetDownloadUtils";
import { backendUrlFromPath } from "./UrlUtils";
import global from "../global";

/**
 * Runtime-optimized asset loading utility that bypasses metadata fetches during play mode
 * This provides faster asset loading by constructing direct download URLs
 */

export interface RuntimeAssetLoadResult {
    success: boolean;
    url: string;
    error?: string;
}

/**
 * Get a direct download URL for an asset ID during runtime/play mode
 * This bypasses the metadata fetch step and constructs the URL directly
 * @param assetId The asset ID (MongoDB ObjectId)
 * @returns Direct download URL
 */
export function getRuntimeAssetUrl(assetId: string): RuntimeAssetLoadResult {
    if (!isAssetId(assetId)) {
        return {
            success: false,
            url: "",
            error: "Invalid asset ID format",
        };
    }

    // Note: RuntimeAssetLoader is used for asset IDs, which don't fit the new path format
    // The new format is for direct path-based URLs, not asset ID lookups
    // This functionality may need to be updated if asset ID lookup is still needed
    const directUrl = backendUrlFromPath(`/api/Asset/Download/asset/${assetId}/file`);

    if (!directUrl) {
        return {
            success: false,
            url: "",
            error: "Unable to construct backend URL",
        };
    }

    return {
        success: true,
        url: directUrl,
    };
}

/**
 * Resolve an asset URL optimized for runtime/play mode
 * Uses direct asset downloads when possible, falls back to regular URLs
 * @param urlOrId Either a regular URL or an asset ID
 * @returns The final URL to use for loading the asset
 */
export function resolveRuntimeAssetUrl(urlOrId: string): string {
    if (!isAssetId(urlOrId)) {
        // Already a URL, return as-is
        return urlOrId;
    }

    // It's an asset ID, construct direct download URL
    const result = getRuntimeAssetUrl(urlOrId);

    if (result.success) {
        return result.url;
    } else {
        console.warn(`Failed to construct runtime asset URL for ${urlOrId}:`, result.error);
        // Return original value as fallback
        return urlOrId;
    }
}

/**
 * Check if we should use runtime optimization
 * This checks if the application is currently in play mode
 * @returns true if runtime optimization should be used
 */
export function shouldUseRuntimeOptimization(): boolean {
    // Check if we're in play mode by accessing the global app instance
    if (global.app) {
        return global.app.isPlaying === true;
    }

    // Default to false if we can't determine play state
    return false;
}

/**
 * Smart asset URL resolver that automatically chooses between runtime and design-time loading
 * @param urlOrId Either a regular URL or an asset ID
 * @param assetType The type of asset (used for design-time loading)
 * @returns Promise resolving to the final URL
 */
export async function smartResolveAssetUrl(
    urlOrId: string,
    assetType?: 'image' | 'audio' | 'video' | 'texture' | 'animation' | 'avatar' | 'mesh',
): Promise<string> {
    if (!isAssetId(urlOrId)) {
        // Already a URL, return as-is
        return urlOrId;
    }

    // Check if we should use runtime optimization
    if (shouldUseRuntimeOptimization()) {
        // Use direct runtime loading
        return resolveRuntimeAssetUrl(urlOrId);
    } else {
        // Use design-time loading with metadata fetch
        if (!assetType) {
            console.warn(`Asset type required for design-time loading of asset ${urlOrId}`);
            return urlOrId;
        }

        return resolveAssetUrl(urlOrId, assetType);
    }
}