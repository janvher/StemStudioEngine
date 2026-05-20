import * as THREE from "three";

export interface LODConfiguration {
    targetReduction: number;
    preserveUVs?: boolean;
    preserveNormals?: boolean;
    preserveColors?: boolean;
    textureScale?: number;
    simplificationMethod?: "meshopt" | "threejs" | "edge-collapse" | "simple";
}

export interface LODLevel {
    level: number;
    geometry: THREE.BufferGeometry;
    materials: THREE.Material | THREE.Material[];
    triangleCount: number;
    vertexCount: number;
    textureSize: number;
    reduction: number;
}

export interface LODResult {
    original: LODLevel;
    lods: LODLevel[];
    processingTime: number;
}

export interface ModelData {
    geometries: THREE.BufferGeometry[];
    materials: THREE.Material[];
    textures: Map<string, THREE.Texture>;
    animations?: THREE.AnimationClip[];
}

export interface ProcessingOptions {
    configurations?: LODConfiguration[];
    maxLODs?: number;
    optimizeTextures?: boolean;
    generateMipmaps?: boolean;
}
