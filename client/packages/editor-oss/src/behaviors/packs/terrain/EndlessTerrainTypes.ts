import { AssetRef } from '@stem/editor-oss/asset-management/AssetRef';

export type HeightFn = (x: number, z: number) => number;

/** Configuration for a terrain object from behavior attributes */
export interface TerrainObjectConfig {
    /** Thumbnail preview URL */
    previewUrl?: string;
    /** Display name for bundled models (read-only in UI) */
    modelName?: string;
    /** Scene object UUID (for user-added models) - deprecated, use modelAsset */
    modelUUID?: string;
    /** Asset reference for custom models from asset library */
    modelAsset?: AssetRef | null;
    /** GLB URL (for default models) */
    modelUrl?: string;
    /** Minimum random scale */
    minScale: number;
    /** Maximum random scale */
    maxScale: number;
    /** Downward offset in world units (meters) applied to the object's base. */
    terrainOffset?: number;
    /** Probability weight (0-100) */
    probability: number;
    /** Object type determines physics behavior */
    objectType: 'plant' | 'rock' | 'tree';
}
