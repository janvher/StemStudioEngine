import type { FrameContext, ISystem } from "../types";
import { PipelineStage } from "../types";

/**
 * Wraps AudioController as a POST_UPDATE system.
 */
export class AudioSystemAdapter implements ISystem {
    readonly id = "audio-system";
    readonly stage = PipelineStage.POST_UPDATE;
    readonly priority = 85;
    readonly reads: string[] = ["events"];
    readonly writes: string[] = ["audio-state"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;

    constructor(private getAudioController: () => { update(): void } | undefined) {}

    update(_context: FrameContext): void {
        this.getAudioController()?.update();
    }
}
