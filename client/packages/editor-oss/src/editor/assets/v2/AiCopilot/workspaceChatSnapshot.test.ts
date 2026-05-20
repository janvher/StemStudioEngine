import {beforeEach, describe, expect, it} from "vitest";

import {
    readWorkspaceChatSnapshot,
    saveWorkspaceChatSnapshot,
} from "./workspaceChatSnapshot";

describe("workspaceChatSnapshot", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it("stores and restores latest default-workspace chat state by scene", () => {
        saveWorkspaceChatSnapshot({
            sceneID: "scene-1",
            sessionID: "session-1",
            messages: [
                {id: "m1", type: "user", content: "Make jumping floatier", timestamp: 100},
                {id: "m2", type: "agent", content: "I updated the preview.", timestamp: 200},
            ],
        });

        const snapshot = readWorkspaceChatSnapshot("scene-1");

        expect(snapshot?.sceneID).toBe("scene-1");
        expect(snapshot?.sessionID).toBe("session-1");
        expect(snapshot?.messages.map(message => message.content)).toEqual([
            "Make jumping floatier",
            "I updated the preview.",
        ]);
    });

    it("can restore a specific session snapshot", () => {
        saveWorkspaceChatSnapshot({
            sceneID: "scene-1",
            sessionID: "session-a",
            messages: [{id: "a", type: "user", content: "First", timestamp: 1}],
        });
        saveWorkspaceChatSnapshot({
            sceneID: "scene-1",
            sessionID: "session-b",
            messages: [{id: "b", type: "user", content: "Second", timestamp: 2}],
        });

        expect(readWorkspaceChatSnapshot("scene-1", "session-a")?.messages[0]?.content).toBe("First");
        expect(readWorkspaceChatSnapshot("scene-1", "session-b")?.messages[0]?.content).toBe("Second");
        expect(readWorkspaceChatSnapshot("scene-1")?.messages[0]?.content).toBe("Second");
    });

    it("stores stale interactive result messages as inert agent transcript entries", () => {
        saveWorkspaceChatSnapshot({
            sceneID: "scene-1",
            messages: [
                {
                    id: "interactive",
                    type: "interactive",
                    content: "Choose an asset",
                    timestamp: 10,
                },
            ],
        });

        const message = readWorkspaceChatSnapshot("scene-1")?.messages[0];

        expect(message?.type).toBe("agent");
        expect(message?.content).toBe("Choose an asset");
    });
});
