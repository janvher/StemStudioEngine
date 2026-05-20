import { Object3D, PerspectiveCamera } from "three";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type GameManager from "@stem/editor-oss/behaviors/game/GameManager";
import type { LambdaComponentData, LambdaConfig } from "../Lambda";
import { LambdaBase } from "../LambdaBase";
import { LambdaManager } from "../LambdaManager";
import { LambdaScheduler } from "../LambdaScheduler";

// Mock VisibilityChecker
vi.mock("../../behaviors/performance/implementations/VisibilityChecker", () => ({
    VisibilityChecker: class {
        isVisible(): boolean { return true; }
        clearCache(): void { }
        dispose(): void { }
    },
}));

/**
 * Integration tests for the Lambda criticality system.
 * Tests the full flow from userData -> LambdaBase -> LambdaScheduler.
 */

class TestLambda extends LambdaBase {
    public processedObjects: Object3D[] = [];
    public processedMultipliers: number[] = [];

    update(deltaTime: number = 0.016): void {
        this.processedObjects = [];
        this.processedMultipliers = [];

        this.processObjects(deltaTime, (object, _data, effectiveDeltaTime) => {
            this.processedObjects.push(object);
            this.processedMultipliers.push(effectiveDeltaTime / deltaTime);
        });
    }
}

const createMockGameManager = (lambdaManager: LambdaManager): GameManager => {
    const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 0);
    camera.updateMatrixWorld();

    return {
        lambdaManager,
        camera,
    } as unknown as GameManager;
};

const createTestConfig = (isCritical?: boolean): LambdaConfig => ({
    id: "test-lambda",
    name: "Test Lambda",
    version: "1.0",
    main: "TestLambda.ts",
    attributes: {},
    componentSchema: {},
    isCritical,
});

describe("Lambda Criticality Integration", () => {
    let lambdaManager: LambdaManager;
    let game: GameManager;
    let scheduler: LambdaScheduler;

    beforeEach(() => {
        lambdaManager = new LambdaManager({} as GameManager);
        scheduler = lambdaManager.scheduler;
        game = createMockGameManager(lambdaManager);
        lambdaManager["game"] = game;
    });

    describe("Component-level criticality", () => {
        it("should process critical components every frame regardless of distance", () => {
            const lambda = new TestLambda("test-lambda", { uuid: "instance-1" });
            lambda.init(game);

            // Create an object far away
            const object = new Object3D();
            object.position.set(200, 0, 0); // 200m away - would normally be heavily throttled
            object.updateMatrixWorld();

            // Set up component criticality in userData
            object.userData.lambdaComponents = [
                {
                    lambdaId: "test-lambda",
                    instanceId: "instance-1",
                    uuid: "component-1",
                    enabled: true,
                    componentData: {},
                    isCritical: true,
                } as LambdaComponentData,
            ];

            lambda._registerObject(object, {});

            // Run multiple frames - critical should always process
            for (let frame = 0; frame < 20; frame++) {
                scheduler.beginFrame(frame);
                lambda.processedObjects = [];
                lambda.apply(0.016);

                // Critical objects should always be processed
                expect(lambda.processedObjects).toContain(object);
                // And should have multiplier of 1 (no deltaTime scaling)
                expect(lambda.processedMultipliers[0]).toBe(1);
            }
        });

        it("should throttle non-critical far objects", () => {
            const lambda = new TestLambda("test-lambda", { uuid: "instance-1" });
            lambda.init(game);

            const object = new Object3D();
            object.position.set(200, 0, 0); // 200m away
            object.updateMatrixWorld();

            // Non-critical component
            object.userData.lambdaComponents = [
                {
                    lambdaId: "test-lambda",
                    instanceId: "instance-1",
                    uuid: "component-1",
                    enabled: true,
                    componentData: {},
                    isCritical: false,
                } as LambdaComponentData,
            ];

            lambda._registerObject(object, {});

            // Run multiple frames - should be throttled
            let processedCount = 0;
            for (let frame = 0; frame < 20; frame++) {
                scheduler.beginFrame(frame);
                lambda.processedObjects = [];
                lambda.apply(0.016);
                if (lambda.processedObjects.includes(object)) {
                    processedCount++;
                }
            }

            // Far non-critical objects should be processed less frequently
            expect(processedCount).toBeLessThan(20);
            expect(processedCount).toBeGreaterThan(0);
        });
    });

    describe("Lambda-config level criticality", () => {
        it("should fall back to lambda config criticality when component has no override", () => {
            // Register config with isCritical: true
            const config = createTestConfig(true);
            lambdaManager.registerLambdaClass("test-lambda", config, TestLambda);

            const lambda = new TestLambda("test-lambda", { uuid: "instance-1" });
            lambda.init(game);

            const object = new Object3D();
            object.position.set(200, 0, 0);
            object.updateMatrixWorld();

            // Component without isCritical set (should fall back to config)
            object.userData.lambdaComponents = [
                {
                    lambdaId: "test-lambda",
                    instanceId: "instance-1",
                    uuid: "component-1",
                    enabled: true,
                    componentData: {},
                    // isCritical not set
                } as LambdaComponentData,
            ];

            lambda._registerObject(object, {});

            // Should process every frame due to config-level criticality
            for (let frame = 0; frame < 10; frame++) {
                scheduler.beginFrame(frame);
                lambda.processedObjects = [];
                lambda.apply(0.016);

                expect(lambda.processedObjects).toContain(object);
            }
        });

        it("should prefer component-level criticality over lambda config", () => {
            // Register config with isCritical: true
            const config = createTestConfig(true);
            lambdaManager.registerLambdaClass("test-lambda", config, TestLambda);

            const lambda = new TestLambda("test-lambda", { uuid: "instance-1" });
            lambda.init(game);

            const object = new Object3D();
            object.position.set(200, 0, 0);
            object.updateMatrixWorld();

            // Component explicitly sets isCritical: false (overrides config)
            object.userData.lambdaComponents = [
                {
                    lambdaId: "test-lambda",
                    instanceId: "instance-1",
                    uuid: "component-1",
                    enabled: true,
                    componentData: {},
                    isCritical: false, // Explicitly false, overrides config
                } as LambdaComponentData,
            ];

            lambda._registerObject(object, {});

            // Should be throttled since component overrides config
            let processedCount = 0;
            for (let frame = 0; frame < 20; frame++) {
                scheduler.beginFrame(frame);
                lambda.processedObjects = [];
                lambda.apply(0.016);
                if (lambda.processedObjects.includes(object)) {
                    processedCount++;
                }
            }

            // Should be throttled (processed less than every frame)
            expect(processedCount).toBeLessThan(20);
        });
    });

    describe("Mixed criticality objects", () => {
        it("should handle different criticality levels for different objects in same lambda", () => {
            const lambda = new TestLambda("test-lambda", { uuid: "instance-1" });
            lambda.init(game);

            // Critical object (close but marked critical)
            const criticalObject = new Object3D();
            criticalObject.name = "critical";
            criticalObject.position.set(5, 0, 0);
            criticalObject.updateMatrixWorld();
            criticalObject.userData.lambdaComponents = [
                {
                    lambdaId: "test-lambda",
                    instanceId: "instance-1",
                    uuid: "comp-critical",
                    enabled: true,
                    componentData: {},
                    isCritical: true,
                } as LambdaComponentData,
            ];

            // Non-critical object (far away)
            const normalObject = new Object3D();
            normalObject.name = "normal";
            normalObject.position.set(200, 0, 0);
            normalObject.updateMatrixWorld();
            normalObject.userData.lambdaComponents = [
                {
                    lambdaId: "test-lambda",
                    instanceId: "instance-1",
                    uuid: "comp-normal",
                    enabled: true,
                    componentData: {},
                    isCritical: false,
                } as LambdaComponentData,
            ];

            lambda._registerObject(criticalObject, {});
            lambda._registerObject(normalObject, {});

            let criticalProcessed = 0;
            let normalProcessed = 0;

            for (let frame = 0; frame < 20; frame++) {
                scheduler.beginFrame(frame);
                lambda.processedObjects = [];
                lambda.apply(0.016);

                if (lambda.processedObjects.includes(criticalObject)) criticalProcessed++;
                if (lambda.processedObjects.includes(normalObject)) normalProcessed++;
            }

            // Critical should always process
            expect(criticalProcessed).toBe(20);
            // Normal far object should be throttled
            expect(normalProcessed).toBeLessThan(20);
            expect(normalProcessed).toBeGreaterThan(0);
        });
    });
});
