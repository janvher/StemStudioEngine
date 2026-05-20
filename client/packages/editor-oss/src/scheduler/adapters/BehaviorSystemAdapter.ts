import type BehaviorManager from "@stem/editor-oss/behaviors/BehaviorManager";
import type { FrameContext, ISystem } from "../types";
import { PipelineStage } from "../types";

/**
 * Wraps the existing BehaviorManager as an ISystem.
 * Uses a getter to avoid circular dependency issues during initialization.
 *
 * Calls the manager's fresh per-frame update path.
 * Budget enforcement happens inside BehaviorManager via the shared live deadline.
 */
export class BehaviorSystemAdapter implements ISystem {
    readonly id = "behavior-system";
    readonly stage = PipelineStage.UPDATE;
    readonly priority = 1000;
    readonly reads: string[] = [];
    readonly writes: string[] = ["transform", "behavior-state"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;
    readonly budgetExempt = true;

    constructor(private getBehaviorManager: () => BehaviorManager | undefined) {}

    update(context: FrameContext): void {
        const mgr = this.getBehaviorManager();
        if (!mgr) return;
        mgr.update(context.deltaTime, context);
    }
}
