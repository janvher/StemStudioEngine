import {describe, expect, it} from "vitest";

import {measureViewportSafeArea} from "./viewportSafeArea";

describe("measureViewportSafeArea", () => {
    it("falls back to the full window when no viewport is available", () => {
        expect(measureViewportSafeArea({windowWidth: 1280, windowHeight: 720})).toEqual({
            left: 0,
            top: 0,
            right: 1280,
            bottom: 720,
            width: 1280,
            height: 720,
            insetLeft: 0,
            insetTop: 0,
            insetRight: 0,
            insetBottom: 0,
        });
    });

    it("derives safe insets from the viewport rect", () => {
        expect(measureViewportSafeArea({
            windowWidth: 1280,
            windowHeight: 720,
            rect: {
                left: 24,
                top: 48,
                width: 1200,
                height: 640,
                right: 1224,
                bottom: 688,
            },
        })).toEqual({
            left: 24,
            top: 48,
            right: 1224,
            bottom: 688,
            width: 1200,
            height: 640,
            insetLeft: 24,
            insetTop: 48,
            insetRight: 56,
            insetBottom: 32,
        });
    });

    it("clamps an oversized rect back into the window bounds", () => {
        expect(measureViewportSafeArea({
            windowWidth: 1000,
            windowHeight: 600,
            rect: {
                left: -20,
                top: 40,
                width: 1100,
                height: 700,
                right: 1080,
                bottom: 740,
            },
        })).toEqual({
            left: 0,
            top: 40,
            right: 1000,
            bottom: 600,
            width: 1000,
            height: 560,
            insetLeft: 0,
            insetTop: 40,
            insetRight: 0,
            insetBottom: 0,
        });
    });

    it("shrinks the safe area for edge-anchored host overlays inside the viewport", () => {
        expect(measureViewportSafeArea({
            windowWidth: 1280,
            windowHeight: 720,
            rect: {
                left: 0,
                top: 48,
                width: 1280,
                height: 672,
                right: 1280,
                bottom: 720,
            },
            occluders: [{
                left: 1160,
                top: 676,
                width: 108,
                height: 32,
                right: 1268,
                bottom: 708,
            }],
        })).toEqual({
            left: 0,
            top: 48,
            right: 1160,
            bottom: 676,
            width: 1160,
            height: 628,
            insetLeft: 0,
            insetTop: 48,
            insetRight: 120,
            insetBottom: 44,
        });
    });
});