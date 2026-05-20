import EventBus from "../../event/EventBus";
import {BehaviorBase} from "../../Behavior";
import GameManager from "../../game/GameManager";

type PassName = "film" | "chromaticAberration" | "lut";

/**
 * PostFxBehavior — bridge between EventBus game events and the post-
 * processing flash API on EffectRenderer.
 *
 * Attach to any object (usually the player or scene root). Configure
 * `triggerEvent` with a topic like `game.health.dec` and the behavior
 * will fire a time-limited pass flash each time the event is emitted.
 *
 * Typical uses:
 *   - damage feedback: `game.health.dec` → film grain flash
 *   - warp/teleport:   custom topic → chromatic aberration flash
 *   - ability trigger: custom topic → LUT intensity bump
 *
 * Manual trigger from gameplay code:
 *   behavior.flash()     // fires with configured attributes
 *   behavior.flash(pass, duration, peakIntensity)  // override
 *
 * The target pass must be enabled in the scene's Post-Processing
 * settings for the flash to be visible — this behavior doesn't force-
 * enable a disabled pass to avoid jarring pipeline rebuilds during
 * gameplay. If the pass is off, flash() is a safe no-op.
 */
class PostFxBehavior extends BehaviorBase {
    protected game: GameManager | null = null;
    private unsubscribeFn: (() => void) | null = null;

    declare attributes: {
        triggerEvent: string;
        pass: PassName;
        duration: number;
        peakIntensity: number;
    };

    init(game: GameManager) {
        this.game = game;
    }

    onAdded(): void {
        this.subscribeToTrigger();
    }

    onStop(): void {
        this.unsubscribe();
    }

    /**
     * Fire a flash. Without args, uses attribute-configured values.
     * Pass overrides to drive from gameplay code directly.
     */
    flash(pass?: PassName, duration?: number, peakIntensity?: number): void {
        const resolvedPass: PassName = pass ?? this.attributes.pass;
        const resolvedDuration = duration ?? this.attributes.duration;
        const resolvedPeak = peakIntensity ?? this.attributes.peakIntensity;

        const effectRenderer = this.game?.engine?.effectRenderer as
            | {flashPass?: (p: string, d: number, i: number) => void}
            | undefined;
        effectRenderer?.flashPass?.(resolvedPass, resolvedDuration, resolvedPeak);
    }

    private subscribeToTrigger(): void {
        const topic = this.attributes.triggerEvent;
        if (!topic) return;
        // EventBus.subscribe returns a token; store the unsubscribe
        // function so onStop can detach cleanly. If subscribe isn't
        // available on the bus (older version / test shim), we noop.
        const bus = EventBus.instance as unknown as {
            subscribe?: (topic: string, handler: (data: unknown) => void) => string;
            unsubscribe?: (token: string) => void;
        };
        if (typeof bus.subscribe !== "function" || typeof bus.unsubscribe !== "function") {
            return;
        }
        const token = bus.subscribe(topic, () => this.flash());
        this.unsubscribeFn = () => {
            try {
                bus.unsubscribe!(token);
            } catch {
                // non-fatal
            }
        };
    }

    private unsubscribe(): void {
        this.unsubscribeFn?.();
        this.unsubscribeFn = null;
    }
}

export default PostFxBehavior;
