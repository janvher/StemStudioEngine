import type { Clock } from "three";

import type { FrameContext, ISystem } from "../types";
import { PipelineStage } from "../types";

/**
 * Wraps AiWorldControl as a POST_UPDATE system.
 */
export class AiWorldSystemAdapter implements ISystem {
    readonly id = "ai-world-system";
    readonly stage = PipelineStage.POST_UPDATE;
    readonly priority = 70;
    readonly reads: string[] = ["transform", "events"];
    readonly writes: string[] = ["ai-state"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;

    constructor(
        private getAiWorldControl: () => { update(clock: Clock, deltaTime: number): void } | undefined,
        private getClock: () => Clock,
    ) {}

    update(context: FrameContext): void {
        this.getAiWorldControl()?.update(this.getClock(), context.deltaTime);
    }
}
