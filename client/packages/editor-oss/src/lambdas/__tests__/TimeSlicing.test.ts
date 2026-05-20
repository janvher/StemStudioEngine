import { Object3D } from "three";
import { describe, it, expect, beforeEach, vi } from "vitest";

import type GameManager from "@stem/editor-oss/behaviors/game/GameManager";
import type { LambdaConfig } from "../Lambda";
import { LambdaBase } from "../LambdaBase";
import { LambdaManager } from "../LambdaManager";
import FusedPhysicsLambda from "../packs/fusedPhysics/FusedPhysicsLambda";

const createMockGameManager = (): GameManager => ({} as GameManager);

// --- LambdaBase.applySliced ---

describe("LambdaBase.applySliced", () => {
    it("should be a generator that completes", () => {
        class TestLambda extends LambdaBase {
            public updateCalled = false;
            update(): void {
                this.updateCalled = true;
            }
        }

        const lambda = new TestLambda("test", {});
        const gen = lambda.applySliced(0.016);

        // Run generator to completion
        let result = gen.next();
        while (!result.done) {
            result = gen.next();
        }

        expect(lambda.updateCalled).toBe(true);
    });

    it("should set and reset _isApplying during execution", () => {
        let wasApplyingDuringUpdate = false;

        class CheckLambda extends LambdaBase {
            update(): void {
                wasApplyingDuringUpdate = this._isApplying;
            }
        }

        const lambda = new CheckLambda("test", {});
        const gen = lambda.applySliced(0.016);

        // Run to completion
        let result = gen.next();
        while (!result.done) {
            result = gen.next();
        }

        expect(wasApplyingDuringUpdate).toBe(true);
        expect(lambda["_isApplying"]).toBe(false);
    });

    it("should process pending ops after completion", () => {
        class QueueLambda extends LambdaBase {
            update(): void {
                // Queue a registration during apply
                this._registerObject(new Object3D(), { test: 1 });
            }
        }

        const lambda = new QueueLambda("test", {});
        const gen = lambda.applySliced(0.016);

        let result = gen.next();
        while (!result.done) {
            result = gen.next();
        }

        expect(lambda.entityCount).toBe(1);
    });
});

// --- LambdaManager.update ---

describe("LambdaManager.update", () => {
    let manager: LambdaManager;
    let game: GameManager;

    const mockConfig: LambdaConfig = {
        id: "test-lambda",
        name: "Test Lambda",
        version: "1.0.0",
        main: "TestLambda.ts",
        attributes: {},
        componentSchema: {},
    };

    class CountingLambda extends LambdaBase {
        static callCount = 0;
        update(): void {
            CountingLambda.callCount++;
        }
    }

    beforeEach(() => {
        game = createMockGameManager();
        manager = new LambdaManager(game);
        CountingLambda.callCount = 0;
    });

    it("should execute all instances in one fresh pass", async () => {
        manager.registerLambdaClass("test-lambda", mockConfig, CountingLambda);
        await manager.createInstance("test-lambda");
        await manager.createInstance("test-lambda");
        await manager.createInstance("test-lambda");

        manager.update(0.016);

        expect(CountingLambda.callCount).toBe(3);
    });

    it("should stop once the shared deadline is exhausted", async () => {
        // Budget check fires every 8th iteration ((processed & 7) === 7),
        // so we need at least 8 instances to trigger it.
        manager.registerLambdaClass("test-lambda", mockConfig, CountingLambda);
        for (let i = 0; i < 9; i++) {
            await manager.createInstance("test-lambda");
        }

        // Mock performance.now() to always return past the deadline.
        const nowSpy = vi.spyOn(performance, "now");
        nowSpy.mockReturnValue(10);

        manager.update(0.016, {
            deltaTime: 0.016,
            fixedDeltaTime: 1 / 60,
            fixedUpdatesEnabled: true,
            frameCount: 1,
            interpolationAlpha: 1,
            fixedOverstep: 0,
            frameStartTime: 0,
            frameDeadline: 5,
            underRenderPressure: false,
            renderAvgMs: 0,
            spatialGrid: null,
        });

        // First 7 instances process (processed 1-7), then check fires at processed=7 and bails
        expect(CountingLambda.callCount).toBeLessThan(9);
        nowSpy.mockRestore();
    });
});

// --- FusedPhysicsLambda.applySliced (intra-lambda yielding) ---

describe("FusedPhysicsLambda.applySliced", () => {
    it("should run synchronously for small entity counts", () => {
        const lambda = new FusedPhysicsLambda("fused-physics", {
            attributes: { gravity: 9.81 },
        });

        // Add 10 entities (below threshold)
        for (let i = 0; i < 10; i++) {
            const obj = new Object3D();
            lambda._registerObject(obj, { vx: 1, useGravity: 0 });
        }

        const gen = lambda.applySliced(0.016);
        let steps = 0;
        let result = gen.next();
        while (!result.done) {
            steps++;
            result = gen.next();
        }

        // Small count: runs synchronously, yields once at end
        expect(steps).toBe(1);
    });

    it("should yield multiple times for large entity counts", () => {
        const lambda = new FusedPhysicsLambda("fused-physics", {
            attributes: { gravity: 9.81 },
        });

        // Add 200 entities (above threshold of 100)
        for (let i = 0; i < 200; i++) {
            const obj = new Object3D();
            lambda._registerObject(obj, { vx: 1, useGravity: 0 });
        }

        const gen = lambda.applySliced(0.016);
        let steps = 0;
        let result = gen.next();
        while (!result.done) {
            steps++;
            result = gen.next();
        }

        // 200 entities / 64 per slice = ~3 yields + final = multiple steps
        expect(steps).toBeGreaterThan(1);
    });

    it("should process all entities when fully consumed", () => {
        const lambda = new FusedPhysicsLambda("fused-physics", {
            attributes: { gravity: 0 },
        });

        const objects: Object3D[] = [];
        for (let i = 0; i < 150; i++) {
            const obj = new Object3D();
            lambda._registerObject(obj, { vx: 10, useGravity: 0 });
            objects.push(obj);
        }

        const gen = lambda.applySliced(1 / 60);
        let result = gen.next();
        while (!result.done) {
            result = gen.next();
        }

        // All objects should have moved
        for (const obj of objects) {
            expect(obj.position.x).toBeGreaterThan(0);
        }
    });

    it("should be partially suspendable for large counts", () => {
        const lambda = new FusedPhysicsLambda("fused-physics", {
            attributes: { gravity: 0 },
        });

        for (let i = 0; i < 200; i++) {
            const obj = new Object3D();
            lambda._registerObject(obj, { vx: 10, useGravity: 0 });
        }

        const gen = lambda.applySliced(1 / 60);
        // Only advance one step (first 64 entities)
        gen.next();

        // At least some objects should have been processed
        let movedCount = 0;
        for (const [obj] of lambda.registeredObjects) {
            if (obj.position.x > 0) movedCount++;
        }
        expect(movedCount).toBeGreaterThan(0);
        expect(movedCount).toBeLessThan(200);
    });
});
