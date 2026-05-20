import { AtlasConfig, LoadedAtlas } from './types';

/**
 * Common atlas JSON filename patterns
 */
const ATLAS_JSON_PATTERNS = [
    /^atlas\.json$/i,
    /.*_atlas\.json$/i,
    /.*\.atlas\.json$/i,
    /texture[_-]?atlas\.json$/i,
];

/**
 * Detect if a filename is an atlas JSON file
 * @param filename
 */
export function isAtlasJsonFile(filename: string): boolean {
    const basename = filename.split('/').pop() || filename;
    return ATLAS_JSON_PATTERNS.some(pattern => pattern.test(basename));
}

/**
 * Find atlas JSON files in a fileBlobMap
 * @param fileBlobMap
 */
export function findAtlasFiles(fileBlobMap: Map<string, Blob>): string[] {
    const atlasFiles: string[] = [];
    for (const [path] of fileBlobMap) {
        if (isAtlasJsonFile(path)) {
            atlasFiles.push(path);
        }
    }
    return atlasFiles;
}

/**
 * Read blob content as text, supporting various environments
 * @param blob
 */
async function readBlobAsText(blob: Blob): Promise<string> {
    // Try native Blob.text() first (fastest in browsers)
    if (typeof blob.text === 'function') {
        try {
            return await blob.text();
        } catch {
            // Fall through to FileReader
        }
    }

    // Use FileReader as fallback (works in jsdom and older browsers)
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(blob);
    });
}

/**
 * Parse atlas JSON and validate structure
 * Supports multiple formats: custom, TexturePacker-style (frames)
 * @param blob
 */
export async function parseAtlasJson(blob: Blob): Promise<AtlasConfig | null> {
    try {
        const text = await readBlobAsText(blob);

        if (!text || text.length === 0) {
            console.warn('AtlasDetector: Empty blob content');
            return null;
        }

        const json = JSON.parse(text);

        // Validate required fields
        if (!json.image || !json.width || !json.height) {
            console.warn('AtlasDetector: Invalid atlas JSON - missing required fields (image, width, height)');
            return null;
        }

        // Handle both "regions" and "frames" (TexturePacker format)
        const rawRegions = json.regions || json.frames || {};
        const regions: Record<string, AtlasConfig['regions'][string]> = {};

        for (const [key, value] of Object.entries(rawRegions)) {
            const region = value as Record<string, unknown>;
            // Support both flat format and TexturePacker's nested frame format
            const frame = (region.frame as Record<string, number>) || region;

            regions[key] = {
                name: key,
                x: (frame.x as number) ?? 0,
                y: (frame.y as number) ?? 0,
                width: (frame.w as number) ?? (frame.width as number) ?? 0,
                height: (frame.h as number) ?? (frame.height as number) ?? 0,
                originalWidth: (region.sourceSize as Record<string, number>)?.w ?? (frame.width),
                originalHeight: (region.sourceSize as Record<string, number>)?.h ?? (frame.height),
            };
        }

        return {
            image: json.image,
            width: json.width,
            height: json.height,
            regions,
            version: json.version,
        };
    } catch (error) {
        console.warn('AtlasDetector: Failed to parse atlas JSON', error);
        return null;
    }
}

/**
 * Load atlas from fileBlobMap
 * @param atlasJsonPath
 * @param fileBlobMap
 * @param rootPath
 */
export async function loadAtlas(
    atlasJsonPath: string,
    fileBlobMap: Map<string, Blob>,
    rootPath: string,
): Promise<LoadedAtlas | null> {
    const jsonBlob = fileBlobMap.get(atlasJsonPath);
    if (!jsonBlob) {
        console.warn(`AtlasDetector: Atlas JSON not found at ${atlasJsonPath}`);
        return null;
    }

    const config = await parseAtlasJson(jsonBlob);
    if (!config) return null;

    // Resolve texture path relative to atlas JSON location
    const atlasDir = atlasJsonPath.split('/').slice(0, -1).join('/');
    const texturePath = atlasDir ? `${atlasDir}/${config.image}` : config.image;

    // Try exact path first
    let textureBlob = fileBlobMap.get(texturePath);

    // Try with rootPath prefix
    if (!textureBlob && rootPath) {
        const rootPrefixedPath = `${rootPath}/${config.image}`;
        textureBlob = fileBlobMap.get(rootPrefixedPath);
    }

    // Try just the filename
    if (!textureBlob) {
        textureBlob = fileBlobMap.get(config.image);
    }

    // Case-insensitive search as fallback
    if (!textureBlob) {
        const imageNameLower = config.image.toLowerCase();
        for (const [path, blob] of fileBlobMap.entries()) {
            if (path.toLowerCase().endsWith(imageNameLower)) {
                textureBlob = blob;
                break;
            }
        }
    }

    if (!textureBlob) {
        console.warn(`AtlasDetector: Atlas texture not found: ${config.image}`);
        return null;
    }

    return { config, textureBlob };
}
