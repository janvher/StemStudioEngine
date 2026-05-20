import type { TerrainObjectModel } from './EndlessTerrainObjects';
import { TerrainObjectConfig } from './EndlessTerrainTypes';

export enum TerrainObjectType {
    Plant = 'plant',
    Rock = 'rock',
    Tree = 'tree',
}

export const DEFAULT_TERRAIN_VALUES = {
    maxHeight: 200,
    seed: 5600,
    grassMaxHeight: 7,
    treeDensity: 50,
    rockDensity: 50,
    rockMaxHeight: 39,
    uvScale: 0.035,
    waterEnabled: true,
    waterPercentage: 15,
} as const;

export const DEFAULT_TERRAIN_TEXTURES = {
    ditch: new URL('./assets/textures/infinite/TER_Grassy_Flowers.png', import.meta.url).href,
    normal: new URL('./assets/textures/infinite/TER_Bumpy_n.png', import.meta.url).href,
    grass: new URL('./assets/textures/infinite/TER_Grassy.png', import.meta.url).href,
    rock: new URL('./assets/textures/infinite/TER_Rock.png', import.meta.url).href,
    snow: new URL('./assets/textures/infinite/TER_SnowRocks.png', import.meta.url).href,
} as const;

// Note that changing the values or order of these models will affect backwards
// compatibility.
export const defaultTerrainModels: Readonly<TerrainObjectModel>[] = [
    {
        url: new URL('./assets/models/TER_TreeNormal.glb', import.meta.url).href,
        minScale: 1.2,
        maxScale: 1.2,
        terrainOffset: 0,
        probability: 100,
        type: TerrainObjectType.Tree,
    },
    {
        url: new URL('./assets/models/TER_TreeNormal_Sml.glb', import.meta.url).href,
        minScale: 0.96,
        maxScale: 0.96,
        terrainOffset: 0,
        probability: 100,
        type: TerrainObjectType.Tree,
    },
    {
        url: new URL('./assets/models/TER_TreeOrangeNormal.glb', import.meta.url).href,
        minScale: 1.2,
        maxScale: 1.2,
        terrainOffset: 0,
        probability: 100,
        type: TerrainObjectType.Tree,
    },
    {
        url: new URL('./assets/models/TER_TreeOrangeNormal_Sml.glb', import.meta.url).href,
        minScale: 0.96,
        maxScale: 0.96,
        terrainOffset: 0,
        probability: 100,
        type: TerrainObjectType.Tree,
    },
    {
        url: new URL('./assets/models/TER_Boulder01.glb', import.meta.url).href,
        minScale: 2.4,
        maxScale: 2.4,
        terrainOffset: 0,
        probability: 20,
        type: TerrainObjectType.Rock,
    },
    {
        url: new URL('./assets/models/TER_Boulder02.glb', import.meta.url).href,
        minScale: 2.4,
        maxScale: 2.4,
        terrainOffset: 0,
        probability: 20,
        type: TerrainObjectType.Rock,
    },
    {
        url: new URL('./assets/models/TER_TreePineSml.glb', import.meta.url).href,
        minScale: 1.32,
        maxScale: 1.32,
        terrainOffset: 1.5,
        probability: 100,
        type: TerrainObjectType.Tree,
    },
    {
        url: new URL('./assets/models/TER_TreePineMed.glb', import.meta.url).href,
        minScale: 1.32,
        maxScale: 1.32,
        terrainOffset: 1.5,
        probability: 100,
        type: TerrainObjectType.Tree,
    },
    {
        url: new URL('./assets/models/TER_TreePineTall.glb', import.meta.url).href,
        minScale: 1.32,
        maxScale: 1.32,
        terrainOffset: 1.5,
        probability: 100,
        type: TerrainObjectType.Tree,
    },
];

/**
 *
 * @param url
 */
function getFilenameFromUrl(url: string): string {
    return url.split('/').pop()?.split('?')[0] || '';
}

/**
 * Bundled terrain assets are emitted with content hashes in production builds
 * (for example `TER_TreePineTall-BdllVS2X.glb`). Strip that hash so imported
 * scenes from other builds still resolve back to the local bundled asset.
 * @param url
 */
function getStableBundledFilename(url: string): string {
    const filename = getFilenameFromUrl(url);
    return filename.replace(/-[A-Za-z0-9]{6,}(?=\.[^.]+$)/, '');
}

// Maps bundled asset filenames to their local (current-environment) URLs.
// Used to detect and replace stale URLs from other environments.
const BUNDLED_TEXTURE_BY_FILENAME = new Map<string, string>(
    Object.values(DEFAULT_TERRAIN_TEXTURES).map(url => [getStableBundledFilename(url), url]),
);

const BUNDLED_MODEL_BY_FILENAME = new Map<string, string>(
    defaultTerrainModels.map(model => [getStableBundledFilename(model.url), model.url]),
);

/**
 * Returns the local URL for a bundled default texture if the given URL
 * matches a known default texture filename, otherwise null.
 * @param url
 */
export function getLocalDefaultTextureUrl(url: string): string | null {
    return BUNDLED_TEXTURE_BY_FILENAME.get(getStableBundledFilename(url)) ?? null;
}

/**
 * Returns the local URL for a bundled default model if the given URL
 * matches a known default model filename, otherwise null.
 * @param url
 */
export function getLocalDefaultModelUrl(url: string): string | null {
    return BUNDLED_MODEL_BY_FILENAME.get(getStableBundledFilename(url)) ?? null;
}

/**
 * Extracts the model name from a URL path
 * @param url
 */
function getModelNameFromUrl(url: string): string {
    const filename = getStableBundledFilename(url);
    // Remove .glb extension and format nicely
    return filename.replace('.glb', '').replace(/_/g, ' ');
}

/**
 * Converts TerrainObjectModel (internal format with URL) to TerrainObjectConfig (user format)
 * @param model
 */
export function convertModelToConfig(model: TerrainObjectModel): TerrainObjectConfig {
    return {
        previewUrl: '', // Will be populated with generated thumbnail at runtime
        modelName: getModelNameFromUrl(model.url),
        modelUrl: model.url,
        minScale: model.minScale,
        maxScale: model.maxScale,
        terrainOffset: model.terrainOffset ?? 0,
        probability: model.probability,
        objectType: model.type,
    };
}

/**
 * Converts TerrainObjectConfig (user format) to TerrainObjectModel (internal format)
 * @param config
 */
export function convertConfigToModel(config: TerrainObjectConfig): TerrainObjectModel | null {
    // If neither modelUrl nor modelUUID is provided, return null
    if (!config.modelUrl && !config.modelUUID) {
        return null;
    }

    return {
        url: config.modelUrl || '', // URL will be empty for scene objects
        minScale: config.minScale,
        maxScale: config.maxScale,
        terrainOffset: config.terrainOffset ?? 0,
        probability: config.probability,
        type: config.objectType as TerrainObjectType,
    };
}

/**
 * Returns default terrain models in user-configurable format
 */
export function getDefaultTerrainObjectConfigs(): TerrainObjectConfig[] {
    return defaultTerrainModels.map(convertModelToConfig);
}
