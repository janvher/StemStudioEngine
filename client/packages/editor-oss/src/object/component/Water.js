import {
    Mesh,
    PlaneGeometry,
    Color,
    Vector3,
    DoubleSide,
} from "three";
import {
    Fn,
    uniform,
    time,
    positionWorld,
    normalWorld,
    cameraPosition,
    vec3,
    vec4,
    float,
    sin,
    cos,
    dot,
    normalize,
    reflect,
    pow,
    mix,
    abs,
    fract,
    floor,
    smoothstep,
    add,
    mul,
    sub,
} from "three/tsl";
import {MeshPhysicalNodeMaterial} from "three/webgpu";

import i18n from "@web-shared/i18n/config";

const {t} = i18n;

/**
 * Procedural noise function for water waves (TSL-based)
 */
const hash = Fn(([p]) => {
    const p3 = fract(p.mul(vec3(0.1031, 0.1030, 0.0973)));
    const dot1 = dot(p3, add(p3, vec3(33.33)));
    return fract(mul(add(p3.x, p3.y), p3.z).mul(dot1));
});

const noise = Fn(([p]) => {
    const i = floor(p);
    const f = fract(p);
    const u = mul(mul(f, f), sub(float(3.0), mul(f, float(2.0))));

    const n000 = hash(i);
    const n100 = hash(add(i, vec3(1, 0, 0)));
    const n010 = hash(add(i, vec3(0, 1, 0)));
    const n110 = hash(add(i, vec3(1, 1, 0)));
    const n001 = hash(add(i, vec3(0, 0, 1)));
    const n101 = hash(add(i, vec3(1, 0, 1)));
    const n011 = hash(add(i, vec3(0, 1, 1)));
    const n111 = hash(add(i, vec3(1, 1, 1)));

    const x1 = mix(n000, n100, u.x);
    const x2 = mix(n010, n110, u.x);
    const x3 = mix(n001, n101, u.x);
    const x4 = mix(n011, n111, u.x);

    const y1 = mix(x1, x2, u.y);
    const y2 = mix(x3, x4, u.y);

    return mix(y1, y2, u.z);
});

/**
 * Water Effect
 * @class
 * @extends THREE.Mesh
 * @description Creates a dynamic water surface with procedural waves using WebGPU TSL
 */
class Water extends Mesh {
    /**
     * Create a new water effect
     * @param {Object} [options={}] - Configuration options
     * @param {number} [options.size=512] - Water plane size
     * @param {number} [options.segments=128] - Water plane segments
     * @param {number} [options.waterColor=0x0077be] - Water color (default: ocean blue)
     * @param {number} [options.waveHeight=0.5] - Maximum wave height
     * @param {number} [options.waveSpeed=1.0] - Wave animation speed
     */
    constructor(options = {}) {
        const size = options.size ?? 512;
        const segments = options.segments ?? 128;
        const waterColor = options.waterColor ?? 0x0077be; // Ocean blue
        const waveHeight = options.waveHeight ?? 0.5;
        const waveSpeed = options.waveSpeed ?? 1.0;

        // Create geometry and rotate to be horizontal (like ground plane)
        const geometry = new PlaneGeometry(size, size, segments, segments);
        geometry.rotateX(-Math.PI / 2);

        // Create WebGPU-compatible material
        const material = new MeshPhysicalNodeMaterial({
            side: DoubleSide,
            transparent: true,
            transmission: 0.9,
            roughness: 0.1,
            metalness: 0.0,
            ior: 1.33, // Water IOR
            thickness: 0.5,
        });

        // Uniform values for animation
        const waveHeightUniform = uniform(waveHeight);
        const waveSpeedUniform = uniform(waveSpeed);
        const waterColorUniform = uniform(new Color(waterColor));

        // Create procedural water waves using TSL
        const waterPositionNode = Fn(() => {
            const worldPos = positionWorld;
            const t = mul(time, waveSpeedUniform);

            // Multi-frequency wave simulation
            const wave1 = sin(add(mul(worldPos.x, 0.02), t)).mul(cos(add(mul(worldPos.z, 0.03), mul(t, 0.7))));
            const wave2 = sin(add(mul(worldPos.x, 0.05), mul(t, 1.3))).mul(cos(add(mul(worldPos.z, 0.04), t)));
            const wave3 = noise(vec3(mul(worldPos.x, 0.1), mul(worldPos.z, 0.1), t));

            const combinedWave = add(add(mul(wave1, 0.5), mul(wave2, 0.3)), mul(wave3, 0.2));
            const displacement = mul(combinedWave, waveHeightUniform);

            return vec3(worldPos.x, add(worldPos.y, displacement), worldPos.z);
        })();

        // Water color with depth-based tinting
        const waterColorNode = Fn(() => {
            const viewDir = normalize(sub(cameraPosition, positionWorld));
            const normal = normalWorld;

            // Fresnel effect for water surface
            const fresnel = pow(sub(float(1.0), abs(dot(viewDir, normal))), float(4.0));

            // Mix water color with white for foam/highlights
            const surfaceColor = mix(waterColorUniform, vec3(1.0, 1.0, 1.0), mul(fresnel, 0.3));

            return vec4(surfaceColor, 0.85);
        })();

        material.positionNode = waterPositionNode;
        material.colorNode = waterColorNode;

        // Create mesh
        super(geometry, material);

        this.name = t("Water");

        // Store references for updates
        this.waveHeightUniform = waveHeightUniform;
        this.waveSpeedUniform = waveSpeedUniform;
        this.waterColorUniform = waterColorUniform;

        Object.assign(this.userData, {
            type: "Water",
            size,
            segments,
            waterColor,
            waveHeight,
            waveSpeed,
        });
    }

    /**
     * Update wave height
     * @param {number} height - New wave height
     */
    setWaveHeight(height) {
        this.waveHeightUniform.value = height;
        this.userData.waveHeight = height;
    }

    /**
     * Update wave speed
     * @param {number} speed - New wave speed
     */
    setWaveSpeed(speed) {
        this.waveSpeedUniform.value = speed;
        this.userData.waveSpeed = speed;
    }

    /**
     * Update water color
     * @param {number|string|Color} color - New water color
     */
    setWaterColor(color) {
        this.waterColorUniform.value.set(color);
        this.userData.waterColor = typeof color === "number" ? color : this.waterColorUniform.value.getHex();
    }

    /**
     * Dispose of water resources
     */
    dispose() {
        this.geometry.dispose();
        this.material.dispose();
    }
}

export default Water;
