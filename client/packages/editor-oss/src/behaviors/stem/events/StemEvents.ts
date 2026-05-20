/**
 * Author-facing engine-event subscription API. Wraps the engine's
 * `EventBus` singleton so behavior code never references `EventBus` directly.
 *
 * Use this only for **engine-emitted** topics — login, orientation, lambda
 * triggers (`ui.open`, `game.playSound`), `IN_GAME_EVENTS` values
 * (character motion / state, lives / health / score, jumppad / platform /
 * teleport activations, …), gameServices auth events, etc.
 *
 * For **behavior-to-behavior** dispatch, do NOT use this — pair
 * `this.onEvent = function (msg, data) { … }` on the receiver with
 * `game.behaviorManager.sendEventToObjectBehaviors(target, msg, data)` on
 * the sender.
 *
 * The wrapper returns a teardown function. Capture it and invoke it from
 * `dispose()` / `onStop()` or the listener leaks across game restart and
 * the callback fires on stale state. The teardown is idempotent — calling
 * it twice is safe.
 */
export interface StemEvents {
    /**
     * Subscribe to an engine-emitted event.
     *
     * @param topic - Engine event topic. Any string is accepted at runtime;
     *   the documented set is published by the engine itself
     *   (`client/src/behaviors/event/EventBus.ts` `IN_GAME_EVENTS`,
     *   `BEHAVIOR_EVENTS`, plus the standalone strings used by
     *   `GameManager`, `UnifiedGameServicesController`, lambda packs, etc.).
     *   Behavior-defined topics are not appropriate here — use `onEvent` +
     *   `behaviorManager.sendEventToObjectBehaviors` for those.
     * @param callback - Invoked when the event fires. Receives `(msg, data)`
     *   where `msg` is the topic and `data` is the published payload.
     * @returns Idempotent teardown function. Behaviors must call it from
     *   `dispose()` / `onStop()` to avoid listener leaks.
     */
    on(topic: string, callback: (msg: string, data: any) => void): () => void;
}
