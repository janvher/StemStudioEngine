import type { FrameContext, ISystem } from "../types";
import { PipelineStage } from "../types";

/**
 * Wraps the AnimationController as an UPDATE system.
 * AnimationController.update() takes no parameters (uses internal clock).
 */
export class AnimationSystemAdapter implements ISystem {
    readonly id = "animation-system";
    readonly stage = PipelineStage.UPDATE;
    readonly priority = 1200;
    readonly reads: string[] = ["transform"];
    readonly writes: string[] = ["transform", "animation"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;
    readonly budgetExempt = true;

    constructor(private getAnimationController: () => { update(): void } | undefined) {}

    update(_context: FrameContext): void {
        this.getAnimationController()?.update();
    }
}
