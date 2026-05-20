
import JSZip from "jszip";

import Ajax from "./Ajax";
import {backendUrlFromPath} from "./UrlUtils";
import {SceneSettings} from "@stem/network/api/scene";
import {getLocalDefaultTextureUrl} from "../behaviors/packs/terrain/EndlessTerrainConstants";
import {urlToFile} from "../controls/AiWorldController/AiWorldController.utils";

// Cache integrity tracking for debugging
const logCacheState = (operation: string, key: string, value?: string, cacheSize?: number) => {
    console.log(`[CACHE ${operation}] Key: ${key.split("/").pop()} | Value: ${value} | Total entries: ${cacheSize}`);
};

/**
 * Retry utility function for async operations with exponential backoff
 * @param operation The async operation to retry
 * @param maxAttempts Maximum number of retry attempts
 * @param delayMs Base delay in milliseconds
 * @param operationName Name of the operation for logging
 * @returns Promise that resolves to the operation result
 */
async function withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000,
    operationName: string = "operation",
): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;
            console.warn(`${operationName} failed on attempt ${attempt}/${maxAttempts}:`, error);

            if (attempt === maxAttempts) {
                break;
            }

            // Exponential backoff with jitter
            const delay = delayMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
            console.log(`Retrying ${operationName} in ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw new Error(
        `${operationName} failed after ${maxAttempts} attempts. Last error: ${lastError?.message || "Unknown error"}`,
    );
}

/**
 *
 * @param sceneData
 * @param optionsServer
 * @param uploadFile
 * @param uploadModel
 */
// Progress tracking interface for asset uploads
interface AssetUploadProgress {
    totalAssets: number;
    processedAssets: number;
    currentAsset?: string;
    failedAssets?: number;
    estimatedTimeRemaining?: number;
    onProgress?: (progress: AssetUploadProgress) => void;
}

/**
 *
 * @param sceneData
 * @param optionsServer
 * @param uploadFile
 * @param uploadModel
 * @param sceneSettings
 * @param progressCallback
 */
async function reuploadAssets(
    sceneData: any[],
    optionsServer: string,
    uploadFile: (file: File) => Promise<string | null>,
    uploadModel: (modelFile: File, thumbnailUrl: string) => Promise<{url: string; thumbnail: string} | null>,
    sceneSettings: SceneSettings | null,
    progressCallback?: (progress: AssetUploadProgress) => void,
): Promise<{sceneData: any[]; bannerImage?: string; uploadedAssets: string[]}> {
    const optionsObject = sceneData.find(item => item.metadata?.generator === "OptionsSerializer");
    let bannerImage = undefined;
    if (!optionsObject || !optionsObject.server) {
        return {sceneData, uploadedAssets: []};
    }

    const sourceServer = optionsObject.server;

    if (sourceServer === optionsServer) {
        return {sceneData, uploadedAssets: []};
    }

    console.log(`Reuploading assets from ${sourceServer} to ${optionsServer}`);

    const assetCache: Map<string, string> = new Map();
    const uploadedAssets: string[] = [];
    const uploadPromises: Map<string, Promise<void>> = new Map(); // Track ongoing uploads to prevent duplicates

    // Count total assets that need processing
    // Skip assets that are already on the target server (already imported in Phase 3)
    const assetsToProcess = sceneData.filter(item => {
        if (item.metadata?.generator !== "ServerObject" || !item.userData?.Url) {
            return false;
        }

        const url = item.userData.Url;

        // Skip if the URL already points to the target server
        if (url.startsWith(optionsServer)) {
            console.log(`[Import] Skipping already-imported asset: ${url}`);
            return false;
        }

        return true;
    });

    const totalAssets = assetsToProcess.length;
    console.log(`[Import] ${totalAssets} assets to reupload (after filtering already-imported)`);
    // Note: Don't early return when totalAssets === 0 because we still need to process
    // banner images, thumbnails, material textures, and other non-ServerObject items
    let processedAssets = 0;
    let failedAssets = 0;
    const startTime = Date.now();

    // Process assets in parallel batches to improve performance
    const BATCH_SIZE = 5; // Process 4 assets concurrently for better throughput
    const batches: any[][] = [];
    for (let i = 0; i < assetsToProcess.length; i += BATCH_SIZE) {
        batches.push(assetsToProcess.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
        const batchResults = await Promise.allSettled(
            batch.map(async item => {
                const currentAsset = item.userData.Url;
                progressCallback?.({
                    totalAssets,
                    processedAssets,
                    failedAssets,
                    currentAsset: currentAsset.split("/").pop() || currentAsset,
                });

                try {
                    await processAssetItem(
                        item,
                        sourceServer,
                        assetCache,
                        uploadFile,
                        uploadModel,
                        uploadedAssets,
                        uploadPromises,
                    );
                    return {success: true, asset: currentAsset};
                } catch (error) {
                    console.error(`Failed to process asset ${currentAsset}:`, error);
                    throw new Error(
                        `Failed to upload asset ${currentAsset.split("/").pop() || currentAsset}: ${error instanceof Error ? error.message : String(error)}`,
                    );
                }
            }),
        );

        // Process batch results atomically
        for (const result of batchResults) {
            if (result.status === "fulfilled") {
                processedAssets++;
            } else {
                failedAssets++;
                // Fail fast - abort scene creation if any asset upload fails
                throw result.reason;
            }
        }

        // Calculate estimated time remaining after each batch
        if (processedAssets > 0) {
            const elapsed = Date.now() - startTime;
            const avgTimePerAsset = elapsed / processedAssets;
            const remainingAssets = totalAssets - processedAssets;
            const estimatedTimeRemaining = Math.round(remainingAssets * avgTimePerAsset / 1000);

            progressCallback?.({
                totalAssets,
                processedAssets,
                failedAssets,
                estimatedTimeRemaining,
                currentAsset: undefined,
            });
        }
    }

    // Process remaining items for images and banner extraction
    for (let i = 0; i < sceneData.length; i++) {
        const item = sceneData[i];

        if (item.metadata?.generator === "ParticleEmitterSerializer" && item.object?.ps?.material?.map?.image) {
            await processBehaviorAttributes(
                item.object.ps.material.map.image,
                sourceServer,
                assetCache,
                uploadedAssets,
                uploadFile,
            );
        }
        // Process all userData properties for asset URLs (not just behaviors)
        if (item.userData && item.metadata?.generator !== "ServerObject") {
            // ServerObject items are already handled above for model uploads
            await processObjectPropertiesForAssets(item.userData, sourceServer, assetCache, uploadFile, uploadedAssets);
        }

        // Also check for assets in the behavior attributes specifically
        await processObjectPropertiesForAssets(
            item.userData?.behaviors,
            sourceServer,
            assetCache,
            uploadFile,
            uploadedAssets,
        );

        // Reupload material textures
        // TODO: refactor material serialization to use standard material serializer and integrate with the Image Asset API
        if (item.userData?.materialSettings) {
            const materialSettings: any = item.userData.materialSettings;

            // Handle legacy single IMaterialSettings format where materialSettings is a single object
            if (
                materialSettings &&
                typeof materialSettings === "object" &&
                "materialType" in materialSettings &&
                "textures" in materialSettings
            ) {
                const textures = materialSettings.textures as Record<string, unknown> | undefined;
                if (textures) {
                    for (const [name, textureURL] of Object.entries(textures)) {
                        if (typeof textureURL === "string" && isAssetUrl(textureURL)) {
                            const newTexturePath = await reuploadSingleImage(
                                textureURL,
                                sourceServer as string,
                                assetCache,
                                uploadFile,
                                uploadedAssets,
                            );
                            textures[name] = newTexturePath;
                        }
                    }
                }
            } else {
                // Handle map-based materialSettings format where values are material config objects
                for (const materialConfig of Object.values(materialSettings)) {
                    const textures = (materialConfig as any)?.textures as Record<string, unknown> | undefined;
                    if (!textures) continue;

                    for (const [name, textureURL] of Object.entries(textures)) {
                        if (typeof textureURL === "string" && isAssetUrl(textureURL)) {
                            const newTexturePath = await reuploadSingleImage(
                                textureURL,
                                sourceServer as string,
                                assetCache,
                                uploadFile,
                                uploadedAssets,
                            );
                            textures[name] = newTexturePath;
                        }
                    }
                }
            }
        }

        if (item.metadata?.generator === "SceneSerializer" && item.userData?.game?.bannerImage) {
            bannerImage = await reuploadSingleImage(
                item.userData.game.bannerImage as string,
                sourceServer as string,
                assetCache,
                uploadFile,
                uploadedAssets,
            );
            // Remove bannerImage from userData — MongoDB Thumbnail is the sole source of truth
            delete item.userData.game.bannerImage;
        }
    }
    if (sceneSettings?.Thumbnail && !sceneSettings.Thumbnail.startsWith("placeholder:")) {
        sceneSettings.Thumbnail = await reuploadSingleImage(
            sceneSettings.Thumbnail,
            sourceServer,
            assetCache,
            uploadFile,
            uploadedAssets,
        );
    }
    if (sceneSettings?.Rendering?.Background) {
        
        // Reupload background texturs if present
        const bg = sceneSettings.Rendering.Background;
        if (typeof bg.Texture === "string" && isAssetUrl(bg.Texture)) {
            try {
                bg.Texture = await reuploadSingleImage(bg.Texture, sourceServer, assetCache, uploadFile, uploadedAssets);
            } catch (e) {
                console.warn("Failed to reupload background texture:", e);
            }
        }

        if (Array.isArray(bg.Cubemap)) {
            for (let i = 0; i < bg.Cubemap.length; i++) {
                const url = bg.Cubemap[i];
                if (typeof url === "string" && isAssetUrl(url)) {
                    try {
                        bg.Cubemap[i] = await reuploadSingleImage(url, sourceServer, assetCache, uploadFile, uploadedAssets);
                    } catch (e) {
                        console.warn(`Failed to reupload cubemap image ${url}:`, e);
                    }
                }
            }
        }
    }

    return {sceneData, bannerImage, uploadedAssets};
}

/**
 * Process a single asset item (model upload)
 * @param item
 * @param sourceServer
 * @param assetCache
 * @param uploadFile
 * @param uploadModel
 * @param uploadedAssets
 * @param uploadPromises
 */
async function processAssetItem(
    item: any,
    sourceServer: string,
    assetCache: Map<string, string>,
    uploadFile: (file: File) => Promise<string | null>,
    uploadModel: (modelFile: File, thumbnailUrl: string) => Promise<{url: string; thumbnail: string} | null>,
    uploadedAssets: string[],
    uploadPromises: Map<string, Promise<void>>,
): Promise<void> {
    if (!item.userData?.Url) return;

    const modelUrl = item.userData.Url.startsWith("http") ? item.userData.Url : sourceServer + item.userData.Url;

    // Check if we already have this asset cached
    if (assetCache.has(modelUrl)) {
        const cachedValue = assetCache.get(modelUrl);
        if (cachedValue !== "UPLOADING") {
            item.userData.Url = cachedValue;
            logCacheState("HIT", modelUrl, cachedValue, assetCache.size);
            return;
        }
    }

    // Check if this asset is currently being uploaded by another parallel process
    if (uploadPromises.has(modelUrl)) {
        // Wait for the ongoing upload to complete
        await uploadPromises.get(modelUrl);
        // Now check cache again (should be populated by the completed upload)
        if (assetCache.has(modelUrl)) {
            const cachedValue = assetCache.get(modelUrl);
            if (cachedValue !== "UPLOADING") {
                item.userData.Url = cachedValue;
                logCacheState("PARALLEL_HIT", modelUrl, cachedValue, assetCache.size);
                return;
            }
        }
        // If cache doesn't have the result after waiting, fall through to upload ourselves
    }

    // Reserve cache entry to prevent race conditions
    assetCache.set(modelUrl, "UPLOADING");
    logCacheState("RESERVE", modelUrl, "UPLOADING", assetCache.size);

    // Create a promise for this upload and store it to prevent duplicate uploads
    const uploadPromise = (async () => {
        try {
            const modelFile = await withRetry(
                () => urlToFile(modelUrl, modelUrl.split("/").pop() || "model.glb", getFileTypeFromUrl(modelUrl)),
                3,
                1000,
                `download model file (${modelUrl.split("/").pop() || "model.glb"})`,
            );

            // Get thumbnail URL - check cache first to avoid re-downloading
            // If cached, we have an already-uploaded thumbnail URL that can be used directly
            let thumbnailUrlForUpload: string = "";
            let sourceThumbnailUrl: string = "";
            if (item.userData.Thumbnail) {
                sourceThumbnailUrl = item.userData.Thumbnail.startsWith("http")
                    ? item.userData.Thumbnail
                    : sourceServer + item.userData.Thumbnail;

                // Check if this thumbnail was already processed by another model
                if (assetCache.has(sourceThumbnailUrl)) {
                    thumbnailUrlForUpload = assetCache.get(sourceThumbnailUrl) as string;
                    console.log(`Using cached thumbnail for model: ${sourceThumbnailUrl} → ${thumbnailUrlForUpload}`);
                } else {
                    // Pass source URL - uploadModel will download and upload as derivative
                    thumbnailUrlForUpload = sourceThumbnailUrl;
                }
            }

            const filename = modelUrl.split("/").pop();
            console.log(`[UPLOAD START] ${filename} → Starting upload...`);
            const modelUploadResult = await uploadModel(modelFile, thumbnailUrlForUpload);
            if (modelUploadResult) {
                console.log(`[UPLOAD COMPLETE] ${filename} → Received URL: ${modelUploadResult.url}`);

                // Validate cache integrity before updating
                const existingCacheValue = assetCache.get(modelUrl);
                if (existingCacheValue !== "UPLOADING") {
                    console.error(
                        `CACHE COLLISION DETECTED! Key ${modelUrl} was expected to be 'UPLOADING' but found: ${existingCacheValue}`,
                    );
                }

                // Cache the result for future use
                assetCache.set(modelUrl, modelUploadResult.url);
                logCacheState("UPDATE", modelUrl, modelUploadResult.url, assetCache.size);

                // Verify the cache was set correctly
                const verifyCache = assetCache.get(modelUrl);
                if (verifyCache !== modelUploadResult.url) {
                    console.error(`CACHE VERIFICATION FAILED! Expected: ${modelUploadResult.url}, Got: ${verifyCache}`);
                }

                // Track uploaded asset for potential cleanup
                uploadedAssets.push(modelUploadResult.url);
                if (modelUploadResult.thumbnail) {
                    uploadedAssets.push(modelUploadResult.thumbnail);
                    // Cache the thumbnail result for other models that might share the same thumbnail
                    if (sourceThumbnailUrl) {
                        assetCache.set(sourceThumbnailUrl, modelUploadResult.thumbnail);
                        console.log(`Cached thumbnail: ${sourceThumbnailUrl} → ${modelUploadResult.thumbnail}`);
                    }
                }
            } else {
                const errorMsg = `Model upload failed for: ${modelUrl.split("/").pop() || modelUrl} - no result returned from server`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
        } catch (error) {
            // Clean up cache state on failure
            if (assetCache.has(modelUrl) && assetCache.get(modelUrl) === "UPLOADING") {
                assetCache.delete(modelUrl);
                console.log(`Cleaned up cache for failed upload: ${modelUrl}`);
            }

            const errorMsg = `Failed to upload model ${modelUrl.split("/").pop() || modelUrl}: ${error instanceof Error ? error.message : String(error)}`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        } finally {
            // Remove the promise from tracking once complete
            uploadPromises.delete(modelUrl);
        }
    })();

    // Store the promise to prevent duplicate uploads
    uploadPromises.set(modelUrl, uploadPromise);

    // Wait for the upload to complete
    await uploadPromise;

    // Set the URL from cache (should be populated now)
    if (assetCache.has(modelUrl)) {
        const cachedUrl = assetCache.get(modelUrl);
        if (cachedUrl !== "UPLOADING") {
            item.userData.Url = cachedUrl;
            console.log(`Final assignment: ${modelUrl} → ${cachedUrl}`);
            if (item.userData.Thumbnail) {
                // Also update thumbnail if it was part of the model upload
                const sourceThumbnailUrl = item.userData.Thumbnail.startsWith("http")
                    ? item.userData.Thumbnail
                    : sourceServer + item.userData.Thumbnail;
                if (assetCache.has(sourceThumbnailUrl)) {
                    item.userData.Thumbnail = assetCache.get(sourceThumbnailUrl);
                }
            }
        } else {
            console.error(`Cache still shows UPLOADING for: ${modelUrl} - upload may have failed`);
        }
    } else {
        console.error(`Cache miss for modelUrl: ${modelUrl}, cache size: ${assetCache.size}`);
    }
}

/**
 * Check if a string value is a potential asset URL that should be processed
 * @param value The string value to check
 * @param key The property key (used for context-aware detection)
 * @param isBehaviorContext Whether we're processing behavior attributesData
 * @returns true if the value appears to be an asset URL
 */
function isAssetUrl(value: string, key?: string, isBehaviorContext: boolean = false): boolean {
    if (!value || typeof value !== "string") return false;

    // Check if value is base64 encoded data (data URI or raw base64 string)
    if (value.startsWith("data:")) {
        return false;
    }

    // Check for raw base64 string (minimum 100 chars to avoid false positives with IDs/tokens)
    if (value.length > 100 && /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/.test(value)) {
        return false;
    }

    // Check for file extensions that indicate assets
    const assetExtensions =
        /\.(png|jpg|jpeg|gif|webp|bmp|svg|mp4|webm|mov|avi|mkv|mp3|wav|ogg|m4a|flac|glb|gltf|fbx|vrm|obj|dae)$/i;
    const hasAssetExtension = assetExtensions.test(value);

    // If it has an asset extension, it's likely an asset regardless of path format
    if (hasAssetExtension) {
        return true;
    }

    // Check for asset-like attribute names (not just in behavior context)
    // This allows assets without extensions to be processed when they have asset-like keys
    if (key) {
        const assetAttributeNames = [
            "texture",
            "image",
            "asset",
            "file",
            "url",
            "src",
            "source",
            "uiImage",
            "shopImage",
            "assetFile",
            "backgroundImage",
            "handleImage",
            "buttonImage",
            "joystickBackgroundImage",
            "joystickHandleImage",
            "external_url",
            "internal_url",
            "thumbnail",
            "icon",
            "avatar",
            "normalMap",
            "roughnessMap",
            "metalnessMap",
            "emissiveMap",
            "displacementMap",
            "aoMap",
            "envMap",
            "lightMap",
        ];

        const keyLower = key.toLowerCase();
        const hasAssetKey = assetAttributeNames.some(name => keyLower.includes(name.toLowerCase()));

        if (hasAssetKey) {
            // If the value looks like a path
            if (value.includes("/") || value.includes("\\")) {
                return true;
            }
            // In behavior context, be more aggressive (even with dashes)
            if (isBehaviorContext && value.includes("-")) {
                return true;
            }
        }
    }

    // Check for absolute URLs
    if (value.startsWith("http://") || value.startsWith("https://")) {
        return true;
    }

    // Check for Upload paths and API paths
    if (value.startsWith("/Upload/") || value.startsWith("/api/")) {
        return true;
    }

    return false;
}

/**
 * Process object properties to find and reupload asset URLs (images, videos, audio, models)
 * @param obj The object to process
 * @param sourceServer The source server URL
 * @param assetCache Cache of already processed assets
 * @param uploadFile Function to upload files
 * @param uploadedAssets Array to track uploaded assets
 */
async function processObjectPropertiesForAssets(
    obj: any,
    sourceServer: string,
    assetCache: Map<string, string>,
    uploadFile: (file: File) => Promise<string | null>,
    uploadedAssets: string[],
): Promise<void> {
    if (!Array.isArray(obj)) return;

    for (const behavior of obj) {
        await processBehaviorAttributes(behavior, sourceServer, assetCache, uploadedAssets, uploadFile);
    }
}

/**
 *
 * @param obj
 * @param sourceServer
 * @param assetCache
 * @param uploadedAssets
 * @param uploadFile
 */
async function processBehaviorAttributes(
    obj: any,
    sourceServer: string,
    assetCache: Map<string, string>,
    uploadedAssets: string[],
    uploadFile: (file: File) => Promise<string | null>,
): Promise<void> {
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "string") {
            // Check if this looks like an asset URL
            if (isAssetUrl(value, key, true)) {
                const assetUrl = value.startsWith("http") ? value : sourceServer + value;
                const fileType = getFileTypeFromUrl(value);

                // For behavior context with asset-like attribute names, try to process even without recognizable extension
                let actualFileType = fileType;
                if (!actualFileType) {
                    // Default to treating as image if it's in behavior context and looks like an asset
                    actualFileType = "image/jpeg"; // Default MIME type for unknown image assets
                    console.log(`Processing behavior asset without extension as image: ${value}`);
                }

                // Skip if we still couldn't determine the file type
                if (!actualFileType) {
                    console.warn(`Skipping unknown file type: ${value}`);
                    continue;
                }

                if (assetCache.has(assetUrl)) {
                    obj[key] = assetCache.get(assetUrl);
                    console.log(`Using cached asset: ${value} → ${obj[key]}`);
                } else {
                    try {
                        // Generate appropriate filename based on file type
                        const extension = value.split(/[#?]/)[0]?.split(".")?.pop()?.toLowerCase() || "file";
                        const defaultFilename = `asset.${extension}`;

                        const assetFile = await withRetry(
                            () => urlToFile(assetUrl, assetUrl.split("/").pop() || defaultFilename, actualFileType),
                            3,
                            1000,
                            `download asset ${JSON.stringify(obj)}`,
                        );

                        const uploadedUrl = await uploadFile(assetFile);
                        if (uploadedUrl) {
                            obj[key] = uploadedUrl;
                            console.log(`Uploaded asset: ${value} → ${obj[key]}`);
                            assetCache.set(assetUrl, uploadedUrl);

                            // Track uploaded asset for potential cleanup
                            uploadedAssets.push(uploadedUrl);
                        }
                    } catch (error) {
                        console.error(`Error uploading asset (${actualFileType}):`, error);
                    }
                }
            }
        } else if (value && typeof value === "object") {
            await processBehaviorAttributes(obj[key], sourceServer, assetCache, uploadedAssets, uploadFile);
        }
    }
}

/**
 * Reupload a single image URL (e.g. bannerImg, thumbnail).
 * @param url
 * @param sourceServer
 * @param assetCache
 * @param uploadFile
 * @param uploadedAssets
 */
export async function reuploadSingleImage(
    url: string,
    sourceServer: string,
    assetCache: Map<string, string>,
    uploadFile: (file: File) => Promise<string | null>,
    uploadedAssets: string[] = [],
): Promise<string> {
    if (!url) return url;

    const fullUrl = url.startsWith("http") ? url : sourceServer + url;

    if (assetCache.has(fullUrl)) {
        const cached = assetCache.get(fullUrl)!;
        console.log(`Using cached image: ${fullUrl} → ${cached}`);
        return cached;
    }

    try {
        const imageFile = await withRetry(
            () => urlToFile(fullUrl, fullUrl.split("/").pop() || "image.jpg", getFileTypeFromUrl(fullUrl)),
            3,
            1000,
            `download image (${fullUrl.split("/").pop() || "image.jpg"})`,
        );

        const uploadedUrl = await uploadFile(imageFile);
        if (uploadedUrl) {
            console.log(`Uploaded image: ${fullUrl} → ${uploadedUrl}`);
            assetCache.set(fullUrl, uploadedUrl);

            // Track uploaded asset for potential cleanup
            uploadedAssets.push(uploadedUrl);
            return uploadedUrl;
        }
    } catch (error) {
        console.error("Error reuploading single image:", error);
    }

    return url; // fallback
}

/**
 *
 * @param url
 */
function getFileTypeFromUrl(url: string): string {
    const extension = url.split(/[#?]/)[0]?.split(".")?.pop()?.trim().toLowerCase();

    switch (extension) {
        // Images
        case "png":
            return "image/png";
        case "jpg":
        case "jpeg":
            return "image/jpeg";
        case "gif":
            return "image/gif";
        case "webp":
            return "image/webp";
        case "bmp":
            return "image/bmp";
        case "svg":
            return "image/svg+xml";
        // Videos
        case "mp4":
            return "video/mp4";
        case "webm":
            return "video/webm";
        case "mov":
            return "video/quicktime";
        case "avi":
            return "video/x-msvideo";
        case "mkv":
            return "video/x-matroska";
        // Audio
        case "mp3":
            return "audio/mpeg";
        case "wav":
            return "audio/wav";
        case "ogg":
            return "audio/ogg";
        case "m4a":
            return "audio/mp4";
        case "flac":
            return "audio/flac";
        // Models
        case "glb":
            return "model/gltf-binary";
        case "gltf":
            return "model/gltf+json";
        case "fbx":
            return "application/octet-stream";
        case "vrm":
            return "application/octet-stream";
        case "obj":
            return "application/octet-stream";
        case "dae":
            return "model/vnd.collada+xml";
        case "ply":
            return "application/octet-stream";
        case "usdz":
            return "model/vnd.usdz+zip";
        case "usd":
            return "model/vnd.usd";
        case "usda":
            return "model/vnd.usda";
        case "usdc":
            return "model/vnd.usdc";
        case "3ds":
            return "application/x-3ds";
        case "blend":
            return "application/x-blender";
        default:
            return "";
    }
}

/**
 * Upload file to backend with retry logic
 * @param file File to upload
 * @param maxRetries Maximum retry attempts
 * @returns Promise<string | null> URL of uploaded file or null if failed
 */
async function uploadFile(file: File, maxRetries: number = 2): Promise<string | null> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await Ajax.post({
                url: backendUrlFromPath(`/api/Upload`),
                data: {file},
                msgBodyType: "multipart",
            });

            if (response?.data?.Code === 200) {
                return response.data.Data?.url;
            }
        } catch (error) {
            console.error(`Error uploading file (attempt ${attempt + 1}/${maxRetries + 1}):`, error);

            // Wait before retry (exponential backoff)
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }
    return null;
}

/**
 * Upload model file to backend with retry logic
 * @param modelFile Model file to upload
 * @param thumbnailUrl Optional thumbnail URL
 * @param maxRetries Maximum retry attempts
 * @returns Promise with upload result or null if failed
 */
async function uploadModel(
    modelFile: File,
    thumbnailUrl: string = "",
    maxRetries: number = 2,
): Promise<{url: string; thumbnail: string} | null> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Create zip file for model upload
            const zipper = new JSZip();
            zipper.file(modelFile.name, modelFile);
            const zip = await zipper.generateAsync({type: "blob"});
            const zippedFile = new File([zip], `${modelFile.name.split(".")[0]}.zip`);

            const response = await Ajax.post({
                url: backendUrlFromPath(`/api/Mesh/Add`),
                data: {
                    file: zippedFile,
                    Image: thumbnailUrl,
                },
                msgBodyType: "multipart",
            });

            if (response?.data?.Code === 200) {
                return {
                    url: response.data.Data.Url,
                    thumbnail: response.data.Data.Thumbnail || thumbnailUrl,
                };
            }
        } catch (error) {
            console.error(`Error uploading model (attempt ${attempt + 1}/${maxRetries + 1}):`, error);

            // Wait before retry (exponential backoff)
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }
    return null;
}

// Texture attribute keys on the Terrain behavior
const TERRAIN_TEXTURE_ATTRS = [
    "ditchTexture", "ditchNormalTexture", "ditchRoughnessTexture",
    "groundTexture", "normalTexture", "grassRoughnessTexture",
    "rockTexture", "rockNormalTexture", "rockRoughnessTexture",
    "snowTexture", "snowNormalTexture", "snowRoughnessTexture",
] as const;

/**
 * Cleans up stale default terrain asset URLs from imported scene data.
 * Handles both new exports (already stripped) and old exports that still
 * contain environment-specific bundled URLs. The terrain behavior's init
 * repopulates local defaults for any attributes that are missing/falsy.
 * @param sceneData
 */
export function cleanupDefaultTerrainAssets(sceneData: any[]): void {
    for (const item of sceneData) {
        const behaviors = item?.userData?.behaviors;
        if (!Array.isArray(behaviors)) continue;

        for (const behavior of behaviors) {
            if (behavior?.name !== "Terrain") continue;

            const attrs = behavior.attributesData;
            if (!attrs) continue;

            const isDefault = attrs.isDefaultState === true || attrs.isDefaultState === undefined;

            if (isDefault) {
                // Full default state: delete all texture attrs and terrainObjects.
                // Behavior's init will repopulate from local defaults.
                for (const key of TERRAIN_TEXTURE_ATTRS) {
                    delete attrs[key];
                }
                delete attrs.terrainObjects;
            } else {
                // User-customized: only strip attributes whose URL points to a
                // bundled default texture from any build/environment.
                for (const key of TERRAIN_TEXTURE_ATTRS) {
                    if (typeof attrs[key] === "string" && getLocalDefaultTextureUrl(attrs[key]) !== null) {
                        delete attrs[key];
                    }
                }

                // Remove terrain objects that only have a modelUrl (bundled-only,
                // no user asset reference). Keep entries with modelAsset or modelUUID.
                if (Array.isArray(attrs.terrainObjects)) {
                    const hadEntries = attrs.terrainObjects.length > 0;
                    attrs.terrainObjects = attrs.terrainObjects.filter(
                        (obj: any) => obj?.modelAsset?.assetId || obj?.modelUUID,
                    );
                    // If all entries were bundled defaults (none survived), delete
                    // terrainObjects so the behavior repopulates with local defaults.
                    if (attrs.terrainObjects.length === 0 && hadEntries) {
                        delete attrs.terrainObjects;
                    }
                }
            }

            // Always strip runtime-generated preview blob URLs
            if (Array.isArray(attrs.terrainObjects)) {
                for (const obj of attrs.terrainObjects) {
                    delete obj.previewUrl;
                }
            }
        }
    }
}

export const ImportUtils = {
    getFileTypeFromUrl,
    reuploadAssets,
    processObjectPropertiesForAssets,
    isAssetUrl,
    uploadModel,
    uploadFile,
};
