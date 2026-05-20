import axios, {isAxiosError} from "axios";
import {chunk} from "lodash";
import * as pako from "pako";

import global from "@web-shared/global";
import {withRetry} from "@web-shared/utils/retry";
import {IS_OSS} from "../../../buildMode";
import {AccessContext, ApiClientOptions, getAssetsApiClient} from "../client";
import {
    DomainAssetType,
    DomainDerivativeType,
    DerivativeCreateAssetDerivativeRequest,
    ImportsImportItem,
    DomainAssetDto,
    DomainAssetRevisionDto,
    DomainAssetImportJobDto,
    DomainAssetImportDto,
    DomainAssetDerivativeDto,
    DomainAssetReleaseDto,
} from "../client/api";

export type Asset = DomainAssetDto;

export type AssetDerivative = DomainAssetDerivativeDto;

export type AssetImport = DomainAssetImportDto;

export type AssetImportItem = ImportsImportItem;

export type AssetImportJob = DomainAssetImportJobDto;

export type AssetRelease = DomainAssetReleaseDto;

export type AssetRevision = DomainAssetRevisionDto;

export type CreateAssetOptions = {
    description?: string;
    revisionDescription?: string;
    dependencies?: Record<string, string>;
    metadata?: Record<string, any>;
    tags?: string[];
};

export type GetAssetDerivativeOptions = {
    apiClientOptions?: ApiClientOptions;
    includeDataUrl?: boolean;
};

export type GetAssetDerivativesOptions = GetAssetDerivativeOptions;

export type CreateAssetDerivativeWithDataParams = {
    assetId: string;
    revisionId: string;
    type: DomainDerivativeType;
    format: string;
    contentType: string;
    data: string | ArrayBuffer | Blob | ReadableStream;
    metadata: Record<string, any>;
    lodLevel?: number;
    contentEncoding?: string;
};

export type CreateAssetWithDataParams = {
    type: DomainAssetType;
    name: string;
    data: string | ArrayBuffer | Blob | ReadableStream;
    format: string;
    contentType: string;
    options?: CreateAssetOptions;
    contentEncoding?: string;
};

export type CreateAssetRevisionParams = {
    assetId: string;
    parentRevisionId: string;
    uploadId?: string;
    data?: string; // base64-encoded (alternative to uploadId)
    contentType?: string; // required when using data
    format?: string;
    options?: CreateAssetRevisionOptions;
};

export type CreateAssetRevisionWithDataParams = {
    assetId: string;
    parentRevisionId: string;
    data: string | ArrayBuffer | Blob | ReadableStream;
    format: string;
    contentType: string;
    options?: CreateAssetRevisionOptions;
    contentEncoding?: string;
};

export type CreateAssetReleaseParams = {
    assetId: string;
    revisionId: string;
    version: AssetVersion;
    description: string;
};

export type CreateAssetRevisionOptions = {
    description?: string;
    dependencies?: Record<string, string>;
    metadata?: Record<string, any>;
};

export type GetAssetOptions = {
    apiClientOptions?: ApiClientOptions;
    includeThumbnails?: boolean;
    includeLatestRelease?: boolean;
};

export type GetAssetsOptions = {
    includeLatestRelease?: boolean;
    includeThumbnails?: boolean;
    owner?: "me" | "all";
    released?: "all" | "true" | "false";
    types?: DomainAssetType[];
    tags?: string[];
    page?: number;
    limit?: number;
    sort?: "asc" | "desc";
};

export type GetAssetsResponse = {
    assets: Asset[];
    totalCount: number;
    page: number;
    limit: number;
};

export type GetAssetReleasesOptions = {
    limit?: number;
};

export type GetAssetRevisionDataOptions = {
    apiClientOptions?: ApiClientOptions;
};

export type GetAssetRevisionOptions = {
    includeDataUrl?: boolean;
    includeDependencies?: boolean;
    includeMetadata?: boolean;
    includeRelease?: boolean;
};

export type GetAssetRevisionsOptions = GetAssetRevisionOptions;

export type GetAssetRevisionsResponse = {
    revisions: AssetRevision[];
};

export type GetSceneAssetsOptions = {
    includeDerivatives?: boolean;
    includeDerivativeDataUrl?: boolean;
    includeLatestRelease?: boolean;
    includeThumbnails?: boolean;
    types?: DomainAssetType[];
};

export type GetMyAssetsOptions = {
    apiClientOptions?: ApiClientOptions;
    includeLatestRelease?: boolean;
    tags?: string[];
    includeThumbnails?: boolean;
    types?: DomainAssetType[];
};

export type UpdateAssetParams = {
    assetId: string;
    name?: string;
    description?: string;
    tags?: string[];
    isForkable?: boolean;
    moderationStatus?: string;
};

export const AssetType = {
    Animation: DomainAssetType.AssetTypeAnimation,
    Audio: DomainAssetType.AssetTypeAudio,
    Behavior: DomainAssetType.AssetTypeBehavior,
    Script: DomainAssetType.AssetTypeScript,
    Image: DomainAssetType.AssetTypeImage,
    Model: DomainAssetType.AssetTypeModel,
    Npc: DomainAssetType.AssetTypeNpc,
    Prefab: DomainAssetType.AssetTypePrefab,
    Quarks: DomainAssetType.AssetTypeQuarks,
    Video: DomainAssetType.AssetTypeVideo,
    File: DomainAssetType.AssetTypeFile,
    Lambda: DomainAssetType.AssetTypeLambda,
    Scene: DomainAssetType.AssetTypeScene,
    // Aliases for semantic clarity (map to existing types)
    Avatar: DomainAssetType.AssetTypeModel, // Avatars are 3D models with avatar metadata
    Texture: DomainAssetType.AssetTypeImage, // Textures are images
    Screenshot: DomainAssetType.AssetTypeImage, // Screenshots are images
} as const;

export const AssetDerivativeType = {
    BehaviorBundle: DomainDerivativeType.DerivativeTypeBehaviorBundle,
    Image: DomainDerivativeType.DerivativeTypeImage,
    Model: DomainDerivativeType.DerivativeTypeModel,
    Thumbnail: DomainDerivativeType.DerivativeTypeThumbnail,
    Audio: DomainDerivativeType.DerivativeTypeAudio,
} as const;

export type AssetVersion = {
    major: number;
    minor: number;
    patch: number;
};

// All model formats supported by the API
export enum ModelFormat {
    Blend = "blend",
    Dae = "dae",
    Fbx = "fbx",
    Glb = "glb",
    Gltf = "gltf",
    Obj = "obj",
    Ply = "ply",
    Spz = "spz",
    Stl = "stl",
    Threeds = "3ds",
    Usd = "usd",
    Usda = "usda",
    Usdc = "usdc",
    Usdz = "usdz",
    Vrm = "vrm",
}

export const SUPPORTED_MODEL_FORMATS: readonly ModelFormat[] = Object.values(ModelFormat);

export const SUPPORTED_MODEL_FORMATS_REGEX = new RegExp(`\\.(${SUPPORTED_MODEL_FORMATS.join("|")})$`, "i");

export const SUPPORTED_MODEL_CONTENT_TYPES: Record<ModelFormat, [string, ...string[]]> = {
    [ModelFormat.Blend]: ["application/x-blender"],
    [ModelFormat.Dae]: ["application/vnd.collada+xml"],
    [ModelFormat.Fbx]: ["application/octet-stream", "text/plain"],
    [ModelFormat.Glb]: ["model/gltf-binary"],
    [ModelFormat.Gltf]: ["model/gltf+json"],
    [ModelFormat.Obj]: ["model/obj"],
    [ModelFormat.Ply]: ["text/plain", "application/octet-stream"],
    [ModelFormat.Spz]: ["application/octet-stream"],
    [ModelFormat.Stl]: ["model/stl"],
    [ModelFormat.Threeds]: ["application/x-3ds"],
    [ModelFormat.Usd]: ["application/usd", "application/octet-stream"],
    [ModelFormat.Usda]: ["application/usda", "text/plain", "application/octet-stream"],
    [ModelFormat.Usdc]: ["application/usdc", "application/octet-stream"],
    [ModelFormat.Usdz]: ["model/vnd.usdz+zip"],
    [ModelFormat.Vrm]: ["model/gltf+json", "model/gltf-binary"],
};

export type AssetResponseType = {
    arraybuffer: ArrayBuffer;
    blob: Blob;
    json: any;
    text: string;
};

export const INLINE_DATA_MAX_BYTES = 1_048_576; // 1 MB

/**
 * Compress data using gzip via pako.
 * @param data - Data to compress
 * @returns Compressed data as a Blob
 */
export const gzipData = async (data: string | ArrayBuffer | Blob | ReadableStream): Promise<Blob> => {
    let bytes: Uint8Array;
    if (data instanceof ArrayBuffer) {
        bytes = new Uint8Array(data);
    } else if (data instanceof Blob) {
        bytes = new Uint8Array(await data.arrayBuffer());
    } else if (typeof data === "string") {
        bytes = new TextEncoder().encode(data);
    } else {
        // ReadableStream
        const reader = data.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            chunks.push(value);
        }
        const total = chunks.reduce((s, c) => s + c.length, 0);
        bytes = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
        }
    }
    return new Blob([pako.gzip(bytes)]);
};

/**
 * Returns byte length of data, or null if unknowable (ReadableStream).
 * @param data - Data to check
 * @returns Byte length, or null
 */
export const getDataByteLength = (
    data: string | ArrayBuffer | Blob | ReadableStream,
): number | null => {
    if (data instanceof ArrayBuffer) return data.byteLength;
    if (data instanceof Blob) return data.size;
    if (typeof data === "string") return new Blob([data]).size;
    return null; // ReadableStream — unknown size
};

/**
 * Convert data to a base64 string.
 * @param data - Data to convert
 * @returns Base64 string
 */
export const dataToBase64 = async (
    data: string | ArrayBuffer | Blob,
): Promise<string> => {
    let buffer: ArrayBuffer;
    if (data instanceof ArrayBuffer) {
        buffer = data;
    } else if (data instanceof Blob) {
        buffer = await data.arrayBuffer();
    } else {
        buffer = new TextEncoder().encode(data).buffer;
    }
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
};

export type CreateAssetParams = {
    type: DomainAssetType;
    format: string;
    contentType: string;
    name: string;
    uploadId?: string;
    data?: string; // base64-encoded (alternative to uploadId)
    options?: CreateAssetOptions;
};

export const createAsset = async ({
    type,
    format,
    contentType,
    name,
    uploadId,
    data,
    options = {},
}: CreateAssetParams): Promise<Asset> => {
    if (IS_OSS) {
        // Mirrors createSceneAsset's OSS branch: produce a synthetic asset
        // record with the inline base64 payload encoded as a data: URL so
        // downstream consumers (behavior loader, asset resolver) can hit
        // the same shape they expect without touching the integrated
        // assets API.
        const id = `oss-asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const revisionId = `oss-rev-${id}`;
        const now = new Date().toISOString();
        let dataUrl: string | undefined;
        if (typeof data === "string" && data.length > 0) {
            const mime = format === "json" ? "application/json" : (contentType || "application/octet-stream");
            dataUrl = `data:${mime};base64,${data}`;
        }
        return {
            id,
            type,
            format,
            name,
            description: options.revisionDescription,
            createTime: now,
            updateTime: now,
            userId: "local",
            headRevisionId: revisionId,
            revision: {id: revisionId, dataUrl, derivatives: [], expiresAt: undefined},
        } as unknown as Asset;
    }
    const response = await getAssetsApiClient().createAsset({
        type,
        format,
        contentType,
        name,
        uploadId,
        data,
        dependencies: options.dependencies,
        revisionDescription: options.revisionDescription,
        metadata: options.metadata,
        tags: options.tags,
    });

    if (response?.status !== 201) {
        console.warn("Failed to create asset", response);
        throw new Error("Failed to create asset");
    }

    return response.data;
};

export const createAssetDerivative = async (
    assetId: string,
    revisionId: string,
    request: DerivativeCreateAssetDerivativeRequest,
): Promise<AssetDerivative> => {
    const response = await getAssetsApiClient().createAssetDerivative(assetId, revisionId, request);

    if (response.status !== 201) {
        console.warn("Failed to create asset derivative", response);
        throw new Error("Failed to create asset derivative");
    }

    return response.data;
};

export const createAssetImport = async (items: AssetImportItem[]): Promise<AssetImport> => {
    const response = await getAssetsApiClient().createAssetImport({
        items,
    });

    if (response?.status !== 201) {
        console.warn("Failed to create asset import", response);
        throw new Error("Failed to create asset import");
    }

    return response.data;
};

export const createAssetRelease = async ({
    assetId,
    revisionId,
    version,
    description,
}: CreateAssetReleaseParams): Promise<AssetRelease> => {
    const response = await getAssetsApiClient().createAssetRelease(assetId, {
        revisionId,
        description,
        versionMajor: version.major,
        versionMinor: version.minor,
        versionPatch: version.patch,
    });

    if (response?.status !== 201) {
        console.warn("Failed to create asset release", response);
        throw new Error("Failed to create asset release");
    }

    return response.data;
};

export type ForkAssetParams = {
    /** The asset id to fork from. */
    assetId: string;
    /** The revision id to fork from. Required by the backend. */
    revisionId: string;
    /** Optional name for the new fork; defaults to the source name on the server. */
    name?: string;
};

export type ForkAssetResult = {
    /** The id of the newly forked asset. */
    assetId: string;
    /** The head revision id on the new fork. */
    revisionId: string;
};

export const forkAsset = async ({assetId, revisionId, name}: ForkAssetParams): Promise<ForkAssetResult> => {
    const response = await getAssetsApiClient().createAssetFork(assetId, {revisionId, name});

    if (response?.status !== 201 && response?.status !== 200) {
        console.warn("Failed to fork asset", response);
        throw createHttpStatusError(response.status, response.data, "Failed to fork asset");
    }

    const {assetId: newAssetId, revisionId: newRevisionId} = response.data ?? {};
    if (!newAssetId || !newRevisionId) {
        throw new Error("Fork asset response missing assetId or revisionId");
    }

    return {assetId: newAssetId, revisionId: newRevisionId};
};

export const createAssetRevision = async ({
    assetId,
    parentRevisionId,
    uploadId,
    data,
    contentType,
    format,
    options = {},
}: CreateAssetRevisionParams): Promise<AssetRevision> => {
    if (IS_OSS) {
        // OSS skips the integrated asset-revision API. Behavior/lambda
        // imports route their payload (`data` is base64) through this and
        // expect a usable revision id back; we encode the inline data as a
        // data: URL so resolvers downstream still read the same shape.
        const id = `oss-rev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        let dataUrl: string | undefined;
        if (typeof data === "string" && data.length > 0) {
            const mime = format === "json" ? "application/json" : (contentType || "application/octet-stream");
            dataUrl = `data:${mime};base64,${data}`;
        }
        return {
            id,
            assetId,
            parentId: parentRevisionId,
            dataUrl,
            derivatives: [],
            expiresAt: undefined,
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString(),
        } as unknown as AssetRevision;
    }
    const response = await getAssetsApiClient().createAssetRevision(assetId, {
        parentId: parentRevisionId,
        uploadId,
        data,
        contentType,
        format,
        description: options.description,
        dependencies: options.dependencies,
        metadata: options.metadata,
    });

    if (response?.status !== 201) {
        console.warn("Failed to create asset revision", response);
        throw createHttpStatusError(response.status, response.data, "Failed to create asset revision");
    }

    // Broadcast to legacy listeners
    global.app?.call("assetChanged", null, {assetId});

    return response.data;
};

export const createAssetUpload = async (contentType: string, contentEncoding?: string) => {
    if (IS_OSS) {
        // OSS skips the asset-upload roundtrip entirely (createSceneAssetWithData
        // forces the inline path), but if a caller still reaches this point we
        // return a synthetic shape with a usable blob: URL so any subsequent
        // upload PUT lands on a writable target (the URL is a no-op since the
        // OSS asset path is fully inline).
        const id = `oss-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        return {upload: {id}, uploadUrl: ""} as never;
    }
    const response = await getAssetsApiClient().createAssetUpload({
        contentType,
        ...(contentEncoding && {contentEncoding}),
    });

    if (response?.status !== 201) {
        console.warn("Failed to create asset upload", response);
        throw new Error("Failed to create asset upload");
    }

    return response.data;
};

export const getAsset = async (assetId: string, options: GetAssetOptions = {}): Promise<Asset> => {
    if (IS_OSS) {
        // OSS doesn't persist assets via the integrated asset service; the
        // scene JSON is self-contained and loaded directly from
        // ProjectStore. Return a minimal synthetic asset so callers that
        // ask for metadata get something usable.
        return {
            id: assetId,
            type: "scene",
            format: "json",
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString(),
            userId: "local",
            headRevisionId: `oss-rev-${assetId}`,
            name: "local",
            revision: {id: `oss-rev-${assetId}`, dataUrl: undefined, derivatives: [], expiresAt: undefined},
        } as never;
    }
    const includes = [];
    if (options.includeThumbnails) {
        includes.push("thumbnails");
    }
    if (options.includeLatestRelease) {
        includes.push("latestRelease");
    }

    const includesStr = includes.length > 0 ? includes.join(",") : undefined;
    const response = await getAssetsApiClient(options.apiClientOptions).getAsset(assetId, includesStr);

    if (response?.status !== 200) {
        console.warn("Failed to get asset", response);
        throw new Error("Failed to get asset");
    }

    return response.data;
};

export const getAssets = async (options: GetAssetsOptions = {}): Promise<GetAssetsResponse> => {
    const includes = [];
    if (options.includeLatestRelease) {
        includes.push("latestRelease");
    }

    if (options.includeThumbnails) {
        includes.push("thumbnails");
    }

    const types = options?.types?.length ? options.types.join(",") : undefined;
    const tags = options?.tags?.length ? options.tags.join(",") : undefined;
    const includesStr = includes.length > 0 ? includes.join(",") : undefined;
    const response = await getAssetsApiClient().getAssets(
        options.owner,
        includesStr,
        types,
        tags,
        options.released,
        options.page,
        options.limit,
        options.sort,
    );

    if (response?.status !== 200) {
        console.warn("Failed to get assets", response);
        throw new Error("Failed to get assets");
    }

    return response.data;
};

export const getAssetDerivative = async (
    assetId: string,
    revisionId: string,
    derivativeId: string,
    options: GetAssetDerivativeOptions = {},
): Promise<AssetDerivative> => {
    const includes = [];
    if (options.includeDataUrl) {
        includes.push("dataUrl");
    }

    const includesStr = includes.length > 0 ? includes.join(",") : undefined;
    const response = await getAssetsApiClient(options.apiClientOptions).getAssetDerivative(
        assetId,
        revisionId,
        derivativeId,
        includesStr,
    );

    if (response?.status !== 200) {
        console.warn("Failed to get asset derivative", response);
        throw new Error("Failed to get asset derivative");
    }

    return response.data;
};

export const getAssetDerivatives = async (
    assetId: string,
    revisionId: string,
    options: GetAssetDerivativesOptions = {},
): Promise<AssetDerivative[]> => {
    if (IS_OSS) return [];
    const includes = [];
    if (options.includeDataUrl) {
        includes.push("dataUrl");
    }

    const includesStr = includes.length > 0 ? includes.join(",") : undefined;
    const response = await getAssetsApiClient(options.apiClientOptions).getAssetDerivatives(
        assetId,
        revisionId,
        includesStr,
    );

    if (response?.status !== 200) {
        console.warn("Failed to get asset derivatives", response);
        throw new Error("Failed to get asset derivatives");
    }

    return response.data.derivatives;
};

export const getAssetImport = async (importId: string): Promise<AssetImport> => {
    const response = await getAssetsApiClient().getAssetImport(importId);

    if (response?.status !== 200) {
        console.warn("Failed to get asset import", response);
        throw new Error("Failed to get asset import");
    }

    return response.data;
};

export const getAssetReleases = async (
    assetId: string,
    options: GetAssetReleasesOptions = {},
): Promise<AssetRelease[]> => {
    const response = await getAssetsApiClient().getAssetReleases(assetId, options?.limit);

    if (response?.status !== 200) {
        console.warn("Failed to get asset releases", response);
        throw new Error("Failed to get asset releases");
    }

    return response.data.releases;
};

export const getAssetRevision = async (
    assetId: string,
    revisionId: string,
    options: GetAssetRevisionOptions = {},
): Promise<AssetRevision> => {
    if (IS_OSS) {
        // OSS-synthesized revisions carry their payload inline as a data: URL.
        // The shape mirrors what the integrated CDN-backed response returns,
        // minus signed-URL fields the local store doesn't have.
        return {
            id: revisionId,
            assetId,
            dataUrl: undefined,
            derivatives: [],
            expiresAt: undefined,
        } as unknown as AssetRevision;
    }
    const includes = [];

    if (options.includeDataUrl) {
        includes.push("dataUrl");
    }

    if (options.includeDependencies) {
        includes.push("dependencies");
    }

    if (options.includeMetadata) {
        includes.push("metadata");
    }

    if (options.includeRelease) {
        includes.push("release");
    }

    const includesStr = includes.length > 0 ? includes.join(",") : undefined;
    const response = await getAssetsApiClient().getAssetRevision(assetId, revisionId, includesStr);

    if (response?.status !== 200) {
        console.warn("Failed to get asset revision", response);
        throw new Error("Failed to get asset revision");
    }

    return response.data;
};

export const getAssetRevisionData = async <T extends keyof AssetResponseType = "json">(
    assetId: string,
    revisionId: string,
    responseType: T,
    options: GetAssetRevisionDataOptions = {},
): Promise<AssetResponseType[T]> => {
    if (IS_OSS) {
        // OSS doesn't route assets through the integrated CDN. Callers that
        // need the underlying bytes should read directly from the scene
        // JSON in ProjectStore. Return an empty value of the right shape.
        if (responseType === "blob") return new Blob([]) as never;
        if (responseType === "arraybuffer") return new ArrayBuffer(0) as never;
        if (responseType === "text") return "" as never;
        return {} as never;
    }
    // Step 1: resolve to a signed CDN URL. Same-origin, so auth headers
    // (X-Scene-Id, X-Root-Asset-Id, X-Asset-Token) flow normally via
    // getAssetsApiClient.
    const urlResponse = await getAssetsApiClient(options.apiClientOptions)
        .getAssetRevisionData(assetId, revisionId);

    if (urlResponse?.status !== 200) {
        console.warn("Failed to resolve asset revision data URL", urlResponse);
        throw new Error("Failed to resolve asset revision data URL");
    }

    const dataUrl = urlResponse.data?.dataUrl;
    if (!dataUrl) {
        throw new Error("Server did not return a dataUrl for asset revision data");
    }

    // Step 2: fetch the presigned URL directly. No auth headers — the URL
    // carries its own signature, and leaking a Bearer token to the CDN
    // would be wrong and could trigger its own preflight.
    const cdnResponse = await axios.get(dataUrl, {responseType});
    return cdnResponse.data as AssetResponseType[T];
};

export const getAssetRevisions = async (assetId: string, options: GetAssetRevisionsOptions = {}) => {
    const includes = [];

    if (options.includeDataUrl) {
        includes.push("dataUrl");
    }

    if (options.includeDependencies) {
        includes.push("dependencies");
    }

    if (options.includeMetadata) {
        includes.push("metadata");
    }

    if (options.includeRelease) {
        includes.push("release");
    }

    const includesStr = includes.length > 0 ? includes.join(",") : undefined;
    const response = await getAssetsApiClient().getAssetRevisions(assetId, includesStr);

    if (response?.status !== 200) {
        console.warn("Failed to get asset revisions", response);
        throw new Error("Failed to get asset revisions");
    }

    return response.data;
};

export const getMyAssets = async (options: GetMyAssetsOptions = {}) => {
    if (IS_OSS) return {assets: []} as Awaited<ReturnType<ReturnType<typeof getAssetsApiClient>["getMyAssets"]>>["data"];
    const apiClientOptions = {
        ...options.apiClientOptions,
        context: AccessContext.User, // Always use user context
    };

    const includes = [];
    if (options.includeThumbnails) {
        includes.push("thumbnails");
    }

    const types = options?.types?.length ? options.types.join(",") : undefined;
    const tags = options?.tags?.length ? options.tags.join(",") : undefined;
    const includesStr = includes.length > 0 ? includes.join(",") : undefined;

    // Pass include as a query param since generated client doesn't support it yet
    const response = await getAssetsApiClient(apiClientOptions).getMyAssets(types, tags, includesStr);

    if (response?.status !== 200) {
        console.warn("Failed to get current user's assets", response);
        throw new Error("Failed to get current user's assets");
    }

    return response.data;
};

export const getSceneAssets = async (sceneId: string, options: GetSceneAssetsOptions = {}) => {
    if (IS_OSS) return {assets: []} as Awaited<ReturnType<ReturnType<typeof getAssetsApiClient>["getSceneAssets"]>>["data"];
    const includes = [];
    if (options.includeDerivatives) {
        includes.push("derivatives");
    }
    if (options.includeDerivativeDataUrl) {
        includes.push("derivativeDataUrl");
    }
    if (options.includeLatestRelease) {
        includes.push("latestRelease");
    }
    if (options.includeThumbnails) {
        includes.push("thumbnails");
    }

    const includesStr = includes.length > 0 ? includes.join(",") : undefined;
    const types = options?.types?.length ? options.types.join(",") : undefined;
    const response = await getAssetsApiClient().getSceneAssets(sceneId, includesStr, types);

    if (response?.status !== 200) {
        console.warn("Failed to get scene assets", response);
        throw new Error("Failed to get scene assets");
    }

    return response.data;
};

export const updateAsset = async ({
    assetId,
    name,
    description,
    tags,
    isForkable,
    moderationStatus,
}: UpdateAssetParams): Promise<Asset> => {
    const response = await getAssetsApiClient().updateAsset(assetId, {
        name,
        description,
        tags,
        isForkable,
        moderationStatus,
    });

    if (response?.status !== 200) {
        console.warn("Failed to update asset", response);
        throw new Error("Failed to update asset");
    }

    return response.data;
};

export const uploadAssetData = async (
    uploadUrl: string,
    data: string | ArrayBuffer | Blob | ReadableStream,
    contentType: string,
    contentEncoding?: string,
) => {
    if (IS_OSS) {
        // OSS has no remote upload endpoint. Callers that reach this point
        // have already encoded the payload inline (data: URL) via the OSS
        // branches of createAssetWithData / createAssetRevisionWithData /
        // createSceneAssetWithData, so the bytes are persisted in the scene
        // JSON. Make this a no-op rather than PUT-ing to the current page URL.
        return;
    }
    // Debug logging for upload
    const dataSize =
        data instanceof Blob
            ? data.size
            : data instanceof ArrayBuffer
              ? data.byteLength
              : typeof data === "string"
                ? data.length
                : "stream";

    console.log("[uploadAssetData] Starting upload:", {
        url: uploadUrl,
        contentType,
        contentEncoding,
        dataSize,
        dataType: data?.constructor?.name || typeof data,
    });

    try {
        const headers: Record<string, string> = {"Content-Type": contentType};
        if (contentEncoding) {
            headers["Content-Encoding"] = contentEncoding;
        }

        const response = await fetch(uploadUrl, {
            method: "PUT",
            headers,
            body: data,
        });

        console.log("[uploadAssetData] Response:", {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
        });

        if (!response.ok || response.status !== 200) {
            const responseText = await response.text().catch(() => "Could not read response");
            console.warn("[uploadAssetData] Failed to upload asset revision data", {
                response,
                responseText,
                url: uploadUrl,
            });
            throw new Error(`Failed to upload asset revision data: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error("[uploadAssetData] Fetch error:", {
            error,
            errorMessage: error instanceof Error ? error.message : String(error),
            url: uploadUrl,
            contentType,
            dataSize,
        });
        throw error;
    }
};

/**
 * Convenience function for creating an asset with the given data.
 * Uses inline data for small payloads (<=1 MB) to avoid 3 HTTP round-trips.
 *
 * @param params - Parameters for creating the asset
 * @param params.type - Type of the asset
 * @param params.name - Name of the asset
 * @param params.format - Format of the data (e.g., "glb")
 * @param params.contentType - Content type of the data
 * @param params.data - Data to upload
 * @param params.options - Additional options for asset creation
 * @param params.contentEncoding - Encoding of the data
 * @returns Promise resolving to the created asset
 */
export const createAssetWithData = async ({
    type,
    name,
    format,
    contentType,
    data,
    options = {},
    contentEncoding,
}: CreateAssetWithDataParams) => {
    // Inline path for small data — skip the upload roundtrip (no gzip for inline).
    // In OSS we force inline regardless of size because there is no remote
    // upload endpoint; the data: URL we synthesize is the asset's storage.
    const byteLength = getDataByteLength(data);
    if (IS_OSS || (byteLength !== null && byteLength <= INLINE_DATA_MAX_BYTES)) {
        const base64 = await dataToBase64(data as string | ArrayBuffer | Blob);
        return createAsset({type, format, contentType, name, data: base64, options});
    }

    const uploadData = contentEncoding ? await gzipData(data) : data;
    const {upload, uploadUrl} = await createAssetUpload(contentType, contentEncoding);
    await uploadAssetData(uploadUrl, uploadData, contentType, contentEncoding);
    return createAsset({type, format, contentType, name, uploadId: upload.id, options});
};

export const createAssetDerivativeWithData = async ({
    assetId,
    revisionId,
    type,
    format,
    contentType,
    data,
    metadata,
    lodLevel,
    contentEncoding,
}: CreateAssetDerivativeWithDataParams) => {
    if (IS_OSS) {
        // OSS has no upload endpoint and no derivative service. Derivatives
        // (LODs, thumbnails) are best-effort: producing them locally would
        // need a write-back path we don't have, so we return a synthetic
        // record that downstream consumers can ignore.
        const now = new Date().toISOString();
        return {
            id: `oss-deriv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            assetId,
            revisionId,
            type,
            format,
            createTime: now,
            updateTime: now,
            ...(lodLevel !== undefined ? {lodLevel} : {}),
            ...(metadata ? {metadata} : {}),
        } as unknown as AssetDerivative;
    }
    const uploadData = contentEncoding ? await gzipData(data) : data;
    const {upload, uploadUrl} = await createAssetUpload(contentType, contentEncoding);
    await uploadAssetData(uploadUrl, uploadData, contentType, contentEncoding);
    return createAssetDerivative(assetId, revisionId, {
        type,
        format,
        metadata,
        lodLevel,
        uploadId: upload.id,
    });
};

/**
 * Convenience function for creating an asset revision with the given data.
 * Uses inline data for small payloads (<=1 MB) to avoid 3 HTTP round-trips.
 *
 * @param params - Parameters for creating the asset revision
 * @param params.assetId - ID of the asset
 * @param params.parentRevisionId - ID of the parent revision
 * @param params.data - Data to upload
 * @param params.format - Format of the data (e.g., "glb", "mp3")
 * @param params.contentType - Content type of the data
 * @param params.options - Additional options for asset revision creation
 * @param params.contentEncoding - Encoding of the data
 * @returns Promise resolving to the committed asset revision
 */
export const createAssetRevisionWithData = async ({
    assetId,
    parentRevisionId,
    data,
    format,
    contentType,
    options = {},
    contentEncoding,
}: CreateAssetRevisionWithDataParams) => {
    // Inline path for small data — skip the upload roundtrip (no gzip for inline).
    // OSS forces inline regardless of size (no upload endpoint to hit).
    const byteLength = getDataByteLength(data);
    if (IS_OSS || (byteLength !== null && byteLength <= INLINE_DATA_MAX_BYTES)) {
        const base64 = await dataToBase64(data as string | ArrayBuffer | Blob);
        return createAssetRevision({
            assetId,
            parentRevisionId,
            data: base64,
            contentType,
            format,
            options,
        });
    }

    const uploadData = contentEncoding ? await gzipData(data) : data;
    const {upload, uploadUrl} = await createAssetUpload(contentType, contentEncoding);
    await uploadAssetData(uploadUrl, uploadData, contentType, contentEncoding);
    return createAssetRevision({
        assetId,
        parentRevisionId,
        uploadId: upload.id,
        format,
        options,
    });
};

/**
 * Import asset data in batches.
 *
 * @remarks
 * This is a convenience function for importing assets in batches. The function
 * returns a promise resolving to the completed asset imports. They may have
 * succeeded or failed.
 *
 * @param assets - The assets to import
 * @param batchSize - The batch size (max 100)
 * @param onProgress - Optional callback for progress updates (completed, total)
 * @param pollConcurrency - Max number of concurrent import/poll pipelines
 * @returns A promise resolving to the completed asset import jobs.
 */
export const batchImportAssets = async (
    assets: AssetImportItem[],
    batchSize: number = 100, // 100 is the max allowed by the backend
    onProgress?: (completed: number, total: number) => void,
    pollConcurrency: number = 5,
) => {
    const safeBatchSize = Math.max(1, Math.min(100, batchSize));
    const safePollConcurrency = Math.max(1, pollConcurrency);
    const chunks = chunk(assets, safeBatchSize);
    const total = chunks.length;
    let completedCount = 0;

    // Process batches with bounded concurrency (default 5),
    // each batch: create import -> wait for completion -> report
    const results = await processWithConcurrencyLimit(
        chunks,
        safePollConcurrency,
        async (chunkItems): Promise<AssetImportJob[]> => {
            const assetImport = await withRetry(() => createAssetImport(chunkItems), {
                operationName: "createAssetImport",
            });
            const finishedImport = await withRetry(() => waitForAssetImport(assetImport.id), {
                operationName: "waitForAssetImport",
            });
            completedCount++;
            onProgress?.(completedCount, total);
            return finishedImport.jobs;
        },
    );

    return results.flat();
};

/**
 * Wait for the specified asset import to complete.
 *
 * @param importId - ID of the asset import
 * @param pollIntervalMs - Interval in milliseconds to poll the import status
 * @returns A promise resolving to the completed asset import.
 */
export const waitForAssetImport = async (importId: string, pollIntervalMs: number = 1000) => {
    // TODO: Add retry logic
    while (true) {
        const assetImport = await getAssetImport(importId);
        const isPending = assetImport.jobs.some(job => job.status === "pending");
        if (!isPending) {
            return assetImport;
        }
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
};

export const processWithConcurrencyLimit = async <T, R>(
    items: T[],
    concurrencyLimit: number,
    processor: (item: T) => Promise<R>,
): Promise<R[]> => {
    if (items.length === 0) {
        return [];
    }

    const results: Array<R | undefined> = new Array(items.length);
    const maxWorkers = Math.max(1, Math.min(concurrencyLimit, items.length));
    let currentIndex = 0;

    const runNext = async (): Promise<void> => {
        while (currentIndex < items.length) {
            const index = currentIndex++;
            results[index] = await processor(items[index]!);
        }
    };

    await Promise.all(Array.from({length: maxWorkers}, () => runNext()));
    return results as R[];
};

export const isNoChangesError = (error: unknown): boolean => {
    if (isStatusError(error) && error.statusCode === 400) {
        const msg = getErrorMessage(error.body);
        return msg?.toLocaleLowerCase().includes("no changes") ?? false;
    }

    return (
        isAxiosError<{msg: string}>(error) &&
        error.response?.status === 400 &&
        error.response?.data.msg.toLocaleLowerCase().includes("no changes")
    );
};

/**
 * Checks whether the given error is a 409 Conflict response.
 * Handles both internal StatusError instances and axios errors.
 *
 * @param error - The error to check
 * @returns true if the error represents a 409 Conflict
 */
export const isConflictError = (error: unknown): boolean => {
    if (isStatusError(error) && error.statusCode === 409) {
        return true;
    }
    return isAxiosError(error) && error.response?.status === 409;
};

interface StatusError extends Error {
    statusCode: number;
    body: unknown;
}

const isStatusError = (error: unknown): error is StatusError => {
    return error instanceof Error && typeof (error as StatusError).statusCode === "number";
};

const createHttpStatusError = (statusCode: number, body: unknown, message: string): StatusError => {
    const error = new Error(message) as StatusError;
    error.statusCode = statusCode;
    error.body = body;
    return error;
};

const getErrorMessage = (body: unknown): string | null => {
    if (!body || typeof body !== "object") {
        return null;
    }

    const msg = (body as {msg?: unknown}).msg;
    return typeof msg === "string" ? msg : null;
};
