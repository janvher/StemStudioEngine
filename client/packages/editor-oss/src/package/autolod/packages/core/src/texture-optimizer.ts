import * as THREE from "three";

export interface TextureOptimizeOptions {
    scale: number;
    generateMipmaps?: boolean;
}

export class TextureOptimizer {
    optimizeMultiple(
        textures: Map<string, THREE.Texture>,
        _options: TextureOptimizeOptions,
    ): Map<string, THREE.Texture> {
        return textures;
    }

    calculateTextureSize(_texture: THREE.Texture): number {
        return 0;
    }
}
