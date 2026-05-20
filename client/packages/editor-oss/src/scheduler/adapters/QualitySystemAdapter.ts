import type { FrameContext, ISystem } from "../types";
import { PipelineStage } from "../types";

/**
 * Wraps the QualitySystem as a PRE_UPDATE system.
 * Adjusts render quality settings before the main update loop.
 */
export class QualitySystemAdapter implements ISystem {
    readonly id = "quality-system";
    readonly stage = PipelineStage.PRE_UPDATE;
    readonly priority = 100;
    readonly reads: string[] = [];
    readonly writes: string[] = ["quality-settings"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;

    constructor(private getQualitySystem: () => { update(deltaTime: number): void } | undefined) {}

    update(context: FrameContext): void {
        this.getQualitySystem()?.update(context.deltaTime);
    }
}
