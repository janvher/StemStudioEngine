import {BasicShadowMap, PCFSoftShadowMap} from "three";
import {describe, expect, it} from "vitest";

import {
    normalizeBackgroundGradient,
    normalizeGradientMode,
    parseBackgroundGradient,
    parseShadowMapType,
} from "./renderingSettingsNormalization";

describe("renderingSettingsNormalization", () => {
    it("parses common shadow map type labels", () => {
        expect(parseShadowMapType("Basic")).toBe(BasicShadowMap);
        expect(parseShadowMapType("PCFSoftShadowMap")).toBe(PCFSoftShadowMap);
        expect(parseShadowMapType("soft")).toBe(PCFSoftShadowMap);
        expect(parseShadowMapType({type: "2"})).toBe(PCFSoftShadowMap);
    });

    it("converts top/bottom gradient objects to CSS gradients", () => {
        expect(
            parseBackgroundGradient({
                topColor: "#87CEEB",
                bottomColor: "#f0e68c",
            })
        ).toBe("linear-gradient(180deg, #87CEEB 0%, #f0e68c 100%)");
    });

    it("converts stringified gradient JSON to CSS gradients", () => {
        expect(
            parseBackgroundGradient('{"topColor":"#87CEEB","bottomColor":"#f0e68c"}')
        ).toBe("linear-gradient(180deg, #87CEEB 0%, #f0e68c 100%)");
    });

    it("converts stop-based gradient objects to CSS gradients", () => {
        expect(
            normalizeBackgroundGradient({
                type: "linear",
                angle: 45,
                stops: [
                    {color: "#000000", position: 0},
                    {color: "#ffffff", position: 1},
                ],
            })
        ).toBe("linear-gradient(45deg, #000000 0%, #ffffff 100%)");
    });

    it("normalizes gradient mode casing", () => {
        expect(normalizeGradientMode("3D")).toBe("3d");
        expect(normalizeGradientMode("2d")).toBe("2d");
    });
});
