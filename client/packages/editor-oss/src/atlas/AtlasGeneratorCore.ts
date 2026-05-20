import {AtlasConfig, AtlasRegion} from "./types";

export interface AtlasGenerationOptions {
    maxAtlasSize?: number;
    padding?: number;
}

export interface TextureInfo {
    name: string;
    width: number;
    height: number;
    imageData: ImageBitmap | HTMLImageElement;
}

export interface AtlasGenerationResult {
    atlasBlob: Blob;
    config: AtlasConfig;
}

interface PackedRegion extends AtlasRegion {
    textureIndex: number;
}

/**
 *
 * @param textures
 * @param maxSize
 * @param padding
 */
function packTextures(
    textures: {name: string; width: number; height: number}[],
    maxSize: number,
    padding: number,
): {regions: PackedRegion[]; atlasWidth: number; atlasHeight: number} | null {
    const sorted = textures
        .map((tex, index) => ({...tex, originalIndex: index}))
        .sort((a, b) => b.height - a.height);

    const regions: PackedRegion[] = [];
    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;
    let atlasWidth = 0;
    let atlasHeight = 0;

    for (const tex of sorted) {
        const texWidth = tex.width + padding;
        const texHeight = tex.height + padding;

        if (currentX + texWidth > maxSize) {
            currentX = 0;
            currentY += rowHeight;
            rowHeight = 0;
        }

        if (currentY + texHeight > maxSize) {
            console.warn(`AtlasGenerator: Texture "${tex.name}" doesn't fit in atlas (${maxSize}x${maxSize})`);
            return null;
        }

        regions.push({
            name: tex.name,
            x: currentX,
            y: currentY,
            width: tex.width,
            height: tex.height,
            originalWidth: tex.width,
            originalHeight: tex.height,
            textureIndex: tex.originalIndex,
        });

        currentX += texWidth;
        rowHeight = Math.max(rowHeight, texHeight);
        atlasWidth = Math.max(atlasWidth, currentX);
        atlasHeight = Math.max(atlasHeight, currentY + rowHeight);
    }

    atlasWidth = nextPowerOf2(atlasWidth);
    atlasHeight = nextPowerOf2(atlasHeight);
    atlasWidth = Math.min(atlasWidth, maxSize);
    atlasHeight = Math.min(atlasHeight, maxSize);

    return {regions, atlasWidth, atlasHeight};
}

/**
 *
 * @param n
 */
function nextPowerOf2(n: number): number {
    return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 *
 * @param textures
 * @param options
 */
export async function generateAtlas(
    textures: TextureInfo[],
    options: AtlasGenerationOptions = {},
): Promise<AtlasGenerationResult | null> {
    const maxSize = options.maxAtlasSize ?? 4096;
    const padding = options.padding ?? 2;

    if (textures.length === 0) {
        console.warn("AtlasGenerator: No textures provided");
        return null;
    }

    if (textures.length === 1) {
        console.warn("AtlasGenerator: Only one texture provided, atlas generation not needed");
        return null;
    }

    const textureInfos = textures.map(tex => ({
        name: tex.name,
        width: tex.width,
        height: tex.height,
    }));

    const packResult = packTextures(textureInfos, maxSize, padding);
    if (!packResult) {
        return null;
    }

    const {regions, atlasWidth, atlasHeight} = packResult;
    const canvas = new OffscreenCanvas(atlasWidth, atlasHeight);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        console.error("AtlasGenerator: Failed to get 2D context");
        return null;
    }

    ctx.clearRect(0, 0, atlasWidth, atlasHeight);

    for (const region of regions) {
        const texture = textures[region.textureIndex];
        if (!texture?.imageData) {
            continue;
        }

        ctx.drawImage(texture.imageData, region.x, region.y, region.width, region.height);
    }

    const atlasBlob = await canvas.convertToBlob({type: "image/png"});
    const config: AtlasConfig = {
        image: "atlas.png",
        width: atlasWidth,
        height: atlasHeight,
        regions: Object.fromEntries(
            regions.map(region => [
                region.name,
                {
                    name: region.name,
                    x: region.x,
                    y: region.y,
                    width: region.width,
                    height: region.height,
                    originalWidth: region.originalWidth,
                    originalHeight: region.originalHeight,
                },
            ]),
        ),
        version: "1.0",
    };

    return {atlasBlob, config};
}

/**
 *
 * @param blob
 */
export async function loadImageFromBlob(blob: Blob): Promise<ImageBitmap> {
    return createImageBitmap(blob);
}

/**
 *
 * @param textureBlobs
 * @param options
 */
export async function generateAtlasFromBlobs(
    textureBlobs: Map<string, Blob>,
    options: AtlasGenerationOptions = {},
): Promise<AtlasGenerationResult | null> {
    const textures: TextureInfo[] = [];

    for (const [name, blob] of textureBlobs) {
        try {
            const imageData = await loadImageFromBlob(blob);
            textures.push({
                name,
                width: imageData.width,
                height: imageData.height,
                imageData,
            });
        } catch (error) {
            console.warn(`AtlasGenerator: Failed to load texture "${name}"`, error);
        }
    }

    return generateAtlas(textures, options);
}
