import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";

import {TimeSliceRunner} from "../TimeSliceRunner";

describe("TimeSliceRunner", () => {
    let runner: TimeSliceRunner;

    beforeEach(() => {
        runner = new TimeSliceRunner();
    });

    afterEach(() => {
        runner.dispose();
    });

    describe("run", () => {
        it("should complete a simple generator", () => {
            let completionCount = 0;
            /**
             *
             */
            function* simpleGenerator(): Generator {
                completionCount++;
                yield;
                completionCount++;
            }

            const deadline = performance.now() + 1000; // Far future
            const completed = runner.run("test", simpleGenerator(), deadline);

            expect(completed).toBe(true);
            expect(completionCount).toBe(2);
        });

        it("should suspend generator when budget exhausted", () => {
            let yieldCount = 0;

            /**
             *
             */
            function* longGenerator(): Generator {
                for (let i = 0; i < 100; i++) {
                    yieldCount++;
                    yield;
                }
            }

            // Use deadline that's already passed (zero budget)
            const deadline = performance.now();

            const completed = runner.run("test", longGenerator(), deadline);

            // Should suspend immediately since budget is exhausted
            expect(completed).toBe(false);
            expect(yieldCount).toBe(1); // First iteration before budget check
        });

        it("should track suspended generators", () => {
            /**
             *
             */
            function* generator(): Generator {
                yield;
                yield;
            }

            const deadline = performance.now(); // Already passed
            runner.run("test", generator(), deadline);

            expect(runner.pendingCount).toBe(1);
        });

        it("should remove completed generator from suspended", () => {
            /**
             *
             */
            function* generator(): Generator {
                yield;
            }

            const deadline = performance.now() + 1000; // Far future
            runner.run("test", generator(), deadline);

            expect(runner.pendingCount).toBe(0);
        });
    });

    describe("resumeAll", () => {
        it("should resume suspended generators", () => {
            let progress = 0;

            /**
             *
             */
            function* generator(): Generator {
                progress = 1;
                yield;
                progress = 2;
                yield;
                progress = 3;
            }

            // First run with no budget - suspends immediately
            const deadline1 = performance.now(); // Already passed
            runner.run("test", generator(), deadline1);
            expect(progress).toBe(1);
            expect(runner.pendingCount).toBe(1);

            // Resume with budget
            const deadline2 = performance.now() + 1000; // Far future
            runner.resumeAll(deadline2);

            expect(progress).toBe(3);
            expect(runner.pendingCount).toBe(0);
        });

        it("should guarantee minimum progress when budget is very low", () => {
            let progress = 0;

            /**
             *
             */
            function* generator(): Generator {
                progress = 1;
                yield;
                progress = 2;
            }

            // Suspend
            const deadline1 = performance.now(); // Already passed
            runner.run("test", generator(), deadline1);
            expect(progress).toBe(1);

            // Resume with too low budget (< 0.5ms) — should still advance one step
            const deadline2 = performance.now() + 0.3; // Very small budget
            runner.resumeAll(deadline2);

            // Should advance by one step (minimum-progress guarantee)
            expect(progress).toBe(2);
            // Generator completed, so no longer pending
            expect(runner.pendingCount).toBe(0);
        });

        it("should guarantee one iteration per suspended generator when budget is exhausted", () => {
            let progressA = 0;
            let progressB = 0;

            /**
             *
             */
            function* generatorA(): Generator {
                progressA = 1;
                yield;
                progressA = 2;
                yield;
                progressA = 3;
            }

            /**
             *
             */
            function* generatorB(): Generator {
                progressB = 1;
                yield;
                progressB = 2;
                yield;
                progressB = 3;
            }

            // Suspend both with zero budget
            const deadline1 = performance.now(); // Already passed
            runner.run("genA", generatorA(), deadline1);
            runner.run("genB", generatorB(), deadline1);
            expect(progressA).toBe(1);
            expect(progressB).toBe(1);
            expect(runner.pendingCount).toBe(2);

            // Resume with zero budget — each should advance exactly one step
            const deadline2 = performance.now(); // Already passed
            runner.resumeAll(deadline2);

            expect(progressA).toBe(2);
            expect(progressB).toBe(2);
            // Both still suspended (not yet done)
            expect(runner.pendingCount).toBe(2);
        });

        it("should handle multiple suspended generators", () => {
            let progressA = 0;
            let progressB = 0;

            /**
             *
             */
            function* generatorA(): Generator {
                progressA = 1;
                yield;
                progressA = 2;
            }

            /**
             *
             */
            function* generatorB(): Generator {
                progressB = 1;
                yield;
                progressB = 2;
            }

            // Suspend both
            const deadline1 = performance.now(); // Already passed
            runner.run("genA", generatorA(), deadline1);
            runner.run("genB", generatorB(), deadline1);

            expect(runner.pendingCount).toBe(2);

            // Resume both
            const deadline2 = performance.now() + 1000; // Far future
            runner.resumeAll(deadline2);

            expect(progressA).toBe(2);
            expect(progressB).toBe(2);
            expect(runner.pendingCount).toBe(0);
        });

        it("should do nothing when no generators suspended", () => {
            const deadline = performance.now() + 1000; // Far future
            // Should not throw
            runner.resumeAll(deadline);
            expect(runner.pendingCount).toBe(0);
        });
    });

    describe("pendingCount", () => {
        it("should return 0 initially", () => {
            expect(runner.pendingCount).toBe(0);
        });

        it("should track suspended generators", () => {
            /**
             *
             */
            function* gen(): Generator {
                yield;
            }

            const deadline = performance.now(); // Already passed

            runner.run("gen1", gen(), deadline);
            expect(runner.pendingCount).toBe(1);

            runner.run("gen2", gen(), deadline);
            expect(runner.pendingCount).toBe(2);
        });
    });

    describe("suspended state helpers", () => {
        it("should report whether a specific generator is suspended", () => {
            /**
             *
             */
            function* gen(): Generator {
                yield;
            }

            const deadline = performance.now(); // Already passed
            runner.run("gen1", gen(), deadline);

            expect(runner.hasSuspended("gen1")).toBe(true);
            expect(runner.hasSuspended("missing")).toBe(false);
        });

        it("should clear suspended generators", () => {
            /**
             *
             */
            function* gen(): Generator {
                yield;
            }

            const deadline = performance.now(); // Already passed
            runner.run("gen1", gen(), deadline);
            runner.run("gen2", gen(), deadline);
            expect(runner.pendingCount).toBe(2);

            runner.clearSuspended();

            expect(runner.pendingCount).toBe(0);
            expect(runner.hasSuspended("gen1")).toBe(false);
            expect(runner.hasSuspended("gen2")).toBe(false);
        });

        it("should trigger finally blocks when clearing suspended generators", () => {
            let cleanedUp = false;

            /**
             *
             */
            function* genWithFinally(): Generator {
                try {
                    yield;
                    yield;
                } finally {
                    cleanedUp = true;
                }
            }

            const deadline = performance.now(); // Already passed
            runner.run("gen1", genWithFinally(), deadline);
            expect(cleanedUp).toBe(false);

            runner.clearSuspended();

            expect(cleanedUp).toBe(true);
            expect(runner.pendingCount).toBe(0);
        });
    });

    describe("dispose", () => {
        it("should clear all suspended generators", () => {
            /**
             *
             */
            function* gen(): Generator {
                yield;
            }

            const deadline = performance.now(); // Already passed
            runner.run("gen1", gen(), deadline);
            runner.run("gen2", gen(), deadline);

            expect(runner.pendingCount).toBe(2);

            runner.dispose();

            expect(runner.pendingCount).toBe(0);
        });
    });

    describe("real-world scenarios", () => {
        it("should handle generator that yields multiple times per iteration", () => {
            let iterations = 0;

            /**
             *
             */
            function* multiYieldGenerator(): Generator {
                for (let i = 0; i < 5; i++) {
                    iterations++;
                    yield; // Budget check point
                    yield; // Another yield
                }
            }

            const deadline = performance.now() + 1000; // Far future
            const completed = runner.run("test", multiYieldGenerator(), deadline);

            expect(completed).toBe(true);
            expect(iterations).toBe(5);
        });

        it("should resume from exact suspension point", () => {
            const processed: number[] = [];

            /**
             *
             */
            function* processingGenerator(): Generator {
                for (let i = 0; i < 5; i++) {
                    processed.push(i);
                    yield;
                }
            }

            // Process first item then suspend
            const gen = processingGenerator();
            const deadline1 = performance.now(); // Already passed
            runner.run("test", gen, deadline1);

            expect(processed).toEqual([0]);

            // Resume and complete
            const deadline2 = performance.now() + 1000; // Far future
            runner.resumeAll(deadline2);

            expect(processed).toEqual([0, 1, 2, 3, 4]);
        });
    });
});
