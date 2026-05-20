import type {TextureResidencyManager} from "@stem/editor-oss/core/budget/TextureResidencyPolicy";
import type {FrameContext, ISystem} from "../types";
import {PipelineStage} from "../types";

/**
 * Applies texture residency after simulation systems have produced current
 * avatar/plot budget states and before the render stage consumes materials.
 */
export class TextureResidencySystemAdapter implements ISystem {
    readonly id = "texture-residency-system";
    readonly stage = PipelineStage.POST_UPDATE;
    readonly priority = 1000;
    readonly reads: string[] = ["avatar-budget", "plot-budget", "quality-settings", "budget-pressure", "render-state"];
    readonly writes: string[] = ["material-state", "render-state"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;

    constructor(
        private readonly getTextureResidencyManager: () => TextureResidencyManager | undefined,
        private readonly configureFromQuality: (manager: TextureResidencyManager) => void,
    ) {}

    update(_context: FrameContext): void {
        const manager = this.getTextureResidencyManager();
        if (!manager) return;
        this.configureFromQuality(manager);
        manager.update();
    }
}
