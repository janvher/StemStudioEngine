import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";

import {FrameOrchestrator, FrameOrchestratorConfig} from "../FrameOrchestrator";
import {PipelineStage, ISystem, FrameContext, hasBudget} from "../types";

// Mock system for testing
class MockSystem implements ISystem {
    readonly id: string;
    readonly stage: PipelineStage;
    readonly priority: number;
    readonly reads: string[];
    readonly writes: string[];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;

    updateCalls: FrameContext[] = [];
    updateFn: ((context: FrameContext) => void | Generator) | null = null;

    constructor(
        id: string,
        stage: PipelineStage,
        priority: number = 100,
        reads: string[] = [],
        writes: string[] = [],
    ) {
        this.id = id;
        this.stage = stage;
        this.priority = priority;
        this.reads = reads;
        this.writes = writes;
    }

    update(context: FrameContext): void | Generator {
        this.updateCalls.push({...context});
        if (this.updateFn) {
            return this.updateFn(context);
        }
    }
}

describe("FrameOrchestrator", () => {
    let orchestrator: FrameOrchestrator;

    beforeEach(() => {
        orchestrator = new FrameOrchestrator();
    });

    afterEach(() => {
        orchestrator.dispose();
    });

    describe("constructor", () => {
        it("should use default config values", () => {
            expect(orchestrator.getFrameCount()).toBe(0);
            expect(orchestrator.getInterpolationAlpha()).toBe(1);
        });

        it("should accept custom config", () => {
            const customConfig: Partial<FrameOrchestratorConfig> = {
                targetFPS: 30,
                frameBudgetMs: 30,
            };
            const customOrchestrator = new FrameOrchestrator(customConfig);
            expect(customOrchestrator.getBudgetManager().activeBudget).toBe(30);
            customOrchestrator.dispose();
        });
    });

    describe("system registration", () => {
        it("should register a system", () => {
            const system = new MockSystem("test-system", PipelineStage.UPDATE);
            orchestrator.registerSystem(system);
            // No error means success - system is registered internally
        });

        it("should warn when registering duplicate system", () => {
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
            const system = new MockSystem("test-system", PipelineStage.UPDATE);

            orchestrator.registerSystem(system);
            orchestrator.registerSystem(system);

            expect(warnSpy).toHaveBeenCalledWith(
                '[FrameOrchestrator] System "test-system" already registered',
            );
            warnSpy.mockRestore();
        });

        it("should unregister a system", () => {
            const system = new MockSystem("test-system", PipelineStage.UPDATE);
            orchestrator.registerSystem(system);
            orchestrator.unregisterSystem("test-system");
            // Should not throw and system should not be called in tick
            orchestrator.tick(0.016);
            expect(system.updateCalls.length).toBe(0);
        });
    });

    describe("tick", () => {
        it("should increment frame count", () => {
            orchestrator.tick(0.016);
            expect(orchestrator.getFrameCount()).toBe(1);

            orchestrator.tick(0.016);
            expect(orchestrator.getFrameCount()).toBe(2);
        });

        it("should call systems in pipeline stage order", () => {
            const callOrder: string[] = [];

            const inputSystem = new MockSystem("input", PipelineStage.INPUT, 100);
            inputSystem.updateFn = () => {
                callOrder.push("input");
            };

            const fixedSystem = new MockSystem("fixed", PipelineStage.FIXED_UPDATE, 100);
            fixedSystem.updateFn = () => {
                callOrder.push("fixed");
            };

            const preUpdateSystem = new MockSystem("pre", PipelineStage.PRE_UPDATE, 100);
            preUpdateSystem.updateFn = () => {
                callOrder.push("pre");
            };

            const updateSystem = new MockSystem("update", PipelineStage.UPDATE, 100);
            updateSystem.updateFn = () => {
                callOrder.push("update");
            };

            const postUpdateSystem = new MockSystem("post", PipelineStage.POST_UPDATE, 100);
            postUpdateSystem.updateFn = () => {
                callOrder.push("post");
            };

            orchestrator.registerSystem(postUpdateSystem);
            orchestrator.registerSystem(inputSystem);
            orchestrator.registerSystem(updateSystem);
            orchestrator.registerSystem(preUpdateSystem);
            orchestrator.registerSystem(fixedSystem);

            // Use 20ms delta to ensure fixed update runs (default fixed timestep is 16.67ms)
            orchestrator.tick(0.020);

            // Verify order: INPUT -> FIXED_UPDATE -> PRE_UPDATE -> UPDATE -> POST_UPDATE
            expect(callOrder).toEqual(["input", "fixed", "pre", "update", "post"]);
        });

        it("should pass correct deltaTime to systems", () => {
            const system = new MockSystem("test", PipelineStage.UPDATE);
            orchestrator.registerSystem(system);

            orchestrator.tick(0.032);

            expect(system.updateCalls.length).toBe(1);
            expect(system.updateCalls[0]!.deltaTime).toBe(0.032);
        });

        it("should pass frame count in context", () => {
            const system = new MockSystem("test", PipelineStage.UPDATE);
            orchestrator.registerSystem(system);

            orchestrator.tick(0.016);
            expect(system.updateCalls[0]!.frameCount).toBe(1);

            orchestrator.tick(0.016);
            expect(system.updateCalls[1]!.frameCount).toBe(2);
        });

        it("should expose deadline-based timing fields in context", () => {
            const system = new MockSystem("test", PipelineStage.UPDATE);
            orchestrator.registerSystem(system);

            orchestrator.tick(0.016);

            const context = system.updateCalls[0]!;
            expect(context.frameStartTime).toBeGreaterThan(0);
            expect(context.frameDeadline).toBeGreaterThan(context.frameStartTime);
            expect("frameBudgetRemaining" in context).toBe(false);
        });

        it("should report budget exhaustion via hasBudget() against the shared deadline", () => {
            const nowSpy = vi.spyOn(performance, "now").mockReturnValue(10);

            expect(hasBudget({
                deltaTime: 0.016,
                fixedDeltaTime: 1 / 60,
                frameCount: 1,
                interpolationAlpha: 1,
                fixedOverstep: 0,
                frameStartTime: 0,
                frameDeadline: 5,
                underRenderPressure: false,
                renderAvgMs: 0,
                spatialGrid: null,
                fixedUpdatesEnabled: true,
            })).toBe(false);

            nowSpy.mockRestore();
        });

        it("should run RENDER immediately after logic stages", () => {
            const callOrder: string[] = [];

            const updateSystem = new MockSystem("update", PipelineStage.UPDATE, 100);
            updateSystem.updateFn = () => {
                callOrder.push("update");
            };

            const renderSystem = new MockSystem("render", PipelineStage.RENDER, 100);
            renderSystem.updateFn = () => {
                callOrder.push("render");
            };

            const renderOrchestrator = new FrameOrchestrator({
                scheduleRender: true,
                targetFPS: 30,
                frameBudgetMs: 100,
            });
            renderOrchestrator.registerSystem(updateSystem);
            renderOrchestrator.registerSystem(renderSystem);

            renderOrchestrator.tick(0.016);
            expect(callOrder).toEqual(["update", "render"]);

            renderOrchestrator.tick(0.016);
            expect(callOrder).toEqual(["update", "render", "update", "render"]);
            renderOrchestrator.dispose();
        });
    });

    describe("fixed timestep accumulator", () => {
        it("should run FIXED_UPDATE multiple times when deltaTime exceeds fixed timestep", () => {
            const fixedOrchestrator = new FrameOrchestrator({
                fixedTimestepMs: 16.67, // 60Hz
                maxFixedStepsPerFrame: 5,
                deltaTimePressureThreshold: 100, // disable pressure for this test
            });

            const fixedSystem = new MockSystem("physics", PipelineStage.FIXED_UPDATE);
            fixedOrchestrator.registerSystem(fixedSystem);

            // Tick with 50ms delta - floor(50/16.67) = 2 fixed updates on first tick
            // (accumulator starts at 0, so 50ms gives us 2 full 16.67ms steps with remainder)
            fixedOrchestrator.tick(0.05);

            expect(fixedSystem.updateCalls.length).toBeGreaterThanOrEqual(2);

            // Second tick should process remaining accumulator plus new delta
            fixedOrchestrator.tick(0.05);

            // Total should be at least 5 updates across two ticks
            expect(fixedSystem.updateCalls.length).toBeGreaterThanOrEqual(5);
            fixedOrchestrator.dispose();
        });

        it("should respect maxFixedStepsPerFrame", () => {
            const fixedOrchestrator = new FrameOrchestrator({
                fixedTimestepMs: 16.67,
                maxFixedStepsPerFrame: 2,
                deltaTimePressureThreshold: 100, // disable pressure for this test
            });

            const fixedSystem = new MockSystem("physics", PipelineStage.FIXED_UPDATE);
            fixedOrchestrator.registerSystem(fixedSystem);

            // Tick with 100ms delta (would need 6 steps, but capped at 2)
            fixedOrchestrator.tick(0.1);

            expect(fixedSystem.updateCalls.length).toBe(2);
            fixedOrchestrator.dispose();
        });

        it("should use fixed deltaTime for FIXED_UPDATE systems", () => {
            const fixedOrchestrator = new FrameOrchestrator({
                fixedTimestepMs: 16.67,
            });

            const fixedSystem = new MockSystem("physics", PipelineStage.FIXED_UPDATE);
            fixedOrchestrator.registerSystem(fixedSystem);

            fixedOrchestrator.tick(0.05);

            // All fixed updates should receive the fixed deltaTime
            for (const call of fixedSystem.updateCalls) {
                expect(call.fixedDeltaTime).toBeCloseTo(0.01667, 3);
            }
            fixedOrchestrator.dispose();
        });

        it("should clamp accumulator on spiral-of-death (accumulator > 2x fixedDt)", () => {
            const fixedOrchestrator = new FrameOrchestrator({
                fixedTimestepMs: 16.67,
                maxFixedStepsPerFrame: 3,
                deltaTimePressureThreshold: 100, // disable pressure for this test
            });

            const fixedSystem = new MockSystem("physics", PipelineStage.FIXED_UPDATE);
            fixedOrchestrator.registerSystem(fixedSystem);

            // First tick with huge delta - should hit max steps
            fixedOrchestrator.tick(0.5);
            const firstTickCalls = fixedSystem.updateCalls.length;
            expect(firstTickCalls).toBe(3); // Capped at maxFixedStepsPerFrame

            // Next tick - accumulator should have been clamped, so should only run ~1 step
            fixedOrchestrator.tick(0.016);
            // After clamp, we should have a fresh start
            expect(fixedSystem.updateCalls.length).toBeLessThanOrEqual(4);

            fixedOrchestrator.dispose();
        });

        it("should skip FIXED_UPDATE when tab is hidden", () => {
            const fixedOrchestrator = new FrameOrchestrator({
                fixedTimestepMs: 16.67,
                maxFixedStepsPerFrame: 3,
            });
            const fixedSystem = new MockSystem("physics", PipelineStage.FIXED_UPDATE);
            fixedOrchestrator.registerSystem(fixedSystem);

            (fixedOrchestrator as any)._isTabVisible = false;

            fixedOrchestrator.tick(0.1);
            expect(fixedSystem.updateCalls.length).toBe(0);

            fixedOrchestrator.dispose();
        });

        it("should clamp fixed steps to one under render pressure", () => {
            const fixedOrchestrator = new FrameOrchestrator({
                fixedTimestepMs: 16.67,
                maxFixedStepsPerFrame: 5,
            });
            const fixedSystem = new MockSystem("physics", PipelineStage.FIXED_UPDATE);
            fixedOrchestrator.registerSystem(fixedSystem);

            fixedOrchestrator.tick(0.05);

            expect(fixedSystem.updateCalls.length).toBe(1);
            fixedOrchestrator.dispose();
        });
    });

    describe("interpolation alpha", () => {
        it("should calculate interpolation alpha based on accumulator", () => {
            const fixedOrchestrator = new FrameOrchestrator({
                fixedTimestepMs: 16.67,
            });

            fixedOrchestrator.tick(0.01);
            const alpha = fixedOrchestrator.getInterpolationAlpha();

            // With 10ms elapsed and 16.67ms fixed step, alpha should be ~0.6
            expect(alpha).toBeGreaterThan(0);
            expect(alpha).toBeLessThan(1);

            fixedOrchestrator.dispose();
        });
    });

    describe("updateConfig", () => {
        it("should update config at runtime", () => {
            orchestrator.updateConfig({frameBudgetMs: 20});
            expect(orchestrator.getBudgetManager().activeBudget).toBe(20);
        });

        it("should reset accumulator when fixedTimestepMs changes", () => {
            // First tick to accumulate some time
            orchestrator.tick(0.01);

            // Update fixed timestep
            orchestrator.updateConfig({fixedTimestepMs: 33.33});

            // Accumulator should be reset (this is internal, but we can verify by behavior)
            const fixedSystem = new MockSystem("physics", PipelineStage.FIXED_UPDATE);
            orchestrator.registerSystem(fixedSystem);

            // With reset accumulator and 16ms tick, may or may not trigger fixed update
            orchestrator.tick(0.016);
            // Just verify no crash - accumulator reset prevents strange behavior
        });
    });

    describe("dispose", () => {
        it("should clean up all resources", () => {
            const system = new MockSystem("test", PipelineStage.UPDATE);
            orchestrator.registerSystem(system);

            // Should not throw
            orchestrator.dispose();

            // Ticking after dispose should not call systems (internal check)
            // Note: The actual implementation might throw or silently fail
            // This test just ensures dispose completes without error
        });
    });

    describe("scheduleRender", () => {
        it("should execute scheduled render callbacks in the same tick render stage", () => {
            const renderFrame = vi.fn();
            const renderOrchestrator = new FrameOrchestrator({
                scheduleRender: true,
                targetFPS: 30,
            });

            renderOrchestrator.scheduleRender(renderFrame);
            expect(renderFrame).not.toHaveBeenCalled();

            renderOrchestrator.tick(0.016);
            expect(renderFrame).toHaveBeenCalledTimes(1);

            renderOrchestrator.tick(0.016);
            expect(renderFrame).toHaveBeenCalledTimes(1);
            renderOrchestrator.dispose();
        });

        it("should render in the same frame when scheduled rendering is enabled", () => {
            const callOrder: string[] = [];

            const updateSystem = new MockSystem("update", PipelineStage.UPDATE, 100);
            updateSystem.updateFn = () => {
                callOrder.push("update");
            };

            const renderSystem = new MockSystem("render", PipelineStage.RENDER, 100);
            renderSystem.updateFn = () => {
                callOrder.push("render");
            };

            const renderOrchestrator = new FrameOrchestrator({
                scheduleRender: true,
            });
            renderOrchestrator.registerSystem(updateSystem);
            renderOrchestrator.registerSystem(renderSystem);

            renderOrchestrator.tick(0.016);

            expect(callOrder).toEqual(["update", "render"]);
            renderOrchestrator.dispose();
        });

        it("should run the render pressure hook before render", () => {
            const callOrder: string[] = [];
            const renderOrchestrator = new FrameOrchestrator({
                scheduleRender: true,
            });

            renderOrchestrator.setRenderPressurePolicy({
                update: () => {
                    callOrder.push("pressure");
                },
            });

            const updateSystem = new MockSystem("update", PipelineStage.UPDATE, 100);
            updateSystem.updateFn = () => {
                callOrder.push("update");
            };

            const renderSystem = new MockSystem("render", PipelineStage.RENDER, 100);
            renderSystem.updateFn = () => {
                callOrder.push("render");
            };

            renderOrchestrator.registerSystem(updateSystem);
            renderOrchestrator.registerSystem(renderSystem);

            renderOrchestrator.tick(0.016);

            expect(callOrder).toEqual(["update", "pressure", "render"]);
            renderOrchestrator.dispose();
        });

    });
});

describe("FrameOrchestrator time-slicing", () => {
    it("should not resume suspended generators ahead of fresh UPDATE work", () => {
        const orchestrator = new FrameOrchestrator({ enableTimeSlicing: true });
        const resumeSpy = vi.spyOn((orchestrator as any).timeSliceRunner, "resumeAll");

        const generatorSystem: ISystem = {
            id: "generator-system",
            stage: PipelineStage.UPDATE,
            priority: 100,
            reads: [],
            writes: [],
            requiresMainThread: true,
            supportsTimeSlicing: true,
            *update(): Generator {
                yield;
                yield;
            },
        };

        orchestrator.registerSystem(generatorSystem);
        orchestrator.tick(0.016);

        expect(resumeSpy).not.toHaveBeenCalled();
        orchestrator.dispose();
    });

    it("should handle generator-returning systems", () => {
        const orchestrator = new FrameOrchestrator({enableTimeSlicing: true});

        let generatorRunCount = 0;
        const generatorSystem: ISystem = {
            id: "generator-system",
            stage: PipelineStage.UPDATE,
            priority: 100,
            reads: [],
            writes: [],
            requiresMainThread: true,
            supportsTimeSlicing: true,
            *update(context: FrameContext): Generator {
                generatorRunCount++;
                yield;
                generatorRunCount++;
                yield;
                generatorRunCount++;
            },
        };

        orchestrator.registerSystem(generatorSystem);
        orchestrator.tick(0.016);

        // Generator should have been run (at least started)
        expect(generatorRunCount).toBeGreaterThan(0);

        orchestrator.dispose();
    });

    it("should discard stale suspended generators and start a fresh pass next frame", () => {
        const orchestrator = new FrameOrchestrator({
            enableTimeSlicing: true,
        });
        const discardSpy = vi.spyOn((orchestrator as any).timeSliceRunner, "discardSuspended");
        let updateCalls = 0;

        const generatorSystem: ISystem = {
            id: "generator-system",
            stage: PipelineStage.UPDATE,
            priority: 100,
            reads: [],
            writes: [],
            requiresMainThread: true,
            supportsTimeSlicing: true,
            *update(): Generator {
                updateCalls++;
                yield;
                yield;
            },
        };

        orchestrator.registerSystem(generatorSystem);

        // Tick 1: Force the generator to be suspended by making budget appear exhausted
        // after the first yield. Mock performance.now() to return past the deadline.
        const realNow = performance.now;
        const budgetMgr = orchestrator.getBudgetManager();
        orchestrator.tick(0.016);
        const deadline = budgetMgr.deadline;

        // The generator completed because real time was within budget.
        // Instead, spy on timeSliceRunner.run to force suspension.
        // Simpler approach: directly suspend a generator so tick 2 sees it.
        const runner = (orchestrator as any).timeSliceRunner;
        // Reset and manually create a suspended state
        /**
         *
         */
        function* staleGen(): Generator { yield; }
        runner.suspended = new Map([["generator-system", staleGen()]]);

        // Tick 2: orchestrator should see stale suspended generator and discard it
        orchestrator.tick(0.016);

        expect(updateCalls).toBe(2); // Called once per tick
        expect(discardSpy).toHaveBeenCalledWith("generator-system");
        discardSpy.mockRestore();
        orchestrator.dispose();
    });

    it("should run non-time-sliceable UPDATE generators to completion in-frame", () => {
        const orchestrator = new FrameOrchestrator({ enableTimeSlicing: true });
        let progress = 0;

        const generatorSystem: ISystem = {
            id: "non-slice-update-generator",
            stage: PipelineStage.UPDATE,
            priority: 100,
            reads: [],
            writes: [],
            requiresMainThread: true,
            supportsTimeSlicing: false,
            *update(): Generator {
                progress = 1;
                yield;
                progress = 2;
                yield;
                progress = 3;
            },
        };

        orchestrator.registerSystem(generatorSystem);
        orchestrator.tick(0.016);

        expect(progress).toBe(3);
        orchestrator.dispose();
    });

    it("should run FIXED_UPDATE generators to completion in-frame", () => {
        const orchestrator = new FrameOrchestrator({ enableTimeSlicing: true });
        let progress = 0;

        const fixedGeneratorSystem: ISystem = {
            id: "fixed-generator-system",
            stage: PipelineStage.FIXED_UPDATE,
            priority: 100,
            reads: [],
            writes: [],
            requiresMainThread: true,
            supportsTimeSlicing: true,
            *update(): Generator {
                progress = 1;
                yield;
                progress = 2;
                yield;
                progress = 3;
            },
        };

        orchestrator.registerSystem(fixedGeneratorSystem);
        orchestrator.tick(0.020);

        expect(progress).toBe(3);
        orchestrator.dispose();
    });
});
