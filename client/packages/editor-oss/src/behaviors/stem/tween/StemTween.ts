/**
 * Author-facing tween API. Wraps the bundled `@tweenjs/tween.js@25` so
 * behaviors don't have to import the library directly, don't pay the
 * per-bundle duplication cost of inlining it via `@import`, and don't have
 * to call `TWEEN.update()` on every frame — the engine ticks the shared
 * group from the scheduler.
 *
 * Time is in SECONDS to match the engine's `update(deltaTime)` convention.
 * Callers pass `duration: 0.6` for 600 ms.
 */

export type EasingName =
    | "Linear.None"
    | "Quadratic.In"
    | "Quadratic.Out"
    | "Quadratic.InOut"
    | "Cubic.In"
    | "Cubic.Out"
    | "Cubic.InOut"
    | "Quartic.In"
    | "Quartic.Out"
    | "Quartic.InOut"
    | "Quintic.In"
    | "Quintic.Out"
    | "Quintic.InOut"
    | "Sinusoidal.In"
    | "Sinusoidal.Out"
    | "Sinusoidal.InOut"
    | "Exponential.In"
    | "Exponential.Out"
    | "Exponential.InOut"
    | "Circular.In"
    | "Circular.Out"
    | "Circular.InOut"
    | "Elastic.In"
    | "Elastic.Out"
    | "Elastic.InOut"
    | "Back.In"
    | "Back.Out"
    | "Back.InOut"
    | "Bounce.In"
    | "Bounce.Out"
    | "Bounce.InOut";

export interface TweenHandle<T extends Record<string, any>> {
    start(): TweenHandle<T>;
    stop(): TweenHandle<T>;
    pause(): TweenHandle<T>;
    resume(): TweenHandle<T>;
    onComplete(cb: (target: T) => void): TweenHandle<T>;
    onUpdate(cb: (target: T) => void): TweenHandle<T>;
    onStart(cb: (target: T) => void): TweenHandle<T>;
    /** Delay before the tween starts. SECONDS. */
    delay(seconds: number): TweenHandle<T>;
    /** Repeat count after the first run. Use `Infinity` for endless. */
    repeat(count: number): TweenHandle<T>;
    /** When true, alternate direction each repeat. */
    yoyo(yoyo?: boolean): TweenHandle<T>;
    /** Chain another tween to fire after this one completes. */
    chain(...tweens: TweenHandle<any>[]): TweenHandle<T>;
    /** True while the tween is running (not stopped, not completed). */
    isPlaying(): boolean;
    /** True once the tween has finished or been stopped. */
    isPaused(): boolean;
}

export interface ToOptions {
    /** Tween duration. SECONDS. */
    duration: number;
    /** Easing curve. Default: `"Linear.None"`. */
    easing?: EasingName;
    /** Pre-roll. SECONDS. Default: 0. */
    delay?: number;
    /** Repeat after first run. Default: 0 (no repeat). */
    repeat?: number;
    /** Alternate direction each repeat. Default: false. */
    yoyo?: boolean;
    /** Auto-start the tween (skip explicit `.start()`). Default: false. */
    autoStart?: boolean;
}

/**
 * Numeric properties to animate. Mixed with `ToOptions` keys at call time
 * (`duration`, `easing`, `delay`, `repeat`, `yoyo`, `autoStart` are reserved).
 */
export type ToProps = Record<string, number>;

export interface StemTween {
    /**
     * Animate `target`'s numeric properties. Returns a Promise — the
     * underlying tween library is loaded lazily on first call so the engine
     * bundle stays small. After the first awaited call, the library is
     * cached and subsequent calls resolve on a microtask. The handle's
     * methods (`start`, `stop`, `onComplete`, …) are sync.
     *
     * @example
     *   const handle = await this.erth.tween.to(
     *       this.gameObject._internal.three.position,
     *       { y: 5, duration: 0.6, easing: "Cubic.InOut", autoStart: true },
     *   );
     *   handle.onComplete(() => console.log("done"));
     */
    to<T extends Record<string, any>>(
        target: T,
        options: ToOptions & ToProps,
    ): Promise<TweenHandle<T>>;

    /**
     * Stop and remove every active tween in the engine group. Sync — no-op
     * if no tween has been created yet (the underlying library hasn't been
     * loaded).
     */
    killAll(): void;
}
