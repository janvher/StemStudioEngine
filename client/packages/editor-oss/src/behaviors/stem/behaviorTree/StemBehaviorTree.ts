/**
 * Author-facing behavior-tree API. Thin façade over `mistreevous@4` so
 * behaviors don't depend on mistreevous directly — the engine owns the
 * version, the wrapper hides the constructor's three-arg shape, and the
 * surface stays stable if we swap implementations later.
 *
 * Behavior trees are well-suited to NPC AI: a tree of action / condition /
 * sequence / selector nodes the engine evaluates each "step". Action and
 * condition functions are looked up by name on the agent object — no
 * `eval` / `Function` constructor (audit confirmed 2026-04-27).
 */

/**
 * The agent that the tree's actions and conditions reference. Each
 * agent function (e.g. `isHungry`, `wander`) maps to a method on this
 * object.
 */
export type BTAgent = Record<string, (...args: any[]) => any>;

/** Per-node state in a behavior tree. */
export type BTState = "READY" | "RUNNING" | "SUCCEEDED" | "FAILED";

export interface BTHandle {
    /**
     * Advance the tree by one step. Call once per frame (or at whatever
     * cadence your AI needs — BT steps are cheap).
     */
    step(): void;
    /** Reset every node to READY. Use when the agent's situation changes. */
    reset(): void;
    /** Current state of the tree as a whole. */
    getState(): BTState;
    /** True while the root is RUNNING. */
    isRunning(): boolean;
}

export type BTDefinition = string | Record<string, any> | Record<string, any>[];

export interface StemBehaviorTree {
    /**
     * Build a behavior tree from a JSON tree definition (or MDSL string)
     * bound to an agent. Returns a Promise — the mistreevous bundle is
     * loaded lazily on first call so the engine bundle stays small. After
     * `await`, the handle's methods (`step`, `reset`, …) are sync.
     *
     * @example
     * ```js
     * this.init = async function (_game) {
     *     const agent = {
     *         isHungry: () => this.getAttribute("hunger") > 50,
     *         forage: () => this.gatherFood() ? "SUCCEEDED" : "RUNNING",
     *         wander: () => "SUCCEEDED",
     *     };
     *     this._tree = await this.erth.behaviorTree.create(
     *         {
     *             type: "selector",
     *             children: [
     *                 {type: "sequence", children: [
     *                     {type: "condition", call: "isHungry"},
     *                     {type: "action", call: "forage"},
     *                 ]},
     *                 {type: "action", call: "wander"},
     *             ],
     *         },
     *         agent,
     *     );
     * };
     * this.update = function () { if (this._tree) this._tree.step(); };
     * ```
     */
    create(definition: BTDefinition, agent: BTAgent): Promise<BTHandle>;
}
