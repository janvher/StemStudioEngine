import type { FrameContext, ISystem } from "../types";
import { PipelineStage } from "../types";

/**
 * Wraps ObjectPicker as a POST_UPDATE system.
 * Runs after core simulation updates and before player-event dispatch.
 */
export class ObjectPickerSystemAdapter implements ISystem {
    readonly id = "object-picker-system";
    readonly stage = PipelineStage.POST_UPDATE;
    readonly priority = 90;
    readonly reads: string[] = ["transform", "camera"];
    readonly writes: string[] = ["selection-state"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;

    constructor(private getObjectPicker: () => { update(): void } | undefined) {}

    update(_context: FrameContext): void {
        this.getObjectPicker()?.update();
    }
}
