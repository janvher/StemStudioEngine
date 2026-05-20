import type { Object3D } from "three";

import type { FrameContext, ISystem } from "../types";
import { PipelineStage } from "../types";

/**
 * Updates the spatial grid in PRE_UPDATE so that distance queries
 * in the UPDATE stage use fresh positions.
 *
 * This system iterates registered objects and updates their grid cells.
 * The actual grid instance is provided via the FrameContext.
 */
export class SpatialGridSystem implements ISystem {
    readonly id = "spatial-grid-system";
    readonly stage = PipelineStage.PRE_UPDATE;
    readonly priority = 200;
    readonly reads: string[] = ["transform"];
    readonly writes: string[] = ["spatial"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;

    private getTrackedObjects: () => Map<string, Object3D>;

    constructor(getTrackedObjects: () => Map<string, Object3D>) {
        this.getTrackedObjects = getTrackedObjects;
    }

    update(context: FrameContext): void {
        const grid = context.spatialGrid;
        if (!grid) return;

        const objects = this.getTrackedObjects();
        for (const [entityId, object] of objects) {
            if (object.userData._isSceneStatic) continue;
            grid.update(entityId, object);
        }
    }
}
