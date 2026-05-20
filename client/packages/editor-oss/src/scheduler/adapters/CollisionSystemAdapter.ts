import type { FrameContext, ISystem } from "../types";
import { PipelineStage } from "../types";

/**
 * Wraps the CollisionDetector as a FIXED_UPDATE system.
 * Runs after physics to resolve collisions.
 */
export class CollisionSystemAdapter implements ISystem {
    readonly id = "collision-system";
    readonly stage = PipelineStage.FIXED_UPDATE;
    readonly priority = 200;
    readonly reads: string[] = ["transform", "physics"];
    readonly writes: string[] = ["collision"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;

    constructor(private getCollisionDetector: () => { update(): void } | undefined) {}

    update(_context: FrameContext): void {
        this.getCollisionDetector()?.update();
    }
}
