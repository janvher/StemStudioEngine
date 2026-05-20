import { describe, expect, it } from "vitest";

import { DEFAULT_BASE_UV_REPEAT, resolveTerrainUv } from "./TerrainUvMode";

describe("TerrainUvMode", () => {
    it("defaults to scale mode for backward compatibility", () => {
        const resolved = resolveTerrainUv({});

        expect(resolved.mode).toBe("scale");
        expect(resolved.u).toBe(DEFAULT_BASE_UV_REPEAT);
        expect(resolved.v).toBe(DEFAULT_BASE_UV_REPEAT);
    });

    it("resolves locked scale to equal u and v with base repeat multiplier", () => {
        const resolved = resolveTerrainUv({
            uvMode: "scale",
            uvScaleLocked: true,
            uvScale: 0.5,
        });

        expect(resolved.u).toBe(100);
        expect(resolved.v).toBe(100);
    });

    it("resolves unlocked scale with independent axes", () => {
        const resolved = resolveTerrainUv({
            uvMode: "scale",
            uvScaleLocked: false,
            uvScaleX: 0.25,
            uvScaleY: 0.75,
        });

        expect(resolved.u).toBe(50);
        expect(resolved.v).toBe(150);
    });

    it("resolves locked repeatCount mode to equal u and v", () => {
        const resolved = resolveTerrainUv({
            uvMode: "repeatCount",
            uvRepeatLocked: true,
            uvRepeat: 12,
        });

        expect(resolved.mode).toBe("repeatCount");
        expect(resolved.u).toBe(12);
        expect(resolved.v).toBe(12);
    });

    it("resolves unlocked repeatCount mode with independent axes", () => {
        const resolved = resolveTerrainUv({
            uvMode: "repeatCount",
            uvRepeatLocked: false,
            uvRepeatU: 8,
            uvRepeatV: 16,
        });

        expect(resolved.u).toBe(8);
        expect(resolved.v).toBe(16);
    });

    it("supports custom base repeat in scale mode", () => {
        const resolved = resolveTerrainUv(
            {
                uvMode: "scale",
                uvScaleLocked: true,
                uvScale: 0.5,
            },
            { baseUvRepeat: 120 },
        );

        expect(resolved.u).toBe(60);
        expect(resolved.v).toBe(60);
    });
});
