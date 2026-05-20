import { BufferAttribute, BufferGeometry, Mesh, Object3D } from 'three';

import { AtlasConfig, AtlasRegion } from './types';

/**
 * UV transform parameters for mapping to atlas region
 */
export interface UVTransform {
    offsetX: number;
    offsetY: number;
    scaleX: number;
    scaleY: number;
}

/**
 * Calculate UV transform for a region within an atlas
 * UV coordinates are remapped from [0,1] to the region's position in the atlas
 * @param region
 * @param atlasWidth
 * @param atlasHeight
 */
export function calculateUVTransform(
    region: AtlasRegion,
    atlasWidth: number,
    atlasHeight: number,
): UVTransform {
    return {
        offsetX: region.x / atlasWidth,
        // Flip Y axis: UV origin is bottom-left, but atlas origin is top-left
        offsetY: 1 - (region.y + region.height) / atlasHeight,
        scaleX: region.width / atlasWidth,
        scaleY: region.height / atlasHeight,
    };
}

/**
 * Remap UVs of a geometry to use atlas region
 * Modifies the geometry's UV attribute in place
 * @param geometry
 * @param region
 * @param atlasWidth
 * @param atlasHeight
 */
export function remapGeometryUVs(
    geometry: BufferGeometry,
    region: AtlasRegion,
    atlasWidth: number,
    atlasHeight: number,
): void {
    const uvAttr = geometry.getAttribute('uv') as BufferAttribute | undefined;
    if (!uvAttr) {
        console.warn('UVRemapper: Geometry has no UV attribute');
        return;
    }

    const transform = calculateUVTransform(region, atlasWidth, atlasHeight);
    const uvArray = uvAttr.array;

    // Create a new Float32Array if the original is not writable
    const isWritable = uvArray instanceof Float32Array;
    const newArray = isWritable ? uvArray : new Float32Array(uvArray);

    for (let i = 0; i < newArray.length; i += 2) {
        // Scale and offset UVs to map to the atlas region
        const u = newArray[i]!;
        const v = newArray[i + 1]!;
        newArray[i] = u * transform.scaleX + transform.offsetX;
        newArray[i + 1] = v * transform.scaleY + transform.offsetY;
    }

    if (!isWritable) {
        geometry.setAttribute('uv', new BufferAttribute(newArray, 2));
    }

    uvAttr.needsUpdate = true;
}

/**
 * Find the atlas region for a given name using various matching strategies
 * @param name
 * @param regions
 */
export function findRegionByName(
    name: string,
    regions: Record<string, AtlasRegion>,
): AtlasRegion | null {
    // Exact match first
    if (regions[name]) {
        return regions[name];
    }

    // Try case-insensitive match
    const nameLower = name.toLowerCase();
    for (const [key, region] of Object.entries(regions)) {
        if (key.toLowerCase() === nameLower) {
            return region;
        }
    }

    // Try matching without file extension
    const nameWithoutExt = name.replace(/\.[^/.]+$/, '');
    if (regions[nameWithoutExt]) {
        return regions[nameWithoutExt];
    }

    // Case-insensitive without extension
    const nameWithoutExtLower = nameWithoutExt.toLowerCase();
    for (const [key, region] of Object.entries(regions)) {
        const keyWithoutExt = key.replace(/\.[^/.]+$/, '').toLowerCase();
        if (keyWithoutExt === nameWithoutExtLower) {
            return region;
        }
    }

    return null;
}

/**
 * Apply atlas UV remapping to an Object3D tree
 * Uses mesh names or material names to match regions
 * @param object
 * @param atlasConfig
 * @param materialToRegionMap
 */
export function applyAtlasToObject(
    object: Object3D,
    atlasConfig: AtlasConfig,
    materialToRegionMap?: Map<string, string>,
): void {
    object.traverse((child) => {
        if (!(child instanceof Mesh)) return;

        const mesh = child as Mesh;

        // Determine region name from mapping or mesh/material name
        let regionName: string | undefined;

        if (materialToRegionMap) {
            const materialName = Array.isArray(mesh.material)
                ? mesh.material[0]?.name
                : mesh.material?.name;
            regionName = materialToRegionMap.get(materialName || '') ||
                         materialToRegionMap.get(mesh.name);
        }

        // Fall back to mesh name or material name
        if (!regionName) {
            const materialName = Array.isArray(mesh.material)
                ? mesh.material[0]?.name
                : mesh.material?.name;
            regionName = mesh.name || materialName;
        }

        if (!regionName) return;

        const region = findRegionByName(regionName, atlasConfig.regions);
        if (!region) return;

        remapGeometryUVs(
            mesh.geometry,
            region,
            atlasConfig.width,
            atlasConfig.height,
        );
    });
}
