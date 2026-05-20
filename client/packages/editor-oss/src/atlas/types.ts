/**
 * Atlas region definition - matches common atlas JSON formats
 * (TexturePacker, ShoeBox, custom exporters)
 */
export interface AtlasRegion {
    /** Region name/identifier */
    name: string;
    /** X offset in pixels from atlas origin */
    x: number;
    /** Y offset in pixels from atlas origin */
    y: number;
    /** Width in pixels */
    width: number;
    /** Height in pixels */
    height: number;
    /** Original texture width (for UV calculation) */
    originalWidth?: number;
    /** Original texture height (for UV calculation) */
    originalHeight?: number;
}

/**
 * Atlas configuration loaded from JSON
 */
export interface AtlasConfig {
    /** Atlas image filename (relative to JSON) */
    image: string;
    /** Atlas width in pixels */
    width: number;
    /** Atlas height in pixels */
    height: number;
    /** Named regions in the atlas */
    regions: Record<string, AtlasRegion>;
    /** Format version for future compatibility */
    version?: string;
}

/**
 * Parsed atlas data with loaded texture blob
 */
export interface LoadedAtlas {
    config: AtlasConfig;
    textureBlob: Blob;
}
