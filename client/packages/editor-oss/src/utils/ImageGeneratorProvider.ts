import {getAIBackend} from "../ai";
import global from "../global";
import {
    Asset,
    GenerateFillRequest,
    GenerateImageRequest,
    PixelateImageRequest,
    RemoveImageBackgroundRequest,
    UpscaleImageRequest,
} from "../types/imageGenerator";

// All image-gen endpoints target OpenAI (image-1 / dall-e) by default. The
// AIBackend forwards `X-BYOK-Provider: openai` so the BYOK key store can
// look up a per-provider key when the server doesn't have one in env.
const PROVIDER_HEADERS = {"X-BYOK-Provider": "openai"} as const;

const fireResponse = (data: unknown): void => {
    global.app?.call("aiImageGenerationResponse", null, data);
};

class ImageGeneratorProvider {
    /**
     * @deprecated authToken is no longer used — `getAIBackend()` handles auth.
     * The constructor signature is preserved for callers that still pass it.
     */
    authToken?: string;

    constructor(authToken?: string) {
        this.authToken = authToken;
    }

    async getModels(paginationToken: string, pageSize: string) {
        const query = new URLSearchParams();
        if (paginationToken) query.set("paginationToken", paginationToken);
        if (pageSize) query.set("pageSize", pageSize);
        const qs = query.toString();
        const res = await getAIBackend().request<any>(
            `/api/AI/ImageGeneration/Models${qs ? "?" + qs : ""}`,
            {method: "GET", headers: PROVIDER_HEADERS},
        );
        if (!res.ok || !res.data) throw Error(`Failed to fetch models (status ${res.status}).`);
        return res.data;
    }

    async getAssets(paginationToken: string, pageSize: string, types: string[]) {
        const query = new URLSearchParams();
        if (paginationToken) query.set("paginationToken", paginationToken);
        if (pageSize) query.set("pageSize", pageSize);
        if (types && types.length) query.set("types", types.join(","));
        const qs = query.toString();
        const res = await getAIBackend().request<any>(
            `/api/AI/ImageGeneration/Asset/List${qs ? "?" + qs : ""}`,
            {method: "GET", headers: PROVIDER_HEADERS},
        );
        if (!res.ok || !res.data) throw Error(`Failed to fetch assets (status ${res.status}).`);
        return res.data;
    }

    async getAssetById(id: string) {
        const res = await getAIBackend().request<any>(
            `/api/AI/ImageGeneration/Asset/Get?assetId=${encodeURIComponent(id)}`,
            {method: "GET", headers: PROVIDER_HEADERS},
        );
        return res.data;
    }

    async getBulkAssets(assetIds: string[]) {
        const res = await getAIBackend().request<any>("/api/AI/ImageGeneration/Asset/GetBulk", {
            method: "POST",
            body: {assetIds},
            headers: PROVIDER_HEADERS,
        });
        if (!res.ok || !res.data) throw Error(`Failed to fetch assets (status ${res.status}).`);
        return res.data;
    }

    async deleteAsset(id: string) {
        const res = await getAIBackend().request<any>("/api/AI/ImageGeneration/Asset/Delete", {
            method: "POST",
            body: {assetIds: [id]},
            headers: PROVIDER_HEADERS,
        });
        if (!res.ok || !res.data) throw Error(`Failed to delete asset (status ${res.status}).`);
        return res.data;
    }

    async uploadImage(image: string, name: string) {
        const res = await getAIBackend().request<any>("/api/AI/ImageGeneration/Asset/Add", {
            method: "POST",
            body: {image, name},
            headers: PROVIDER_HEADERS,
        });
        if (!res.ok || !res.data) throw Error(`Failed to add assets (status ${res.status}).`);
        return res.data;
    }

    async downloadAsset(asset: Asset) {
        try {
            const response = await fetch(asset.url);
            if (!response.ok) {
                throw new Error(`Failed to fetch the asset: ${response.statusText}`);
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${asset.id}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error while downloading asset:", error);
        }
    }

    async generateImage(data: GenerateImageRequest) {
        const endpoint = data.image ? "ImageToImage" : "TextToImage";
        const res = await getAIBackend().request<any>(`/api/AI/ImageGeneration/${endpoint}`, {
            method: "POST",
            body: {
                modelId: data.modelId,
                image: data.image,
                prompt: data.prompt,
                negativePrompt: data.negativePrompt,
                height: data.height,
                width: data.width,
                numSamples: data.numSamples,
            },
            headers: PROVIDER_HEADERS,
        });
        if (!res.ok || !res.data) throw Error(`Failed to generate assets (status ${res.status}).`);
        fireResponse(res.data);
        return res.data;
    }

    async generateTexture(data: GenerateImageRequest) {
        const endpoint = data.image ? "ImageToTexture" : "TextToTexture";
        const res = await getAIBackend().request<any>(`/api/AI/ImageGeneration/${endpoint}`, {
            method: "POST",
            body: {
                modelId: data.modelId,
                image: data.image,
                prompt: data.prompt,
                negativePrompt: data.negativePrompt,
                height: data.height,
                width: data.width,
                numSamples: data.numSamples,
            },
            headers: PROVIDER_HEADERS,
        });
        if (!res.ok || !res.data) throw Error(`Failed to generate assets (status ${res.status}).`);
        fireResponse(res.data);
        return res.data;
    }

    async generateSkybox(data: GenerateImageRequest) {
        const res = await getAIBackend().request<any>("/api/AI/ImageGeneration/TextToSkybox", {
            method: "POST",
            body: {
                prompt: data.prompt,
                negativePrompt: data.negativePrompt,
                width: data.width,
                style: data.style,
                numSamples: data.numSamples,
            },
            headers: PROVIDER_HEADERS,
        });
        if (!res.ok || !res.data) throw Error(`Failed to generate assets (status ${res.status}).`);
        fireResponse(res.data);
        return res.data;
    }

    async removeImageBackground(data: RemoveImageBackgroundRequest) {
        const res = await getAIBackend().request<any>("/api/AI/ImageGeneration/RemoveBackground", {
            method: "POST",
            body: {assetId: data.assetId},
            headers: PROVIDER_HEADERS,
        });
        if (!res.ok || !res.data) throw Error(`Failed to remove background (status ${res.status}).`);
        fireResponse(res.data);
        return res.data;
    }

    async pixelateImage(data: PixelateImageRequest) {
        const res = await getAIBackend().request<any>("/api/AI/ImageGeneration/Pixelate", {
            method: "POST",
            body: {
                assetId: data.assetId,
                pixelGridSize: data.pixelGridSize,
                removeNoise: data.removeNoise,
                removeBackground: data.removeBackground,
            },
            headers: PROVIDER_HEADERS,
        });
        if (!res.ok || !res.data) throw Error(`Failed to edit assets (status ${res.status}).`);
        fireResponse(res.data);
        return res.data;
    }

    async upscaleImage(data: UpscaleImageRequest) {
        const res = await getAIBackend().request<any>("/api/AI/ImageGeneration/Upscale", {
            method: "POST",
            body: {
                assetId: data.assetId,
                scalingFactor: data.scalingFactor,
                style: data.style,
                imageType: data.imageType,
                prompt: data.prompt,
                negativePrompt: data.negativePrompt,
            },
            headers: PROVIDER_HEADERS,
        });
        if (!res.ok || !res.data) throw Error(`Failed to edit assets (status ${res.status}).`);
        fireResponse(res.data);
        return res.data;
    }

    async generateFill(data: GenerateFillRequest) {
        const res = await getAIBackend().request<any>("/api/AI/ImageGeneration/MaskReplace", {
            method: "POST",
            body: {
                assetId: data.assetId,
                mask: data.mask,
                prompt: data.prompt,
                negativePrompt: data.negativePrompt,
            },
            headers: PROVIDER_HEADERS,
        });
        if (!res.ok || !res.data) throw Error(`Failed to edit assets (status ${res.status}).`);
        fireResponse(res.data);
        return res.data;
    }
}

export default ImageGeneratorProvider;
