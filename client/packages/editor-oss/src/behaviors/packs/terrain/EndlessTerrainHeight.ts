import { Noise } from "noisejs";

import { HeightFn } from './EndlessTerrainTypes';

interface CityLocation {
    name: string;
    x: number;
    y: number;
    z: number;
    radius: number;
}

export class EndlessTerrainHeight {
    // Do not modify these constants because that would break backward
    // compatibility with old scenes.
    private static readonly chunkSize = 350;
    private static readonly cityRadius = 100;
    private static readonly edgeVariation = 1;
    private static readonly frequency = 0.005;
    private static readonly persistence = 0.5;
    private static readonly valleyDepth = 0.25;
    private static readonly variationFactor = 0.05;

    private static readonly cityLocations: CityLocation[] = [
        { name: "City A", x: 0, y: 0, z: 0, radius: EndlessTerrainHeight.cityRadius * 0.75 },
        { name: "City B", x: -200, y: 0, z: -150, radius: EndlessTerrainHeight.cityRadius * 0.70 },
        { name: "City C", x: 100, y: 0, z: -450, radius: EndlessTerrainHeight.cityRadius * 0.75 },
    ];

    private readonly noise: Noise;
    private readonly seed: number;
    private readonly waterMultiplier: number;

    constructor(
        seed: number,
        private readonly maxHeight: number,
        waterPercentage: number = 15,
    ) {
        this.seed = seed;
        this.noise = new Noise(seed);
        // Convert water percentage to the internal multiplier used by large-scale shaping.
        // Calibration: 0.23→15%, 0.25→17%, 0.35→24%. Linear: multiplier ≈ percentage * 0.015.
        // When water is disabled (percentage=0), use 0.08 to keep terrain shaping but prevent
        // negative heights by adding an upward floor.
        this.waterMultiplier = waterPercentage > 0 ? waterPercentage * 0.015 : 0.08;
    }

    static getChunkSize() {
        return EndlessTerrainHeight.chunkSize;
    }

    /**
     * Classic height function with simple rolling hills.
     * Uses standard fBm without domain warping or squared noise.
     */
    getHeightFn(): HeightFn {
        return (x: number, z: number) => {
            const randomOffset = EndlessTerrainHeight.seededRandom(x, z);
            let height = 0;
            let minDistanceToCity = Infinity;

            for (const city of EndlessTerrainHeight.cityLocations) {
                const { x: cityX, y: cityY, z: cityZ, radius: cityRadius } = city;
                const distanceToCity = Math.hypot(x - cityX, z - cityZ);
                minDistanceToCity = Math.min(minDistanceToCity, distanceToCity);

                if (distanceToCity < cityRadius) {
                    height += randomOffset * EndlessTerrainHeight.variationFactor * (1 - distanceToCity / cityRadius);
                    height += cityY;
                }
            }

            if (minDistanceToCity >= EndlessTerrainHeight.cityRadius) {
                const distanceToCenter = Math.hypot(x, z);
                const edgeFactor = EndlessTerrainHeight.edgeVariation * (distanceToCenter / EndlessTerrainHeight.chunkSize);
                height += this.getClassicBaseHeight(x, z) + edgeFactor;
            }

            return height;
        };
    }

    private getClassicBaseHeight(x: number, z: number) {
        let total = 0;
        let maxAmplitude = 0;

        for (let i = 0; i < 4; i++) {
            const freq = EndlessTerrainHeight.frequency * Math.pow(2, i);
            const amp = this.maxHeight * Math.pow(EndlessTerrainHeight.persistence, i);

            total += this.noise.perlin2(x * freq, z * freq) * amp;
            maxAmplitude += amp;
        }

        const normalizedHeight = total / maxAmplitude * this.maxHeight;
        if (normalizedHeight < 0) {
            const randomOffset = EndlessTerrainHeight.seededRandom(x, z);
            return -randomOffset * EndlessTerrainHeight.valleyDepth;
        }

        return normalizedHeight;
    }

    /**
     * Enhanced height function with smooth terrain, steep slopes, and domain warping.
     * Uses squared fBm for smooth-but-steep mountains.
     */
    getEnhancedHeightFn(): HeightFn {
        const warpNoise = new Noise(this.seed + 1000);
        const waterDisabled = this.waterMultiplier === 0.08;

        return (x: number, z: number) => {
            const randomOffset = EndlessTerrainHeight.seededRandom(x, z);
            let height = 0;
            let minDistanceToCity = Infinity;

            for (const city of EndlessTerrainHeight.cityLocations) {
                const { x: cityX, y: cityY, z: cityZ, radius: cityRadius } = city;
                const distanceToCity = Math.hypot(x - cityX, z - cityZ);
                minDistanceToCity = Math.min(minDistanceToCity, distanceToCity);

                if (distanceToCity < cityRadius) {
                    height += randomOffset * EndlessTerrainHeight.variationFactor * (1 - distanceToCity / cityRadius);
                    height += cityY;
                }
            }

            if (minDistanceToCity >= EndlessTerrainHeight.cityRadius) {
                const distanceToCenter = Math.hypot(x, z);
                const edgeFactor = EndlessTerrainHeight.edgeVariation * (distanceToCenter / EndlessTerrainHeight.chunkSize);
                height += this.getEnhancedBaseHeight(x, z, warpNoise);
                height += edgeFactor;
            }

            // When water is disabled, clamp final height to prevent any negative values
            return waterDisabled ? Math.max(0, height) : height;
        };
    }

    /**
     * Enhanced base height with domain warping, squared fBm, and smoothstep field flattening.
     * Creates a natural distribution: water bodies, flat fields, hills, and mountains.
     * @param x
     * @param z
     * @param warpNoise
     */
    private getEnhancedBaseHeight(x: number, z: number, warpNoise: Noise): number {
        // 1. Domain warping: offset coords with low-freq noise to break grid regularity
        const warpStrength = 80;
        const warpFreq = 0.002;
        const wx = x + warpNoise.perlin2(x * warpFreq, z * warpFreq) * warpStrength;
        const wz = z + warpNoise.perlin2(x * warpFreq + 31.7, z * warpFreq + 47.3) * warpStrength;

        // 2. Squared fBm (smooth valleys, steep-but-smooth peaks)
        let fBm = 0;
        let maxAmplitude = 0;
        for (let i = 0; i < 4; i++) {
            const freq = EndlessTerrainHeight.frequency * Math.pow(2, i);
            const amp = this.maxHeight * Math.pow(EndlessTerrainHeight.persistence, i);
            let increment = this.noise.perlin2(wx * freq, wz * freq);
            increment *= increment; // Square for smooth terrain
            fBm += increment * amp;
            maxAmplitude += amp;
        }
        fBm = fBm / maxAmplitude * this.maxHeight;

        // 3. Large-scale shaping — waterMultiplier controls how much terrain is below water level
        const n = warpNoise.perlin2(x * 0.001, z * 0.001); // [-1, 1]
        let largescale = n * this.maxHeight * this.waterMultiplier;

        // 4. Smoothstep field flattening: in low large-scale areas, replace noise with flat plains
        const pct = warpNoise.perlin2(x * 0.0005 + 100, z * 0.0005 + 100) - 0.5;
        const flatHeight = (EndlessTerrainHeight.smoothstep(pct, 0.5, 1.0) - 0.5) * this.maxHeight * 0.2;
        const blendWeight = 1 - EndlessTerrainHeight.smoothstep(n, -1, -0.3);
        largescale = EndlessTerrainHeight.lerp(largescale, flatHeight, blendWeight);

        // 5. Dampen fBm in flat/water areas so negative heights come through
        const dampedFBm = EndlessTerrainHeight.lerp(fBm, 0, blendWeight * 0.85);
        return dampedFBm + largescale;
    }

    private static smoothstep(x: number, edge0: number, edge1: number): number {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    }

    private static lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    private static seededRandom(x: number, z: number) {
        const seed = x * 73856093 ^ z * 19349663;
        return (seed * 9301 + 49297) % 233280 / 233280;
    }
}
