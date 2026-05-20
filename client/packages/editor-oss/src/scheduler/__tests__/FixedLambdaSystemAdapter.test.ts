import { describe, expect, it, vi } from "vitest";

import { FixedLambdaSystemAdapter } from "../adapters/FixedLambdaSystemAdapter";
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

describe("FixedLambdaSystemAdapter", () => {
    it("returns void when no lambda manager is available", () => {
        const adapter = new FixedLambdaSystemAdapter(() => undefined);

        expect(adapter.update(createFrameContext())).toBeUndefined();
    });

    it("passes the fixed timestep through to lambdaManager.fixedUpdate()", () => {
        const manager = {
            fixedUpdate: vi.fn(),
        };
        const adapter = new FixedLambdaSystemAdapter(() => manager as any);
        const context = createFrameContext({ fixedDeltaTime: 1 / 30 });

        adapter.update(context);

        expect(adapter.supportsTimeSlicing).toBe(false);
        expect(manager.fixedUpdate).toHaveBeenCalledWith(context.fixedDeltaTime, context);
    });
});
