import EventBus from "../../event/EventBus";
import {BehaviorBase} from "../../Behavior";
import GameManager from "../../game/GameManager";

type PassName = "film" | "chromaticAberration" | "lut";

/**
 * DestructibleBehavior — marks the attached object as destructible and
 * responds to destruction events fired by a Trigger step (via
 * `startOnTrigger`) or by an EventBus topic.
 *
 * Destruction in this behavior is intentionally logical (hide + detach
 * physics) rather than shattered geometry. Debris/fracture effects belong
 * in a separate prefab that subscribes to `destroyedEvent` — keeping this
 * behavior focused means it stays safe to attach to any object including
 * static props, UI-placed meshes, or networked objects.
 *
 * Why this lives inside the trigger system:
 *   - Game designers already compose cause/effect via Trigger behaviors.
 *     Another bespoke destruction pathway splits the mental model.
 *   - Trigger's OBJECT_STATE_COMPARE condition already reads
 *     `userData.destroyed`, so this behavior's side effect automatically
 *     unlocks downstream conditional logic without new APIs.
 */
class DestructibleBehavior extends BehaviorBase {
    protected game: GameManager | null = null;
    private unsubscribeFn: (() => void) | null = null;
    private respawnTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private isDestroyed: boolean = false;

    declare attributes: {
        startOnTrigger: boolean;
        triggerEvent: string;
        respawn: boolean;
        respawnDelay: number;
        destroyedEvent: string;
        postFxFlash: PassName | "";
        flashDuration: number;
        flashPeak: number;
    };

    init(game: GameManager) {
        this.game = game;
    }

    onAdded(): void {
        this.subscribeToTrigger();
    }

    onStop(): void {
        this.unsubscribe();
        if (this.respawnTimeoutId !== null) {
            clearTimeout(this.respawnTimeoutId);
            this.respawnTimeoutId = null;
        }
    }

    /**
     * Called by TriggerBehavior when a step with APPLY_BEHAVIOR targets this
     * behavior. Any message that isn't explicitly "deactivate" is treated
     * as a destruction request — matches how other startOnTrigger behaviors
     * (like enemies/consumables) accept a generic trigger kick.
     */
    onEvent(msg: string, data: any): void {
        if (msg === "trigger") {
            const actionType = data?.actionType;
            if (actionType === "deactivate") {
                this.respawn();
                return;
            }
            this.destroy();
        }
    }

    /**
     * Destroy the target: hide, detach physics, mark userData, fire
     * optional flash + completion event. Idempotent — calling twice is
     * a no-op, so overlapping triggers won't double-process.
     */
    destroy(): void {
        if (this.isDestroyed) return;
        if (!this.target) return;
        this.isDestroyed = true;

        this.target.visible = false;
        this.target.userData = this.target.userData || {};
        this.target.userData.destroyed = true;

        try {
            this.game?.engine?.physics?.removePhysicsObjectBody?.(this.target);
        } catch (err) {
            console.warn("[DestructibleBehavior] physics detach failed", err);
        }

        this.emitCompletion();
        this.triggerFlash();

        if (this.attributes.respawn && this.attributes.respawnDelay > 0) {
            this.scheduleRespawn();
        }
    }

    /**
     * Re-enable the object. Used by the respawn timer and by explicit
     * deactivate triggers. Only re-adds the physics body if there was
     * one at destroy time; for objects without physics the target simply
     * becomes visible again.
     */
    respawn(): void {
        if (!this.isDestroyed) return;
        if (!this.target) return;
        this.isDestroyed = false;

        this.target.visible = true;
        this.target.userData = this.target.userData || {};
        this.target.userData.destroyed = false;

        try {
            this.game?.engine?.physics?.addPhysicsObjectBody?.(this.target);
        } catch (err) {
            console.warn("[DestructibleBehavior] physics re-attach failed", err);
        }

        if (this.respawnTimeoutId !== null) {
            clearTimeout(this.respawnTimeoutId);
            this.respawnTimeoutId = null;
        }
    }

    private scheduleRespawn(): void {
        if (this.respawnTimeoutId !== null) {
            clearTimeout(this.respawnTimeoutId);
        }
        const delayMs = Math.max(0, this.attributes.respawnDelay) * 1000;
        this.respawnTimeoutId = setTimeout(() => {
            this.respawnTimeoutId = null;
            this.respawn();
        }, delayMs);
    }

    private emitCompletion(): void {
        const topic = (this.attributes.destroyedEvent || "").trim();
        if (!topic) return;
        try {
            EventBus.instance.send(topic, {
                uuid: this.target?.uuid,
                target: this.target,
            });
        } catch (err) {
            console.warn("[DestructibleBehavior] failed to emit destroyedEvent", err);
        }
    }

    private triggerFlash(): void {
        const pass = this.attributes.postFxFlash;
        if (!pass) return;
        const effectRenderer = this.game?.engine?.effectRenderer as
            | {flashPass?: (p: string, d: number, i: number) => void}
            | undefined;
        effectRenderer?.flashPass?.(
            pass,
            this.attributes.flashDuration,
            this.attributes.flashPeak,
        );
    }

    private subscribeToTrigger(): void {
        const topic = (this.attributes.triggerEvent || "").trim();
        if (!topic) return;

        const bus = EventBus.instance as unknown as {
            subscribe?: (topic: string, handler: (msg: string, data: any) => void) => string;
            unsubscribe?: (token: string) => void;
        };
        if (typeof bus.subscribe !== "function" || typeof bus.unsubscribe !== "function") {
            return;
        }

        const token = bus.subscribe(topic, () => this.destroy());
        this.unsubscribeFn = () => {
            try {
                bus.unsubscribe!(token);
            } catch {
                // non-fatal on teardown
            }
        };
    }

    private unsubscribe(): void {
        this.unsubscribeFn?.();
        this.unsubscribeFn = null;
    }
}

export default DestructibleBehavior;
