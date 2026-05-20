/**
 * Author-facing finite-state-machine API. Thin façade over `xstate@5` so
 * behaviors don't depend on XState directly — the engine owns the version,
 * the wrapper hides import bookkeeping, and the surface stays stable if we
 * swap implementations later. Supports flat states, hierarchical states,
 * parallel states, guards, actions, and context.
 *
 * For tiny "idle → running → end" lifecycles you can pass a simple flat
 * machine; for HUD modes / weapon states / NPC AI you can nest.
 *
 * Time-related state-machine features (`after`, delayed transitions) tick
 * against XState's internal scheduler, which uses real time. They work in
 * play mode but are not coupled to our scheduler's pause/resume.
 */

/**
 * Subset of XState's MachineConfig that's safe to expose. Authors pass a
 * plain object literal; we accept it as `any` and forward to XState (which
 * does its own structural validation at runtime).
 */
export type MachineConfig = Record<string, any>;

export interface FsmSnapshot {
    /** Current state value. String for flat states, nested object for hierarchical. */
    value: any;
    /** Current context object. */
    context: any;
    /** True when the machine has reached a final state. */
    done: boolean;
}

export interface FsmActor {
    /** Start the actor. Idempotent — calling on a running actor is a no-op. */
    start(): FsmActor;
    /** Stop the actor and release any timers. */
    stop(): void;
    /**
     * Send an event. Either a string (`"OPEN"`) or an object
     * (`{type: "OPEN", payload: 42}`).
     */
    send(event: string | {type: string; [key: string]: any}): void;
    /** Snapshot of the current state (value + context + done). */
    snapshot(): FsmSnapshot;
    /**
     * Subscribe to state transitions. The subscriber fires immediately with
     * the current snapshot, then on every transition. Returns an unsubscribe
     * function.
     */
    subscribe(fn: (snapshot: FsmSnapshot) => void): () => void;
    /**
     * Check whether the current state matches a state path. Works for
     * hierarchical states: `matches("running.attacking")`, parallel states,
     * and simple values.
     */
    matches(statePath: string): boolean;
}

export interface StemFsm {
    /**
     * Compile and instantiate a state machine. Returns a Promise — the
     * underlying XState bundle is loaded lazily on first call so the engine
     * bundle stays small. After the first awaited call, subsequent calls
     * resolve on a microtask. Awaitable inside `init(_game)`.
     *
     * The returned actor's methods (`start`, `send`, `subscribe`, …) are
     * sync and remain valid after `await`.
     *
     * @example
     * ```js
     * this.init = async function (_game) {
     *     this._door = (await this.erth.fsm.create({
     *         id: "door",
     *         initial: "closed",
     *         context: {locked: false},
     *         states: {
     *             closed: { on: { OPEN: { target: "open", guard: ({context}) => !context.locked } } },
     *             open:   { on: { CLOSE: "closed" } },
     *         },
     *     })).start();
     *
     *     this._door.send("OPEN");
     *     this._door.matches("open"); // true
     * };
     * ```
     */
    create(config: MachineConfig): Promise<FsmActor>;
}
