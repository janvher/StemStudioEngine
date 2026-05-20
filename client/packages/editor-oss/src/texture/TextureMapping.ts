/**
 * Texture Mapping System
 *
 * Provides intelligent texture-to-model mapping with:
 * - PBR texture type detection (diffuse, normal, roughness, metallic, etc.)
 * - Multiple fallback strategies for texture resolution
 * - Support for pre-baked models, atlas systems, and loose texture overrides
 * - Name-based auto-mapping for multi-model scenarios
 *
 * Priority order:
 * 1. Explicitly selected texture overrides (highest)
 * 2. Atlas system (if atlas.json present)
 * 3. Name-matched textures in ZIP/directory
 * 4. Embedded textures in model (lowest)
 */

/** Common image extensions supported for textures */
export const TEXTURE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tga', '.tiff', '.gif'];

/** Model file extensions */
export const MODEL_EXTENSIONS = [
    '.gltf', '.glb', '.obj', '.fbx', '.ply', '.dae', '.stl',
    '.3ds', '.blend', '.usd', '.usda', '.usdc', '.usdz', '.vrm',
];

/**
 * PBR texture type enumeration
 */
export enum TextureType {
    /** Diffuse/Albedo/Color/BaseColor map */
    Diffuse = 'map',
    /** Normal map */
    Normal = 'normalMap',
    /** Roughness map */
    Roughness = 'roughnessMap',
    /** Metalness/Metallic map */
    Metalness = 'metalnessMap',
    /** Ambient occlusion map */
    AO = 'aoMap',
    /** Emissive map */
    Emissive = 'emissiveMap',
    /** Height/Displacement map */
    Displacement = 'displacementMap',
    /** Alpha/Opacity map */
    Alpha = 'alphaMap',
    /** Unknown type - treat as diffuse */
    Unknown = 'unknown',
}

/**
 * Patterns for detecting PBR texture types from filenames
 * Order matters - more specific patterns should come first
 */
const TEXTURE_TYPE_PATTERNS: Array<{ type: TextureType; patterns: RegExp[] }> = [
    {
        type: TextureType.Normal,
        patterns: [
            /[_-]?normal/i,
            /[_-]?nrm/i,
            /[_-]?norm/i,
            /[_-]?n$/i,
        ],
    },
    {
        type: TextureType.Roughness,
        patterns: [
            /[_-]?roughness/i,
            /[_-]?rough/i,
            /[_-]?rgh/i,
            /[_-]?r$/i,
        ],
    },
    {
        type: TextureType.Metalness,
        patterns: [
            /[_-]?metalness/i,
            /[_-]?metallic/i,
            /[_-]?metal/i,
            /[_-]?mtl/i,
            /[_-]?m$/i,
        ],
    },
    {
        type: TextureType.AO,
        patterns: [
            /[_-]?ambientocclusion/i,
            /[_-]?ambient[_-]?occlusion/i,
            /[_-]?occlusion/i,
            /[_-]?ao/i,
        ],
    },
    {
        type: TextureType.Emissive,
        patterns: [
            /[_-]?emissive/i,
            /[_-]?emission/i,
            /[_-]?emit/i,
            /[_-]?glow/i,
            /[_-]?e$/i,
        ],
    },
    {
        type: TextureType.Displacement,
        patterns: [
            /[_-]?displacement/i,
            /[_-]?height/i,
            /[_-]?disp/i,
            /[_-]?bump/i,
            /[_-]?h$/i,
        ],
    },
    {
        type: TextureType.Alpha,
        patterns: [
            /[_-]?alpha/i,
            /[_-]?opacity/i,
            /[_-]?transparent/i,
            /[_-]?a$/i,
        ],
    },
    {
        type: TextureType.Diffuse,
        patterns: [
            /[_-]?diffuse/i,
            /[_-]?albedo/i,
            /[_-]?basecolor/i,
            /[_-]?base[_-]?color/i,
            /[_-]?color/i,
            /[_-]?col/i,
            /[_-]?diff/i,
            /[_-]?d$/i,
            /[_-]?texture/i,
        ],
    },
];

/** Common texture suffixes for name-based matching */
export const TEXTURE_SUFFIXES = ['', '_diffuse', '_albedo', '_color', '_texture', '_base', '_basecolor', '_d', '_col'];

/**
 * Single texture reference with blob and source path
 */
export interface TextureRef {
    blob: Blob;
    path: string;
}

/**
 * PBR texture overrides for a material
 */
export interface TextureOverrides {
    map?: TextureRef;
    normalMap?: TextureRef;
    roughnessMap?: TextureRef;
    metalnessMap?: TextureRef;
    aoMap?: TextureRef;
    emissiveMap?: TextureRef;
    displacementMap?: TextureRef;
    alphaMap?: TextureRef;
}

/**
 * Complete model load context with all texture-related data
 */
export interface ModelLoadContext {
    /** Map of all files in the ZIP/selection */
    fileBlobMap: Map<string, Blob>;
    /** Root path prefix for relative path resolution */
    rootPath: string;
    /** Atlas data if atlas.json was detected */
    atlasData?: {
        config: {
            image: string;
            width: number;
            height: number;
            regions: Record<string, { x: number; y: number; width: number; height: number; name: string }>;
        };
        textureBlob: Blob;
    };
    /** Texture overrides to apply (from loose texture files) */
    textureOverrides?: TextureOverrides;
    /** For multi-model scenarios: model basename → texture overrides */
    modelTextureMap?: Map<string, TextureOverrides>;
}

/**
 * Result of texture detection in a file map
 */
export interface TextureDetectionResult {
    /** Paths to texture files found */
    texturePaths: string[];
    /** Paths to model files found */
    modelPaths: string[];
    /** Classified textures by type */
    texturesByType: Map<TextureType, TextureRef[]>;
    /** For multi-model: model basename → texture overrides */
    modelTextureMap: Map<string, TextureOverrides>;
    /** Whether there are loose textures that need mapping */
    hasLooseTextures: boolean;
}

/**
 * Check if a file path is a texture file
 * @param path
 */
export function isTextureFile(path: string): boolean {
    const lowerPath = path.toLowerCase();
    return TEXTURE_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
}

/**
 * Check if a file path is a model file
 * @param path
 */
export function isModelFile(path: string): boolean {
    const lowerPath = path.toLowerCase();
    return MODEL_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
}

/**
 * Extract the base name (without extension) from a file path
 * @param path
 */
export function getBaseName(path: string): string {
    const fileName = path.split('/').pop() || path;
    return fileName.replace(/\.[^/.]+$/, '');
}

/**
 * Extract the directory path from a file path
 * @param path
 */
export function getDirectory(path: string): string {
    const parts = path.split('/');
    return parts.slice(0, -1).join('/');
}

/**
 * Detect the PBR texture type from a filename
 * @param filename
 */
export function detectTextureType(filename: string): TextureType {
    const baseName = getBaseName(filename);

    for (const { type, patterns } of TEXTURE_TYPE_PATTERNS) {
        for (const pattern of patterns) {
            if (pattern.test(baseName)) {
                return type;
            }
        }
    }

    // Default to unknown (will be treated as diffuse if only one texture)
    return TextureType.Unknown;
}

/**
 * Strip texture type suffix from a basename to get the "core" name
 * e.g., "character_diffuse" → "character", "rock_normal" → "rock"
 * @param baseName
 */
export function stripTextureSuffix(baseName: string): string {
    // Try each pattern and remove matching suffix
    for (const { patterns } of TEXTURE_TYPE_PATTERNS) {
        for (const pattern of patterns) {
            const match = baseName.match(pattern);
            if (match && match.index !== undefined) {
                return baseName.substring(0, match.index);
            }
        }
    }
    return baseName;
}

/**
 * Detect textures and models from a fileBlobMap and compute mappings
 * @param fileBlobMap
 */
export function detectTexturesAndModels(fileBlobMap: Map<string, Blob>): TextureDetectionResult {
    const texturePaths: string[] = [];
    const modelPaths: string[] = [];
    const texturesByType = new Map<TextureType, TextureRef[]>();
    const modelTextureMap = new Map<string, TextureOverrides>();

    console.debug(`[TextureMapping] detectTexturesAndModels: Analyzing ${fileBlobMap.size} files`);

    // First pass: categorize files
    for (const [path, blob] of fileBlobMap.entries()) {
        if (isTextureFile(path)) {
            texturePaths.push(path);

            const type = detectTextureType(path);
            console.debug(`[TextureMapping] Found texture: "${path}" → type: ${type}`);
            if (!texturesByType.has(type)) {
                texturesByType.set(type, []);
            }
            texturesByType.get(type)!.push({ blob, path });
        } else if (isModelFile(path)) {
            modelPaths.push(path);
            console.debug(`[TextureMapping] Found model: "${path}"`);
        }
    }

    console.debug(`[TextureMapping] Summary: ${modelPaths.length} models, ${texturePaths.length} textures`);

    // If there are no loose textures, return early
    if (texturePaths.length === 0) {
        console.debug(`[TextureMapping] No loose textures found, returning early`);
        return {
            texturePaths,
            modelPaths,
            texturesByType,
            modelTextureMap,
            hasLooseTextures: false,
        };
    }

    // Second pass: map textures to models
    for (const modelPath of modelPaths) {
        const modelBaseName = getBaseName(modelPath).toLowerCase();
        const modelDir = getDirectory(modelPath);
        const overrides: TextureOverrides = {};

        console.debug(`[TextureMapping] Processing model: "${modelPath}" (baseName: "${modelBaseName}", dir: "${modelDir}")`);

        // For each texture, check if it belongs to this model
        for (const texturePath of texturePaths) {
            const textureBaseName = getBaseName(texturePath).toLowerCase();
            const textureDir = getDirectory(texturePath);
            const textureCoreBase = stripTextureSuffix(textureBaseName);
            const textureType = detectTextureType(texturePath);
            const blob = fileBlobMap.get(texturePath)!;

            // Check if texture matches model by naming convention
            const nameMatches =
                // Exact core name match (e.g., "rock" matches "rock_diffuse")
                textureCoreBase === modelBaseName ||
                // Texture name contains model name
                textureBaseName.includes(modelBaseName) ||
                // Model name contains texture core name
                modelBaseName.includes(textureCoreBase) ||
                // Check with common suffixes
                TEXTURE_SUFFIXES.some(suffix => textureBaseName === modelBaseName + suffix);

            // Directory matching: same directory OR texture is in a subdirectory of the model's folder
            const sameDirectory = textureDir === modelDir;
            const isInSubdirectory = modelDir ? textureDir.startsWith(modelDir + '/') : false;
            const isInSameTree = sameDirectory || isInSubdirectory;

            // For single model, accept ANY texture in the same directory tree
            // For multiple models, require name matching OR same directory
            const shouldInclude =
                nameMatches ||
                isInSameTree && modelPaths.length === 1 ||
                sameDirectory && modelPaths.length > 1;

            console.debug(`[TextureMapping] Checking texture: "${texturePath}" → ` +
                `baseName: "${textureBaseName}", dir: "${textureDir}", coreBase: "${textureCoreBase}", ` +
                `nameMatches: ${nameMatches}, sameDir: ${sameDirectory}, isSubdir: ${isInSubdirectory}, ` +
                `shouldInclude: ${shouldInclude}`);

            if (shouldInclude) {
                const ref: TextureRef = { blob, path: texturePath };

                // Map to appropriate slot based on detected type
                switch (textureType) {
                    case TextureType.Diffuse:
                    case TextureType.Unknown:
                        if (!overrides.map) {
                            overrides.map = ref;
                            console.debug(`[TextureMapping] Assigned "${texturePath}" to 'map' slot`);
                        }
                        break;
                    case TextureType.Normal:
                        if (!overrides.normalMap) {
                            overrides.normalMap = ref;
                            console.debug(`[TextureMapping] Assigned "${texturePath}" to 'normalMap' slot`);
                        }
                        break;
                    case TextureType.Roughness:
                        if (!overrides.roughnessMap) {
                            overrides.roughnessMap = ref;
                            console.debug(`[TextureMapping] Assigned "${texturePath}" to 'roughnessMap' slot`);
                        }
                        break;
                    case TextureType.Metalness:
                        if (!overrides.metalnessMap) {
                            overrides.metalnessMap = ref;
                            console.debug(`[TextureMapping] Assigned "${texturePath}" to 'metalnessMap' slot`);
                        }
                        break;
                    case TextureType.AO:
                        if (!overrides.aoMap) {
                            overrides.aoMap = ref;
                            console.debug(`[TextureMapping] Assigned "${texturePath}" to 'aoMap' slot`);
                        }
                        break;
                    case TextureType.Emissive:
                        if (!overrides.emissiveMap) {
                            overrides.emissiveMap = ref;
                            console.debug(`[TextureMapping] Assigned "${texturePath}" to 'emissiveMap' slot`);
                        }
                        break;
                    case TextureType.Displacement:
                        if (!overrides.displacementMap) {
                            overrides.displacementMap = ref;
                            console.debug(`[TextureMapping] Assigned "${texturePath}" to 'displacementMap' slot`);
                        }
                        break;
                    case TextureType.Alpha:
                        if (!overrides.alphaMap) {
                            overrides.alphaMap = ref;
                            console.debug(`[TextureMapping] Assigned "${texturePath}" to 'alphaMap' slot`);
                        }
                        break;
                }
            }
        }

        // If single model and single texture with unknown type, use as diffuse
        if (modelPaths.length === 1 && texturePaths.length === 1 && !overrides.map) {
            const texturePath = texturePaths[0]!;
            const blob = fileBlobMap.get(texturePath);
            if (blob) {
                overrides.map = { blob, path: texturePath };
                console.debug(`[TextureMapping] Single model/texture fallback: Assigned "${texturePath}" to 'map' slot`);
            }
        }

        // If we found any overrides for this model, store them
        if (Object.keys(overrides).length > 0) {
            modelTextureMap.set(modelBaseName, overrides);
            console.debug(`[TextureMapping] Model "${modelBaseName}" has overrides:`, Object.keys(overrides));
        } else {
            console.debug(`[TextureMapping] Model "${modelBaseName}" has NO overrides`);
        }
    }

    // If single model and textures exist but weren't mapped, create a global override
    if (modelPaths.length === 1 && texturePaths.length > 0 && modelTextureMap.size === 0) {
        console.debug(`[TextureMapping] Creating global override for single model with unmapped textures`);
        const overrides: TextureOverrides = {};

        for (const texturePath of texturePaths) {
            const type = detectTextureType(texturePath);
            const ref: TextureRef = { blob: fileBlobMap.get(texturePath)!, path: texturePath };

            switch (type) {
                case TextureType.Diffuse:
                case TextureType.Unknown:
                    if (!overrides.map) {
                        overrides.map = ref;
                        console.debug(`[TextureMapping] Global fallback: Assigned "${texturePath}" to 'map' slot (type: ${type})`);
                    }
                    break;
                case TextureType.Normal:
                    if (!overrides.normalMap) {
                        overrides.normalMap = ref;
                        console.debug(`[TextureMapping] Global fallback: Assigned "${texturePath}" to 'normalMap' slot`);
                    }
                    break;
                case TextureType.Roughness:
                    if (!overrides.roughnessMap) {
                        overrides.roughnessMap = ref;
                        console.debug(`[TextureMapping] Global fallback: Assigned "${texturePath}" to 'roughnessMap' slot`);
                    }
                    break;
                case TextureType.Metalness:
                    if (!overrides.metalnessMap) {
                        overrides.metalnessMap = ref;
                        console.debug(`[TextureMapping] Global fallback: Assigned "${texturePath}" to 'metalnessMap' slot`);
                    }
                    break;
                case TextureType.AO:
                    if (!overrides.aoMap) {
                        overrides.aoMap = ref;
                        console.debug(`[TextureMapping] Global fallback: Assigned "${texturePath}" to 'aoMap' slot`);
                    }
                    break;
                case TextureType.Emissive:
                    if (!overrides.emissiveMap) {
                        overrides.emissiveMap = ref;
                        console.debug(`[TextureMapping] Global fallback: Assigned "${texturePath}" to 'emissiveMap' slot`);
                    }
                    break;
                case TextureType.Displacement:
                    if (!overrides.displacementMap) {
                        overrides.displacementMap = ref;
                        console.debug(`[TextureMapping] Global fallback: Assigned "${texturePath}" to 'displacementMap' slot`);
                    }
                    break;
                case TextureType.Alpha:
                    if (!overrides.alphaMap) {
                        overrides.alphaMap = ref;
                        console.debug(`[TextureMapping] Global fallback: Assigned "${texturePath}" to 'alphaMap' slot`);
                    }
                    break;
            }
        }

        // If still no diffuse but we have unknown types, use first unknown as diffuse
        if (!overrides.map) {
            const unknowns = texturesByType.get(TextureType.Unknown);
            if (unknowns && unknowns.length > 0) {
                overrides.map = unknowns[0];
                console.debug(`[TextureMapping] Global fallback: Using first unknown texture "${unknowns[0]!.path}" as 'map'`);
            }
        }

        const modelBaseName = getBaseName(modelPaths[0]!).toLowerCase();
        modelTextureMap.set(modelBaseName, overrides);
        console.debug(`[TextureMapping] Global override complete for "${modelBaseName}":`, Object.keys(overrides));
    }

    console.debug(`[TextureMapping] detectTexturesAndModels complete: ${modelTextureMap.size} models with overrides`);

    return {
        texturePaths,
        modelPaths,
        texturesByType,
        modelTextureMap,
        hasLooseTextures: texturePaths.length > 0,
    };
}

/**
 * Find a texture in the fileBlobMap using multiple fallback strategies
 *
 * @param requestedPath - The path that the model is requesting
 * @param fileBlobMap - Map of all available files
 * @param rootPath - Root path prefix for the model
 * @param modelBaseName - Base name of the model (for name-based matching)
 * @returns The texture ref if found, or null
 */
export function findTexture(
    requestedPath: string,
    fileBlobMap: Map<string, Blob>,
    rootPath: string = '',
    modelBaseName?: string,
): TextureRef | null {
    console.debug(`[TextureMapping] findTexture called: requestedPath="${requestedPath}", rootPath="${rootPath}", modelBaseName="${modelBaseName}"`);
    console.debug(`[TextureMapping] Available files in fileBlobMap:`, Array.from(fileBlobMap.keys()));

    // Strategy 1: Exact path match
    if (fileBlobMap.has(requestedPath)) {
        console.debug(`[TextureMapping] Strategy 1 SUCCESS: Exact path match for "${requestedPath}"`);
        return { blob: fileBlobMap.get(requestedPath)!, path: requestedPath };
    }
    console.debug(`[TextureMapping] Strategy 1 FAILED: No exact match for "${requestedPath}"`);

    // Strategy 2: With rootPath prefix
    if (rootPath) {
        const withRoot = rootPath.endsWith('/')
            ? `${rootPath}${requestedPath}`
            : `${rootPath}/${requestedPath}`;
        console.debug(`[TextureMapping] Strategy 2: Trying with root path: "${withRoot}"`);
        if (fileBlobMap.has(withRoot)) {
            console.debug(`[TextureMapping] Strategy 2 SUCCESS: Found with root path "${withRoot}"`);
            return { blob: fileBlobMap.get(withRoot)!, path: withRoot };
        }
        console.debug(`[TextureMapping] Strategy 2 FAILED: No match for "${withRoot}"`);
    }

    // Strategy 3: Just the filename
    const fileName = requestedPath.split('/').pop() || requestedPath;
    console.debug(`[TextureMapping] Strategy 3: Trying just filename: "${fileName}"`);
    if (fileBlobMap.has(fileName)) {
        console.debug(`[TextureMapping] Strategy 3 SUCCESS: Found by filename "${fileName}"`);
        return { blob: fileBlobMap.get(fileName)!, path: fileName };
    }
    console.debug(`[TextureMapping] Strategy 3 FAILED: No match for filename "${fileName}"`);

    // Strategy 4: Case-insensitive search for exact filename
    const fileNameLower = fileName.toLowerCase();
    console.debug(`[TextureMapping] Strategy 4: Case-insensitive search for "${fileNameLower}"`);
    for (const [path, blob] of fileBlobMap.entries()) {
        const pathFileName = path.split('/').pop()?.toLowerCase() || '';
        if (pathFileName === fileNameLower) {
            console.debug(`[TextureMapping] Strategy 4 SUCCESS: Case-insensitive match "${path}"`);
            return { blob, path };
        }
    }
    console.debug(`[TextureMapping] Strategy 4 FAILED: No case-insensitive match`);

    // Strategy 5: If we have model base name, try name-based matching
    if (modelBaseName) {
        const modelNameLower = modelBaseName.toLowerCase();
        console.debug(`[TextureMapping] Strategy 5: Name-based matching with model "${modelNameLower}"`);

        for (const suffix of TEXTURE_SUFFIXES) {
            for (const ext of TEXTURE_EXTENSIONS) {
                const expectedName = (modelNameLower + suffix + ext).toLowerCase();

                for (const [path, blob] of fileBlobMap.entries()) {
                    if (!isTextureFile(path)) continue;
                    const pathFileName = path.split('/').pop()?.toLowerCase() || '';
                    if (pathFileName === expectedName) {
                        console.debug(`[TextureMapping] Strategy 5 SUCCESS: Found "${path}" matching expected "${expectedName}"`);
                        return { blob, path };
                    }
                }
            }
        }
        console.debug(`[TextureMapping] Strategy 5 FAILED: No name-based match found`);
    }

    // Strategy 6: Any texture with similar name (contains the base name)
    const requestedBaseName = getBaseName(requestedPath).toLowerCase();
    console.debug(`[TextureMapping] Strategy 6: Partial name match for base "${requestedBaseName}"`);
    if (requestedBaseName) {
        for (const [path, blob] of fileBlobMap.entries()) {
            if (!isTextureFile(path)) continue;
            const pathBaseName = getBaseName(path).toLowerCase();
            if (pathBaseName.includes(requestedBaseName) || requestedBaseName.includes(pathBaseName)) {
                console.debug(`[TextureMapping] Strategy 6 SUCCESS: Partial match "${path}" (pathBase: "${pathBaseName}")`);
                return { blob, path };
            }
        }
    }
    console.debug(`[TextureMapping] Strategy 6 FAILED: No partial name match`);

    // Strategy 7: If only one texture file exists AND the request looks like a texture, use it as fallback
    // Guard: only apply when the requested path itself has a texture extension to avoid
    // accidentally returning a texture for non-texture requests (e.g., the main model URL).
    if (isTextureFile(requestedPath)) {
        const textureFiles = Array.from(fileBlobMap.entries()).filter(([path]) => isTextureFile(path));
        if (textureFiles.length === 1) {
            const entry = textureFiles[0]!;
            return { blob: entry[1], path: entry[0] };
        }
    }

    console.debug(`[TextureMapping] findTexture: ALL STRATEGIES FAILED for "${requestedPath}"`);
    return null;
}

/**
 * Build texture overrides from detected textures for a specific model
 * @param modelBaseName
 * @param detection
 */
export function getTextureOverridesForModel(
    modelBaseName: string,
    detection: TextureDetectionResult,
): TextureOverrides | undefined {
    console.debug(`[TextureMapping] getTextureOverridesForModel: Looking for model "${modelBaseName}"`);
    console.debug(`[TextureMapping] Available models in detection:`, Array.from(detection.modelTextureMap.keys()));

    // Check model-specific map first
    const modelKey = modelBaseName.toLowerCase();
    if (detection.modelTextureMap.has(modelKey)) {
        const overrides = detection.modelTextureMap.get(modelKey);
        console.debug(`[TextureMapping] Found exact match for "${modelKey}":`, overrides ? Object.keys(overrides) : 'none');
        return overrides;
    }

    // If only one model, return the first (and only) entry
    if (detection.modelTextureMap.size === 1) {
        const overrides = detection.modelTextureMap.values().next().value;
        console.debug(`[TextureMapping] Single model in map, using it for "${modelBaseName}":`, overrides ? Object.keys(overrides) : 'none');
        return overrides;
    }

    console.debug(`[TextureMapping] No overrides found for "${modelBaseName}"`);
    return undefined;
}

/**
 * Check if there are any loose texture files that might be intended for texture override
 * @param fileBlobMap
 */
export function hasLooseTextures(fileBlobMap: Map<string, Blob>): boolean {
    let hasTextures = false;
    let hasModels = false;

    for (const path of fileBlobMap.keys()) {
        if (isTextureFile(path)) hasTextures = true;
        if (isModelFile(path)) hasModels = true;
        if (hasTextures && hasModels) return true;
    }

    return false;
}

/**
 * Get all texture files from the fileBlobMap
 * @param fileBlobMap
 */
export function getAllTextures(fileBlobMap: Map<string, Blob>): Map<string, Blob> {
    const textures = new Map<string, Blob>();
    for (const [path, blob] of fileBlobMap.entries()) {
        if (isTextureFile(path)) {
            textures.set(path, blob);
        }
    }
    return textures;
}
