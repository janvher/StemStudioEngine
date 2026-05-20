import type { FrameContext, ISystem } from "../types";
import { PipelineStage } from "../types";

/**
 * Wraps AnimationGraphController as a POST_UPDATE system.
 */
export class AnimationGraphSystemAdapter implements ISystem {
    readonly id = "animation-graph-system";
    readonly stage = PipelineStage.POST_UPDATE;
    readonly priority = 80;
    readonly reads: string[] = ["animation", "transform"];
    readonly writes: string[] = ["animation"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;
    readonly budgetExempt = true;

    constructor(
        private getAnimationGraphController: () => { update(clock: any, deltaTime?: number): void } | undefined,
        private getClock: () => any,
    ) {}

    update(context: FrameContext): void {
        this.getAnimationGraphController()?.update(this.getClock(), context.deltaTime);
    }
}
