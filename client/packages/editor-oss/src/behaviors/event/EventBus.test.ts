import {afterEach, describe, expect, it, vi} from "vitest";

import EventBus from "./EventBus";

describe("EventBus", () => {
    afterEach(() => {
        EventBus.instance.reset();
    });

    it("sends a topic to multiple subscribers", () => {
        const a = vi.fn();
        const b = vi.fn();
        EventBus.instance.subscribe("game.start", a);
        EventBus.instance.subscribe("game.start", b);

        EventBus.instance.send("game.start", {id: 1});

        expect(a).toHaveBeenCalledWith("game.start", {id: 1});
        expect(b).toHaveBeenCalledWith("game.start", {id: 1});
    });

    it("unsubscribes using a token", () => {
        const a = vi.fn();
        const token = EventBus.instance.subscribe("game.pause", a);

        EventBus.instance.unsubscribe(token);
        EventBus.instance.send("game.pause", {id: 2});

        expect(a).not.toHaveBeenCalled();
    });

    it("unsubscribes all listeners by topic", () => {
        const a = vi.fn();
        const b = vi.fn();
        EventBus.instance.subscribe("game.stop", a);
        EventBus.instance.subscribe("game.stop", b);

        EventBus.instance.unsubscribe("game.stop");
        EventBus.instance.send("game.stop", {id: 3});

        expect(a).not.toHaveBeenCalled();
        expect(b).not.toHaveBeenCalled();
    });

    it("delivers engine-priority listeners before game listeners", () => {
        const order: string[] = [];
        EventBus.instance.subscribe("game.tick", () => order.push("game"));
        EventBus.instance.subscribe("game.tick", () => order.push("engine"), {priority: "engine"});

        EventBus.instance.send("game.tick");

        expect(order).toEqual(["engine", "game"]);
    });
});
