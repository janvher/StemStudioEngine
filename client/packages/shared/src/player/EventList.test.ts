import { describe, it, expect } from "vitest";

import EventList from "./EventList";

describe("Player EventList", () => {
    it("should include sceneLoadFailed event", () => {
        expect(EventList).toContain("sceneLoadFailed");
    });

    it("should include core scene events", () => {
        expect(EventList).toContain("sceneLoaded");
        expect(EventList).toContain("objectChanged");
        expect(EventList).toContain("objectAdded");
        expect(EventList).toContain("objectRemoved");
    });

    it("should include game lifecycle events", () => {
        expect(EventList).toContain("gameStarted");
        expect(EventList).toContain("gameEnded");
        expect(EventList).toContain("playerStarted");
    });

    it("should not contain duplicate events", () => {
        const uniqueEvents = new Set(EventList);
        expect(uniqueEvents.size).toBe(EventList.length);
    });
});
