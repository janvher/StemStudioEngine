import type {Group} from "@tweenjs/tween.js";

import type {FrameContext, ISystem} from "../types";
import {PipelineStage} from "../types";

/**
 * Ticks the per-game Tween.js group exposed via `this.erth.tween`. The
 * group is created lazily — only after the first `erth.tween.to(...)` call
 * dynamic-imports the library — so until then this adapter is a cheap
 * per-frame null check. After the lib loads, `groupRef.current` becomes
 * the live Group and we tick it before `BehaviorSystemAdapter` so behaviors
 * observing tweened values in `update(dt)` see this frame's interpolated
 * state.
 *
 * Tween.js expects absolute time in milliseconds. We pass `performance.now()`
 * directly — Tween.js tracks per-tween elapsed time from its own start
 * timestamp, so the scheduler's `deltaTime` (seconds) is irrelevant here.
 */
export class TweenSystemAdapter implements ISystem {
    readonly id = "tween-system";
    readonly stage = PipelineStage.UPDATE;
    readonly priority = 900;
    readonly reads: string[] = [];
    readonly writes: string[] = ["transform"];
    readonly requiresMainThread = true;
    readonly supportsTimeSlicing = false;
    readonly budgetExempt = true;

    constructor(private getGroupRef: () => {current: Group | null} | undefined) {}

    update(_context: FrameContext): void {
        const ref = this.getGroupRef();
        if (!ref || !ref.current) return;
        ref.current.update(performance.now());
    }
}
