import type { LambdaManager } from "@stem/editor-oss/lambdas/LambdaManager";
import type { FrameContext, ISystem } from "../types";
import { PipelineStage } from "../types";

/**
 * Wraps the existing LambdaManager as an ISystem.
 *
 * Calls the manager's fresh per-frame update path.
 * Budget enforcement happens inside LambdaManager via the shared live deadline.
 */
export class LambdaSystemAdapter implements ISystem {
    readonly id = "lambda-system";
    readonly stage = PipelineStage.UPDATE;
    readonly priority = 1100;
    readonly reads: string[] = ["transform"];
    readonly writes: string[] = ["transform", "lambda-state"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;
    readonly budgetExempt = true;

    constructor(private getLambdaManager: () => LambdaManager | undefined) {}

    update(context: FrameContext): void {
        const manager = this.getLambdaManager();
        if (!manager) return;
        manager.fixedUpdatesEnabled = context.fixedUpdatesEnabled;
        manager.scheduler?.setSpatialGrid?.(context.spatialGrid);
        manager.update(context.deltaTime, context);
    }
}
