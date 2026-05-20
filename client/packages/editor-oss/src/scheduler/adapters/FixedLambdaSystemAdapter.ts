import type { LambdaManager } from "@stem/editor-oss/lambdas/LambdaManager";
import type { FrameContext, ISystem } from "../types";
import { PipelineStage } from "../types";

/**
 * Runs lambdas with fixedUpdate() at fixed timestep in FIXED_UPDATE stage.
 * Lambdas that implement fixedUpdate() will be called at a consistent rate
 * determined by scheduler.fixedTimestepHz (e.g., 60Hz on desktop, 30Hz on mobile).
 *
 * Lambdas without fixedUpdate() are skipped with a console warning.
 * This is similar to Godot's _physics_process() - use for physics-dependent logic.
 *
 * Calls the manager's fixed-step path directly.
 */
export class FixedLambdaSystemAdapter implements ISystem {
    readonly id = "fixed-lambda-system";
    readonly stage = PipelineStage.FIXED_UPDATE;
    readonly priority = 160; // After fixed behaviors (150), before collision (200)
    readonly reads: string[] = ["transform"];
    readonly writes: string[] = ["transform", "lambda-state"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;

    constructor(private getLambdaManager: () => LambdaManager | undefined) {}

    update(context: FrameContext): void {
        const manager = this.getLambdaManager();
        if (!manager) return;
        manager.fixedUpdate(context.fixedDeltaTime, context);
    }
}
