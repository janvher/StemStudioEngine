import type { Clock } from "three";

import type { FrameContext, ISystem } from "../types";
import { PipelineStage } from "../types";

/**
 * Wraps the scheduled render callback as a RENDER stage system.
 * Runs render-frame synchronization immediately before the scheduled render.
 */
export class RenderSystemAdapter implements ISystem {
    readonly id = "render-system";
    readonly stage = PipelineStage.RENDER;
    readonly priority = 100;
    readonly reads: string[] = ["transform", "camera", "render-state"];
    readonly writes: string[] = [];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;

    constructor(
        private getRenderCallback: () => ((clock: Clock, deltaTime: number) => void) | undefined,
        private getClock: () => Clock
    ) {}

    update(context: FrameContext): void {
        this.getRenderCallback()?.(this.getClock(), context.deltaTime);
    }
}
