/**
 * Unit tests demonstrating the testability of the new industry-standard architecture
 * Using explicit priority-based throttling instead of brittle auto-detection
 */
import * as THREE from "three";

import BehaviorManager from "../../BehaviorManager";
import {
    IBehaviorThrottler,
    IVisibilityChecker,
    IDistanceThrottler,
    IPerformanceMonitor,
    IThrottleDecision,
    IPerformanceMetrics,
    BehaviorThrottlePriority,
} from "../interfaces/IThrottleStrategy";
import {ThrottleContainer} from "../ThrottleContainer";

vi.mock("three", async (importOriginal) => ({
    ...await importOriginal<typeof import("three")>(),
    Audio: vi.fn(),
    AudioListener: vi.fn(),
}));

// Mock implementations for testing
class MockVisibilityChecker implements IVisibilityChecker {
    private mockVisible = true;

    setVisible(visible: boolean) {
        this.mockVisible = visible;
    }

    isVisible(): boolean {
        return this.mockVisible;
    }

    clearCache(): void {}
    dispose(): void {}
}

class MockDistanceThrottler implements IDistanceThrottler {
    private mockDecision: IThrottleDecision = {shouldUpdate: true, reason: "test"};
    private mockDistanceFactor = 1;

    setDecision(decision: IThrottleDecision) {
        this.mockDecision = decision;
    }

    setDistanceFactor(factor: number) {
        this.mockDistanceFactor = factor;
    }

    shouldThrottle(): IThrottleDecision {
        return this.mockDecision;
    }

    getDistanceFactor(): number {
        return this.mockDistanceFactor;
    }

    updateConfig(): void {}
}

class MockPerformanceMonitor implements IPerformanceMonitor {
    private metrics = {
        totalChecks: 0,
        culledCount: 0,
        throttledCount: 0,
        startTime: performance.now(),
    };

    recordCheck(): void {
        this.metrics.totalChecks++;
    }

    recordCull(): void {
        this.metrics.culledCount++;
    }

    recordThrottle(): void {
        this.metrics.throttledCount++;
    }

    getMetrics(): IPerformanceMetrics {
        const runTime = performance.now() - this.metrics.startTime;
        return {
            totalChecks: this.metrics.totalChecks,
            culledCount: this.metrics.culledCount,
            throttledCount: this.metrics.throttledCount,
            runTimeMs: runTime,
            cullingEfficiency:
                this.metrics.totalChecks > 0 ? this.metrics.culledCount / this.metrics.totalChecks * 100 : 0,
            throttlingEfficiency:
                this.metrics.totalChecks > 0 ? this.metrics.throttledCount / this.metrics.totalChecks * 100 : 0,
        };
    }

    dispose(): void {
        this.metrics = {
            totalChecks: 0,
            culledCount: 0,
            throttledCount: 0,
            startTime: performance.now(),
        };
    }
}

class MockThrottleContainer extends ThrottleContainer {
    constructor(
        private mockVisibilityChecker: MockVisibilityChecker,
        private mockDistanceThrottler: MockDistanceThrottler,
        private mockPerformanceMonitor: MockPerformanceMonitor,
    ) {
        super();
    }

    createVisibilityChecker(): IVisibilityChecker {
        return this.mockVisibilityChecker;
    }

    createDistanceThrottler(): IDistanceThrottler {
        return this.mockDistanceThrottler;
    }

    createPerformanceMonitor(): IPerformanceMonitor {
        return this.mockPerformanceMonitor;
    }
}

// Industry-standard explicit priority-based tests
describe("BehaviorThrottling - Industry Standard Approach", () => {
    let mockVisibilityChecker: MockVisibilityChecker;
    let mockDistanceThrottler: MockDistanceThrottler;
    let mockPerformanceMonitor: MockPerformanceMonitor;
    let mockContainer: MockThrottleContainer;
    let throttler: IBehaviorThrottler;

    beforeEach(() => {
        mockVisibilityChecker = new MockVisibilityChecker();
        mockDistanceThrottler = new MockDistanceThrottler();
        mockPerformanceMonitor = new MockPerformanceMonitor();
        mockContainer = new MockThrottleContainer(mockVisibilityChecker, mockDistanceThrottler, mockPerformanceMonitor);
        throttler = mockContainer.createBehaviorThrottler();
    });

    it("should always update CRITICAL priority behaviors", () => {
        const behavior = {
            throttleConfig: {
                throttlePriority: BehaviorThrottlePriority.CRITICAL,
                enableFrustumCulling: true,
                enableDistanceThrottling: true,
            },
            target: new THREE.Object3D(),
            enableFrustumCulling: true,
            enableDistanceThrottling: true,
        } as any;
        const camera = new THREE.PerspectiveCamera();

        const result = throttler.shouldUpdateBehavior(behavior, camera, 1, 0.016);

        expect(result.shouldUpdate).toBe(true);
        expect(result.reason).toBe("critical-priority");
    });
    it("should throttle LOW priority behaviors appropriately", () => {
        const behavior = {
            uuid: "test-low-priority-uuid",
            throttleConfig: {
                throttlePriority: BehaviorThrottlePriority.LOW,
                enableFrustumCulling: true,
                enableDistanceThrottling: true,
            },
            target: new THREE.Object3D(),
            enableFrustumCulling: true,
            enableDistanceThrottling: true,
        } as any;
        const camera = new THREE.PerspectiveCamera();

        // LOW priority has factor 3, so behavior should update exactly 1 out of every 3 frames
        // (stable interleave distributes which frame based on UUID hash)
        let updateCount = 0;
        for (let frame = 0; frame < 3; frame++) {
            const result = throttler.shouldUpdateBehavior(behavior, camera, frame, 0.016);
            if (result.shouldUpdate) updateCount++;
        }
        expect(updateCount).toBe(1);

        // Throttled frames should have the correct reason
        let throttledResult: any = null;
        for (let frame = 0; frame < 3; frame++) {
            const result = throttler.shouldUpdateBehavior(behavior, camera, frame, 0.016);
            if (!result.shouldUpdate) { throttledResult = result; break; }
        }
        expect(throttledResult).not.toBeNull();
        expect(throttledResult.reason).toBe("throttled-factor-3");
    });
    it("should respect individual behavior culling settings", () => {
        const behavior = {
            uuid: "test-culling-uuid",
            throttleConfig: {
                throttlePriority: BehaviorThrottlePriority.MEDIUM,
                enableFrustumCulling: false, // Explicitly disabled
                enableDistanceThrottling: true,
            },
            target: new THREE.Object3D(),
            enableFrustumCulling: false, // Explicitly disabled
            enableDistanceThrottling: true,
        } as any;
        const camera = new THREE.PerspectiveCamera();

        // Set object as not visible, but behavior has culling disabled
        mockVisibilityChecker.setVisible(false);

        // MEDIUM has factor 2, so behavior runs on 1 of every 2 frames (hash-based)
        // Find the frame where it runs and verify it passes despite being invisible
        let passedFrame = false;
        for (let frame = 0; frame < 2; frame++) {
            const result = throttler.shouldUpdateBehavior(behavior, camera, frame, 0.016);
            if (result.shouldUpdate) {
                expect(result.reason).toBe("passed-all-checks");
                passedFrame = true;
            }
        }
        expect(passedFrame).toBe(true);
    });

    it("should record performance metrics correctly", () => {
        const behavior = {
            throttleConfig: {
                throttlePriority: BehaviorThrottlePriority.HIGH,
                enableFrustumCulling: true,
                enableDistanceThrottling: true,
            },
            target: new THREE.Object3D(),
            enableFrustumCulling: true,
            enableDistanceThrottling: true,
        } as any;
        const camera = new THREE.PerspectiveCamera();

        throttler.shouldUpdateBehavior(behavior, camera, 1, 0.016); // Frame 1, HIGH factor is 1, so it updates

        const metrics = mockPerformanceMonitor.getMetrics();
        expect(metrics.totalChecks).toBe(1);
    });
});

// Example integration test with BehaviorManager
describe("BehaviorManager Integration - Explicit Priority System", () => {
    it("should use injected throttle container with explicit priorities", () => {
        const mockVisibilityChecker = new MockVisibilityChecker();
        const mockDistanceThrottler = new MockDistanceThrottler();
        const mockPerformanceMonitor = new MockPerformanceMonitor();
        const mockContainer = new MockThrottleContainer(
            mockVisibilityChecker,
            mockDistanceThrottler,
            mockPerformanceMonitor,
        );

        const mockGame = {
            scene: (() => { const s = new THREE.Scene(); s.name = "BehaviorThrottlingTestScene"; return s; })(),
            camera: new THREE.PerspectiveCamera(),
        } as any;

        // BehaviorManager with dependency injection - industry standard
        const behaviorManager = new BehaviorManager(
            mockGame,
            new Map(),
            new Map(),
            mockContainer, // Explicit dependency injection
        );

        // System is now predictable and testable
        const metrics = behaviorManager.getPerformanceMetrics();
        expect(metrics).toBeDefined();
    });
});
