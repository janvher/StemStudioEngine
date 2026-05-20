import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";

import {FrameBudgetManager} from "../FrameBudgetManager";
import {PipelineStage} from "../types";

describe("FrameBudgetManager", () => {
    let manager: FrameBudgetManager;

    beforeEach(() => {
        manager = new FrameBudgetManager(14, 60);
    });

    afterEach(() => {
        manager.dispose();
    });

    describe("constructor", () => {
        it("should use provided budget", () => {
            const customManager = new FrameBudgetManager(20, 60);
            expect(customManager.activeBudget).toBe(20);
            customManager.dispose();
        });

        it("should use default values when not provided", () => {
            const defaultManager = new FrameBudgetManager();
            expect(defaultManager.activeBudget).toBe(14);
            defaultManager.dispose();
        });
    });

    describe("beginFrame", () => {
        it("should reset frame start time", () => {
            manager.beginFrame();
            const elapsed1 = manager.elapsed;

            // Wait a bit
            const start = performance.now();
            while (performance.now() - start < 5) {
                // busy wait
            }

            manager.beginFrame();
            const elapsed2 = manager.elapsed;

            expect(elapsed2).toBeLessThan(elapsed1 + 5);
        });

        it("should scale budget based on deltaTime when provided", () => {
            // With 16ms frame (60fps), budget should be 16 * 0.85 = 13.6ms
            manager.beginFrame(0.016);
            expect(manager.activeBudget).toBeCloseTo(13.6, 1);
        });

        it("should use config budget when no deltaTime provided", () => {
            manager.beginFrame();
            expect(manager.activeBudget).toBe(14);
        });
    });

    describe("elapsed", () => {
        it("should return time since beginFrame", () => {
            manager.beginFrame();

            // Busy wait for a bit
            const start = performance.now();
            while (performance.now() - start < 2) {
                // busy wait
            }

            expect(manager.elapsed).toBeGreaterThan(1);
        });
    });

    describe("remaining", () => {
        it("should return budget minus elapsed time", () => {
            manager.beginFrame();
            const remaining = manager.remaining;
            expect(remaining).toBeLessThanOrEqual(14);
            expect(remaining).toBeGreaterThan(0);
        });

        it("should never return negative", () => {
            manager.beginFrame();

            // Simulate long frame by mocking
            const originalNow = performance.now;
            vi.spyOn(performance, "now").mockReturnValue(originalNow() + 100);

            expect(manager.remaining).toBe(0);

            vi.restoreAllMocks();
        });
    });

    describe("isExhausted", () => {
        it("should return false when budget available", () => {
            manager.beginFrame();
            expect(manager.isExhausted).toBe(false);
        });

        it("should return true when remaining <= 0.5ms", () => {
            manager.beginFrame();

            // Mock performance.now to simulate exhausted budget
            const originalNow = performance.now;
            vi.spyOn(performance, "now").mockReturnValue(originalNow() + 100);

            expect(manager.isExhausted).toBe(true);

            vi.restoreAllMocks();
        });
    });

    describe("recordStageTime", () => {
        it("should track stage time with EMA smoothing", () => {
            manager.recordStageTime(PipelineStage.UPDATE, 5);
            expect(manager.getStageAvgTime(PipelineStage.UPDATE)).toBe(5);

            // Second recording should be smoothed (EMA alpha = 0.15)
            manager.recordStageTime(PipelineStage.UPDATE, 10);
            // Expected: 0.15 * 10 + 0.85 * 5 = 1.5 + 4.25 = 5.75
            expect(manager.getStageAvgTime(PipelineStage.UPDATE)).toBeCloseTo(5.75, 2);
        });

        it("should track different stages independently", () => {
            manager.recordStageTime(PipelineStage.UPDATE, 5);
            manager.recordStageTime(PipelineStage.FIXED_UPDATE, 10);

            expect(manager.getStageAvgTime(PipelineStage.UPDATE)).toBe(5);
            expect(manager.getStageAvgTime(PipelineStage.FIXED_UPDATE)).toBe(10);
        });
    });

    describe("getStageAvgTime", () => {
        it("should return 0 for untracked stage", () => {
            expect(manager.getStageAvgTime(PipelineStage.POST_UPDATE)).toBe(0);
        });
    });

    describe("recordRenderTime", () => {
        it("should track render time with EMA smoothing", () => {
            manager.recordRenderTime(8);
            expect(manager.renderTimeAvg).toBe(8 * 0.15);

            manager.recordRenderTime(10);
            // Expected: 0.15 * 10 + 0.85 * 1.2 = 1.5 + 1.02 = 2.52
            const expectedRenderTime = 0.15 * 10 + 0.85 * (8 * 0.15);
            expect(manager.renderTimeAvg).toBeCloseTo(expectedRenderTime, 2);
        });
    });

    describe("rebalance", () => {
        it("should adjust budget based on render time", () => {
            // Simulate some render time tracking
            for (let i = 0; i < 10; i++) {
                manager.recordRenderTime(5); // 5ms average render time
            }

            manager.rebalance();

            // At 60fps, frame time is ~16.67ms
            // Logic budget = 16.67 - renderTime - 1ms headroom
            // But clamped to max of config budget (14ms)
            expect(manager.activeBudget).toBeLessThanOrEqual(14);
            expect(manager.activeBudget).toBeGreaterThanOrEqual(2);
        });

        it("should clamp budget to minimum 2ms", () => {
            // Simulate very long render time
            for (let i = 0; i < 10; i++) {
                manager.recordRenderTime(15);
            }

            manager.rebalance();

            // Budget should be clamped to minimum 2ms
            expect(manager.activeBudget).toBeGreaterThanOrEqual(2);
        });

        it("should persist rebalanced cap across beginFrame", () => {
            // Force rebalance cap to minimum by simulating heavy render time.
            for (let i = 0; i < 20; i++) {
                manager.recordRenderTime(20);
            }
            manager.rebalance();

            // Without persistent cap this would be ~42.5ms.
            manager.beginFrame(0.05);
            expect(manager.activeBudget).toBe(2);
        });
    });

    describe("updateTargetFPS", () => {
        it("should update target FPS", () => {
            manager.updateTargetFPS(30);
            // No direct getter, but rebalance should use new FPS
            // At 30fps, frame time is ~33ms
            manager.rebalance();
            // Just verify no error - actual budget calculation uses new FPS internally
        });

        it("should ignore invalid FPS values", () => {
            const originalBudget = manager.activeBudget;
            manager.updateTargetFPS(0);
            manager.updateTargetFPS(-1);
            // Should not change anything
        });
    });

    describe("dispose", () => {
        it("should clear stage time tracking", () => {
            manager.recordStageTime(PipelineStage.UPDATE, 5);
            expect(manager.getStageAvgTime(PipelineStage.UPDATE)).toBe(5);

            manager.dispose();

            expect(manager.getStageAvgTime(PipelineStage.UPDATE)).toBe(0);
        });
    });
});
