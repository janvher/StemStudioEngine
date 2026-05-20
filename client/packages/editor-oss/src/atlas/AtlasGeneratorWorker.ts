import {
    AtlasGenerationOptions,
    AtlasGenerationResult,
    generateAtlasFromBlobs,
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

self.onmessage = async (event: MessageEvent<AtlasWorkerRequest>) => {
    const {id, type, payload} = event.data;
    if (type !== "generate") {
        return;
    }

    try {
        const result = await generateAtlasFromBlobs(new Map(payload.textureBlobs), payload.options);
        const response: AtlasWorkerResponse = {id, result};
        self.postMessage(response);
    } catch (error) {
        const response: AtlasWorkerResponse = {
            id,
            result: null,
            error: error instanceof Error ? error.message : String(error),
        };
        self.postMessage(response);
    }
};
