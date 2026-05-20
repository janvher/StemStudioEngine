import {
    Points,
    BufferGeometry,
    BufferAttribute,
    Color,
    AdditiveBlending,
    MathUtils,
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
} from "three/tsl";
import {PointsNodeMaterial} from "three/webgpu";

import i18n from "@web-shared/i18n/config";

const {t} = i18n;

/**
 * Smoke Effect
 * @class
 * @extends THREE.Points
 * @description Creates a particle-based smoke effect using WebGPU TSL
 */
class Smoke extends Points {
    /**
     * Create a new smoke effect
     * @param {Object} [options={}] - Configuration options
     * @param {number} [options.particleCount=64] - Number of particles in the smoke
     * @param {number} [options.size=3] - Size of each particle
     * @param {number} [options.lifetime=10] - Particle lifetime in seconds
     * @param {number} [options.color=0x888888] - Smoke color
     * @param {number} [options.spreadRadius=1] - Horizontal spread radius
     * @param {number} [options.riseSpeed=0.5] - Vertical rise speed
     */
    constructor(options = {}) {
        const particleCount = options.particleCount ?? 64;
        const size = options.size ?? 3;
        const lifetime = options.lifetime ?? 10;
        const smokeColor = options.color ?? 0x888888;
        const spreadRadius = options.spreadRadius ?? 1;
        const riseSpeed = options.riseSpeed ?? 0.5;

        // Create geometry with particle attributes
        const geometry = new BufferGeometry();

        const positions = new Float32Array(particleCount * 3);
        const randoms = new Float32Array(particleCount * 3); // Random offsets for variation
        const phases = new Float32Array(particleCount); // Phase offset for each particle

        for (let i = 0; i < particleCount; i++) {
            // Initial positions (clustered near origin)
            positions[i * 3 + 0] = MathUtils.randFloatSpread(0.5);
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = MathUtils.randFloatSpread(0.5);

            // Random values for variation
            randoms[i * 3 + 0] = Math.random();
            randoms[i * 3 + 1] = Math.random();
            randoms[i * 3 + 2] = Math.random();

            // Phase offset so particles don't all sync
            phases[i] = Math.random();
        }

        geometry.setAttribute("position", new BufferAttribute(positions, 3));
        geometry.setAttribute("aRandom", new BufferAttribute(randoms, 3));
        geometry.setAttribute("aPhase", new BufferAttribute(phases, 1));

        // Create WebGPU-compatible material
        const material = new PointsNodeMaterial({
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
        });

        // Uniforms
        const sizeUniform = uniform(size);
        const lifetimeUniform = uniform(lifetime);
        const colorUniform = uniform(new Color(smokeColor));
        const spreadRadiusUniform = uniform(spreadRadius);
        const riseSpeedUniform = uniform(riseSpeed);

        // Get custom attributes
        const aRandom = attribute("aRandom");
        const aPhase = attribute("aPhase");

        // Position node - animate particles rising and spreading
        const smokePositionNode = Fn(() => {
            const t = time;

            // Calculate particle age (looping based on lifetime)
            const particleTime = mod(add(t, mul(aPhase, lifetimeUniform)), lifetimeUniform);
            const normalizedAge = particleTime.div(lifetimeUniform);

            // Vertical rise with acceleration
            const rise = mul(particleTime, riseSpeedUniform);

            // Horizontal spread increases with height
            const spread = mul(normalizedAge, spreadRadiusUniform);
            const xOffset = mul(sin(add(mul(aRandom.x, 6.28), mul(t, 0.5))), spread);
            const zOffset = mul(cos(add(mul(aRandom.z, 6.28), mul(t, 0.3))), spread);

            // Turbulence/wobble
            const wobbleX = mul(sin(add(mul(t, 2.0), mul(aRandom.y, 10.0))), mul(0.2, normalizedAge));
            const wobbleZ = mul(cos(add(mul(t, 1.5), mul(aRandom.x, 8.0))), mul(0.2, normalizedAge));

            return vec3(
                add(add(xOffset, wobbleX), mul(aRandom.x.sub(0.5), 0.5)),
                rise,
                add(add(zOffset, wobbleZ), mul(aRandom.z.sub(0.5), 0.5)),
            );
        })();

        // Size node - particles grow then shrink
        const smokeSizeNode = Fn(() => {
            const t = time;
            const particleTime = mod(add(t, mul(aPhase, lifetimeUniform)), lifetimeUniform);
            const normalizedAge = particleTime.div(lifetimeUniform);

            // Size curve: small -> large -> small
            const sizeCurve = mul(
                smoothstep(float(0.0), float(0.2), normalizedAge),
                sub(float(1.0), smoothstep(float(0.7), float(1.0), normalizedAge)),
            );

            return mul(sizeUniform, mul(sizeCurve, add(float(0.5), mul(aRandom.y, 0.5))));
        })();

        // Color node - fade out as particle ages
        const smokeColorNode = Fn(() => {
            const t = time;
            const particleTime = mod(add(t, mul(aPhase, lifetimeUniform)), lifetimeUniform);
            const normalizedAge = particleTime.div(lifetimeUniform);

            // Fade out alpha over lifetime
            const alpha = mul(
                smoothstep(float(0.0), float(0.1), normalizedAge),
                sub(float(1.0), smoothstep(float(0.5), float(1.0), normalizedAge)),
            );

            // Slightly lighten color as smoke rises and disperses
            const fadedColor = mix(colorUniform, vec3(0.9, 0.9, 0.9), mul(normalizedAge, 0.3));

            return vec4(fadedColor, mul(alpha, 0.6));
        })();

        material.positionNode = smokePositionNode;
        material.sizeNode = smokeSizeNode;
        material.colorNode = smokeColorNode;

        // Create points
        super(geometry, material);

        this.name = t("Smoke");

        // Store references for updates
        this.sizeUniform = sizeUniform;
        this.lifetimeUniform = lifetimeUniform;
        this.colorUniform = colorUniform;
        this.spreadRadiusUniform = spreadRadiusUniform;
        this.riseSpeedUniform = riseSpeedUniform;

        Object.assign(this.userData, {
            type: "Smoke",
            particleCount,
            size,
            lifetime,
            color: smokeColor,
            spreadRadius,
            riseSpeed,
        });
    }

    /**
     * Update particle size
     * @param {number} size - New particle size
     */
    setSize(size) {
        this.sizeUniform.value = size;
        this.userData.size = size;
    }

    /**
     * Update particle lifetime
     * @param {number} lifetime - New lifetime in seconds
     */
    setLifetime(lifetime) {
        this.lifetimeUniform.value = lifetime;
        this.userData.lifetime = lifetime;
    }

    /**
     * Update smoke color
     * @param {number|string|Color} color - New smoke color
     */
    setColor(color) {
        this.colorUniform.value.set(color);
        this.userData.color = typeof color === "number" ? color : this.colorUniform.value.getHex();
    }

    /**
     * Update spread radius
     * @param {number} radius - New spread radius
     */
    setSpreadRadius(radius) {
        this.spreadRadiusUniform.value = radius;
        this.userData.spreadRadius = radius;
    }

    /**
     * Update rise speed
     * @param {number} speed - New rise speed
     */
    setRiseSpeed(speed) {
        this.riseSpeedUniform.value = speed;
        this.userData.riseSpeed = speed;
    }

    /**
     * Dispose of smoke resources
     */
    dispose() {
        this.geometry.dispose();
        this.material.dispose();
    }
}

export default Smoke;
