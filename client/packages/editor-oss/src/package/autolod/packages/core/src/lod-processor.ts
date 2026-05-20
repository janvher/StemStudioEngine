import * as THREE from "three";
import {GLTFExporter} from "three/examples/jsm/exporters/GLTFExporter.js";
import {MeshoptDecoder} from "three/examples/jsm/libs/meshopt_decoder.module.js";
import {DRACOLoader} from "three/examples/jsm/loaders/DRACOLoader.js";
import {FBXLoader} from "three/examples/jsm/loaders/FBXLoader.js";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js";
import {KTX2Loader} from "three/examples/jsm/loaders/KTX2Loader.js";

import {EdgeCollapseSimplifier} from "./simplification/edge-collapse";
import {MeshoptSimplifierWrapper} from "./simplification/meshopt-simplifier";
import {SimpleDecimator} from "./simplification/simple-decimator";
import {ThreeJSSimplifier} from "./simplification/threejs-simplifier";
import {TextureOptimizer} from "./texture-optimizer";
import type {LODConfiguration, LODLevel, LODResult, ModelData, ProcessingOptions} from "./types";


export class LODProcessor {
    private gltfLoader: GLTFLoader;
    private fbxLoader: FBXLoader;
    private dracoLoader: DRACOLoader;
    private exporter: GLTFExporter;
    private textureOptimizer: TextureOptimizer;

    constructor(renderer: THREE.WebGLRenderer) {
        this.gltfLoader = new GLTFLoader();
        const ktx2Loader = new KTX2Loader().setTranscoderPath("/assets/js/basis/").detectSupport(renderer);

        this.gltfLoader.setKTX2Loader(ktx2Loader);
        this.fbxLoader = new FBXLoader();
        this.exporter = new GLTFExporter();
        this.textureOptimizer = new TextureOptimizer();

        // Set up Draco decoder for compressed geometry
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
        this.dracoLoader.setDecoderConfig({type: "js"});

        // Set up decoders for GLTF
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
        this.gltfLoader.setMeshoptDecoder(MeshoptDecoder);

        console.log("LODProcessor initialized with FBX support");
    }

    async process(
        buffer: ArrayBuffer,
        options: ProcessingOptions = {},
        fileType?: "glb" | "gltf" | "fbx",
    ): Promise<LODResult> {
        const startTime = performance.now();

        const modelData = await this.loadModel(buffer, fileType);
        const original = this.createLODLevel(modelData, 0, 0);

        const configurations = this.getConfigurations(options);
        const lods = await this.generateLODs(modelData, configurations, options);

        const processingTime = performance.now() - startTime;

        return {
            original,
            lods,
            processingTime,
        };
    }

    async processToGLB(
        buffer: ArrayBuffer,
        options: ProcessingOptions = {},
        fileType?: "glb" | "gltf" | "fbx",
    ): Promise<{ glbBuffers: ArrayBuffer[]; lodResult: LODResult }> {
        const result = await this.process(buffer, options, fileType);
        const glbBuffers: ArrayBuffer[] = [];

        for (const lod of result.lods) {
            const scene = new THREE.Scene();
            scene.name = "LODExportScene";

            // Create compatible material for export
            const sourceMaterial = Array.isArray(lod.materials) ? lod.materials[0] : lod.materials;
            const exportMaterial = this.createCompatibleMaterial(sourceMaterial);
            const mesh = new THREE.Mesh(lod.geometry, exportMaterial);

            scene.add(mesh);

            try {
                const glb = await this.exportToGLB(scene);
                glbBuffers.push(glb);
            } catch (error) {
                console.error("GLB export failed for LOD", lod.level, ":", error);
                // Try again with basic material as fallback
                const fallbackMaterial = this.createCompatibleMaterial();
                mesh.material = fallbackMaterial;

                try {
                    const glb = await this.exportToGLB(scene);
                    glbBuffers.push(glb);
                    console.log("GLB export succeeded with fallback material for LOD", lod.level);
                } catch (fallbackError) {
                    console.error("GLB export failed even with fallback material:", fallbackError);
                    throw fallbackError;
                }
            }
        }

        return { glbBuffers, lodResult: result };
    }

    private async loadModel(buffer: ArrayBuffer, fileType?: "glb" | "gltf" | "fbx"): Promise<ModelData> {
        // Use the provided fileType from the UI, fallback to GLB if not specified
        const type = fileType || "glb";
        console.log(`Loading ${type.toUpperCase()} file (size: ${buffer.byteLength} bytes)`);

        if (type === "fbx") {
            console.log("Using FBX loader");
            return this.loadFBX(buffer);
        } else if (type === "gltf") {
            console.log("Using GLTF loader");
            return this.loadGLTF(buffer);
        } else {
            console.log("Using GLB loader");
            return this.loadGLTF(buffer);
        }
    }

    // @ts-ignore
    private checkVertexColorsConsistency(obj3d) {
        // @ts-ignore
        obj3d.traverse(child => {
            if (child.isMesh) {
                const geometry = child.geometry;
                let materials = child.material;
                const hasColorAttr = geometry && geometry.attributes && geometry.attributes.color;
                if (!Array.isArray(materials)) materials = [materials];
                // @ts-ignore
                materials = materials.map(mat => {
                    if (mat && "vertexColors" in mat) {
                        const usesVertexColors = mat.vertexColors;
                        if (usesVertexColors && !hasColorAttr || !usesVertexColors && hasColorAttr) {
                            const newMat = mat.clone();
                            newMat.vertexColors = hasColorAttr;
                            return newMat;
                        }
                    }
                    return mat;
                });

                child.material = Array.isArray(child.material) ? materials : materials[0];
            }
        });
    }

    // FBX loading using loader.load() with blob URL like Three.js examples
    private async loadFBX(buffer: ArrayBuffer): Promise<ModelData> {
        return new Promise((resolve, reject) => {
            try {
                console.log("Loading FBX buffer with size:", buffer.byteLength);

                // Create blob URL from ArrayBuffer to use with loader.load()
                const blob = new Blob([buffer], {type: "application/octet-stream"});
                const blobUrl = URL.createObjectURL(blob);

                // Use loader.load() like the Three.js example
                this.fbxLoader.load(
                    blobUrl,
                    object => {
                        // Clean up the blob URL
                        URL.revokeObjectURL(blobUrl);
                        console.log(
                            "FBX loaded successfully:",
                            object.constructor.name,
                            "children:",
                            object.children.length,
                        );

                        this.checkVertexColorsConsistency(object);
                        // Convert FBX object to ModelData format
                        const modelData: ModelData = {
                            geometries: [],
                            materials: [],
                            textures: new Map(),
                            animations: object.animations || [],
                        };

                        // Traverse the FBX object and extract geometry and materials
                        object.traverse(child => {
                            if (child instanceof THREE.Mesh) {
                                if (child.geometry instanceof THREE.BufferGeometry) {
                                    modelData.geometries.push(child.geometry.clone());
                                }

                                if (Array.isArray(child.material)) {
                                    modelData.materials.push(...child.material.map(m => m.clone()));
                                } else if (child.material) {
                                    modelData.materials.push(child.material.clone());
                                }

                                // Extract textures from materials
                                const material = Array.isArray(child.material) ? child.material[0] : child.material;
                                if (
                                    material instanceof THREE.MeshStandardMaterial ||
                                    material instanceof THREE.MeshPhongMaterial ||
                                    material instanceof THREE.MeshLambertMaterial
                                ) {
                                    if (material.map) modelData.textures.set("map", material.map);
                                    if ((material as any).normalMap)
                                        modelData.textures.set("normalMap", (material as any).normalMap);
                                    if ((material as any).roughnessMap)
                                        modelData.textures.set("roughnessMap", (material as any).roughnessMap);
                                    if ((material as any).metalnessMap)
                                        modelData.textures.set("metalnessMap", (material as any).metalnessMap);
                                    if ((material as any).aoMap)
                                        modelData.textures.set("aoMap", (material as any).aoMap);
                                    if (material.emissiveMap)
                                        modelData.textures.set("emissiveMap", material.emissiveMap);
                                }
                            }
                        });

                        console.log("FBX model data extracted:", {
                            geometries: modelData.geometries.length,
                            materials: modelData.materials.length,
                            textures: modelData.textures.size,
                            animations: modelData.animations?.length || 0,
                        });

                        resolve(modelData);
                    },
                    progress => {
                        console.log("FBX loading progress:", progress);
                    },
                    error => {
                        // Clean up the blob URL on error
                        URL.revokeObjectURL(blobUrl);
                        console.error("FBX loading failed:", error);
                        reject(
                            new Error(`FBX loading failed: ${error instanceof Error ? error.message : String(error)}`),
                        );
                    },
                );
            } catch (error) {
                console.error("FBX loading setup failed:", error);
                reject(
                    new Error(`FBX loading setup failed: ${error instanceof Error ? error.message : String(error)}`),
                );
            }
        });
    }

    private async exportToGLB(scene: THREE.Scene | THREE.Group): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            this.exporter.parse(
                scene,
                result => {
                    if (result instanceof ArrayBuffer) {
                        resolve(result);
                    } else {
                        reject(new Error("Export did not produce ArrayBuffer"));
                    }
                },
                error => reject(error),
                {binary: true},
            );
        });
    }

    // Rest of the methods remain the same...
    private async loadGLTF(buffer: ArrayBuffer): Promise<ModelData> {
        return new Promise((resolve, reject) => {
            this.gltfLoader.parse(
                buffer,
                "",
                gltf => {
                    const modelData: ModelData = {
                        geometries: [],
                        materials: [],
                        textures: new Map(),
                        animations: gltf.animations,
                    };

                    gltf.scene.traverse(child => {
                        if (child instanceof THREE.Mesh) {
                            if (child.geometry instanceof THREE.BufferGeometry) {
                                modelData.geometries.push(child.geometry.clone());
                            }

                            if (Array.isArray(child.material)) {
                                modelData.materials.push(...child.material.map(m => m.clone()));
                            } else if (child.material) {
                                modelData.materials.push(child.material.clone());
                            }

                            const material = Array.isArray(child.material) ? child.material[0] : child.material;
                            if (material instanceof THREE.MeshStandardMaterial) {
                                if (material.map) modelData.textures.set("map", material.map);
                                if (material.normalMap) modelData.textures.set("normalMap", material.normalMap);
                                if (material.roughnessMap)
                                    modelData.textures.set("roughnessMap", material.roughnessMap);
                                if (material.metalnessMap)
                                    modelData.textures.set("metalnessMap", material.metalnessMap);
                                if (material.aoMap) modelData.textures.set("aoMap", material.aoMap);
                                if (material.emissiveMap) modelData.textures.set("emissiveMap", material.emissiveMap);
                            }
                        }
                    });

                    resolve(modelData);
                },
                reject,
            );
        });
    }

    private getConfigurations(options: ProcessingOptions): LODConfiguration[] {
        if (options.configurations && options.configurations.length > 0) {
            return options.configurations.slice(0, 3);
        }

        const maxLODs = Math.min(options.maxLODs || 3, 3);
        const configurations: LODConfiguration[] = [];

        // LOD 1: 70%, LOD 2: 50%, LOD 3: 25%
        const reductionLevels = [0.7, 0.5, 0.25];

        for (let i = 1; i <= maxLODs; i++) {
            configurations.push({
                targetReduction: reductionLevels[i - 1]!,
                preserveUVs: true,
                preserveNormals: i <= 2,
                preserveColors: true,
                textureScale: Math.max(0.25, 1 - i * 0.25),
                simplificationMethod: "meshopt",
            });
        }

        return configurations;
    }

    private async generateLODs(
        modelData: ModelData,
        configurations: LODConfiguration[],
        options: ProcessingOptions,
    ): Promise<LODLevel[]> {
        const lods: LODLevel[] = [];

        for (let i = 0; i < configurations.length; i++) {
            const config = configurations[i]!;
            const lod = await this.generateSingleLOD(modelData, config, i + 1, options);
            lods.push(lod);
        }

        return lods;
    }

    private async generateSingleLOD(
        modelData: ModelData,
        config: LODConfiguration,
        level: number,
        options: ProcessingOptions,
    ): Promise<LODLevel> {
        const simplifiedGeometries: THREE.BufferGeometry[] = [];
        let totalTriangles = 0;
        let totalVertices = 0;

        for (const geometry of modelData.geometries) {
            // Clone the geometry to avoid modifying the original
            const geometryClone = geometry.clone();

            // Select the simplification algorithm - default to meshopt for best quality
            const algorithm = config.simplificationMethod || "meshopt";
            let simplified: THREE.BufferGeometry;

            const simplificationParams = {
                targetRatio: config.targetReduction,
                preserveUVs: config.preserveUVs ?? true,
                preserveNormals: config.preserveNormals ?? true,
                preserveColors: config.preserveColors ?? true,
            };

            console.log(`Using ${algorithm} algorithm for LOD ${level}`);

            switch (algorithm) {
                case "meshopt": {
                    const simplifier = new MeshoptSimplifierWrapper();
                    simplified = await simplifier.simplify(geometryClone, simplificationParams);
                    break;
                }
                case "threejs": {
                    const simplifier = new ThreeJSSimplifier();
                    simplified = simplifier.simplify(geometryClone, simplificationParams);
                    break;
                }
                case "edge-collapse": {
                    const simplifier = new EdgeCollapseSimplifier();
                    simplified = simplifier.simplify(geometryClone, simplificationParams);
                    break;
                }
                case "simple":
                default: {
                    const simplifier = new SimpleDecimator();
                    simplified = simplifier.simplify(geometryClone, simplificationParams);
                    break;
                }
            }

            simplifiedGeometries.push(simplified);

            // Calculate triangle and vertex counts
            const vertexCount = simplified.attributes.position ? simplified.attributes.position.count : 0;
            let triangleCount = 0;

            if (simplified.index) {
                triangleCount = Math.floor(simplified.index.count / 3);
            } else if (vertexCount > 0) {
                // Non-indexed geometry - vertices are arranged as triangles
                triangleCount = Math.floor(vertexCount / 3);
            }

            totalTriangles += triangleCount;
            totalVertices += vertexCount;

            console.log(`LOD ${level} geometry: ${vertexCount} vertices, ${triangleCount} triangles`);
        }

        console.log(`LOD ${level} total: ${totalVertices} vertices, ${totalTriangles} triangles`);

        let materials = modelData.materials;
        let textureSize = 0;

        if (options.optimizeTextures && config.textureScale && modelData.textures.size > 0) {
            const optimizedTextures = this.textureOptimizer.optimizeMultiple(modelData.textures, {
                scale: config.textureScale,
                generateMipmaps: options.generateMipmaps ?? true,
            });

            // Safety check for optimizedTextures
            if (optimizedTextures && optimizedTextures.size > 0) {
                materials = materials.map((material: THREE.Material) => {
                    const clonedMaterial = material.clone();

                    if (clonedMaterial instanceof THREE.MeshStandardMaterial) {
                        if (clonedMaterial.map && optimizedTextures.has("map")) {
                            clonedMaterial.map = optimizedTextures.get("map")!;
                        }
                        if (clonedMaterial.normalMap && optimizedTextures.has("normalMap")) {
                            clonedMaterial.normalMap = optimizedTextures.get("normalMap")!;
                        }
                        if (clonedMaterial.roughnessMap && optimizedTextures.has("roughnessMap")) {
                            clonedMaterial.roughnessMap = optimizedTextures.get("roughnessMap")!;
                        }
                        if (clonedMaterial.metalnessMap && optimizedTextures.has("metalnessMap")) {
                            clonedMaterial.metalnessMap = optimizedTextures.get("metalnessMap")!;
                        }
                    }

                    return clonedMaterial;
                });

                for (const texture of optimizedTextures.values()) {
                    textureSize += this.textureOptimizer.calculateTextureSize(texture);
                }
            }
        }

        const mergedGeometry =
            simplifiedGeometries.length > 1 ? this.mergeGeometries(simplifiedGeometries) : simplifiedGeometries[0]!;

        return {
            level,
            geometry: mergedGeometry,
            materials: materials.length === 1 ? materials[0]! : materials,
            triangleCount: totalTriangles,
            vertexCount: totalVertices,
            textureSize,
            reduction: config.targetReduction,
        };
    }

    private createCompatibleMaterial(sourceMaterial?: THREE.Material): THREE.MeshStandardMaterial {
        const material = new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0.5,
            metalness: 0.0,
        });

        if (sourceMaterial) {
            // Copy safe properties
            if (sourceMaterial instanceof THREE.MeshStandardMaterial) {
                if (sourceMaterial.color) material.color.copy(sourceMaterial.color);
                if (sourceMaterial.emissive) material.emissive.copy(sourceMaterial.emissive);
                material.roughness = sourceMaterial.roughness ?? 0.5;
                material.metalness = sourceMaterial.metalness ?? 0.0;
                material.transparent = sourceMaterial.transparent;
                material.opacity = sourceMaterial.opacity;
            } else if (sourceMaterial instanceof THREE.MeshPhongMaterial) {
                if (sourceMaterial.color) material.color.copy(sourceMaterial.color);
                if (sourceMaterial.emissive) material.emissive.copy(sourceMaterial.emissive);
                if (sourceMaterial.shininess) {
                    material.roughness = Math.max(0.1, Math.min(1.0, 1.0 - sourceMaterial.shininess / 100));
                }
                material.transparent = sourceMaterial.transparent;
                material.opacity = sourceMaterial.opacity;
            } else if (sourceMaterial instanceof THREE.MeshLambertMaterial) {
                if (sourceMaterial.color) material.color.copy(sourceMaterial.color);
                if (sourceMaterial.emissive) material.emissive.copy(sourceMaterial.emissive);
                material.transparent = sourceMaterial.transparent;
                material.opacity = sourceMaterial.opacity;
            } else {
                // Generic material - copy what we can
                if ((sourceMaterial as any).color) material.color.copy((sourceMaterial as any).color);
            }
        }

        console.log("Created compatible MeshStandardMaterial");
        return material;
    }

    private validateGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
        console.log("Validating geometry attributes...");

        // Clean up any problematic attributes
        const attributesToRemove = ["skinIndex", "skinWeight"];
        attributesToRemove.forEach(attrName => {
            if (geometry.attributes[attrName]) {
                console.log(`Removing problematic attribute: ${attrName}`);
                geometry.deleteAttribute(attrName);
            }
        });

        // Remove morph target attributes that can cause WebGL issues
        Object.keys(geometry.attributes).forEach(attrName => {
            if (attrName.startsWith("morphTarget")) {
                console.log(`Removing morph target attribute: ${attrName}`);
                geometry.deleteAttribute(attrName);
            }
        });

        // Clear morph attributes that can cause undefined errors
        if (geometry.morphAttributes) {
            console.log("Clearing morph attributes");
            geometry.morphAttributes = {};
        }

        // Validate all remaining attributes
        Object.keys(geometry.attributes).forEach(attrName => {
            const attr = geometry.attributes[attrName];
            if (!attr || !attr.array || attr.array.length === 0) {
                console.log(`Removing invalid attribute: ${attrName}`);
                geometry.deleteAttribute(attrName);
            } else if (attr.count === 0) {
                console.log(`Removing empty attribute: ${attrName}`);
                geometry.deleteAttribute(attrName);
            }
        });

        // Ensure position attribute is valid
        const posAttr = geometry.attributes.position;
        if (!posAttr || !posAttr.array || posAttr.array.length === 0 || posAttr.count === 0) {
            throw new Error("Geometry has invalid position attribute");
        }

        // Ensure normals are valid or compute them
        if (
            !geometry.attributes.normal ||
            !geometry.attributes.normal.array ||
            geometry.attributes.normal.array.length === 0
        ) {
            console.log("Computing vertex normals for geometry");
            geometry.computeVertexNormals();
        }

        // Validate index if present
        if (geometry.index && (!geometry.index.array || geometry.index.array.length === 0)) {
            console.log("Removing invalid index");
            geometry.setIndex(null);
        }

        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        console.log(`Geometry validated: ${posAttr.count} vertices`);
        return geometry;
    }

    private mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
        if (geometries.length === 1) {
            return this.validateGeometry(geometries[0]!.clone());
        }

        const mergedGeometry = new THREE.BufferGeometry();
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        let indexOffset = 0;

        for (const geometry of geometries) {
            // Validate each geometry before merging
            const validatedGeometry = this.validateGeometry(geometry.clone());

            const positionAttr = validatedGeometry.attributes.position;
            if (!positionAttr || !positionAttr.array) {
                console.warn("Skipping geometry with invalid position attribute");
                continue;
            }

            for (let i = 0; i < positionAttr.count; i++) {
                positions.push(positionAttr.getX(i), positionAttr.getY(i), positionAttr.getZ(i));
            }

            if (validatedGeometry.attributes.normal && validatedGeometry.attributes.normal.array) {
                const normalAttr = validatedGeometry.attributes.normal;
                for (let i = 0; i < normalAttr.count; i++) {
                    normals.push(normalAttr.getX(i), normalAttr.getY(i), normalAttr.getZ(i));
                }
            }

            if (validatedGeometry.attributes.uv && validatedGeometry.attributes.uv.array) {
                const uvAttr = validatedGeometry.attributes.uv;
                for (let i = 0; i < uvAttr.count; i++) {
                    uvs.push(uvAttr.getX(i), uvAttr.getY(i));
                }
            }

            if (validatedGeometry.index && validatedGeometry.index.array) {
                for (let i = 0; i < validatedGeometry.index.count; i++) {
                    indices.push(validatedGeometry.index.getX(i) + indexOffset);
                }
            }

            indexOffset += positionAttr.count;
        }

        if (positions.length === 0) {
            throw new Error("No valid geometry data to merge");
        }

        mergedGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));

        if (normals.length > 0) {
            mergedGeometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(normals), 3));
        }

        if (uvs.length > 0) {
            mergedGeometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
        }

        if (indices.length > 0) {
            mergedGeometry.setIndex(indices);
        }

        return this.validateGeometry(mergedGeometry);
    }

    private createLODLevel(modelData: ModelData, level: number, reduction: number): LODLevel {
        let totalTriangles = 0;
        let totalVertices = 0;
        let textureSize = 0;

        for (const geometry of modelData.geometries) {
            const vertexCount = geometry.attributes.position ? geometry.attributes.position.count : 0;

            if (geometry.index) {
                totalTriangles += geometry.index.count / 3;
            } else if (vertexCount > 0) {
                // Non-indexed geometry - vertices are arranged as triangles
                totalTriangles += vertexCount / 3;
            }

            totalVertices += vertexCount;
        }

        if (modelData.textures && modelData.textures.size > 0) {
            for (const texture of modelData.textures.values()) {
                textureSize += this.textureOptimizer.calculateTextureSize(texture);
            }
        }

        const mergedGeometry =
            modelData.geometries.length > 1
                ? this.mergeGeometries(modelData.geometries)
                : this.validateGeometry(modelData.geometries[0]!.clone());

        return {
            level,
            geometry: mergedGeometry,
            materials: modelData.materials.length === 1 ? modelData.materials[0]! : modelData.materials,
            triangleCount: totalTriangles,
            vertexCount: totalVertices,
            textureSize,
            reduction,
        };
    }
}
