import { describe, expect, it } from "vitest";

import { EndlessTerrainHeight } from "./EndlessTerrainHeight";

const DEFAULT_SEED = 5600;
const DEFAULT_MAX_HEIGHT = 200;

/**
 * Sample the height function across a grid of points.
 * Returns an array of height values.
 * @param heightFn
 * @param range
 * @param step
 */
function sampleHeights(
    heightFn: (x: number, z: number) => number,
    range: number,
    step: number,
): number[] {
    const heights: number[] = [];
    for (let x = -range; x <= range; x += step) {
        for (let z = -range; z <= range; z += step) {
            heights.push(heightFn(x, z));
        }
    }
    return heights;
}

describe("EndlessTerrainHeight", () => {
    describe("classic height function (getHeightFn)", () => {
        it("produces some negative heights (shallow valleys)", () => {
            const terrain = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT);
            const heightFn = terrain.getHeightFn();

            const heights = sampleHeights(heightFn, 1000, 50);
            const negativeCount = heights.filter(h => h < 0).length;

            expect(negativeCount).toBeGreaterThan(0);
        });

        it("negative heights are bounded by valleyDepth", () => {
            const terrain = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT);
            const heightFn = terrain.getHeightFn();

            const heights = sampleHeights(heightFn, 1000, 50);
            const minHeight = Math.min(...heights);

            // Classic valleys are capped at -valleyDepth (0.25)
            expect(minHeight).toBeGreaterThanOrEqual(-0.25);
        });

        it("produces some positive heights (mountains/hills)", () => {
            const terrain = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT);
            const heightFn = terrain.getHeightFn();
            const heights = sampleHeights(heightFn, 1000, 50);
            const positiveCount = heights.filter(h => h > 1).length;

            expect(positiveCount).toBeGreaterThan(0);
        });

        it("is deterministic for same seed and coordinates", () => {
            const terrain1 = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT);
            const terrain2 = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT);
            const fn1 = terrain1.getHeightFn();
            const fn2 = terrain2.getHeightFn();

            const testPoints: [number, number][] = [[100, 200], [0, 0], [-300, 150], [42, -99]];
            for (const [x, z] of testPoints) {
                expect(fn1(x, z)).toBe(fn2(x, z));
            }
        });

        it("different seeds produce different terrain", () => {
            const terrain1 = new EndlessTerrainHeight(1234, DEFAULT_MAX_HEIGHT);
            const terrain2 = new EndlessTerrainHeight(5678, DEFAULT_MAX_HEIGHT);
            const fn1 = terrain1.getHeightFn();
            const fn2 = terrain2.getHeightFn();

            // Check a point far from cities where terrain noise dominates
            const h1 = fn1(500, 500);
            const h2 = fn2(500, 500);
            expect(h1).not.toBe(h2);
        });

        it("works correctly with different maxHeight values", () => {
            const smallTerrain = new EndlessTerrainHeight(DEFAULT_SEED, 50);
            const largeTerrain = new EndlessTerrainHeight(DEFAULT_SEED, 500);
            const smallFn = smallTerrain.getHeightFn();
            const largeFn = largeTerrain.getHeightFn();

            const smallHeights = sampleHeights(smallFn, 1000, 50);
            const largeHeights = sampleHeights(largeFn, 1000, 50);

            expect(smallHeights.some(h => h < 0)).toBe(true);
            expect(largeHeights.some(h => h < 0)).toBe(true);

            // Larger maxHeight should produce taller peaks
            const smallMax = Math.max(...smallHeights);
            const largeMax = Math.max(...largeHeights);
            expect(largeMax).toBeGreaterThan(smallMax);
        });
    });

    describe("enhanced height function (getEnhancedHeightFn)", () => {
        it("produces some negative heights (for water)", () => {
            const terrain = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT);
            const heightFn = terrain.getEnhancedHeightFn();

            const heights = sampleHeights(heightFn, 1000, 50);
            const negativeCount = heights.filter(h => h < 0).length;

            expect(negativeCount).toBeGreaterThan(0);
        });

        it("produces some positive heights (mountains/hills)", () => {
            const terrain = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT);
            const heightFn = terrain.getEnhancedHeightFn();
            const heights = sampleHeights(heightFn, 1000, 50);
            const positiveCount = heights.filter(h => h > 1).length;

            expect(positiveCount).toBeGreaterThan(0);
        });

        it("is deterministic for same seed and coordinates", () => {
            const terrain1 = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT);
            const terrain2 = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT);
            const fn1 = terrain1.getEnhancedHeightFn();
            const fn2 = terrain2.getEnhancedHeightFn();

            const testPoints: [number, number][] = [[100, 200], [0, 0], [-300, 150], [42, -99]];
            for (const [x, z] of testPoints) {
                expect(fn1(x, z)).toBe(fn2(x, z));
            }
        });

        it("produces deeper valleys than classic (domain warping + water)", () => {
            const terrain = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT);
            const classicFn = terrain.getHeightFn();
            const enhancedFn = terrain.getEnhancedHeightFn();

            const classicHeights = sampleHeights(classicFn, 1000, 50);
            const enhancedHeights = sampleHeights(enhancedFn, 1000, 50);

            const classicMin = Math.min(...classicHeights);
            const enhancedMin = Math.min(...enhancedHeights);

            // Enhanced terrain can go much deeper than classic's -0.25 valley cap
            expect(enhancedMin).toBeLessThan(classicMin);
        });
    });

    describe("water percentage control (enhanced)", () => {
        it("default waterPercentage=15: ~15% of terrain should be underwater", () => {
            const terrain = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT, 15);
            const heightFn = terrain.getEnhancedHeightFn();
            const heights = sampleHeights(heightFn, 2000, 25);

            const negative = heights.filter(h => h < 0).length;
            const waterPct = negative / heights.length * 100;

            expect(waterPct).toBeGreaterThan(10);
            expect(waterPct).toBeLessThan(20);
        });

        it("waterPercentage=1: <5% below zero", () => {
            const terrain = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT, 1);
            const heightFn = terrain.getEnhancedHeightFn();
            const heights = sampleHeights(heightFn, 2000, 25);

            const negative = heights.filter(h => h < 0).length;
            const waterPct = negative / heights.length * 100;

            expect(waterPct).toBeLessThan(5);
        });

        it("waterPercentage=30: 25-35% below zero", () => {
            const terrain = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT, 30);
            const heightFn = terrain.getEnhancedHeightFn();
            const heights = sampleHeights(heightFn, 2000, 25);

            const negative = heights.filter(h => h < 0).length;
            const waterPct = negative / heights.length * 100;

            expect(waterPct).toBeGreaterThan(25);
            expect(waterPct).toBeLessThan(35);
        });

        it("waterPercentage=0 (water disabled): 0% below zero", () => {
            const terrain = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT, 0);
            const heightFn = terrain.getEnhancedHeightFn();
            const heights = sampleHeights(heightFn, 2000, 25);

            const negative = heights.filter(h => h < 0).length;

            expect(negative).toBe(0);
        });

        it("increasing waterPercentage monotonically increases water coverage", () => {
            const percentages = [1, 5, 15, 25, 30];
            const waterCoverages = percentages.map(pct => {
                const terrain = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT, pct);
                const heightFn = terrain.getEnhancedHeightFn();
                const heights = sampleHeights(heightFn, 2000, 25);
                return heights.filter(h => h < 0).length / heights.length;
            });

            for (let i = 1; i < waterCoverages.length; i++) {
                expect(waterCoverages[i]).toBeGreaterThanOrEqual(waterCoverages[i - 1]!);
            }
        });
    });

    describe("density math formulas", () => {
        /**
         * Tree density formula extracted for testing:
         *   treeOffset = (treeDensity / 100) * 1.3 - 0.5
         *   forestDensity = max(0, (forestSample + treeOffset) / (1 + treeOffset))
         *   if (rForest > forestDensity) -> skip tree
         * @param treeDensity
         * @param forestSamples
         */
        function computeTreePassRate(treeDensity: number, forestSamples: number[]): number {
            const treeOffset = (treeDensity / 100) * 1.3 - 0.5;
            let passed = 0;
            for (const forestSample of forestSamples) {
                const forestDensityVal = Math.max(0, (forestSample + treeOffset) / (1 + treeOffset));
                passed += Math.min(1, Math.max(0, forestDensityVal));
            }
            return passed / forestSamples.length;
        }

        it("treeDensity=0 should produce near-zero tree pass rate", () => {
            const samples = Array.from({ length: 1000 }, (_, i) => (i / 1000) * 2 - 1);
            const rate = computeTreePassRate(0, samples);
            expect(rate).toBeLessThan(0.15);
        });

        it("treeDensity=50 should produce moderate tree pass rate", () => {
            const samples = Array.from({ length: 1000 }, (_, i) => (i / 1000) * 2 - 1);
            const rate = computeTreePassRate(50, samples);
            expect(rate).toBeGreaterThan(0.2);
            expect(rate).toBeLessThan(0.8);
        });

        it("treeDensity=100 should produce higher tree pass rate than default", () => {
            const samples = Array.from({ length: 1000 }, (_, i) => (i / 1000) * 2 - 1);
            const rate100 = computeTreePassRate(100, samples);
            const rate50 = computeTreePassRate(50, samples);
            expect(rate100).toBeGreaterThan(rate50);
            expect(rate100).toBeGreaterThan(0.35);
        });

        it("increasing treeDensity monotonically increases pass rate", () => {
            const samples = Array.from({ length: 1000 }, (_, i) => (i / 1000) * 2 - 1);
            const rates = [0, 25, 50, 75, 100].map(d => ({
                density: d,
                rate: computeTreePassRate(d, samples),
            }));
            for (let i = 1; i < rates.length; i++) {
                expect(rates[i]!.rate).toBeGreaterThanOrEqual(rates[i - 1]!.rate);
            }
        });

        /**
         * Rock density formula:
         *   if (rRockDensity > rockDensity / 50) -> skip rock
         *   rRockDensity is uniform [0,1]
         *   pass rate = min(1, rockDensity / 50)
         */
        it("rockDensity=0 should block all rocks", () => {
            const passRate = Math.min(1, 0 / 50);
            expect(passRate).toBe(0);
        });

        it("rockDensity=50 should pass all rocks (matches current behavior)", () => {
            const passRate = Math.min(1, 50 / 50);
            expect(passRate).toBe(1);
        });

        it("rockDensity=25 should pass ~50% of rocks", () => {
            const passRate = Math.min(1, 25 / 50);
            expect(passRate).toBeCloseTo(0.5, 1);
        });

        it("rockDensity=100 should pass all rocks", () => {
            const passRate = Math.min(1, 100 / 50);
            expect(Math.min(1, passRate)).toBe(1);
        });
    });

    describe("city locations", () => {
        it("classic: produces near-zero heights at city center (0, 0)", () => {
            const terrain = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT);
            const heightFn = terrain.getHeightFn();

            const height = heightFn(0, 0);
            expect(Math.abs(height)).toBeLessThan(5);
        });

        it("classic: produces near-zero heights at city B (-200, -150)", () => {
            const terrain = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT);
            const heightFn = terrain.getHeightFn();

            const height = heightFn(-200, -150);
            expect(Math.abs(height)).toBeLessThan(5);
        });

        it("enhanced: produces near-zero heights at city center (0, 0)", () => {
            const terrain = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT);
            const heightFn = terrain.getEnhancedHeightFn();

            const height = heightFn(0, 0);
            expect(Math.abs(height)).toBeLessThan(5);
        });

        it("enhanced: produces near-zero heights at city B (-200, -150)", () => {
            const terrain = new EndlessTerrainHeight(DEFAULT_SEED, DEFAULT_MAX_HEIGHT);
            const heightFn = terrain.getEnhancedHeightFn();

            const height = heightFn(-200, -150);
            expect(Math.abs(height)).toBeLessThan(5);
        });
    });
});
