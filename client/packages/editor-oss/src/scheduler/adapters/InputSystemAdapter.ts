import type { FrameContext, ISystem } from "../types";
import { PipelineStage } from "../types";

/**
 * Wraps GameManager input manager as an INPUT stage system.
 * Runs every frame before fixed/update stages and is never budget-gated.
 */
export class InputSystemAdapter implements ISystem {
    readonly id = "input-system";
    readonly stage = PipelineStage.INPUT;
    readonly priority = 100;
    readonly reads: string[] = ["input-device"];
    readonly writes: string[] = ["input-state"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;

    constructor(private getInputManager: () => { update(): void } | undefined) {}

    update(_context: FrameContext): void {
        this.getInputManager()?.update();
    }
}
