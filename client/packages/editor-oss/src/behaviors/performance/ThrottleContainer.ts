/**
 * Dependency injection container for behavior throttling
 * Industry-standard explicit priority-based throttling system
 */
import * as THREE from 'three';

import type { ISpatialGrid } from '../../scheduler/types';
import { Behavior } from '../Behavior';
import { VisibilityChecker } from './implementations/VisibilityChecker';
import {
    IBehaviorThrottler,
    IVisibilityChecker,
    IDistanceThrottler,
    IPerformanceMonitor,
    IConfigValidator,
    IThrottleConfig,
    IThrottleDecision,
    IPerformanceMetrics,
    BehaviorThrottlePriority,
} from './interfaces/IThrottleStrategy';

export interface IThrottleContainer {
    createBehaviorThrottler(config?: Partial<IThrottleConfig>): IBehaviorThrottler;
    createVisibilityChecker(): IVisibilityChecker;
    createDistanceThrottler(): IDistanceThrottler;
    createPerformanceMonitor(): IPerformanceMonitor;
    createConfigValidator(): IConfigValidator;
}

/**
 * Default configuration for throttling system with explicit priority factors
 * Optimized for character movement stability
 */
const DEFAULT_THROTTLE_CONFIG: IThrottleConfig = {
    farDistanceSq: 2500,
    veryFarDistanceSq: 10000,
    farThrottleFactor: 2,        // Reduced from 3 - lighter throttling for better smoothness
    veryFarThrottleFactor: 5,    // Reduced from 10 - prevent aggressive throttling
    enableFrustumCulling: true,
    enableDistanceThrottling: true,
    enablePerformanceReporting: false,
    throttlingEnabled: true,     // Global throttling enable/disable
    priorityThrottleFactors: {
        [BehaviorThrottlePriority.CRITICAL]: 1,  // Never throttle
        [BehaviorThrottlePriority.HIGH]: 1,      // Changed from 2 - critical behaviors shouldn't be throttled
        [BehaviorThrottlePriority.MEDIUM]: 2,    // Changed from 3 - lighter throttling
        [BehaviorThrottlePriority.LOW]: 3,       // Changed from 5 - moderate throttling
        [BehaviorThrottlePriority.MINIMAL]: 5,    // Changed from 10 - less aggressive
    },
};

export class ThrottleContainer implements IThrottleContainer {
    createBehaviorThrottler(config?: Partial<IThrottleConfig>): IBehaviorThrottler {
        const validator = this.createConfigValidator();
        const finalConfig = validator.validate({
            ...DEFAULT_THROTTLE_CONFIG,
            ...config,
        });

        return new BehaviorThrottler(
            this.createVisibilityChecker(),
            this.createDistanceThrottler(),
            this.createPerformanceMonitor(),
            finalConfig,
        );
    }

    createVisibilityChecker(): IVisibilityChecker {
        return new VisibilityChecker();
    }

    createDistanceThrottler(): IDistanceThrottler {
        return new DistanceThrottler();
    }

    createPerformanceMonitor(): IPerformanceMonitor {
        return new PerformanceMonitor();
    }

    createConfigValidator(): IConfigValidator {
        return new ConfigValidator();
    }
}

// Implementation classes - these should ideally be in separate files for better organization

class BehaviorThrottler implements IBehaviorThrottler {
    // Adaptive throttle scaling (mirrors LambdaScheduler EMA pattern)
    private adaptiveMultiplier: number = 1;
    private avgFrameTime: number = 16.67;
    private lastFrameTime: number = 0;
    private readonly EMA_ALPHA = 0.1;
    // External pressure signal from orchestrator (1 = no pressure, up to 4)
    private _externalPressureMultiplier: number = 1;

    constructor(
        private readonly visibilityChecker: IVisibilityChecker,
        private readonly distanceThrottler: IDistanceThrottler,
        private readonly performanceMonitor: IPerformanceMonitor,
        private config: IThrottleConfig,
    ) {}

    /** Call once per frame before processing behaviors to update adaptive throttle */
    beginFrame(): void {
        const now = performance.now();
        if (this.lastFrameTime > 0) {
            const dt = now - this.lastFrameTime;
            this.avgFrameTime = this.EMA_ALPHA * dt + (1 - this.EMA_ALPHA) * this.avgFrameTime;
            const target = 16.67; // 60fps
            if (this.avgFrameTime > target * 1.2) {
                this.adaptiveMultiplier = Math.min(this.adaptiveMultiplier + 1, 4);
            } else if (this.avgFrameTime < target * 0.85 && this.adaptiveMultiplier > 1) {
                this.adaptiveMultiplier = Math.max(1, this.adaptiveMultiplier - 1);
            }
        }
        this.lastFrameTime = now;
        // Merge external orchestrator pressure (take the higher of local vs external)
        this.adaptiveMultiplier = Math.max(this.adaptiveMultiplier, this._externalPressureMultiplier);
    }

    setPressureMultiplier(multiplier: number): void {
        this._externalPressureMultiplier = Math.max(1, Math.min(4, multiplier));
    }

    shouldUpdateBehavior(
        behavior: Behavior,
        camera: THREE.Camera,
        frameCount: number,
    ): IThrottleDecision {
        this.performanceMonitor.recordCheck();

        // STEP 0: Check if throttling is globally disabled
        if (!this.config.throttlingEnabled) {
            return { shouldUpdate: true, reason: 'throttling-disabled' };
        }

        // STEP 1: Check explicit priority - industry standard approach
        const priorityFactor = this.config.priorityThrottleFactors[behavior.throttleConfig.throttlePriority];

        // CRITICAL behaviors always update
        if (behavior.throttleConfig.throttlePriority === BehaviorThrottlePriority.CRITICAL) {
            return { shouldUpdate: true, reason: 'critical-priority' };
        }

        // STEP 1b: Check requiresConsistentUpdates flag - these behaviors need every frame
        if (behavior.throttleConfig.requiresConsistentUpdates) {
            return { shouldUpdate: true, reason: 'requires-consistent-updates' };
        }

        // STEP 2: Check if no target
        if (!behavior.target) {
            return { shouldUpdate: true, reason: 'no-target' };
        }

        // STEP 3: Compute combined throttle factor (priority × distance × adaptive)
        let combinedFactor = Math.max(priorityFactor, this.adaptiveMultiplier);

        if (this.config.enableDistanceThrottling && behavior.throttleConfig.enableDistanceThrottling) {
            const distanceFactor = this.distanceThrottler.getDistanceFactor(behavior.target, camera);
            combinedFactor = Math.min(priorityFactor * distanceFactor, 60);
            combinedFactor = Math.max(combinedFactor, this.adaptiveMultiplier);
        }

        // STEP 4: Frustum culling — boost throttle instead of hard-cull
        // Invisible behaviors still run at heavily reduced rate (e.g. AI behind camera)
        if (this.config.enableFrustumCulling && behavior.throttleConfig.enableFrustumCulling) {
            const isVisible = this.visibilityChecker.isVisible(behavior.target, camera);
            if (!isVisible) {
                this.performanceMonitor.recordCull();
                // Opt-in full skip for visual-only behaviors (not CRITICAL)
                if (behavior.throttleConfig.skipWhenInvisible) {
                    return { shouldUpdate: false, reason: 'invisible-skip' };
                }
                combinedFactor = Math.max(combinedFactor, 20);
            }
        }

        // STEP 5: Stable interleave using UUID hash (prevents frame spikes)
        // Without this, ALL behaviors with factor=3 skip the same frames.
        // Hash spreads them evenly so ~1/3 run each frame.
        if (combinedFactor > 1) {
            let hash = behavior.target?.userData?._behaviorHash as number | undefined;
            if (hash === undefined) {
                hash = this.stableHash(behavior.uuid);
                if (behavior.target) behavior.target.userData._behaviorHash = hash;
            }
            if (hash % combinedFactor !== frameCount % combinedFactor) {
                this.performanceMonitor.recordThrottle();
                return {
                    shouldUpdate: false,
                    reason: `throttled-factor-${combinedFactor}`,
                    priority: combinedFactor,
                };
            }
        }

        return { shouldUpdate: true, reason: 'passed-all-checks' };
    }

    /**
     * Simple string hash returning a stable non-negative integer
     * @param uuid
     */
    private stableHash(uuid: string): number {
        let h = 0;
        for (let i = 0; i < uuid.length; i++) {
            h = (h << 5) - h + uuid.charCodeAt(i) | 0;
        }
        return Math.abs(h);
    }

    configure(config: Partial<IThrottleConfig>): void {
        const validator = new ConfigValidator();
        this.config = validator.validate({ ...this.config, ...config });
        this.distanceThrottler.updateConfig(this.config);
    }

    getMetrics(): IPerformanceMetrics {
        return this.performanceMonitor.getMetrics();
    }

    setSpatialGrid(grid: ISpatialGrid | null): void {
        this.distanceThrottler.setSpatialGrid?.(grid);
    }

    dispose(): void {
        this.visibilityChecker.dispose();
        this.performanceMonitor.dispose();
    }
}

class DistanceThrottler implements IDistanceThrottler {
    private config: IThrottleConfig = DEFAULT_THROTTLE_CONFIG;
    private objectWorldPosAux = new THREE.Vector3();
    private cameraWorldPosAux = new THREE.Vector3();
    private spatialGrid: ISpatialGrid | null = null;

    setSpatialGrid(grid: ISpatialGrid | null): void {
        this.spatialGrid = grid;
    }

    private getDistanceSq(object: THREE.Object3D, camera: THREE.Camera): number {
        // Use spatial grid for O(1) lookup when available
        if (this.spatialGrid) {
            camera.getWorldPosition(this.cameraWorldPosAux);
            const gridDist = this.spatialGrid.getDistanceSq(object.uuid, this.cameraWorldPosAux);
            if (gridDist !== null && gridDist !== undefined) {
                return gridDist;
            }
        }
        // Fallback: compute world positions (O(n) path)
        object.getWorldPosition(this.objectWorldPosAux);
        camera.getWorldPosition(this.cameraWorldPosAux);
        return this.objectWorldPosAux.distanceToSquared(this.cameraWorldPosAux);
    }

    getDistanceFactor(object: THREE.Object3D, camera: THREE.Camera): number {
        const distanceSq = this.getDistanceSq(object, camera);
        if (distanceSq > this.config.veryFarDistanceSq) return this.config.veryFarThrottleFactor;
        if (distanceSq > this.config.farDistanceSq) return this.config.farThrottleFactor;
        return 1;
    }

    shouldThrottle(object: THREE.Object3D, camera: THREE.Camera, frameCount: number): IThrottleDecision {
        const distanceSq = this.getDistanceSq(object, camera);

        if (distanceSq > this.config.veryFarDistanceSq) {
            const shouldUpdate = frameCount % this.config.veryFarThrottleFactor === 0;
            return {
                shouldUpdate,
                reason: shouldUpdate ? 'very-far-throttled-update' : 'very-far-throttled-skip',
                priority: 1,
            };
        } else if (distanceSq > this.config.farDistanceSq) {
            const shouldUpdate = frameCount % this.config.farThrottleFactor === 0;
            return {
                shouldUpdate,
                reason: shouldUpdate ? 'far-throttled-update' : 'far-throttled-skip',
                priority: 2,
            };
        }

        return { shouldUpdate: true, reason: 'close-object', priority: 3 };
    }

    updateConfig(config: IThrottleConfig): void {
        this.config = config;
    }
}

class PerformanceMonitor implements IPerformanceMonitor {
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
            cullingEfficiency: this.metrics.totalChecks > 0 ?
                this.metrics.culledCount / this.metrics.totalChecks * 100 : 0,
            throttlingEfficiency: this.metrics.totalChecks > 0 ?
                this.metrics.throttledCount / this.metrics.totalChecks * 100 : 0,
        };
    }

    dispose(): void {
        // Reset metrics
        this.metrics = {
            totalChecks: 0,
            culledCount: 0,
            throttledCount: 0,
            startTime: performance.now(),
        };
    }
}

class ConfigValidator implements IConfigValidator {
    validate(config: Partial<IThrottleConfig>): IThrottleConfig {
        return {
            farDistanceSq: this.validateNumber(config.farDistanceSq, DEFAULT_THROTTLE_CONFIG.farDistanceSq, 100, 100000),
            veryFarDistanceSq: this.validateNumber(
                config.veryFarDistanceSq, 
                DEFAULT_THROTTLE_CONFIG.veryFarDistanceSq, 
                config.farDistanceSq || DEFAULT_THROTTLE_CONFIG.farDistanceSq, 
                1000000,
            ),
            farThrottleFactor: Math.max(1, Math.min(60, Math.floor(config.farThrottleFactor || DEFAULT_THROTTLE_CONFIG.farThrottleFactor))),
            veryFarThrottleFactor: Math.max(1, Math.min(120, Math.floor(config.veryFarThrottleFactor || DEFAULT_THROTTLE_CONFIG.veryFarThrottleFactor))),
            enableFrustumCulling: config.enableFrustumCulling ?? DEFAULT_THROTTLE_CONFIG.enableFrustumCulling,
            enableDistanceThrottling: config.enableDistanceThrottling ?? DEFAULT_THROTTLE_CONFIG.enableDistanceThrottling,
            enablePerformanceReporting: config.enablePerformanceReporting ?? DEFAULT_THROTTLE_CONFIG.enablePerformanceReporting,
            throttlingEnabled: config.throttlingEnabled ?? DEFAULT_THROTTLE_CONFIG.throttlingEnabled,
            priorityThrottleFactors: {
                ...DEFAULT_THROTTLE_CONFIG.priorityThrottleFactors,
                ...config.priorityThrottleFactors || {},
            },
        };
    }

    private validateNumber(value: number | undefined, defaultValue: number, min: number, max: number): number {
        if (typeof value !== 'number' || isNaN(value)) {
            return defaultValue;
        }
        return Math.max(min, Math.min(max, value));
    }
}
