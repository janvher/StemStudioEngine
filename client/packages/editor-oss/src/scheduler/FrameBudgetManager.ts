import { PipelineStage } from "./types";

/**
 * Tracks global frame budget and per-stage time consumption.
 * Uses EMA smoothing to adaptively rebalance the logic budget
 * based on measured render time.
 */
export class FrameBudgetManager {
    private readonly configBudgetMs: number;
    private activeBudgetMs: number;
    private rebalancedCapMs: number;
    private frameStart: number = 0;
    private stageAvgTimes: Map<PipelineStage, number> = new Map();
    private readonly EMA_ALPHA = 0.15;
    /** Fraction of actual frame time to use as budget (0-1). */
    private static readonly FRAME_UTILIZATION = 0.85;
    /** Headroom to leave for browser/OS overhead. */
    private static readonly HEADROOM_MS = 1.0;

    private targetFPS: number;
    private avgRenderTimeMs: number = 0;

    constructor(totalBudgetMs: number = 14, targetFPS: number = 60) {
        this.configBudgetMs = totalBudgetMs;
        this.activeBudgetMs = totalBudgetMs;
        this.rebalancedCapMs = totalBudgetMs;
        this.targetFPS = targetFPS;
    }

    /**
     * Begin a new frame. When deltaTime (in seconds) is provided,
     * the budget scales to 85% of the actual frame time.
     * @param deltaTimeSec
     */
    beginFrame(deltaTimeSec?: number): void {
        this.frameStart = performance.now();
        const dynamicBudgetMs = deltaTimeSec !== undefined && deltaTimeSec > 0
            ? deltaTimeSec * 1000 * FrameBudgetManager.FRAME_UTILIZATION
            : this.configBudgetMs;

        this.activeBudgetMs = Math.min(dynamicBudgetMs, this.rebalancedCapMs);
    }

    get activeBudget(): number {
        return this.activeBudgetMs;
    }

    get frameStartTime(): number {
        return this.frameStart;
    }

    get deadline(): number {
        return this.frameStart + this.activeBudgetMs;
    }

    remainingAt(now: number): number {
        return Math.max(0, this.deadline - now);
    }

    isExhaustedAt(now: number): boolean {
        return this.remainingAt(now) <= 0.5;
    }

    get elapsed(): number {
        return performance.now() - this.frameStart;
    }

    get remaining(): number {
        return Math.max(0, this.activeBudgetMs - this.elapsed);
    }

    get isExhausted(): boolean {
        return this.remaining <= 0.5;
    }

    recordStageTime(stage: PipelineStage, timeMs: number): void {
        const current = this.stageAvgTimes.get(stage) ?? timeMs;
        this.stageAvgTimes.set(
            stage,
            this.EMA_ALPHA * timeMs + (1 - this.EMA_ALPHA) * current,
        );
    }

    getStageAvgTime(stage: PipelineStage): number {
        return this.stageAvgTimes.get(stage) ?? 0;
    }

    /**
     * Record how long the GPU/render pass took this frame (in ms).
     * Called from the render loop after Three.js render completes.
     * @param renderTimeMs
     */
    recordRenderTime(renderTimeMs: number): void {
        this.avgRenderTimeMs =
            this.EMA_ALPHA * renderTimeMs +
            (1 - this.EMA_ALPHA) * this.avgRenderTimeMs;
    }

    /**
     * Rebalance the config budget based on measured render time.
     * Logic budget = frame time target − average render time − headroom.
     * Called every 60 frames by FrameOrchestrator.
     */
    rebalance(): void {
        const frameTimeMs = 1000 / this.targetFPS;
        const logicBudget = frameTimeMs - this.avgRenderTimeMs - FrameBudgetManager.HEADROOM_MS;
        // Clamp: never drop below 2ms (need at least some logic time) or exceed config
        this.rebalancedCapMs = Math.max(2, Math.min(this.configBudgetMs, logicBudget));
        this.activeBudgetMs = Math.min(this.activeBudgetMs, this.rebalancedCapMs);
    }

    /** Current average render time as tracked by recordRenderTime. */
    get renderTimeAvg(): number {
        return this.avgRenderTimeMs;
    }

    updateTargetFPS(fps: number): void {
        if (fps > 0) this.targetFPS = fps;
    }

    dispose(): void {
        this.stageAvgTimes.clear();
    }
}
