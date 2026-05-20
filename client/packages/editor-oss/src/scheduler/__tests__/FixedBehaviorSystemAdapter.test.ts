import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { FixedBehaviorSystemAdapter } from "../adapters/FixedBehaviorSystemAdapter";
import { PipelineStage, FrameContext } from "../types";
import type BehaviorManager from "@stem/editor-oss/behaviors/BehaviorManager";

// Mock behavior with fixedUpdate
const createMockBehavior = (id: string, hasFixedUpdate = true, isPaused = false) => ({
    id,
    uuid: `uuid-${id}`,
    isPaused,
    fixedUpdate: hasFixedUpdate ? vi.fn() : undefined,
    update: vi.fn(),
});

// Mock BehaviorManager
const createMockBehaviorManager = (behaviors: ReturnType<typeof createMockBehavior>[]) => ({
    behaviors,
    isProcessing: false,
    fixedUpdate(fixedDeltaTime: number, _context?: FrameContext): void {
        for (let i = 0; i < behaviors.length; i++) {
            const behavior = behaviors[i]!;
            if (typeof behavior.fixedUpdate !== "function") continue;
            if (behavior.isPaused) continue;
            behavior.fixedUpdate(fixedDeltaTime);
        }
    },
});

describe("FixedBehaviorSystemAdapter", () => {
    let adapter: FixedBehaviorSystemAdapter;
    let mockManager: ReturnType<typeof createMockBehaviorManager>;

    const createFrameContext = (overrides: Partial<FrameContext> = {}): FrameContext => ({
        deltaTime: 0.016,
        fixedDeltaTime: 0.01667, // ~60Hz
        frameCount: 1,
        interpolationAlpha: 0,
        spatialGrid: null,
        fixedOverstep: 0,
        frameStartTime: performance.now(),
        frameDeadline: performance.now() + 14,
        underRenderPressure: false,
        renderAvgMs: 0,
        fixedUpdatesEnabled: true,
        ...overrides,
    });

    beforeEach(() => {
        mockManager = createMockBehaviorManager([]);
        adapter = new FixedBehaviorSystemAdapter(() => mockManager as unknown as BehaviorManager);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("system properties", () => {
        it("should have id 'fixed-behavior-system'", () => {
            expect(adapter.id).toBe("fixed-behavior-system");
        });

        it("should run in FIXED_UPDATE stage", () => {
            expect(adapter.stage).toBe(PipelineStage.FIXED_UPDATE);
        });

        it("should have priority 150 (after physics, before collision)", () => {
            expect(adapter.priority).toBe(150);
        });

        it("should read physics and transform", () => {
            expect(adapter.reads).toContain("physics");
            expect(adapter.reads).toContain("transform");
        });

        it("should write transform and behavior-state", () => {
            expect(adapter.writes).toContain("transform");
            expect(adapter.writes).toContain("behavior-state");
        });

        it("should require main thread", () => {
            expect(adapter.requiresMainThread).toBe(true);
        });

        it("should not support time slicing", () => {
            expect(adapter.supportsTimeSlicing).toBe(false);
        });
    });

    describe("update", () => {
        it("should return early when manager is undefined", () => {
            const nullAdapter = new FixedBehaviorSystemAdapter(() => undefined);
            const result = nullAdapter.update(createFrameContext());
            expect(result).toBeUndefined();
        });

        it("should call fixedUpdate on behavior manager", () => {
            const behavior = createMockBehavior("test");
            mockManager = createMockBehaviorManager([behavior]);
            adapter = new FixedBehaviorSystemAdapter(() => mockManager as unknown as BehaviorManager);

            const context = createFrameContext({ fixedDeltaTime: 0.01667 });
            adapter.update(context);

            expect(behavior.fixedUpdate).toHaveBeenCalledWith(0.01667);
        });

        it("should skip behaviors without fixedUpdate method", () => {
            const behaviorWithFixed = createMockBehavior("with-fixed", true);
            const behaviorWithoutFixed = createMockBehavior("without-fixed", false);
            mockManager = createMockBehaviorManager([behaviorWithFixed, behaviorWithoutFixed]);
            adapter = new FixedBehaviorSystemAdapter(() => mockManager as unknown as BehaviorManager);

            adapter.update(createFrameContext());

            expect(behaviorWithFixed.fixedUpdate).toHaveBeenCalled();
            expect(behaviorWithoutFixed.fixedUpdate).toBeUndefined();
        });

        it("should skip paused behaviors", () => {
            const activeBehavior = createMockBehavior("active", true, false);
            const pausedBehavior = createMockBehavior("paused", true, true);
            mockManager = createMockBehaviorManager([activeBehavior, pausedBehavior]);
            adapter = new FixedBehaviorSystemAdapter(() => mockManager as unknown as BehaviorManager);

            adapter.update(createFrameContext());

            expect(activeBehavior.fixedUpdate).toHaveBeenCalled();
            expect(pausedBehavior.fixedUpdate).not.toHaveBeenCalled();
        });

        it("should pass fixedDeltaTime from FrameContext", () => {
            const behavior = createMockBehavior("test");
            mockManager = createMockBehaviorManager([behavior]);
            adapter = new FixedBehaviorSystemAdapter(() => mockManager as unknown as BehaviorManager);

            const customFixedDt = 0.03333; // 30Hz
            adapter.update(createFrameContext({ fixedDeltaTime: customFixedDt }));

            expect(behavior.fixedUpdate).toHaveBeenCalledWith(customFixedDt);
        });

        it("should process all behaviors in one call", () => {
            // Create 20 behaviors
            const behaviors = Array.from({ length: 20 }, (_, i) =>
                createMockBehavior(`behavior-${i}`),
            );
            mockManager = createMockBehaviorManager(behaviors);
            adapter = new FixedBehaviorSystemAdapter(() => mockManager as unknown as BehaviorManager);

            adapter.update(createFrameContext());

            // All behaviors should have been processed
            behaviors.forEach((b) => {
                expect(b.fixedUpdate).toHaveBeenCalledTimes(1);
            });
        });

        it("should process all behaviors in a single update call", () => {
            const behaviors = Array.from({ length: 10 }, (_, i) =>
                createMockBehavior(`behavior-${i}`),
            );
            mockManager = createMockBehaviorManager(behaviors);
            adapter = new FixedBehaviorSystemAdapter(() => mockManager as unknown as BehaviorManager);

            adapter.update(createFrameContext());

            // All behaviors should have been processed
            behaviors.forEach((b) => {
                expect(b.fixedUpdate).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe("lazy resolution", () => {
        it("should defer manager resolution until update is called", () => {
            let managerCreated = false;
            const lazyAdapter = new FixedBehaviorSystemAdapter(() => {
                managerCreated = true;
                return mockManager as unknown as BehaviorManager;
            });

            // Manager not resolved yet
            expect(managerCreated).toBe(false);

            // Trigger update
            lazyAdapter.update(createFrameContext());

            // Now manager should be resolved
            expect(managerCreated).toBe(true);
        });
    });
});
