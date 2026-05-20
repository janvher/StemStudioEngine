import type { FrameContext, ISystem } from "../types";
import { PipelineStage } from "../types";

/**
 * Wraps PlayerEvent as a POST_UPDATE system.
 * Runs after all game logic to broadcast player state changes.
 */
export class PlayerEventAdapter implements ISystem {
    readonly id = "player-event-system";
    readonly stage = PipelineStage.POST_UPDATE;
    readonly priority = 100;
    readonly reads: string[] = ["transform"];
    readonly writes: string[] = ["events"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;

    constructor(
        private getPlayerEvent: () => { update(clock: any, deltaTime: number): void } | undefined,
    ) {}

    update(context: FrameContext): void {
        // Legacy scripts should use deltaTime; clock is deprecated and intentionally null.
        this.getPlayerEvent()?.update(null, context.deltaTime);
    }
}
