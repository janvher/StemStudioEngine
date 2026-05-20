import type { IPhysics } from "@stem/editor-oss/physics/common/types";
import type { FrameContext, ISystem } from "../types";
import { PipelineStage } from "../types";

/**
 * Wraps the physics engine (Ammo.js/Rapier) as a FIXED_UPDATE system.
 * Physics runs at fixed timestep for deterministic simulation.
 */
export class PhysicsSystemAdapter implements ISystem {
    readonly id = "physics-system";
    readonly stage = PipelineStage.FIXED_UPDATE;
    readonly priority = 100;
    readonly reads: string[] = ["transform"];
    readonly writes: string[] = ["transform", "physics"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;

    constructor(private getPhysics: () => IPhysics | undefined) {}

    update(context: FrameContext): void {
        this.getPhysics()?.simulate(context.fixedDeltaTime);
    }
}
