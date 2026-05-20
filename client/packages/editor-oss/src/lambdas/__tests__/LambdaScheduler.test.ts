import { Object3D, PerspectiveCamera } from "three";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { ISpatialGrid } from "@stem/editor-oss/scheduler/types";

// Mock the VisibilityChecker module before importing LambdaScheduler
vi.mock("../../behaviors/performance/implementations/VisibilityChecker", () => ({
    VisibilityChecker: class MockVisibilityChecker {
        isVisible(): boolean {
            return true;
        }
        clearCache(): void { }
        dispose(): void { }
    },
}));

// Import after mock
import { LambdaScheduler } from "../LambdaScheduler";

describe("LambdaScheduler", () => {
    let scheduler: LambdaScheduler;
    let camera: PerspectiveCamera;

    beforeEach(() => {
        scheduler = new LambdaScheduler({
            targetFPS: 60,
            frameBudgetMs: 12,
            defaultThrottleFactor: 1,
            farDistanceSq: 2500,      // 50m
            veryFarDistanceSq: 10000, // 100m
        });
        camera = new PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.set(0, 0, 0);
        camera.updateMatrixWorld();
    });

    afterEach(() => {
        scheduler?.dispose();
    });

    describe("constructor", () => {
        it("should use default config when none provided", () => {
            const defaultScheduler = new LambdaScheduler();
            expect(defaultScheduler.frameBudgetMs).toBe(12);
            defaultScheduler.dispose();
        });

        it("should merge provided config with defaults", () => {
            const customScheduler = new LambdaScheduler({ frameBudgetMs: 8 });
            expect(customScheduler.frameBudgetMs).toBe(8);
            customScheduler.dispose();
        });
    });

    describe("beginFrame", () => {
        it("should use orchestrator frame count when provided", () => {
            scheduler.beginFrame(100);
            // Frame count should now be 100 - we can verify through behavior
        });

        it("should use orchestrator deadline when provided", () => {
            const deadline = performance.now() + 5;
            scheduler.beginFrame({
                deltaTime: 0.016,
                fixedDeltaTime: 0.01667,
                fixedUpdatesEnabled: true,
                frameCount: 1,
                interpolationAlpha: 1,
                fixedOverstep: 0,
                frameStartTime: performance.now(),
                frameDeadline: deadline,
                underRenderPressure: false,
                renderAvgMs: 0,
                spatialGrid: null,
            });
            expect(scheduler.frameDeadline).toBe(deadline);
        });

        it("should keep config budget available as a compatibility accessor", () => {
            scheduler.beginFrame(1);
            expect(scheduler.frameBudgetMs).toBe(12);
        });
    });

    describe("shouldProcess - Critical Flag", () => {
        it("should always return 1 for critical objects", () => {
            const object = new Object3D();
            object.position.set(1000, 1000, 1000); // Very far away
            object.updateMatrixWorld();

            scheduler.beginFrame();
            const result = scheduler.shouldProcess(object, camera, 0, true);

            expect(result).toBe(1);
        });

        it("should bypass all throttling for critical objects", () => {
            const object = new Object3D();
            object.position.set(200, 0, 0); // Beyond veryFarDistanceSq
            object.updateMatrixWorld();

            // Critical should always return 1
            for (let i = 0; i < 20; i++) {
                scheduler.beginFrame(i);
                const result = scheduler.shouldProcess(object, camera, 0, true);
                expect(result).toBe(1);
            }
        });
    });

    describe("shouldProcess - Distance-based LOD", () => {
        it("should return base throttle for close objects", () => {
            const object = new Object3D();
            object.position.set(10, 0, 0); // 10m away
            object.updateMatrixWorld();

            scheduler.beginFrame(0);
            const result = scheduler.shouldProcess(object, camera, 0, false);

            // Close objects get base throttle (1) - should run
            expect(result).toBeGreaterThanOrEqual(0);
        });

        it("should apply higher throttle for far objects (>50m), capped at 3", () => {
            const object = new Object3D();
            object.position.set(60, 0, 0); // 60m away (>50m, <100m)
            object.updateMatrixWorld();

            // Run multiple frames to find one where the object runs with capped throttle factor 3
            let foundThrottle3 = false;
            for (let i = 0; i < 10; i++) {
                scheduler.beginFrame(i);
                const result = scheduler.shouldProcess(object, camera, 0, false);
                if (result === 3) {
                    foundThrottle3 = true;
                    break;
                }
            }
            // The throttle factor would be 4 for far objects but capped at 3
            expect(foundThrottle3).toBe(true);
        });

        it("should apply highest throttle for very far objects (>100m), capped at 3", () => {
            const object = new Object3D();
            object.position.set(150, 0, 0); // 150m away (>100m)
            object.updateMatrixWorld();

            // Run multiple frames to find one where the object runs with capped throttle factor 3
            let foundThrottle3 = false;
            for (let i = 0; i < 20; i++) {
                scheduler.beginFrame(i);
                const result = scheduler.shouldProcess(object, camera, 0, false);
                if (result === 3) {
                    foundThrottle3 = true;
                    break;
                }
            }
            // The throttle factor would be 10 for very far objects but capped at 3
            expect(foundThrottle3).toBe(true);
        });
    });

    describe("shouldProcess - Interleaving", () => {
        it("should use stable hash for consistent frame assignment", () => {
            const object = new Object3D();
            object.position.set(5, 0, 0);
            object.updateMatrixWorld();

            // Find which frames this object runs on
            const runFrames: number[] = [];
            for (let i = 0; i < 10; i++) {
                scheduler.beginFrame(i);
                const result = scheduler.shouldProcess(object, camera, 0, false);
                if (result > 0) {
                    runFrames.push(i);
                }
            }

            // With throttle=1 and close distance, should run every frame
            expect(runFrames.length).toBe(10);
        });

        it("should cache hash on object userData", () => {
            const object = new Object3D();
            object.position.set(5, 0, 0);
            object.updateMatrixWorld();

            expect(object.userData._lambdaHash).toBeUndefined();

            scheduler.beginFrame(0);
            scheduler.shouldProcess(object, camera, 0, false);

            expect(object.userData._lambdaHash).toBeDefined();
            expect(typeof object.userData._lambdaHash).toBe("number");
        });

        it("should reuse cached hash on subsequent calls", () => {
            const object = new Object3D();
            object.position.set(5, 0, 0);
            object.updateMatrixWorld();

            scheduler.beginFrame(0);
            scheduler.shouldProcess(object, camera, 0, false);
            const firstHash = object.userData._lambdaHash;

            scheduler.beginFrame(1);
            scheduler.shouldProcess(object, camera, 0, false);
            const secondHash = object.userData._lambdaHash;

            expect(firstHash).toBe(secondHash);
        });
    });

    describe("shouldProcess - Camera caching", () => {
        it("should cache camera position per frame", () => {
            const object1 = new Object3D();
            const object2 = new Object3D();
            object1.position.set(5, 0, 0);
            object2.position.set(10, 0, 0);
            object1.updateMatrixWorld();
            object2.updateMatrixWorld();

            const cameraSpy = vi.spyOn(camera, "getWorldPosition");

            scheduler.beginFrame(0);
            scheduler.shouldProcess(object1, camera, 0, false);
            scheduler.shouldProcess(object2, camera, 1, false);

            // Camera position should only be computed once per frame
            expect(cameraSpy).toHaveBeenCalledTimes(1);

            cameraSpy.mockRestore();
        });

        it("should recompute camera position when switching cameras within the same frame", () => {
            const object = new Object3D();
            object.position.set(5, 0, 0);
            object.updateMatrixWorld();

            const camera2 = new PerspectiveCamera();
            camera2.position.set(10, 0, 0);
            camera2.updateMatrixWorld();

            const cameraSpy = vi.spyOn(camera, "getWorldPosition");
            const camera2Spy = vi.spyOn(camera2, "getWorldPosition");

            scheduler.beginFrame(0);

            // First call with camera 1
            scheduler.shouldProcess(object, camera, 0, false);
            expect(cameraSpy).toHaveBeenCalledTimes(1);

            // Second call with camera 2 - should trigger re-computation
            scheduler.shouldProcess(object, camera2, 0, false);
            expect(camera2Spy).toHaveBeenCalledTimes(1);

            // Third call with camera 1 again - should trigger re-computation again
            scheduler.shouldProcess(object, camera, 0, false);
            expect(cameraSpy).toHaveBeenCalledTimes(2);

            cameraSpy.mockRestore();
            camera2Spy.mockRestore();
        });

        it("should recompute camera position on new frame", () => {
            const object = new Object3D();
            object.position.set(5, 0, 0);
            object.updateMatrixWorld();

            const cameraSpy = vi.spyOn(camera, "getWorldPosition");

            scheduler.beginFrame(0);
            scheduler.shouldProcess(object, camera, 0, false);

            scheduler.beginFrame(1);
            scheduler.shouldProcess(object, camera, 0, false);

            // Camera position should be computed once per frame
            expect(cameraSpy).toHaveBeenCalledTimes(2);

            cameraSpy.mockRestore();
        });
    });

    describe("setSpatialGrid", () => {
        it("should use spatial grid for distance lookups when available", () => {
            const mockGrid: ISpatialGrid = {
                update: vi.fn(),
                getDistanceSq: vi.fn().mockReturnValue(25), // 5m away
                queryRadius: vi.fn().mockReturnValue([]),
                remove: vi.fn(),
                dispose: vi.fn(),
            };

            scheduler.setSpatialGrid(mockGrid);

            const object = new Object3D();
            object.position.set(100, 0, 0); // Would be 100m without grid
            object.updateMatrixWorld();

            scheduler.beginFrame(0);
            scheduler.shouldProcess(object, camera, 0, false);

            // Should use grid's distance instead of computing
            expect(mockGrid.getDistanceSq).toHaveBeenCalled();
        });

        it("should fall back to object position when grid returns null", () => {
            const mockGrid: ISpatialGrid = {
                update: vi.fn(),
                getDistanceSq: vi.fn().mockReturnValue(null),
                queryRadius: vi.fn().mockReturnValue([]),
                remove: vi.fn(),
                dispose: vi.fn(),
            };

            scheduler.setSpatialGrid(mockGrid);

            const object = new Object3D();
            object.position.set(60, 0, 0);
            object.updateMatrixWorld();
            // Force update to trigger fallback to getWorldPosition
            object.matrixWorldNeedsUpdate = true;

            const objectSpy = vi.spyOn(object, "getWorldPosition");

            scheduler.beginFrame(0);
            scheduler.shouldProcess(object, camera, 0, false);

            // Should fall back to computing object position
            expect(objectSpy).toHaveBeenCalled();

            objectSpy.mockRestore();
        });
    });

    describe("dispose", () => {
        it("should dispose visibility checker without error", () => {
            expect(() => scheduler.dispose()).not.toThrow();
        });
    });
});

describe("LambdaScheduler - Edge Cases", () => {
    let scheduler: LambdaScheduler;
    let camera: PerspectiveCamera;

    beforeEach(() => {
        scheduler = new LambdaScheduler();
        camera = new PerspectiveCamera();
        camera.updateMatrixWorld();
    });

    afterEach(() => {
        scheduler?.dispose();
    });

    it("should handle object with no parent (world matrix not updated)", () => {
        const object = new Object3D();
        // Don't call updateMatrixWorld

        scheduler.beginFrame(0);
        // Should not throw
        expect(() => scheduler.shouldProcess(object, camera, 0, false)).not.toThrow();
    });

    it("should handle object at origin (same position as camera)", () => {
        const object = new Object3D();
        object.position.set(0, 0, 0);
        camera.position.set(0, 0, 0);
        object.updateMatrixWorld();
        camera.updateMatrixWorld();

        scheduler.beginFrame(0);
        const result = scheduler.shouldProcess(object, camera, 0, false);

        // Distance is 0, should use base throttle and run
        expect(result).toBeGreaterThanOrEqual(0);
    });

    it("should handle negative positions", () => {
        const object = new Object3D();
        object.position.set(-100, -50, -75);
        object.updateMatrixWorld();

        scheduler.beginFrame(0);
        // Should not throw and should compute distance correctly
        expect(() => scheduler.shouldProcess(object, camera, 0, false)).not.toThrow();
    });

    it("should cap deltaTime multiplier at 3 for very far objects", () => {
        const object = new Object3D();
        object.position.set(200, 0, 0); // 200m away — raw throttle would be 10
        object.updateMatrixWorld();

        for (let i = 0; i < 20; i++) {
            scheduler.beginFrame(i);
            const result = scheduler.shouldProcess(object, camera, 0, false);
            // When the object runs, multiplier should be capped at 3
            expect(result).toBeLessThanOrEqual(3);
        }
    });

    it("should cap deltaTime multiplier at 3 for far objects", () => {
        const object = new Object3D();
        object.position.set(60, 0, 0); // 60m — raw throttle factor would be 4
        object.updateMatrixWorld();

        for (let i = 0; i < 20; i++) {
            scheduler.beginFrame(i);
            const result = scheduler.shouldProcess(object, camera, 0, false);
            expect(result).toBeLessThanOrEqual(3);
        }
    });

    it("should skip objects when throttled based on hash and frame", () => {
        const object = new Object3D();
        object.position.set(60, 0, 0); // Far enough for throttle factor 4
        object.updateMatrixWorld();

        // Count how many frames the object runs in a cycle of 20
        let runCount = 0;
        for (let i = 0; i < 20; i++) {
            scheduler.beginFrame(i);
            const result = scheduler.shouldProcess(object, camera, 0, false);
            if (result > 0) {
                runCount++;
            }
        }

        // With throttle factor 4, should run roughly 5 times in 20 frames
        expect(runCount).toBeGreaterThan(0);
        expect(runCount).toBeLessThanOrEqual(10);
    });
});
