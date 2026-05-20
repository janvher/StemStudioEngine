/*
 * Copyright: StemStudio Maintainers
 * Portions of this code are derived from the Shadow Editor (MIT License)
 */
import {
    AtlasGenerationOptions,
    AtlasGenerationResult,
    TextureInfo,
    generateAtlas as generateAtlasMainThread,
    generateAtlasFromBlobs as generateAtlasFromBlobsMainThread,
    loadImageFromBlob,
} from "./AtlasGeneratorCore";

type AtlasWorkerRequest = {
    id: number;
    type: "generate";
    payload: {
        textureBlobs: Array<[string, Blob]>;
        options: AtlasGenerationOptions;
    };
};

type AtlasWorkerResponse = {
    id: number;
    result: AtlasGenerationResult | null;
    error?: string;
};

let atlasWorker: Worker | null = null;
let nextRequestId = 1;
const pendingRequests = new Map<
    number,
    {
        resolve: (result: AtlasGenerationResult | null) => void;
        reject: (error: Error) => void;
    }
>();

/**
 *
 */
function canUseAtlasWorker(): boolean {
    return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined";
}

/**
 *
 */
function getAtlasWorker(): Worker | null {
    if (!canUseAtlasWorker()) {
        return null;
    }

    if (!atlasWorker) {
        atlasWorker = new Worker(new URL("./AtlasGeneratorWorker.ts", import.meta.url), {type: "module"});
        atlasWorker.onmessage = (event: MessageEvent<AtlasWorkerResponse>) => {
            const {id, result, error} = event.data;
            const pending = pendingRequests.get(id);
            if (!pending) {
                return;
            }

            pendingRequests.delete(id);
            if (error) {
                pending.reject(new Error(error));
                return;
            }

            pending.resolve(result);
        };
        atlasWorker.onerror = error => {
            const pending = Array.from(pendingRequests.values());
            pendingRequests.clear();
            atlasWorker?.terminate();
            atlasWorker = null;
            for (const request of pending) {
                request.reject(new Error(`AtlasGeneratorWorker crashed: ${error.message}`));
            }
        };
    }

    return atlasWorker;
}

export type {AtlasGenerationOptions, AtlasGenerationResult, TextureInfo};

/**
 *
 * @param textures
 * @param options
 */
export async function generateAtlas(
    textures: TextureInfo[],
    options: AtlasGenerationOptions = {},
): Promise<AtlasGenerationResult | null> {
    return generateAtlasMainThread(textures, options);
}

export {loadImageFromBlob};

/**
 *
 * @param textureBlobs
 * @param options
 */
export async function generateAtlasFromBlobs(
    textureBlobs: Map<string, Blob>,
    options: AtlasGenerationOptions = {},
): Promise<AtlasGenerationResult | null> {
    const worker = getAtlasWorker();
    if (!worker) {
        return generateAtlasFromBlobsMainThread(textureBlobs, options);
    }

    const id = nextRequestId++;
    const request: AtlasWorkerRequest = {
        id,
        type: "generate",
        payload: {
            textureBlobs: Array.from(textureBlobs.entries()),
            options,
        },
    };

    return new Promise<AtlasGenerationResult | null>((resolve, reject) => {
        pendingRequests.set(id, {resolve, reject});

        try {
            worker.postMessage(request);
        } catch (error) {
            pendingRequests.delete(id);
            reject(error instanceof Error ? error : new Error(String(error)));
        }
    }).catch(async error => {
        console.warn("AtlasGenerator: Worker generation failed, falling back to main thread.", error);
        return generateAtlasFromBlobsMainThread(textureBlobs, options);
    });
}
