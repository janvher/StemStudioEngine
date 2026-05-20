import type {RuntimeBudgetCoordinator} from "@stem/editor-oss/core/budget/RuntimeBudgetCoordinator";
import type {TextureResidencyManager} from "@stem/editor-oss/core/budget/TextureResidencyPolicy";
import type {FrameContext, ISystem} from "../types";
import {PipelineStage} from "../types";

/**
 * Updates runtime memory pressure after quality settings are current and before
 * plot/avatar/texture policies consume budget pressure overrides.
 */
export class RuntimeBudgetSystemAdapter implements ISystem {
    readonly id = "runtime-budget-system";
    readonly stage = PipelineStage.PRE_UPDATE;
    readonly priority = 110;
    readonly reads: string[] = ["quality-settings", "material-state"];
    readonly writes: string[] = ["budget-pressure"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;

    constructor(
        private readonly getCoordinator: () => RuntimeBudgetCoordinator | undefined,
        private readonly getTextureResidencyManager: () => TextureResidencyManager | undefined,
        private readonly configureFromQuality: (coordinator: RuntimeBudgetCoordinator) => void,
    ) {}

    update(context: FrameContext): void {
        const coordinator = this.getCoordinator();
        if (!coordinator) return;

        this.configureFromQuality(coordinator);
        coordinator.update(
            {
                textureResidencyManager: this.getTextureResidencyManager(),
            },
            {
                underRenderPressure: context.underRenderPressure,
            },
        );
    }
}
