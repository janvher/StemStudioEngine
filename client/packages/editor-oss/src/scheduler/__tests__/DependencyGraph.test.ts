import {describe, it, expect, vi, beforeEach} from "vitest";

import {DependencyGraph} from "../DependencyGraph";
import {PipelineStage, ISystem} from "../types";

// Mock system factory
/**
 *
 * @param id
 * @param stage
 * @param priority
 * @param reads
 * @param writes
 */
function createMockSystem(
    id: string,
    stage: PipelineStage,
    priority: number = 100,
    reads: string[] = [],
    writes: string[] = [],
): ISystem {
    return {
        id,
        stage,
        priority,
        reads,
        writes,
        requiresMainThread: true,
        supportsTimeSlicing: false,
        update: vi.fn(),
    };
}

describe("DependencyGraph", () => {
    let graph: DependencyGraph;

    beforeEach(() => {
        graph = new DependencyGraph();
    });

    describe("addSystem", () => {
        it("should add a system to the graph", () => {
            const system = createMockSystem("test", PipelineStage.UPDATE);
            graph.addSystem(system);
            expect(graph.hasSystem("test")).toBe(true);
        });

        it("should invalidate cache when adding a system", () => {
            const system1 = createMockSystem("sys1", PipelineStage.UPDATE);
            graph.addSystem(system1);

            // Get execution order to populate cache
            const order1 = graph.getExecutionOrder(PipelineStage.UPDATE);
            expect(order1).toHaveLength(1);

            // Add another system - should invalidate cache
            const system2 = createMockSystem("sys2", PipelineStage.UPDATE);
            graph.addSystem(system2);

            const order2 = graph.getExecutionOrder(PipelineStage.UPDATE);
            expect(order2).toHaveLength(2);
        });
    });

    describe("removeSystem", () => {
        it("should remove a system from the graph", () => {
            const system = createMockSystem("test", PipelineStage.UPDATE);
            graph.addSystem(system);
            expect(graph.hasSystem("test")).toBe(true);

            graph.removeSystem("test");
            expect(graph.hasSystem("test")).toBe(false);
        });

        it("should invalidate cache when removing a system", () => {
            const system1 = createMockSystem("sys1", PipelineStage.UPDATE);
            const system2 = createMockSystem("sys2", PipelineStage.UPDATE);
            graph.addSystem(system1);
            graph.addSystem(system2);

            // Get execution order to populate cache
            const order1 = graph.getExecutionOrder(PipelineStage.UPDATE);
            expect(order1).toHaveLength(2);

            // Remove system - should invalidate cache
            graph.removeSystem("sys1");

            const order2 = graph.getExecutionOrder(PipelineStage.UPDATE);
            expect(order2).toHaveLength(1);
        });
    });

    describe("hasSystem", () => {
        it("should return true for existing system", () => {
            const system = createMockSystem("test", PipelineStage.UPDATE);
            graph.addSystem(system);
            expect(graph.hasSystem("test")).toBe(true);
        });

        it("should return false for non-existing system", () => {
            expect(graph.hasSystem("nonexistent")).toBe(false);
        });
    });

    describe("getExecutionOrder", () => {
        it("should return empty array for empty stage", () => {
            const order = graph.getExecutionOrder(PipelineStage.UPDATE);
            expect(order).toEqual([]);
        });

        it("should return systems in priority order when no dependencies", () => {
            const sys1 = createMockSystem("sys1", PipelineStage.UPDATE, 200);
            const sys2 = createMockSystem("sys2", PipelineStage.UPDATE, 100);
            const sys3 = createMockSystem("sys3", PipelineStage.UPDATE, 300);

            graph.addSystem(sys1);
            graph.addSystem(sys2);
            graph.addSystem(sys3);

            const order = graph.getExecutionOrder(PipelineStage.UPDATE);
            expect(order.map(s => s.id)).toEqual(["sys2", "sys1", "sys3"]);
        });

        it("should only return systems for the requested stage", () => {
            const updateSys = createMockSystem("update", PipelineStage.UPDATE);
            const fixedSys = createMockSystem("fixed", PipelineStage.FIXED_UPDATE);
            const preSys = createMockSystem("pre", PipelineStage.PRE_UPDATE);

            graph.addSystem(updateSys);
            graph.addSystem(fixedSys);
            graph.addSystem(preSys);

            const updateOrder = graph.getExecutionOrder(PipelineStage.UPDATE);
            expect(updateOrder.map(s => s.id)).toEqual(["update"]);

            const fixedOrder = graph.getExecutionOrder(PipelineStage.FIXED_UPDATE);
            expect(fixedOrder.map(s => s.id)).toEqual(["fixed"]);
        });

        it("should cache execution order", () => {
            const sys = createMockSystem("sys", PipelineStage.UPDATE);
            graph.addSystem(sys);

            const order1 = graph.getExecutionOrder(PipelineStage.UPDATE);
            const order2 = graph.getExecutionOrder(PipelineStage.UPDATE);

            // Should return the same cached array
            expect(order1).toBe(order2);
        });

        it("should respect write->read dependencies", () => {
            // SystemA writes "transform", SystemB reads "transform"
            // SystemA should run before SystemB
            const sysA = createMockSystem("sysA", PipelineStage.UPDATE, 200, [], ["transform"]);
            const sysB = createMockSystem("sysB", PipelineStage.UPDATE, 100, ["transform"], []);

            graph.addSystem(sysB); // Add B first with lower priority
            graph.addSystem(sysA);

            const order = graph.getExecutionOrder(PipelineStage.UPDATE);

            // Despite B having lower priority, A should run first because B reads what A writes
            expect(order.map(s => s.id)).toEqual(["sysA", "sysB"]);
        });

        it("should handle chain of dependencies", () => {
            // A writes X, B reads X writes Y, C reads Y
            // Order should be A -> B -> C
            const sysA = createMockSystem("sysA", PipelineStage.UPDATE, 300, [], ["X"]);
            const sysB = createMockSystem("sysB", PipelineStage.UPDATE, 200, ["X"], ["Y"]);
            const sysC = createMockSystem("sysC", PipelineStage.UPDATE, 100, ["Y"], []);

            graph.addSystem(sysC);
            graph.addSystem(sysA);
            graph.addSystem(sysB);

            const order = graph.getExecutionOrder(PipelineStage.UPDATE);
            expect(order.map(s => s.id)).toEqual(["sysA", "sysB", "sysC"]);
        });

        it("should use priority as tiebreaker for independent systems", () => {
            // Both systems write different things, no dependencies
            const sysA = createMockSystem("sysA", PipelineStage.UPDATE, 200, [], ["X"]);
            const sysB = createMockSystem("sysB", PipelineStage.UPDATE, 100, [], ["Y"]);

            graph.addSystem(sysA);
            graph.addSystem(sysB);

            const order = graph.getExecutionOrder(PipelineStage.UPDATE);
            // B has lower priority number, should come first
            expect(order.map(s => s.id)).toEqual(["sysB", "sysA"]);
        });

        it("should skip dependency edge if reader also writes the same component", () => {
            // A writes X, B reads AND writes X (mutual read/write = peers)
            // No dependency edge should be created, use priority
            const sysA = createMockSystem("sysA", PipelineStage.UPDATE, 200, [], ["X"]);
            const sysB = createMockSystem("sysB", PipelineStage.UPDATE, 100, ["X"], ["X"]);

            graph.addSystem(sysA);
            graph.addSystem(sysB);

            const order = graph.getExecutionOrder(PipelineStage.UPDATE);
            // No dependency, so priority wins - B (100) before A (200)
            expect(order.map(s => s.id)).toEqual(["sysB", "sysA"]);
        });

        it("should handle circular dependency with fallback", () => {
            // A reads Y writes X, B reads X writes Y -> circular
            const sysA = createMockSystem("sysA", PipelineStage.UPDATE, 200, ["Y"], ["X"]);
            const sysB = createMockSystem("sysB", PipelineStage.UPDATE, 100, ["X"], ["Y"]);

            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            graph.addSystem(sysA);
            graph.addSystem(sysB);

            const order = graph.getExecutionOrder(PipelineStage.UPDATE);

            // Should log error about circular dependency
            expect(errorSpy).toHaveBeenCalled();
            // Should fallback to priority order
            expect(order.map(s => s.id)).toEqual(["sysB", "sysA"]);

            errorSpy.mockRestore();
        });
    });

    describe("getParallelWaves", () => {
        it("should return empty array for empty stage", () => {
            const waves = graph.getParallelWaves(PipelineStage.UPDATE);
            expect(waves).toEqual([]);
        });

        it("should put all independent systems in one wave", () => {
            const sysA = createMockSystem("sysA", PipelineStage.UPDATE, 100, [], ["X"]);
            const sysB = createMockSystem("sysB", PipelineStage.UPDATE, 200, [], ["Y"]);
            const sysC = createMockSystem("sysC", PipelineStage.UPDATE, 300, [], ["Z"]);

            graph.addSystem(sysA);
            graph.addSystem(sysB);
            graph.addSystem(sysC);

            const waves = graph.getParallelWaves(PipelineStage.UPDATE);
            expect(waves.length).toBe(1);
            expect(waves[0]!.length).toBe(3);
        });

        it("should separate dependent systems into different waves", () => {
            // A writes X, B reads X writes Y, C reads Y
            const sysA = createMockSystem("sysA", PipelineStage.UPDATE, 100, [], ["X"]);
            const sysB = createMockSystem("sysB", PipelineStage.UPDATE, 200, ["X"], ["Y"]);
            const sysC = createMockSystem("sysC", PipelineStage.UPDATE, 300, ["Y"], []);

            graph.addSystem(sysA);
            graph.addSystem(sysB);
            graph.addSystem(sysC);

            const waves = graph.getParallelWaves(PipelineStage.UPDATE);
            expect(waves.length).toBe(3);
            expect(waves[0]!.map(s => s.id)).toEqual(["sysA"]);
            expect(waves[1]!.map(s => s.id)).toEqual(["sysB"]);
            expect(waves[2]!.map(s => s.id)).toEqual(["sysC"]);
        });

        it("should allow parallel execution within each wave", () => {
            // A and B write different things (can run in parallel)
            // C depends on both
            const sysA = createMockSystem("sysA", PipelineStage.UPDATE, 100, [], ["X"]);
            const sysB = createMockSystem("sysB", PipelineStage.UPDATE, 200, [], ["Y"]);
            const sysC = createMockSystem("sysC", PipelineStage.UPDATE, 300, ["X", "Y"], []);

            graph.addSystem(sysA);
            graph.addSystem(sysB);
            graph.addSystem(sysC);

            const waves = graph.getParallelWaves(PipelineStage.UPDATE);
            expect(waves.length).toBe(2);
            // First wave has A and B (can run in parallel)
            expect(waves[0]!.length).toBe(2);
            expect(waves[0]!.map(s => s.id).sort()).toEqual(["sysA", "sysB"]);
            // Second wave has C
            expect(waves[1]!.map(s => s.id)).toEqual(["sysC"]);
        });
    });

    describe("dispose", () => {
        it("should clear all nodes and caches", () => {
            const sys = createMockSystem("sys", PipelineStage.UPDATE);
            graph.addSystem(sys);
            graph.getExecutionOrder(PipelineStage.UPDATE); // Populate cache

            graph.dispose();

            expect(graph.hasSystem("sys")).toBe(false);
            expect(graph.getExecutionOrder(PipelineStage.UPDATE)).toEqual([]);
        });
    });
});
