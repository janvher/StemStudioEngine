import * as THREE from "three";
import {Texture} from "three";
import {texture, uniform, uv, vec2, vec3, vec4, cos, sin, Fn, select} from "three/tsl";
import {MeshBasicNodeMaterial} from "three/webgpu";

class ScalingImageMaterial {
    /**
     * Creates a NodeMaterial with aspect ratio scaling and optional rotation support
     * @param textureInput - The texture to apply
     * @param aspectRatio - The aspect ratio for UV scaling
     * @param angleRad - Optional rotation angle in radians (default: 0)
     * @param options - Optional material configuration
     * @param options.side
     * @param options.transparent
     */
    static createMaterial(
        textureInput: Texture,
        aspectRatio: number,
        angleRad: number = 0,
        options?: {
            side?: THREE.Side;
            transparent?: boolean;
        },
    ): MeshBasicNodeMaterial {
        // Create uniforms for TSL
        const adjustUv = uniform(vec2(1, aspectRatio));
        const rotation = uniform(angleRad);

        // Create the color node using TSL
        const colorNode = Fn(() => {
            // Get base UV coordinates
            const baseUv = uv();

            let finalUv;

            if (angleRad !== 0) {
                // Center UV coordinates
                const centeredUv = baseUv.sub(0.5);

                // Apply rotation to UV coordinates
                const cosAngle = cos(rotation);
                const sinAngle = sin(rotation);

                // Manually create rotation matrix multiplication
                const rotatedUvX = centeredUv.x.mul(cosAngle).sub(centeredUv.y.mul(sinAngle));
                const rotatedUvY = centeredUv.x.mul(sinAngle).add(centeredUv.y.mul(cosAngle));
                const rotatedUv = vec2(rotatedUvX, rotatedUvY);

                // Apply aspect ratio scaling and recenter
                finalUv = vec2(0.5).add(rotatedUv.mul(adjustUv));
            } else {
                // No rotation - simpler calculation
                finalUv = vec2(0.5).add(baseUv.mul(adjustUv)).sub(adjustUv.mul(0.5));
            }

            // Sample texture
            const defaultColor = vec3(0.3);
            const sampledColor = texture(textureInput, finalUv).rgb;

            // Check bounds
            const inBounds = finalUv.x
                .greaterThanEqual(0.0)
                .and(finalUv.y.greaterThanEqual(0.0))
                .and(finalUv.x.lessThan(1.0))
                .and(finalUv.y.lessThan(1.0));

            // Use select for ternary-like behavior
            const color = select(inBounds, sampledColor, defaultColor);
            return vec4(color, 1.0);
        })();

        const material = new MeshBasicNodeMaterial();
        material.colorNode = colorNode;
        material.side = options?.side ?? THREE.FrontSide;
        material.transparent = options?.transparent ?? false;

        return material;
    }
}

export default ScalingImageMaterial;
