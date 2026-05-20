import type {Camera} from "three";

import type {PlotBudgetManager} from "@stem/editor-oss/core/budget/PlotBudgetPolicy";
import type {FrameContext, ISystem} from "../types";
import {PipelineStage} from "../types";

/**
 * Updates distance-batched static plot/LOD budgets after quality settings are current
 * and before render state is consumed.
 */
export class PlotBudgetSystemAdapter implements ISystem {
    readonly id = "plot-budget-system";
    readonly stage = PipelineStage.PRE_UPDATE;
    readonly priority = 120;
    readonly reads: string[] = ["camera", "transform", "quality-settings", "budget-pressure"];
    readonly writes: string[] = ["render-state"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;

    constructor(
        private readonly getPlotBudgetManager: () => PlotBudgetManager | undefined,
        private readonly getCamera: () => Camera | undefined,
        private readonly configureFromQuality: (manager: PlotBudgetManager) => void,
    ) {}

    update(_context: FrameContext): void {
        const manager = this.getPlotBudgetManager();
        if (!manager) return;
        this.configureFromQuality(manager);
        manager.update(this.getCamera());
    }
}
