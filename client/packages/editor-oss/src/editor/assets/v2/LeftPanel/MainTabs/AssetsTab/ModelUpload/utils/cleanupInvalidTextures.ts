import * as THREE from 'three';
import { Object3D } from 'three';

// Import the default texture - Vite will handle the path correctly
// eslint-disable-next-line import/no-unresolved
import defaultTexturePath from '/assets/textures/default-placeholder.png';

// Debug: verify module loads
console.log('[cleanupInvalidTextures.ts] MODULE LOADED v9 AT', new Date().toISOString());
console.log('[cleanupInvalidTextures.ts] Default texture path:', defaultTexturePath);

// Cached default texture instance
let cachedDefaultTexture: THREE.Texture | null = null;
let textureLoadPromise: Promise<THREE.Texture> | null = null;

/**
 * Loads and caches the default placeholder texture.
 */
const ensureDefaultTextureLoaded = (): Promise<THREE.Texture> => {
    if (cachedDefaultTexture) {
        return Promise.resolve(cachedDefaultTexture);
    }

    if (textureLoadPromise) {
        return textureLoadPromise;
    }

    console.log('[cleanupInvalidTextures] Loading default texture from:', defaultTexturePath);

    textureLoadPromise = new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(
            defaultTexturePath,
            (texture) => {
                console.log('[cleanupInvalidTextures] Default texture loaded successfully!');
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.needsUpdate = true;
                cachedDefaultTexture = texture;
                resolve(texture);
            },
            undefined,
            (error) => {
                console.error('[cleanupInvalidTextures] Failed to load default texture:', error);
                reject(error);
            },
        );
    });

    return textureLoadPromise;
};

/**
 * Analyzes UV coordinates of a mesh to get the UV range.
 * Returns { uRange, vRange } representing how far UVs extend beyond 0-1.
 * @param mesh
 */
const analyzeUVRange = (mesh: THREE.Mesh): { uRange: number; vRange: number } => {
    const geometry = mesh.geometry;
    const uvAttr = geometry?.getAttribute('uv');

    if (!uvAttr) {
        console.log('[cleanupInvalidTextures] No UV attribute found, using default range');
        return { uRange: 1, vRange: 1 };
    }

    let minU = Infinity, maxU = -Infinity;
    let minV = Infinity, maxV = -Infinity;

    for (let i = 0; i < uvAttr.count; i++) {
        const u = uvAttr.getX(i);
        const v = uvAttr.getY(i);
        minU = Math.min(minU, u);
        maxU = Math.max(maxU, u);
        minV = Math.min(minV, v);
        maxV = Math.max(maxV, v);
    }

    const uRange = maxU - minU;
    const vRange = maxV - minV;

    console.log(`[cleanupInvalidTextures] UV analysis: U range [${minU.toFixed(2)}, ${maxU.toFixed(2)}] = ${uRange.toFixed(2)}, V range [${minV.toFixed(2)}, ${maxV.toFixed(2)}] = ${vRange.toFixed(2)}`);

    return { uRange: Math.max(uRange, 0.001), vRange: Math.max(vRange, 0.001) };
};

/**
 * Creates a clone of the default texture with repeat settings based on UV coordinates.
 * This ensures the texture tiles properly regardless of the mesh's UV layout.
 * @param mesh
 */
const createTextureForMesh = (mesh: THREE.Mesh): THREE.Texture | null => {
    if (!cachedDefaultTexture) return null;

    const texture = cachedDefaultTexture.clone();
    texture.needsUpdate = true;

    // Analyze actual UV coordinates to determine proper repeat values
    const { uRange, vRange } = analyzeUVRange(mesh);

    // Calculate aspect ratio of UVs to prevent stretching
    // We want the texture to tile with equal size in both directions
    const uvAspect = uRange / vRange;

    // Base number of tiles we want (adjustable for tile density)
    const baseTiles = 4;

    let repeatX: number;
    let repeatY: number;

    if (uvAspect > 1) {
        // UVs are wider than tall - need more X repeats
        repeatX = Math.max(1, Math.round(baseTiles * uvAspect));
        repeatY = baseTiles;
    } else {
        // UVs are taller than wide - need more Y repeats
        repeatX = baseTiles;
        repeatY = Math.max(1, Math.round(baseTiles / uvAspect));
    }

    texture.repeat.set(repeatX, repeatY);
    console.log(`[cleanupInvalidTextures] Texture repeat set to (${repeatX}, ${repeatY}) based on UV aspect ${uvAspect.toFixed(2)}`);

    return texture;
};

/**
 * Detects whether a model has any invalid/missing textures without modifying it.
 * Returns true if any material has a texture slot with missing or failed-to-load image data.
 * @param model
 */
export const detectMissingTextures = (model: Object3D): boolean => {
    const textureSlots = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'bumpMap', 'displacementMap', 'alphaMap', 'specularMap'];
    let hasMissing = false;

    model.traverse((child) => {
        if (hasMissing) return;
        if (!(child instanceof THREE.Mesh) || !child.material) return;

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of materials) {
            // Check for texture slots with broken/failed image data
            for (const slot of textureSlots) {
                const tex = mat[slot];
                if (!tex || tex.isCompressedTexture) continue;

                if (!tex.image) {
                    hasMissing = true;
                    return;
                }

                const img = tex.image;
                if (img instanceof HTMLImageElement && (img.naturalWidth === 0 || img.naturalHeight === 0)) {
                    hasMissing = true;
                    return;
                }
                if (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap && (img.width === 0 || img.height === 0)) {
                    hasMissing = true;
                    return;
                }
                if (img.width !== undefined && img.height !== undefined && (img.width === 0 || img.height === 0)) {
                    hasMissing = true;
                    return;
                }
            }

            // Also detect meshes with UV coordinates but no diffuse map —
            // a strong signal that textures were expected but not provided
            // (e.g. standalone FBX/OBJ imported without accompanying texture files).
            if (!mat.map && child.geometry) {
                const uvAttr = child.geometry.getAttribute('uv');
                if (uvAttr && uvAttr.count > 0) {
                    hasMissing = true;
                    return;
                }
            }
        }
    });

    return hasMissing;
};

/**
 * Cleans up invalid textures from a model.
 * FBX files often reference external textures that fail to load,
 * causing rendering issues and GLTFExporter crashes.
 *
 * Invalid diffuse/color map textures are replaced with a default
 * placeholder texture. Other texture types are removed.
 *
 * @param model
 * @returns Promise resolving to true if any invalid textures were found and handled
 */
export const cleanupInvalidTextures = async (model: Object3D): Promise<boolean> => {
    console.log('[cleanupInvalidTextures] Processing model:', model.name || model.uuid);

    // Ensure the default texture is loaded before processing
    try {
        await ensureDefaultTextureLoaded();
        console.log('[cleanupInvalidTextures] Default texture is ready');
    } catch (error) {
        console.error('[cleanupInvalidTextures] Could not load default texture:', error);
    }

    let foundInvalidTexture = false;

    // Only replace diffuse/color maps with default texture, remove other types
    const replaceableSlots = ['map'];
    const removableSlots = ['normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'bumpMap', 'displacementMap', 'alphaMap', 'envMap', 'lightMap', 'specularMap'];

    model.traverse((child) => {
        if (!(child instanceof THREE.Mesh) || !child.material) {
            return;
        }

        const materials = Array.isArray(child.material) ? child.material : [child.material];

        materials.forEach((mat) => {
            [...replaceableSlots, ...removableSlots].forEach((slot) => {
                const tex = mat[slot];
                if (!tex) return;

                let isValid = true;
                let reason = '';

                if (tex.isCompressedTexture) {
                    isValid = true;
                } else if (!tex.image) {
                    isValid = false;
                    reason = 'no image data';
                } else {
                    const img = tex.image;

                    // Check for HTMLImageElement with failed load
                    if (img instanceof HTMLImageElement) {
                        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                            isValid = false;
                            reason = `HTMLImageElement failed to load (naturalWidth=${img.naturalWidth}, naturalHeight=${img.naturalHeight}, src=${img.src?.substring(0, 50)})`;
                        }
                    }
                    // Check for ImageBitmap
                    else if (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap) {
                        if (img.width === 0 || img.height === 0) {
                            isValid = false;
                            reason = 'ImageBitmap has zero dimensions';
                        }
                    }
                    // Check for canvas or other image sources
                    else if (img.width !== undefined && img.height !== undefined) {
                        if (img.width === 0 || img.height === 0) {
                            isValid = false;
                            reason = 'image has zero dimensions';
                        }
                    }
                    // Check for data textures
                    else if (!img.data || img.data.length === 0) {
                        // If it's not a standard image type and has no data, it's invalid
                        if (img.width === undefined && img.height === undefined) {
                            isValid = false;
                            reason = 'unknown image type with no data';
                        }
                    }
                }

                if (!isValid) {
                    console.warn(`[cleanupInvalidTextures] Found invalid texture in "${slot}": ${reason}`);

                    if (replaceableSlots.includes(slot)) {
                        // Replace diffuse map with default placeholder texture
                        const defaultTex = createTextureForMesh(child);
                        if (defaultTex) {
                            mat[slot] = defaultTex;
                            console.log(`[cleanupInvalidTextures] ✅ Applied default texture to "${slot}"`);
                        } else {
                            mat[slot] = null;
                            console.warn(`[cleanupInvalidTextures] Default texture not available, removed "${slot}"`);
                        }
                    } else {
                        // Remove other texture types (normal, roughness, etc.)
                        mat[slot] = null;
                    }

                    // Mark material as needing update for the changes to take effect
                    mat.needsUpdate = true;
                    foundInvalidTexture = true;
                }
            });
        });
    });

    if (foundInvalidTexture) {
        console.log('[cleanupInvalidTextures] Invalid textures were found and handled');
    } else {
        console.log('[cleanupInvalidTextures] All textures are valid');
    }

    return foundInvalidTexture;
};
