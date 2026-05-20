import {ChangeEvent} from "react";

import {showToast} from "@stem/editor-oss/showToast";
import Ajax from "../utils/Ajax";
import {backendUrlFromPath} from "../utils/UrlUtils";


/**
 *
 * @param url
 * @param callback
 * @param size
 * @param size.minWidth
 * @param size.minHeight
 * @param accept
 * @param sceneID
 * @param libraryIDToAdd
 */
async function upload(
    url: string,
    callback: (response: any) => void,
    size?: {minWidth: number; minHeight: number},
    accept?: string,
    sceneID?: string,
    libraryIDToAdd?: string,
): Promise<void> {
    let input = document.createElement("input");
    input.type = "file";
    input.style.display = "none";
    document.body.appendChild(input);

    input.value = "";
    if (accept) {
        input.accept = accept;
    }

    input.onchange = async event => {
        input.onchange = null;
        const inputEvent = event as unknown as ChangeEvent<HTMLInputElement>;
        if (url && inputEvent.target.files) {
            try {
                const file = inputEvent.target.files[0]!;

                // We can't perform image validation on KTX2 files.
                if (size && !file.name.toLowerCase().endsWith(".ktx2")) {
                    const minHeight = size.minHeight;
                    const minWidth = size.minWidth;
                    const img = new Image();
                    img.src = URL.createObjectURL(file);

                    const checkImageDimensions = () => {
                        return new Promise<void>((resolve, reject) => {
                            img.onload = () => {
                                if (img.width < minWidth || img.height < minHeight) {
                                    reject(
                                        new Error(`Image dimensions must be at least ${minWidth}x${minHeight} pixels.`),
                                    );
                                } else {
                                    resolve();
                                }
                            };
                            img.onerror = () => {
                                reject(new Error("Invalid image file."));
                            };
                        });
                    };
                    await checkImageDimensions();
                }
                const data: any = {file};
                if (sceneID) {
                    data.SceneID = sceneID;
                }
                if (libraryIDToAdd) {
                    data.LibraryIDToAdd = libraryIDToAdd;
                }
                const response = await Ajax.post({
                    url: backendUrlFromPath(url),
                    msgBodyType: "multipart",
                    data,
                });
                const obj = response?.data;
                if (obj.Code === 200) {
                    callback(obj);
                } else {
                    showToast({type: "error", body: obj.Msg});
                }
            } catch (error: any) {
                showToast({type: "error", body: error.message || "Request failed."});
            }
        } else {
            callback(inputEvent.target.files?.[0]);
        }
    };
    input.click();
}

/**
 *
 * @param file
 * @param url
 * @param callback
 * @param sceneID
 * @param libraryIDToAdd
 */
async function uploadSingleFile(
    file: File,
    url: string,
    callback: (response: any) => void,
    sceneID?: string | null,
    libraryIDToAdd?: string,
): Promise<void> {
    try {
        const data: any = {file};
        if (sceneID) data.SceneID = sceneID;
        if (libraryIDToAdd) data.LibraryIDToAdd = libraryIDToAdd;

        const response = await Ajax.post({
            url: backendUrlFromPath(url),
            msgBodyType: "multipart",
            data,
        });

        const obj = response?.data;
        if (obj.Code === 200) {
            callback(obj);
        } else {
            showToast({type: "error", body: obj.Msg});
        }
    } catch (error: any) {
        showToast({type: "error", body: error.message || "Upload failed."});
    }
}

// Batch upload with concurrency control
/**
 *
 * @param files
 * @param url
 * @param progressCallback
 * @param sceneID
 * @param libraryIDToAdd
 * @param maxConcurrency
 */
async function batchUploadFiles(
    files: File[],
    url: string,
    progressCallback?: (completed: number, total: number, errors: Error[]) => void,
    sceneID?: string | null,
    libraryIDToAdd?: string,
    maxConcurrency: number = 4,
): Promise<{successful: any[], failed: {file: File, error: Error}[]}> {
    const results: any[] = [];
    const errors: {file: File, error: Error}[] = [];
    const batches: File[][] = [];

    // Ensure maxConcurrency is at least 1 to prevent infinite loops
    maxConcurrency = Math.max(1, maxConcurrency);

    // Split files into batches of maxConcurrency
    for (let i = 0; i < files.length; i += maxConcurrency) {
        batches.push(files.slice(i, i + maxConcurrency));
    }

    let completed = 0;

    // Process batches sequentially, but files within each batch concurrently
    for (const batch of batches) {
        const batchPromises = batch.map(async (file) => {
            try {
                const data: any = {file};
                if (sceneID) data.SceneID = sceneID;
                if (libraryIDToAdd) data.LibraryIDToAdd = libraryIDToAdd;

                const response = await Ajax.post({
                    url: backendUrlFromPath(url),
                    msgBodyType: "multipart",
                    data,
                });

                const obj = response?.data;
                if (obj.Code === 200) {
                    results.push(obj);
                    return obj;
                } else {
                    throw new Error(obj.Msg || 'Upload failed');
                }
            } catch (error: any) {
                errors.push({file, error});
                throw error;
            } finally {
                completed++;
                progressCallback?.(completed, files.length, errors.map(e => e.error));
            }
        });

        // Wait for current batch to complete before starting next batch
        await Promise.allSettled(batchPromises);
    }

    return {successful: results, failed: errors};
}

// Enhanced model batch upload with concurrent processing
/**
 *
 * @param files
 * @param thumbnailUrls
 * @param onProgress
 * @param sceneID
 * @param libraryIDToAdd
 * @param maxConcurrency
 */
async function batchUploadModels(
    files: File[],
    thumbnailUrls: string[],
    onProgress?: (completed: number, total: number, errors: Error[]) => void,
    sceneID?: string | null,
    libraryIDToAdd?: string,
    maxConcurrency: number = 3,
): Promise<{successful: any[], failed: {file: File, error: Error}[]}> {
    const results: any[] = [];
    const errors: {file: File, error: Error}[] = [];

    // Ensure maxConcurrency is at least 1 to prevent infinite loops
    maxConcurrency = Math.max(1, maxConcurrency);

    // Create batches for concurrent processing
    const batches: Array<{file: File, thumbnailUrl: string}[]> = [];
    for (let i = 0; i < files.length; i += maxConcurrency) {
        const batch = [];
        for (let j = 0; j < maxConcurrency && i + j < files.length; j++) {
            batch.push({
                file: files[i + j]!,
                thumbnailUrl: thumbnailUrls[i + j] ?? '',
            });
        }
        batches.push(batch);
    }

    let completed = 0;

    // Process batches sequentially, items within batch concurrently
    for (const batch of batches) {
        const batchPromises = batch.map(async ({file, thumbnailUrl}) => {
            try {
                const data: any = {
                    file,
                    Image: thumbnailUrl,
                };

                if (sceneID) {
                    data.SceneID = sceneID;
                }
                if (libraryIDToAdd) {
                    data.LibraryID = libraryIDToAdd;
                }

                const response = await Ajax.post({
                    url: backendUrlFromPath('/api/Mesh/Add'),
                    data,
                    msgBodyType: "multipart",
                });

                const obj = response?.data;
                if (obj.Code === 200) {
                    results.push(obj.Data);
                    return obj.Data;
                } else {
                    throw new Error(obj.Msg || 'Model upload failed');
                }
            } catch (error: any) {
                errors.push({file, error});
                throw error;
            } finally {
                completed++;
                onProgress?.(completed, files.length, errors.map(e => e.error));
            }
        });

        // Wait for current batch before proceeding
        await Promise.allSettled(batchPromises);
    }

    return {successful: results, failed: errors};
}

export const UploadUtils = {
    upload,
    uploadSingleFile,
    batchUploadFiles,
    batchUploadModels,
};
