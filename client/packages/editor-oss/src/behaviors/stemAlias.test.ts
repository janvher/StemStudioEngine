import {describe, expect, it} from "vitest";

import {BehaviorBase} from "./Behavior";
import type {StemEngineInterface} from "./stem";

/**
 * The brand-neutral `StemEngineInterface` is exposed to behaviors as
 * `this.stemEngine`. The original `this.erth` name stays available as a
 * deprecation alias getter for backward compatibility with existing
 * user-authored behaviors.
 *
 * This test pins the runtime contract: `instance.erth === instance.stemEngine`.
 */
describe("BehaviorBase stemEngine/erth alias", () => {
    it("exposes both `erth` and `stemEngine` pointing at the same object", () => {
        const fakeStemEngine = {
            ai: {},
            asset: {},
            camera: {},
            combat: {},
            team: {},
            pool: {},
            object: {},
            scene: {},
            store: {},
            lambdas: {},
            behaviors: {},
            tween: {},
            fsm: {},
            behaviorTree: {},
            spatial: {},
            events: {},
        } as never;

        const fakeTarget = {} as never;
        const fakeGameObject = {} as never;
        const instance = new BehaviorBase(fakeTarget, "test.behavior", {
            gameObject: fakeGameObject,
            erth: fakeStemEngine,
        });

        expect(instance.erth).toBe(fakeStemEngine);
        expect(instance.stemEngine).toBe(fakeStemEngine);
        expect(instance.stemEngine).toBe(instance.erth);
    });

    it("StemEngineInterface compile-time identity check", () => {
        const _check = (x: StemEngineInterface): StemEngineInterface => x;
        expect(typeof _check).toBe("function");
    });
});
