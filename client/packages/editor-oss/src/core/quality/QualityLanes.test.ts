import { describe, expect, it } from "vitest";

import { getAdjacentPreset, getAllLanes, getLane, isLaneCeiling, isLaneFloor, getRungIndex } from "./QualityLanes";
import { QualityPresets } from "./QualityPresets";

describe("QualityLanes", () => {
    it("all lanes have valid rungs with at least 2 presets", () => {
        for (const lane of getAllLanes()) {
            expect(lane.rungs.length).toBeGreaterThanOrEqual(2);
            expect(lane.defaultRungIndex).toBeGreaterThanOrEqual(0);
            expect(lane.defaultRungIndex).toBeLessThan(lane.rungs.length);
        }
    });

    it("all lane presets exist in QualityPresets", () => {
        for (const lane of getAllLanes()) {
            for (const rung of lane.rungs) {
                const preset = QualityPresets.getPreset(rung);
                expect(preset, `Preset ${rung} for lane ${lane.lane} should exist`).toBeDefined();
            }
        }
    });

    it("getAdjacentPreset returns correct neighbors", () => {
        const lane = getLane('desktop_discrete');
        expect(getAdjacentPreset('desktop_discrete', lane.rungs[0]!, 'up')).toBe(lane.rungs[1]);
        expect(getAdjacentPreset('desktop_discrete', lane.rungs[0]!, 'down')).toBeNull();
        expect(getAdjacentPreset('desktop_discrete', lane.rungs[lane.rungs.length - 1]!, 'up')).toBeNull();
    });

    it("no preset can step outside its lane", () => {
        for (const lane of getAllLanes()) {
            expect(getAdjacentPreset(lane.lane, lane.rungs[0]!, 'down')).toBeNull();
            expect(getAdjacentPreset(lane.lane, lane.rungs[lane.rungs.length - 1]!, 'up')).toBeNull();
        }
    });

    it("isLaneFloor and isLaneCeiling work correctly", () => {
        const lane = getLane('apple_silicon');
        expect(isLaneFloor('apple_silicon', lane.rungs[0]!)).toBe(true);
        expect(isLaneFloor('apple_silicon', lane.rungs[1]!)).toBe(false);
        expect(isLaneCeiling('apple_silicon', lane.rungs[lane.rungs.length - 1]!)).toBe(true);
        expect(isLaneCeiling('apple_silicon', lane.rungs[0]!)).toBe(false);
    });

    it("getRungIndex returns correct index", () => {
        expect(getRungIndex('ios', 'ios_balanced')).toBe(0);
        expect(getRungIndex('ios', 'ios_high')).toBe(1);
        expect(getRungIndex('ios', 'nonexistent')).toBe(-1);
    });

    it("lane ordering is monotonically valid (pixelRatio non-decreasing)", () => {
        for (const lane of getAllLanes()) {
            let prevPixelRatio = 0;
            for (const rung of lane.rungs) {
                const preset = QualityPresets.getPreset(rung)!;
                expect(preset.settings.rendering.pixelRatio).toBeGreaterThanOrEqual(prevPixelRatio);
                prevPixelRatio = preset.settings.rendering.pixelRatio;
            }
        }
    });
});
