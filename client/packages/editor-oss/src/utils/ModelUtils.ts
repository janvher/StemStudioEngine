import {Document, Texture, WebIO} from "@gltf-transform/core";
import type {JSONDocument, Transform} from "@gltf-transform/core";
import {ALL_EXTENSIONS, EXTMeshoptCompression} from "@gltf-transform/extensions";
import {dedup, flatten, join, prune, resample, simplify, unpartition, meshopt} from "@gltf-transform/functions";
import * as Comlink from "comlink";
import {MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier} from "meshoptimizer";
import {AmbientLight, Box3, Object3D, PerspectiveCamera, Scene, Vector3} from "three";
import {GLTFExporter} from "three/examples/jsm/exporters/GLTFExporter.js";
import {WebGPURenderer} from "three/webgpu";

import Ajax from "./Ajax";
import type {ModelUtilsWorkerAPI} from "./ModelUtilsWorker";
import ModelUtilsWorker from "./ModelUtilsWorker.ts?worker";
import {backendUrlFromPath} from "./UrlUtils";
import {EARTHAnimationGraphTransformExtension} from "../animation/extensions/EARTHAnimationGraphTransformExtension";
import { getObjectBoundingBox, isGaussianSplatObject } from "@stem/editor-oss/model/gaussianSplats";
import { disposeSparkComposite, ensureSparkComposite } from "../render/SparkCompositeBridge";
import {showToast} from "@stem/editor-oss/showToast";

// Maximum texture size supported by KTX2/Basis encoder.
// The encoder has a fixed 10MB output buffer which can overflow with larger textures.
const MAX_TEXTURE_SIZE_FOR_COMPRESSION = 4096;

// Shared WebIO instance to avoid recreating it per-call (expensive).
let _sharedWebIO: WebIO | null = null;
const getSharedWebIO = async (): Promise<WebIO> => {
    if (!_sharedWebIO) {
        await MeshoptEncoder.ready;
        await MeshoptDecoder.ready;

        _sharedWebIO = new WebIO()
            .registerExtensions([...ALL_EXTENSIONS, EARTHAnimationGraphTransformExtension])
            .registerDependencies({
                "meshopt.encoder": MeshoptEncoder,
                "meshopt.decoder": MeshoptDecoder,
            });
    }
    return _sharedWebIO;
};

interface OptimizeGlbFileOptions {
    /** Whether to compress textures (default: false) */
    compressTextures?: boolean;

    /** Enforce a maximum texture size (default: off) */
    maxTextureSize?: number;

    /** Texture scale factor (0.0 - 1.0) */
    textureScale?: number;

    /** Target ratio for mesh simplification (0.0 - 1.0) */
    simplifyRatio?: number;

    /** Target error for mesh simplification */
    simplifyError?: number;

    /** Whether to remove morph targets (default: true) */
    removeMorphTargets?: boolean;

    /** Whether to use meshopt compression (default: true) */
    useMeshopt?: boolean;
}

// Options for legacy compressModel helper
type CompressModelOptions = {
    /** If true, skip applying EXT_meshopt compression and meshopt transform */
    disableMeshopt?: boolean;
    /** Whether input is JSONDocument (true) or binary ArrayBuffer (false). */
    isJSON?: boolean;
};

/**
 * @deprecated Use `optimizeGlbFile` instead
 * @param data Source GLB/GLTF data (ArrayBuffer for GLB, JSONDocument for GLTF)
 * @param options Optional settings ({ isJSON, disableMeshopt }) OR legacy (isJSON boolean as 2nd arg)
 * @param onError Optional error callback
 * @returns Compressed data, same shape as input
 */
async function compressModel(
    data: ArrayBuffer | JSONDocument,
    options: CompressModelOptions,
    onError?: () => void,
): Promise<ArrayBuffer | JSONDocument> {
    let compressedData = data;
    try {
        // Only options object is supported
        const isJSON = Boolean(options?.isJSON);
        const useMeshopt = !options?.disableMeshopt;

        const io = await getSharedWebIO();
        const deps: Record<string, unknown> = {};
        if (useMeshopt) {
            deps["meshopt.decoder"] = MeshoptDecoder;
            deps["meshopt.encoder"] = MeshoptEncoder;
        }
        io.registerDependencies(deps);

        let doc: Document;

        if (isJSON) {
            doc = await io.readJSON(data as JSONDocument);
        } else {
            const buf = new Uint8Array(data as ArrayBuffer);
            doc = await io.readBinary(buf);
        }

        if (useMeshopt) {
            doc.createExtension(EXTMeshoptCompression)
                .setRequired(true)
                .setEncoderOptions({method: EXTMeshoptCompression.EncoderMethod.FILTER});
        }

        if (useMeshopt) {
            await doc.transform(
                resample(),
                unpartition(),
                dedup(),
                prune(),
                flatten(),
                join(),
                meshopt({encoder: MeshoptEncoder, level: "high"}),
                backfaceCulling({cull: true}),
            );
        } else {
            await doc.transform(
                resample(),
                unpartition(),
                dedup(),
                prune(),
                flatten(),
                join(),
                backfaceCulling({cull: true}),
            );
        }

        if (isJSON) {
            compressedData = await io.writeJSON(doc);
        } else {
            const bin = await io.writeBinary(doc);
            compressedData = bin.buffer;
        }

        for (const material of doc.getRoot().listMaterials()) {
            material.dispose();
        }
        for (const mesh of doc.getRoot().listMeshes()) {
            mesh.dispose();
        }
    } catch (error) {
        console.error(error);
        onError?.();
    }

    return compressedData;
}

/**
 * Compress textures in a GLB file (binary GLTF).
 *
 * @remarks
 * This function uses a worker to compress the textures in the GLB file.
 *
 * @param glbData - The GLB file data.
 * @param options - @see {@link OptimizeGlbFileOptions}
 * @returns
 */
const compressTextures = async (glbData: ArrayBuffer, options: OptimizeGlbFileOptions): Promise<ArrayBuffer> => {
    const worker = new ModelUtilsWorker();
    const proxy = Comlink.wrap<ModelUtilsWorkerAPI>(worker);
    try {
        // Copy the ArrayBuffer because it will be transferred to the worker.
        const copiedBuffer = glbData.slice(0);
        const result = await proxy.processCompressTextures(
            Comlink.transfer({glbData: copiedBuffer, options}, [copiedBuffer]),
        );
        return result;
    } finally {
        proxy[Comlink.releaseProxy]();
        worker.terminate();
    }
};

/**
 * Resize textures in a GLB file.
 *
 * @param scale - The scale factor (0.0 - 1.0).
 * @param maxTextureSize - The maximum texture size.
 * @returns A transform function.
 */
const resizeTextures = (scale: number, maxTextureSize?: number): Transform => {
    return async doc => {
        // Build a list of textures used as normal maps
        const normalTextures = new Set<Texture>();
        const materials = doc.getRoot().listMaterials();
        for (const material of materials) {
            const normalTexture = material.getNormalTexture();
            if (normalTexture) {
                normalTextures.add(normalTexture);
            }
        }

        // Resize textures
        for (const texture of doc.getRoot().listTextures()) {
            const image = texture.getImage();
            if (!image) {
                continue;
            }

            const size = texture.getSize();
            if (!size) {
                continue;
            }

            let width = size[0];
            let height = size[1];

            if (maxTextureSize) {
                if (width > maxTextureSize || height > maxTextureSize) {
                    const ratio = Math.min(maxTextureSize / width, maxTextureSize / height);
                    width = Math.floor(width * ratio);
                    height = Math.floor(height * ratio);
                }
            }

            width = Math.floor(width * scale);
            height = Math.floor(height * scale);

            // NOTE: we resize to nearest power of two for better compression and compatibility
            width = Math.pow(2, Math.floor(Math.log2(width)));
            height = Math.pow(2, Math.floor(Math.log2(height)));

            // Ensure at least 4x4
            width = Math.max(width, 4);
            height = Math.max(height, 4);

            // Skip if size hasn't changed significantly
            if (width === size[0] && height === size[1]) {
                continue;
            }

            // Create an image bitmap from the image data.
            let bitmap;
            try {
                const data = new Uint8Array(image.buffer.byteLength);
                data.set(image);
                const blob = new Blob([data], {type: texture.getMimeType()});
                bitmap = await createImageBitmap(blob);
            } catch (err) {
                console.warn(`resizeTextures: Failed to create image bitmap (mime type: ${texture.getMimeType()}`, err);
                continue;
            }

            // Create a canvas and draw the image to it to resize it.
            let canvas;
            try {
                canvas = new OffscreenCanvas(width, height);
                const context = canvas.getContext("2d");
                if (!context) {
                    console.warn("resizeTextures: Failed to create canvas context");
                    continue;
                }

                const isNormalMap = normalTextures.has(texture);
                context.imageSmoothingEnabled = !isNormalMap;
                if (!isNormalMap) {
                    context.imageSmoothingQuality = "high";
                }

                context.drawImage(bitmap, 0, 0, width, height);
            } catch (err) {
                console.warn("resizeTextures: Failed to draw to canvas", err);
                continue;
            }

            // Get the resized image data from the canvas.
            try {
                const resizedBlob = await canvas.convertToBlob({type: texture.getMimeType()});
                const resizedBuffer = await resizedBlob.arrayBuffer();
                texture.setImage(new Uint8Array(resizedBuffer));
            } catch (err) {
                console.warn("resizeTextures: Failed to get bytes from resized image", err);
                continue;
            }
        }
    };
};

const removeMorphTargets = (): Transform => {
    return (doc: Document) => {
        for (const mesh of doc.getRoot().listMeshes()) {
            for (const prim of mesh.listPrimitives()) {
                for (const target of prim.listTargets()) {
                    target.dispose();
                }
            }
        }
    };
};

/**
 * Optimize a GLB file (binary GLTF).
 *
 * @param glbData - The GLB file data.
 * @param options - @see {@link OptimizeGlbFileOptions}
 * @returns A promise that resolves to the optimized GLB file data.
 */
export const optimizeGlbFile = async (glbData: ArrayBuffer, options: OptimizeGlbFileOptions): Promise<ArrayBuffer> => {
    await MeshoptSimplifier.ready;

    const io = await getSharedWebIO();

    const doc = await io.readBinary(new Uint8Array(glbData));
    if (options.useMeshopt ?? true) {
        doc.createExtension(EXTMeshoptCompression)
            .setRequired(true)
            .setEncoderOptions({method: EXTMeshoptCompression.EncoderMethod.FILTER});
    }

    if (options.removeMorphTargets ?? true) {
        await doc.transform(removeMorphTargets());
    }

    if (options.simplifyRatio) {
        await doc.transform(
            simplify({
                simplifier: MeshoptSimplifier,
                ratio: options.simplifyRatio,
                error: options.simplifyError || 0.001,
            }),
        );
    }

    // Determine maximum texture size:
    // - Use user-specified maxTextureSize if provided
    // - If compression is enabled, cap at MAX_TEXTURE_SIZE_FOR_COMPRESSION to avoid encoder buffer overflow
    let maxTextureSize = options.maxTextureSize ? Math.max(options.maxTextureSize, 1) : undefined;
    if (options.compressTextures) {
        maxTextureSize = maxTextureSize
            ? Math.min(maxTextureSize, MAX_TEXTURE_SIZE_FOR_COMPRESSION)
            : MAX_TEXTURE_SIZE_FOR_COMPRESSION;
    }

    if (maxTextureSize || options.textureScale) {
        const textureScale = options.textureScale || 1.0;
        await doc.transform(resizeTextures(textureScale, maxTextureSize));
    }

    if (options.useMeshopt ?? true) {
        await doc.transform(meshopt({encoder: MeshoptEncoder, level: "high"}));
    }

    let optimizedGlbData: ArrayBuffer = (await io.writeBinary(doc)).buffer;

    for (const material of doc.getRoot().listMaterials()) {
        material.dispose();
    }

    for (const mesh of doc.getRoot().listMeshes()) {
        mesh.dispose();
    }

    // Texture compression needs to be done in a web worker to avoid blocking
    // the main thread.
    if (options.compressTextures) {
        optimizedGlbData = await compressTextures(optimizedGlbData, options);
    }

    return optimizedGlbData;
};

/**
 * @deprecated Use `optimizeGlbFile` instead
 * @param data Source GLB/GLTF data (ArrayBuffer for GLB, JSONDocument for GLTF)
 * @param isJSON Whether input is JSONDocument (true) or binary (false)
 * @param onError Optional error callback
 * @returns Simplified data, same shape as input
 */
const simplifyModel = async (
    data: ArrayBuffer | JSONDocument,
    isJSON: boolean,
    onError?: () => void,
): Promise<ArrayBuffer | JSONDocument> => {
    let simplifiedData = data;
    try {
        const io = new WebIO().registerExtensions([...ALL_EXTENSIONS, EARTHAnimationGraphTransformExtension]);

        let doc: Document;

        if (isJSON) {
            doc = await io.readJSON(data as JSONDocument);
        } else {
            const buf = new Uint8Array(data as ArrayBuffer);
            doc = await io.readBinary(buf);
        }

        await doc.transform(
            unpartition(),
            dedup(),
            prune(),
            flatten(),
            join(),
            simplify({simplifier: MeshoptSimplifier, ratio: 0.75, error: 0.001}),
        );

        if (isJSON) {
            simplifiedData = await io.writeJSON(doc);
        } else {
            const bin = await io.writeBinary(doc);
            simplifiedData = bin.buffer;
        }

        for (const material of doc.getRoot().listMaterials()) {
            material.dispose();
        }
        for (const mesh of doc.getRoot().listMeshes()) {
            mesh.dispose();
        }
    } catch (error) {
        console.error(error);
        onError?.();
    }

    return simplifiedData;
};

const backfaceCulling = (options: {cull: boolean}) => {
    return (document: Document) => {
        for (const material of document.getRoot().listMaterials()) {
            material.setDoubleSided(!options.cull);
        }
    };
};

const THUMBNAIL_GAUSSIAN_SPLAT_WARMUP_FRAMES = 45;

const waitForThumbnailFrame = async () => {
    await new Promise<void>((resolve) => {
        let resolved = false;
        const finish = () => {
            if (resolved) return;
            resolved = true;
            resolve();
        };

        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(finish);
        }

        setTimeout(finish, 16);
    });
};

const getThumbnailBounds = (model: Object3D) => {
    let box = new Box3();
    try {
        box = getObjectBoundingBox(model);
    } catch {
        box = new Box3();
    }

    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const hasFiniteBounds =
        Number.isFinite(size.x) && Number.isFinite(size.y) && Number.isFinite(size.z) &&
        Number.isFinite(center.x) && Number.isFinite(center.y) && Number.isFinite(center.z);

    if (!hasFiniteBounds || box.isEmpty() || Math.max(size.x, size.y, size.z) <= 0) {
        size.set(1, 1, 1);
        center.set(0, 0, 0);
    }

    return {size, center};
};

const positionThumbnailCamera = (model: Object3D, camera: PerspectiveCamera) => {
    const {size, center} = getThumbnailBounds(model);
    const diagonal = Math.sqrt(size.x * size.x + size.y * size.y + size.z * size.z);
    const maxDim = Math.max(size.x, size.y, size.z, diagonal * 0.6, 1);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ = Math.max(cameraZ * 1.2, 1);

    camera.near = Math.max(0.01, cameraZ * 0.001);
    camera.far = Math.max(1000, cameraZ * 10);
    camera.updateProjectionMatrix();
    camera.position.set(center.x, center.y, center.z + cameraZ);
    camera.lookAt(center);
};

const renderThumbnailFrame = (renderer: WebGPURenderer, scene: Scene, camera: PerspectiveCamera) => {
    renderer.render(scene, camera);
};

const createThumbnailFromModel = async (model: Object3D, width = 512, height = 512): Promise<string> => {
    // Setup scene
    const scene = new Scene();
    scene.name = "ModelThumbnailScene";
    scene.background = null;
    const oldParent = model.parent;
    let renderer: WebGPURenderer | undefined;
    let sparkComposite: ReturnType<typeof ensureSparkComposite> | undefined;

    try {
        scene.add(model);

        // Lighting
        const light = new AmbientLight(0xffffff, 2.0);
        scene.add(light);

        // Camera & renderer
        const camera = new PerspectiveCamera(20, 1, 0.1, 1000);
        renderer = new WebGPURenderer({antialias: true, alpha: true});
        renderer.setSize(width, height);
        await renderer.init();
        renderer.setClearColor(0x000000, 0);
        sparkComposite = ensureSparkComposite(scene, renderer);

        const isGaussianSplat = isGaussianSplatObject(model);
        const frameCount = isGaussianSplat ? THUMBNAIL_GAUSSIAN_SPLAT_WARMUP_FRAMES : 1;

        for (let frame = 0; frame < frameCount; frame++) {
            model.updateMatrixWorld(true);
            positionThumbnailCamera(model, camera);
            renderThumbnailFrame(renderer, scene, camera);

            if (isGaussianSplat && frame < frameCount - 1) {
                await waitForThumbnailFrame();
            }
        }

        return renderer.domElement.toDataURL("image/png");
    } finally {
        disposeSparkComposite(sparkComposite);
        renderer?.dispose();
        scene.remove(model);

        if (oldParent) {
            oldParent.add(model);
        }
    }
};

const uploadThumbnail = async (file: File): Promise<string> => {
    try {
        const res = await Ajax.post({
            url: backendUrlFromPath(`/api/Upload`),
            data: {
                file,
            },
            msgBodyType: "multipart",
        });
        if (res?.data.Code !== 200) {
            throw new Error(res?.data.Msg || "Failed to upload thumbnail.");
        }
        return res.data.Data.url;
    } catch (error: any) {
        console.error("Error uploading thumbnail:", error.message || error);
        throw new Error(error.message || "Failed to upload thumbnail.");
    }
};

const saveAsGLB = (model: any, callback: (result: ArrayBuffer) => void) => {
    try {
        var exporter = new GLTFExporter();
        exporter.parse(
            model.children.length > 0 ? model.children : model,
            function (result) {
                callback(result as ArrayBuffer);
            },
            error => {
                showToast({type: "error", title: "Failed to save model"});
                console.error(error);
            },
            {
                trs: true,
                binary: true,
                animations: model._obj?.animations || model.animations,
            },
        );
    } catch (error) {
        showToast({type: "error", title: "Failed to save model"});
        console.error(error);
    }
};

export const getModelStats = async (buffer: ArrayBuffer) => {
    await MeshoptDecoder.ready;
    const io = new WebIO()
        .registerExtensions([...ALL_EXTENSIONS, EARTHAnimationGraphTransformExtension])
        .registerDependencies({
            "meshopt.decoder": MeshoptDecoder,
        });
    const doc = await io.readBinary(new Uint8Array(buffer));

    let vertexCount = 0;
    let triangleCount = 0;

    for (const mesh of doc.getRoot().listMeshes()) {
        for (const prim of mesh.listPrimitives()) {
            const position = prim.getAttribute("POSITION");
            if (position) {
                vertexCount += position.getCount();
            }
            const indices = prim.getIndices();
            if (indices) {
                triangleCount += indices.getCount() / 3;
            } else {
                // Non-indexed?
                if (position) {
                    triangleCount += position.getCount() / 3;
                }
            }
        }
    }
    return {vertexCount, triangleCount};
};

interface AtlasTexturesOptions {
    /** Maximum atlas size in pixels (default 4096) */
    maxAtlasSize?: number;
    /** Padding between textures in pixels (default 2) */
    padding?: number;
}

/**
 * Extract textures from a GLB file and generate a texture atlas.
 * Returns the modified GLB with atlas applied, or the original data if atlas generation fails.
 * @param glbData - The source GLB file data as an ArrayBuffer to process for atlas generation.
 * @param options - Configuration options for texture atlas generation (e.g., max atlas size, padding).
 */
export const atlasTextures = async (
    glbData: ArrayBuffer,
    options: AtlasTexturesOptions = {},
): Promise<{glbData: ArrayBuffer; atlasBlob?: Blob; atlasConfig?: import("@stem/editor-oss/atlas/types").AtlasConfig}> => {
    const {generateAtlasFromBlobs} = await import("@stem/editor-oss/atlas/AtlasGenerator");

    await MeshoptDecoder.ready;
    const io = new WebIO()
        .registerExtensions([...ALL_EXTENSIONS, EARTHAnimationGraphTransformExtension])
        .registerDependencies({
            "meshopt.decoder": MeshoptDecoder,
        });

    const doc = await io.readBinary(new Uint8Array(glbData));
    const textures = doc.getRoot().listTextures();

    // Need at least 2 textures to make atlas worthwhile
    if (textures.length < 2) {
        console.log("atlasTextures: Not enough textures for atlas generation");
        return {glbData};
    }

    // Extract texture blobs
    const textureBlobs = new Map<string, Blob>();
    for (const texture of textures) {
        const image = texture.getImage();
        if (!image) continue;

        const name = texture.getName() || texture.getURI() || `texture_${textureBlobs.size}`;
        const mimeType = texture.getMimeType() || "image/png";
        const blob = new Blob([image], {type: mimeType});
        textureBlobs.set(name, blob);
    }

    if (textureBlobs.size < 2) {
        console.log("atlasTextures: Not enough valid textures for atlas generation");
        return {glbData};
    }

    // Generate atlas
    const atlasResult = await generateAtlasFromBlobs(textureBlobs, {
        maxAtlasSize: options.maxAtlasSize ?? 4096,
        padding: options.padding ?? 2,
    });

    if (!atlasResult) {
        console.warn("atlasTextures: Atlas generation failed");
        return {glbData};
    }

    console.log(
        `atlasTextures: Generated ${atlasResult.config.width}x${atlasResult.config.height} atlas with ${Object.keys(atlasResult.config.regions).length} regions`,
    );

    return {
        glbData,
        atlasBlob: atlasResult.atlasBlob,
        atlasConfig: atlasResult.config,
    };
};

export const ModelUtils = {
    compressModel,
    simplifyModel,
    createThumbnailFromModel,
    uploadThumbnail,
    saveAsGLB,
    getModelStats,
    atlasTextures,
};
