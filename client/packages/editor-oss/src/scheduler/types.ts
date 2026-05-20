import type { Object3D, Vector3 } from "three";

export enum PipelineStage {
    INPUT = 0,
    FIXED_UPDATE = 1,
    PRE_UPDATE = 2,
    UPDATE = 3,
    POST_UPDATE = 4,
    RENDER = 5,
}

export interface FrameContext {
    deltaTime: number;
    fixedDeltaTime: number;
    frameCount: number;
    interpolationAlpha: number;
    fixedOverstep: number;
    frameStartTime: number;
    frameDeadline: number;
    underRenderPressure: boolean;
    renderAvgMs: number;
    spatialGrid: ISpatialGrid | null;
    /** Whether fixed-rate update adapters are active (behaviors/lambdas fixedUpdate called separately) */
    fixedUpdatesEnabled: boolean;
}

/**
 * Live budget check against the shared frame deadline.
 * @param ctx
 */
export function hasBudget(ctx: FrameContext): boolean {
    return performance.now() < ctx.frameDeadline;
}

export interface ISystem {
    readonly id: string;
    readonly stage: PipelineStage;
    readonly priority: number;
    readonly reads: string[];
    readonly writes: string[];
    readonly requiresMainThread: boolean;
    readonly supportsTimeSlicing: boolean;
    readonly budgetExempt?: boolean;
    update(context: FrameContext): void | Generator;
    dispose?(): void;
}

export interface ISpatialGrid {
    update(entityId: string, object: Object3D): void;
    getDistanceSq(entityId: string, point: Vector3): number | null;
    queryRadius(position: Vector3, radius: number): string[];
    remove(entityId: string): void;
    dispose(): void;
}
