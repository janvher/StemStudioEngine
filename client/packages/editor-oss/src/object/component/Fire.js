import {
    Points,
    BufferGeometry,
    BufferAttribute,
    Color,
    AdditiveBlending,
    MathUtils,
    Object3D,
} from "three";
import {
    Fn,
    uniform,
    time,
    attribute,
    vec3,
    vec4,
    float,
    sin,
    cos,
    mul,
    add,
    sub,
    mod,
    mix,
    smoothstep,
    fract,
    floor,
    dot,
    pow,
} from "three/tsl";
import {PointsNodeMaterial} from "three/webgpu";

import i18n from "@web-shared/i18n/config";

const {t} = i18n;

/**
 * Simple hash function for procedural noise in TSL
 */
const hash = Fn(([p]) => {
    const p3 = fract(p.mul(vec3(0.1031, 0.1030, 0.0973)));
    const dotVal = dot(p3, add(p3, vec3(33.33)));
    return fract(mul(add(p3.x, p3.y), p3.z).add(dotVal));
});

/**
 * Simple noise function for fire turbulence
 */
const noise = Fn(([p]) => {
    const i = floor(p);
    const f = fract(p);
    const u = mul(mul(f, f), sub(float(3.0), mul(f, float(2.0))));

    const n000 = hash(i);
    const n100 = hash(add(i, vec3(1, 0, 0)));
    const n010 = hash(add(i, vec3(0, 1, 0)));
    const n110 = hash(add(i, vec3(1, 1, 0)));

    const x1 = mix(n000, n100, u.x);
    const x2 = mix(n010, n110, u.x);

    return mix(x1, x2, u.y);
});

/**
 * Fire Effect
 * @class
 * @extends THREE.Object3D
 * @description Creates a particle-based fire effect using WebGPU TSL
 */
class Fire extends Object3D {
    /**
     * Create a new fire effect
     * @param {THREE.Camera} camera - The camera viewing the fire (kept for API compatibility)
     * @param {Object} [options={}] - Configuration options
     * @param {number} [options.width=2] - Fire width
     * @param {number} [options.height=4] - Fire height
     * @param {number} [options.depth=2] - Fire depth
     * @param {number} [options.particleCount=200] - Number of fire particles
     * @param {number} [options.intensity=1.0] - Fire intensity
     */
    constructor(camera, options = {}) {
        super();

        const width = options.width ?? 2;
        const height = options.height ?? 4;
        const depth = options.depth ?? 2;
        const particleCount = options.particleCount ?? 200;
        const intensity = options.intensity ?? 1.0;

        // Create geometry with particle attributes
        const geometry = new BufferGeometry();

        const positions = new Float32Array(particleCount * 3);
        const randoms = new Float32Array(particleCount * 3);
        const phases = new Float32Array(particleCount);
        const sizes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            // Initial positions (spread within the fire volume)
            positions[i * 3 + 0] = MathUtils.randFloatSpread(width * 0.3);
            positions[i * 3 + 1] = Math.random() * height * 0.2;
            positions[i * 3 + 2] = MathUtils.randFloatSpread(depth * 0.3);

            // Random values for variation
            randoms[i * 3 + 0] = Math.random();
            randoms[i * 3 + 1] = Math.random();
            randoms[i * 3 + 2] = Math.random();

            // Phase offset for particle lifecycle
            phases[i] = Math.random();

            // Random size variation
            sizes[i] = 0.5 + Math.random() * 0.5;
        }

        geometry.setAttribute("position", new BufferAttribute(positions, 3));
        geometry.setAttribute("aRandom", new BufferAttribute(randoms, 3));
        geometry.setAttribute("aPhase", new BufferAttribute(phases, 1));
        geometry.setAttribute("aSize", new BufferAttribute(sizes, 1));

        // Create WebGPU-compatible material
        const material = new PointsNodeMaterial({
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
        });

        // Uniforms
        const widthUniform = uniform(width);
        const heightUniform = uniform(height);
        const depthUniform = uniform(depth);
        const intensityUniform = uniform(intensity);
        const lifetime = 2.0; // Fire particle lifetime in seconds
        const lifetimeUniform = uniform(lifetime);

        // Fire colors (from hot core to cooler outer)
        const coreColor = uniform(new Color(0xffffcc)); // Bright yellow-white
        const midColor = uniform(new Color(0xff6600)); // Orange
        const outerColor = uniform(new Color(0xff0000)); // Red
        const tipColor = uniform(new Color(0x330000)); // Dark red/smoke

        // Get custom attributes
        const aRandom = attribute("aRandom");
        const aPhase = attribute("aPhase");
        const aSize = attribute("aSize");

        // Position node - animate fire particles rising with turbulence
        const firePositionNode = Fn(() => {
            const t = time;

            // Calculate particle age (looping)
            const particleTime = mod(add(t, mul(aPhase, lifetimeUniform)), lifetimeUniform);
            const normalizedAge = particleTime.div(lifetimeUniform);

            // Vertical rise - faster at the beginning, slower at top
            const riseSpeed = mul(sub(float(1.0), mul(normalizedAge, 0.5)), 3.0);
            const rise = mul(particleTime, riseSpeed);

            // Horizontal spread increases as particle rises
            const spread = mul(normalizedAge, mul(widthUniform, 0.3));

            // Turbulence based on noise
            const noiseInput = vec3(
                add(mul(aRandom.x, 10.0), mul(t, 2.0)),
                add(rise, mul(t, 3.0)),
                add(mul(aRandom.z, 10.0), mul(t, 1.5)),
            );
            const turbulence = noise(noiseInput);

            // Spiral/flicker motion
            const angle = add(mul(aRandom.x, 6.28), mul(t, mul(2.0, add(float(1.0), aRandom.y))));
            const xOffset = mul(sin(angle), mul(spread, turbulence));
            const zOffset = mul(cos(angle), mul(spread, turbulence));

            // Base position offset
            const baseX = mul(aRandom.x.sub(0.5), widthUniform.mul(0.5));
            const baseZ = mul(aRandom.z.sub(0.5), depthUniform.mul(0.5));

            return vec3(
                add(baseX, xOffset),
                mul(rise, heightUniform.div(lifetimeUniform.mul(3.0))),
                add(baseZ, zOffset),
            );
        })();

        // Size node - particles shrink as they rise
        const fireSizeNode = Fn(() => {
            const t = time;
            const particleTime = mod(add(t, mul(aPhase, lifetimeUniform)), lifetimeUniform);
            const normalizedAge = particleTime.div(lifetimeUniform);

            // Size curve: start medium, peak slightly, then shrink
            const sizeCurve = mul(
                smoothstep(float(0.0), float(0.1), normalizedAge),
                sub(float(1.0), pow(normalizedAge, float(0.5))),
            );

            // Base size with intensity
            const baseSize = mul(mul(aSize, intensityUniform), 30.0);

            return mul(baseSize, sizeCurve);
        })();

        // Color node - fire gradient from core to tip
        const fireColorNode = Fn(() => {
            const t = time;
            const particleTime = mod(add(t, mul(aPhase, lifetimeUniform)), lifetimeUniform);
            const normalizedAge = particleTime.div(lifetimeUniform);

            // Flicker effect
            const flicker = add(
                float(0.8),
                mul(sin(add(mul(t, 15.0), mul(aRandom.x, 20.0))), 0.2),
            );

            // Color gradient based on particle age
            // Young particles are bright yellow/white (core)
            // Middle-aged are orange
            // Old particles are red/dark (tip)
            const color1 = mix(coreColor, midColor, smoothstep(float(0.0), float(0.3), normalizedAge));
            const color2 = mix(color1, outerColor, smoothstep(float(0.3), float(0.6), normalizedAge));
            const finalColor = mix(color2, tipColor, smoothstep(float(0.6), float(1.0), normalizedAge));

            // Alpha fades at the top
            const alpha = mul(
                smoothstep(float(0.0), float(0.05), normalizedAge),
                sub(float(1.0), pow(normalizedAge, float(1.5))),
            );

            // Apply intensity and flicker
            const brightColor = mul(finalColor, mul(intensityUniform, flicker));

            return vec4(brightColor, mul(alpha, 0.8));
        })();

        material.positionNode = firePositionNode;
        material.sizeNode = fireSizeNode;
        material.colorNode = fireColorNode;

        // Create the points object
        const firePoints = new Points(geometry, material);
        firePoints.name = t("Fire");

        this.add(firePoints);

        this.name = t("Fire");
        this.position.y = height / 2;

        // Store references
        this.firePoints = firePoints;
        this.widthUniform = widthUniform;
        this.heightUniform = heightUniform;
        this.depthUniform = depthUniform;
        this.intensityUniform = intensityUniform;
        this.coreColor = coreColor;
        this.midColor = midColor;
        this.outerColor = outerColor;

        Object.assign(this.userData, {
            type: "Fire",
            width,
            height,
            depth,
            particleCount,
            intensity,
        });
    }

    /**
     * Update fire intensity
     * @param {number} intensity - New intensity value
     */
    setIntensity(intensity) {
        this.intensityUniform.value = intensity;
        this.userData.intensity = intensity;
    }

    /**
     * Update fire dimensions
     * @param {number} width - New width
     * @param {number} height - New height
     * @param {number} depth - New depth
     */
    setDimensions(width, height, depth) {
        this.widthUniform.value = width;
        this.heightUniform.value = height;
        this.depthUniform.value = depth;
        this.userData.width = width;
        this.userData.height = height;
        this.userData.depth = depth;
        this.position.y = height / 2;
    }

    /**
     * Dispose of fire resources
     */
    dispose() {
        this.firePoints.geometry.dispose();
        this.firePoints.material.dispose();
    }
}

export default Fire;
