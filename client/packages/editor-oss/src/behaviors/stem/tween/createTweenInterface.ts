import type {Easing as EasingNS, Group, Tween} from "@tweenjs/tween.js";

type EasingFunction = (amount: number) => number;

import type {EasingName, StemTween, ToOptions, ToProps, TweenHandle} from "./StemTween";

const RESERVED: ReadonlySet<string> = new Set<keyof ToOptions>([
    "duration",
    "easing",
    "delay",
    "repeat",
    "yoyo",
    "autoStart",
]);

// Cached library promise so the dynamic import only fires once per game.
// Stored at module scope: every game in this process shares the chunk after
// it loads, but each game holds its own Group instance (see below).
type TweenModule = typeof import("@tweenjs/tween.js");
let _libPromise: Promise<TweenModule> | null = null;
const loadLib = (): Promise<TweenModule> => {
    if (!_libPromise) _libPromise = import("@tweenjs/tween.js");
    return _libPromise;
};

const resolveEasing = (Easing: typeof EasingNS, name: EasingName | undefined): EasingFunction => {
    if (!name) return Easing.Linear.None;
    const [familyName, variant] = name.split(".") as [keyof typeof Easing, string];
    const family = Easing[familyName] as Record<string, EasingFunction> | undefined;
    if (!family || typeof family[variant] !== "function") {
        // eslint-disable-next-line no-console
        console.warn(`[erth.tween] Unknown easing "${name}", falling back to Linear.None`);
        return Easing.Linear.None;
    }
    return family[variant];
};

const wrap = <T extends Record<string, any>>(tween: Tween<T>): TweenHandle<T> => {
    const handle: TweenHandle<T> = {
        start() { tween.start(); return handle; },
        stop() { tween.stop(); return handle; },
        pause() { tween.pause(); return handle; },
        resume() { tween.resume(); return handle; },
        onComplete(cb) { tween.onComplete(cb); return handle; },
        onUpdate(cb) { tween.onUpdate(cb); return handle; },
        onStart(cb) { tween.onStart(cb); return handle; },
        delay(seconds) { tween.delay(Math.max(0, seconds) * 1000); return handle; },
        repeat(count) { tween.repeat(count); return handle; },
        yoyo(yoyo = true) { tween.yoyo(yoyo); return handle; },
        chain(...others) { tween.chain(...others.map(unwrap)); return handle; },
        isPlaying() { return tween.isPlaying(); },
        isPaused() { return tween.isPaused(); },
    };
    HANDLE_TWEENS.set(handle, tween);
    return handle;
};

const HANDLE_TWEENS = new WeakMap<TweenHandle<any>, Tween<any>>();

const unwrap = <T extends Record<string, any>>(handle: TweenHandle<T>): Tween<T> => {
    const t = HANDLE_TWEENS.get(handle);
    if (!t) throw new Error("[erth.tween] handle was not produced by erth.tween.to()");
    return t as Tween<T>;
};

/**
 * GroupRef is a mutable container we hand the scheduler so it can pick up the
 * Tween.Group as soon as it exists. The library only loads when a tween is
 * first created; until then `ref.current` is null and the adapter is a
 * no-op.
 */
export interface GroupRef {
    current: Group | null;
}

export const createTweenInterface = (): {erth: StemTween; groupRef: GroupRef} => {
    const groupRef: GroupRef = {current: null};

    const ensureGroup = async (): Promise<{Tween: TweenModule["Tween"]; Easing: TweenModule["Easing"]; group: Group}> => {
        const lib = await loadLib();
        if (!groupRef.current) groupRef.current = new lib.Group();
        return {Tween: lib.Tween, Easing: lib.Easing, group: groupRef.current};
    };

    const to = async <T extends Record<string, any>>(
        target: T,
        options: ToOptions & ToProps,
    ): Promise<TweenHandle<T>> => {
        const {Tween, Easing, group} = await ensureGroup();

        const props: Record<string, number> = {};
        for (const k of Object.keys(options)) {
            if (RESERVED.has(k)) continue;
            const v = (options as Record<string, unknown>)[k];
            if (typeof v === "number") props[k] = v;
        }
        const durationMs = Math.max(0, options.duration) * 1000;
        const tween = new Tween<T>(target, group)
            .to(props, durationMs)
            .easing(resolveEasing(Easing, options.easing));

        if (options.delay && options.delay > 0) tween.delay(options.delay * 1000);
        if (options.repeat && options.repeat > 0) tween.repeat(options.repeat);
        if (options.yoyo) tween.yoyo(true);

        const handle = wrap(tween);
        if (options.autoStart) tween.start();
        return handle;
    };

    const killAll = () => {
        if (groupRef.current) groupRef.current.removeAll();
    };

    return {
        erth: {to, killAll},
        groupRef,
    };
};
