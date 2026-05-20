import { CommandBuffer } from "./CommandBuffer";
import { recordFrameRuntimeTrace } from "./debug/frameRuntimeTrace.js";
import { DependencyGraph } from "./DependencyGraph";
import { FrameBudgetManager } from "./FrameBudgetManager";
import { TimeSliceRunner } from "./TimeSliceRunner";
import type { FrameContext, ISystem, ISpatialGrid } from "./types";
import { PipelineStage } from "./types";

const RENDER_STAGE = PipelineStage.RENDER;

export interface RenderPressurePolicy {
    update(renderAvgMs: number, deltaTimeMs: number): void;
}

export interface FrameOrchestratorConfig {
    targetFPS: number;
    frameBudgetMs: number;
    fixedTimestepMs: number;
    maxFixedStepsPerFrame: number;
    enableTimeSlicing: boolean;
    scheduleRender: boolean;
    /** Render avg / target ratio that triggers pressure (default 0.5). */
    renderPressureThreshold: number;
    /** DeltaTime / target ratio that triggers pressure (default 1.25). */
    deltaTimePressureThreshold: number;
    /** Whether fixed-rate behavior/lambda adapters are registered */
    fixedUpdatesEnabled?: boolean;
    /** Optional callback for quality alarm edge transitions. */
    alarmCallback?: (type: string, negative: boolean) => void;
    /**
     * When true (default), each UPDATE stage starts a fresh pass and discards
     * stale suspended generators from the previous frame.
     * When false, restores legacy behavior: resume suspended generators before
     * running the fresh UPDATE pass. Useful for A/B rollout comparison.
     */
    useFreshFrameScheduling?: boolean;
}

const DEFAULT_CONFIG: FrameOrchestratorConfig = {
    targetFPS: 60,
    frameBudgetMs: 14,
    fixedTimestepMs: 1000 / 60,
    maxFixedStepsPerFrame: 3,
    enableTimeSlicing: true,
    scheduleRender: false,
    renderPressureThreshold: 0.5,
    deltaTimePressureThreshold: 1.25,
    useFreshFrameScheduling: true,
};

/**
 * Unified frame orchestrator that replaces the ad-hoc sequential updates
 * in Application.animate() with a pipeline-stage architecture.
 *
 * Pipeline: INPUT → FIXED_UPDATE → PRE_UPDATE → UPDATE
 * → POST_UPDATE → RENDER
 * Command buffer flushes happen between FIXED_UPDATE/PRE_UPDATE and UPDATE/POST_UPDATE.
 */
export class FrameOrchestrator {
    private config: FrameOrchestratorConfig;
    private frameBudgetManager: FrameBudgetManager;
    private timeSliceRunner: TimeSliceRunner;
    private dependencyGraph: DependencyGraph;
    private commandBuffer: CommandBuffer;
    private animationFrameId: number | null = null;
    private animationCallback: (() => void) | null = null;
    private lastAnimationFrameTime: number | null = null;
    private deferredRenderCallbacks: Array<() => void> = [];
    private isRenderStageActive: boolean = false;
    private renderPressurePolicy: RenderPressurePolicy | null = null;

    private fixedAccumulator: number = 0;
    private interpolationAlpha: number = 1;
    private frameCount: number = 0;
    private _underRenderPressure: boolean = false;
    private _prevRenderPressure: boolean = false;
    private _prevBudgetExhausted: boolean = false;

    private spatialGrid: ISpatialGrid | null = null;

    // Background tab throttle: skip expensive stages when tab is hidden
    private _isTabVisible: boolean = true;
    private _visibilityHandler: (() => void) | null = null;
    private static readonly BACKGROUND_SKIP_STAGES = new Set([
        PipelineStage.FIXED_UPDATE,
        PipelineStage.UPDATE,
        PipelineStage.POST_UPDATE,
        PipelineStage.RENDER,
    ]);

    constructor(config: Partial<FrameOrchestratorConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.frameBudgetManager = new FrameBudgetManager(this.config.frameBudgetMs, this.config.targetFPS);
        this.timeSliceRunner = new TimeSliceRunner();
        this.dependencyGraph = new DependencyGraph();
        this.commandBuffer = new CommandBuffer();

        // Listen for tab visibility changes to throttle background execution
        if (typeof document !== "undefined") {
            this._visibilityHandler = () => {
                this._isTabVisible = !document.hidden;
                if (!this._isTabVisible) {
                    console.debug("[FrameOrchestrator] Tab hidden — throttling to essential stages only");
                } else {
                    console.debug("[FrameOrchestrator] Tab visible — resuming full pipeline");
                }
            };
            document.addEventListener("visibilitychange", this._visibilityHandler);
        }
    }

    // --- System registration ---

    registerSystem(system: ISystem): void {
        if (this.dependencyGraph.hasSystem(system.id)) {
            console.warn(`[FrameOrchestrator] System "${system.id}" already registered`);
            return;
        }
        this.dependencyGraph.addSystem(system);
    }

    unregisterSystem(id: string): void {
        this.dependencyGraph.removeSystem(id);
    }

    setSpatialGrid(grid: ISpatialGrid): void {
        this.spatialGrid = grid;
    }

    setRenderPressurePolicy(policy: RenderPressurePolicy | null): void {
        this.renderPressurePolicy = policy;
    }

    // --- Main tick ---

    tick(deltaTime: number): void {
        this.frameCount++;

        const fixedDt = this.config.fixedTimestepMs / 1000;
        const logicDeltaTime = deltaTime;

        // --- Compute deadline and render pressure ---
        this.frameBudgetManager.beginFrame(logicDeltaTime);
        const targetFrameMs = 1000 / this.config.targetFPS;
        const renderAvgMs = this.frameBudgetManager.renderTimeAvg;
        this._underRenderPressure =
            renderAvgMs > targetFrameMs * this.config.renderPressureThreshold ||
            logicDeltaTime * 1000 > targetFrameMs * this.config.deltaTimePressureThreshold;

        // Stage 1: INPUT — always runs, never budget-gated
        this.runStage(PipelineStage.INPUT, logicDeltaTime, fixedDt);

        // --- Pre-fixed (orchestrator-internal) ---
        // Input state is finalized for consumption by fixed-step gameplay.

        // Stage 2: FIXED_UPDATE — accumulator pattern for deterministic physics
        const accumulatorBeforeFrame = this.fixedAccumulator;
        const availableFixedSteps = Math.floor((accumulatorBeforeFrame + logicDeltaTime) / fixedDt);
        let executedFixedSteps = 0;
        let stoppedByMaxSteps = false;
        let stoppedByDeadline = false;
        let droppedFixedDebtSec = 0;
        if (this._isTabVisible) {
            this.fixedAccumulator += logicDeltaTime;
            const maxSteps = this._underRenderPressure ? 1 : this.config.maxFixedStepsPerFrame;
            let steps = 0;
            while (
                this.fixedAccumulator >= fixedDt &&
                steps < maxSteps &&
                performance.now() < this.frameBudgetManager.deadline
            ) {
                this.runStage(PipelineStage.FIXED_UPDATE, fixedDt, fixedDt);
                this.fixedAccumulator -= fixedDt;
                steps++;
            }
            executedFixedSteps = steps;
            if (this.fixedAccumulator >= fixedDt) {
                stoppedByMaxSteps = steps >= maxSteps;
                stoppedByDeadline = !stoppedByMaxSteps && performance.now() >= this.frameBudgetManager.deadline;
            }
            // Tight spiral-of-death clamp: keep at most one fixed step of carryover.
            const unclampedAccumulator = this.fixedAccumulator;
            this.fixedAccumulator = Math.min(this.fixedAccumulator, fixedDt);
            droppedFixedDebtSec = Math.max(0, unclampedAccumulator - this.fixedAccumulator);
        } else {
            // Background tabs skip fixed simulation completely and discard backlog.
            this.fixedAccumulator = 0;
            this.timeSliceRunner.clearSuspended();
            droppedFixedDebtSec = accumulatorBeforeFrame + logicDeltaTime;
        }

        // --- Post-fixed (orchestrator-internal) ---
        // Compute interpolation alpha for smooth rendering between fixed steps.
        this.interpolationAlpha = fixedDt > 0 ? this.fixedAccumulator / fixedDt : 1;
        recordFrameRuntimeTrace({
            kind: "orchestrator-frame",
            frameCount: this.frameCount,
            deltaTimeMs: logicDeltaTime * 1000,
            availableFixedSteps,
            executedFixedSteps,
            fixedAccumulatorBeforeSec: accumulatorBeforeFrame,
            fixedAccumulatorAfterSec: this.fixedAccumulator,
            fixedTimestepMs: fixedDt * 1000,
            interpolationAlpha: this.interpolationAlpha,
            underRenderPressure: this._underRenderPressure,
            renderAvgMs,
            stoppedByMaxSteps,
            stoppedByDeadline,
            droppedFixedDebtMs: droppedFixedDebtSec * 1000,
            tabVisible: this._isTabVisible,
        });

        const shouldTraceReplay = Boolean((globalThis as Record<string, unknown>).__TRACE_FRAME_REPLAY__);
        if (shouldTraceReplay) {
            console.debug("[ReplayTrace][OrchestratorFrame]", {
                frame: this.frameCount,
                deltaTimeMs: logicDeltaTime * 1000,
                availableFixedSteps,
                executedFixedSteps,
                fixedAccumulatorBeforeSec: accumulatorBeforeFrame,
                fixedAccumulatorAfterSec: this.fixedAccumulator,
                interpolationAlpha: this.interpolationAlpha,
                underRenderPressure: this._underRenderPressure,
                renderAvgMs,
                droppedFixedDebtMs: droppedFixedDebtSec * 1000,
                stoppedByMaxSteps,
                stoppedByDeadline,
                tabVisible: this._isTabVisible,
            });
        }
        if (stoppedByMaxSteps || stoppedByDeadline || droppedFixedDebtSec > 0) {
            const anomaly = {
                kind: "orchestrator-anomaly",
                frameCount: this.frameCount,
                deltaTimeMs: logicDeltaTime * 1000,
                availableFixedSteps,
                executedFixedSteps,
                droppedFixedDebtMs: droppedFixedDebtSec * 1000,
                stoppedByMaxSteps,
                stoppedByDeadline,
                underRenderPressure: this._underRenderPressure,
                renderAvgMs,
            };
            recordFrameRuntimeTrace(anomaly);
            if (shouldTraceReplay) {
                console.warn("[ReplayTrace][OrchestratorAnomaly]", anomaly);
            }
        }

        // Command buffer flush #1 (between FIXED_UPDATE and PRE_UPDATE)
        this.commandBuffer.flush();

        // Stage 3: PRE_UPDATE — spatial grid rebuild, quality settings
        // Runs after FIXED_UPDATE so UPDATE sees post-fixed state.
        this.runStage(PipelineStage.PRE_UPDATE, logicDeltaTime, fixedDt);

        // Command buffer flush #2 (between PRE_UPDATE and UPDATE)
        this.commandBuffer.flush();

        // Stage 4: UPDATE
        if (!this.config.useFreshFrameScheduling) {
            // Legacy path: resume suspended generators from previous frame before fresh work.
            this.timeSliceRunner.resumeAll(this.frameBudgetManager.deadline);
        }
        this.runStage(PipelineStage.UPDATE, logicDeltaTime, fixedDt);

        // Command buffer flush #3 (between UPDATE and POST_UPDATE)
        this.commandBuffer.flush();

        // Stage 5: POST_UPDATE — events, multiplayer sync
        this.runStage(PipelineStage.POST_UPDATE, logicDeltaTime, fixedDt);

        // --- Pre-render pressure hook (orchestrator-internal) ---
        // Same-frame render shedding goes here without reordering PRE_UPDATE.
        if (this.renderPressurePolicy) {
            this.renderPressurePolicy.update(renderAvgMs, logicDeltaTime * 1000);
        }

        // Emit alarm edge transitions for adaptive quality
        if (this.config.alarmCallback) {
            if (this._underRenderPressure !== this._prevRenderPressure) {
                this._prevRenderPressure = this._underRenderPressure;
                this.config.alarmCallback('render_pressure', this._underRenderPressure);
            }
            const budgetExhausted = this.frameBudgetManager.isExhausted;
            if (budgetExhausted !== this._prevBudgetExhausted) {
                this._prevBudgetExhausted = budgetExhausted;
                this.config.alarmCallback('budget_pressure', budgetExhausted);
            }
        }

        // Stage 6: RENDER
        if (this.config.scheduleRender) {
            this.executeRenderStage(logicDeltaTime, fixedDt);
        }

        // Periodic rebalance
        if (this.frameCount % 60 === 0) {
            this.frameBudgetManager.rebalance();
        }

        // Diagnostic log every ~5 seconds (at 60fps ≈ 300 frames)
        if (this.frameCount % 300 === 1) {
            console.debug(
                `[FrameOrchestrator] active ✓ frame=${this.frameCount} ` +
                `budget=${this.frameBudgetManager.activeBudget.toFixed(1)}ms ` +
                `fixedHz=${(1000 / this.config.fixedTimestepMs).toFixed(0)} ` +
                `pressure=${this._underRenderPressure} renderAvg=${renderAvgMs.toFixed(1)}ms ` +
                `scheduleRender=${this.config.scheduleRender}`,
            );
        }
    }

    scheduleRender(renderFrame: () => void): void {
        if (!this.config.scheduleRender || this.isRenderStageActive) {
            this.executeRenderCallback(renderFrame);
            return;
        }

        this.deferredRenderCallbacks.push(renderFrame);
    }

    private executeRenderCallback(renderFrame: () => void): void {
        const renderStart = performance.now();
        try {
            renderFrame();
        } finally {
            this.frameBudgetManager.recordRenderTime(performance.now() - renderStart);
        }
    }

    private flushDeferredRenderCallbacks(): void {
        if (this.deferredRenderCallbacks.length === 0) {
            return;
        }

        const callbacks = this.deferredRenderCallbacks.splice(0);
        for (const callback of callbacks) {
            this.executeRenderCallback(callback);
        }
    }

    private executeRenderStage(deltaTime: number, fixedDt: number): void {
        this.runStage(RENDER_STAGE, deltaTime, fixedDt);

        // When the tab is hidden, the render stage may be skipped by background throttling
        // logic. In that case, avoid flushing deferred render callbacks to prevent
        // unintended rendering work from running in the background.
        if (typeof document !== "undefined" && document.visibilityState === "hidden") {
            return;
        }
        this.flushDeferredRenderCallbacks();
    }

    startAnimationLoop(animationCallback: () => void): void {
        this.stopAnimationLoop();
        this.animationCallback = animationCallback;

        const loop = (timestamp: number) => {
            if (!this.animationCallback) {
                this.animationFrameId = null;
                return;
            }

            const shouldThrottleAnimationLoop = this.config.targetFPS < 59.5;
            if (shouldThrottleAnimationLoop) {
                const targetFrameInterval = 1000 / this.config.targetFPS;
                if (this.lastAnimationFrameTime === null) {
                    this.lastAnimationFrameTime = timestamp;
                }

                const elapsed = timestamp - this.lastAnimationFrameTime;
                if (elapsed + 0.25 < targetFrameInterval) {
                    this.animationFrameId = requestAnimationFrame(loop);
                    return;
                }

                this.lastAnimationFrameTime = elapsed > 0
                    ? timestamp - (elapsed % targetFrameInterval)
                    : timestamp;
            } else {
                this.lastAnimationFrameTime = timestamp;
            }
            this.animationCallback();
            this.animationFrameId = requestAnimationFrame(loop);
        };

        this.animationFrameId = requestAnimationFrame(loop);
    }

    stopAnimationLoop(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.animationCallback = null;
        this.lastAnimationFrameTime = null;
    }

    // --- Stage execution ---

    private runStage(stage: PipelineStage, dt: number, fixedDt: number): void {
        // Skip expensive stages when tab is in background
        if (!this._isTabVisible && FrameOrchestrator.BACKGROUND_SKIP_STAGES.has(stage)) {
            return;
        }

        const systems = this.dependencyGraph.getExecutionOrder(stage);
        if (systems.length === 0) return;

        const stageStart = performance.now();
        const context = this.buildContext(dt, fixedDt);
        const ignoreBudget = stage === PipelineStage.INPUT || stage === PipelineStage.RENDER;

        if (stage === PipelineStage.RENDER) {
            this.isRenderStageActive = true;
        }

        try {
            for (const system of systems) {
                if (this.frameBudgetManager.isExhausted && !ignoreBudget && !system.budgetExempt) {
                    continue;
                }

                let result: void | Generator;
                try {
                    result = system.update(context);
                } catch (error) {
                    console.warn(
                        `[FrameOrchestrator] Handled exception in system "${system.id}" during stage "${stage}" update(); continuing.`,
                        error,
                    );
                    continue;
                }

                if (!result || typeof result[Symbol.iterator] !== "function") {
                    continue;
                }

                const shouldTimeSlice =
                    this.config.enableTimeSlicing &&
                    stage === PipelineStage.UPDATE &&
                    system.supportsTimeSlicing;

                if (shouldTimeSlice) {
                    if (this.config.useFreshFrameScheduling && this.timeSliceRunner.hasSuspended(system.id)) {
                        this.timeSliceRunner.discardSuspended(system.id);
                    }
                    try {
                        this.timeSliceRunner.run(system.id, result, this.frameBudgetManager.deadline);
                    } catch (error) {
                        console.warn(
                            `[FrameOrchestrator] Handled exception while time-slicing system "${system.id}" in stage "${stage}"; continuing.`,
                            error,
                        );
                    }
                    continue;
                }

                // Non-sliced generators (especially FIXED_UPDATE) must complete in-stage.
                try {
                    let next = result.next();
                    while (!next.done) {
                        next = result.next();
                    }
                } catch (error) {
                    console.warn(
                        `[FrameOrchestrator] Handled exception while running generator for system "${system.id}" in stage "${stage}"; continuing.`,
                        error,
                    );
                }
            }
        } finally {
            if (stage === PipelineStage.RENDER) {
                this.flushDeferredRenderCallbacks();
                this.isRenderStageActive = false;
            }
        }

        this.frameBudgetManager.recordStageTime(stage, performance.now() - stageStart);
    }

    private buildContext(dt: number, fixedDt: number): FrameContext {
        return {
            deltaTime: dt,
            fixedDeltaTime: fixedDt,
            frameCount: this.frameCount,
            interpolationAlpha: this.interpolationAlpha,
            fixedOverstep: this.fixedAccumulator,
            frameStartTime: this.frameBudgetManager.frameStartTime,
            frameDeadline: this.frameBudgetManager.deadline,
            underRenderPressure: this._underRenderPressure,
            renderAvgMs: this.frameBudgetManager.renderTimeAvg,
            spatialGrid: this.spatialGrid,
            fixedUpdatesEnabled: this.config.fixedUpdatesEnabled ?? false,
        };
    }

    // --- Accessors ---

    getInterpolationAlpha(): number {
        return this.interpolationAlpha;
    }

    getFrameCount(): number {
        return this.frameCount;
    }

    isRenderSchedulingEnabled(): boolean {
        return this.config.scheduleRender;
    }

    getCommandBuffer(): CommandBuffer {
        return this.commandBuffer;
    }

    getBudgetManager(): FrameBudgetManager {
        return this.frameBudgetManager;
    }

    /**
     * Update orchestrator config at runtime (e.g. from quality system).
     * @param patch
     */
    updateConfig(patch: Partial<FrameOrchestratorConfig>): void {
        this.config = { ...this.config, ...patch };
        if (patch.frameBudgetMs !== undefined || patch.targetFPS !== undefined) {
            this.frameBudgetManager = new FrameBudgetManager(this.config.frameBudgetMs, this.config.targetFPS);
        }
        if (patch.fixedTimestepMs !== undefined) {
            this.fixedAccumulator = 0;
        }
        if (patch.scheduleRender === false) {
            this.deferredRenderCallbacks.length = 0;
        }
    }

    // --- Cleanup ---

    dispose(): void {
        this.stopAnimationLoop();
        if (this._visibilityHandler && typeof document !== "undefined") {
            document.removeEventListener("visibilitychange", this._visibilityHandler);
            this._visibilityHandler = null;
        }
        this.dependencyGraph.dispose();
        this.frameBudgetManager.dispose();
        this.timeSliceRunner.dispose();
        this.commandBuffer.dispose();
        this.deferredRenderCallbacks.length = 0;
        this.isRenderStageActive = false;
        this.spatialGrid?.dispose();
        this.spatialGrid = null;
    }
}
