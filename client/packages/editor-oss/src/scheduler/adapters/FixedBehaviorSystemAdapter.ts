import type BehaviorManager from "@stem/editor-oss/behaviors/BehaviorManager";
import type { FrameContext, ISystem } from "../types";
import { PipelineStage } from "../types";

/**
 * Runs behaviors with fixedUpdate() at fixed timestep in FIXED_UPDATE stage.
 * Behaviors that implement fixedUpdate() will be called at a consistent rate
 * determined by scheduler.fixedTimestepHz (e.g., 60Hz on desktop, 30Hz on mobile).
 *
 * This is similar to Godot's _physics_process() - use for physics-dependent logic.
 * Visual smoothing should be done in update() using interpolationAlpha.
 *
 * Calls the manager's fixed-step path directly.
 */
export class FixedBehaviorSystemAdapter implements ISystem {
    readonly id = "fixed-behavior-system";
    readonly stage = PipelineStage.FIXED_UPDATE;
    readonly priority = 150; // After physics (100), before collision (200)
    readonly reads: string[] = ["physics", "transform"];
    readonly writes: string[] = ["transform", "behavior-state"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;

    constructor(private getBehaviorManager: () => BehaviorManager | undefined) {}

    update(context: FrameContext): void {
        const mgr = this.getBehaviorManager();
        if (!mgr) return;
        mgr.fixedUpdate(context.fixedDeltaTime, context);
    }
}
