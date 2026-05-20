import { describe, expect, it, vi } from "vitest";

import { BehaviorSystemAdapter } from "../adapters/BehaviorSystemAdapter";
import { FixedLambdaSystemAdapter } from "../adapters/FixedLambdaSystemAdapter";
import { LambdaSystemAdapter } from "../adapters/LambdaSystemAdapter";
import type { FrameContext } from "../types";

/**
 *
 * @param overrides
 */
function createFrameContext(overrides: Partial<FrameContext> = {}): FrameContext {
    return {
        deltaTime: 0.016,
        fixedDeltaTime: 1 / 60,
        frameCount: 1,
        interpolationAlpha: 1,
        fixedOverstep: 0,
        frameStartTime: 0,
        frameDeadline: 10,
        underRenderPressure: false,
        renderAvgMs: 0,
        spatialGrid: null,
        fixedUpdatesEnabled: true,
        ...overrides,
    };
}

describe("update system adapters", () => {
    it("BehaviorSystemAdapter should call update() and not rely on the sliced path", () => {
        const manager = {
            update: vi.fn(),
            updateSliced: vi.fn(),
        };
        const adapter = new BehaviorSystemAdapter(() => manager as any);
        const context = createFrameContext();

        const result = adapter.update(context);

        expect(result).toBeUndefined();
        expect(adapter.supportsTimeSlicing).toBe(false);
        expect(manager.update).toHaveBeenCalledWith(context.deltaTime, context);
        expect(manager.updateSliced).not.toHaveBeenCalled();
    });

    it("LambdaSystemAdapter should call update() and not return a generator", () => {
        const manager = {
            update: vi.fn(),
            updateSliced: vi.fn(),
        };
        const adapter = new LambdaSystemAdapter(() => manager as any);
        const context = createFrameContext();

        const result = adapter.update(context);

        expect(result).toBeUndefined();
        expect(adapter.supportsTimeSlicing).toBe(false);
        expect(manager.update).toHaveBeenCalledWith(context.deltaTime, context);
        expect(manager.updateSliced).not.toHaveBeenCalled();
    });

    it("FixedLambdaSystemAdapter should call fixedUpdate() directly", () => {
        const manager = {
            fixedUpdate: vi.fn(),
            fixedUpdateSliced: vi.fn(),
        };
        const adapter = new FixedLambdaSystemAdapter(() => manager as any);
        const context = createFrameContext({ fixedDeltaTime: 1 / 30 });

        const result = adapter.update(context);

        expect(result).toBeUndefined();
        expect(manager.fixedUpdate).toHaveBeenCalledWith(context.fixedDeltaTime, context);
        expect(manager.fixedUpdateSliced).not.toHaveBeenCalled();
    });
});
