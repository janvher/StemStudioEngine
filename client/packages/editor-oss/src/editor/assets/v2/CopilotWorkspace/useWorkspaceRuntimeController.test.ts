import {describe, expect, it} from "vitest";

import {getWorkspaceRuntimeState} from "./useWorkspaceRuntimeController";

describe("getWorkspaceRuntimeState", () => {
    it("treats a non-running runtime as editing", () => {
        expect(getWorkspaceRuntimeState({isPlaying: false, isPaused: false})).toEqual({
            playtestState: "editing",
            playtestActive: false,
            playing: false,
            paused: false,
        });
    });

    it("treats a running runtime as playing", () => {
        expect(getWorkspaceRuntimeState({isPlaying: true, isPaused: false})).toEqual({
            playtestState: "playing",
            playtestActive: true,
            playing: true,
            paused: false,
        });
    });

    it("lets paused override playing when both flags are present during transitions", () => {
        expect(getWorkspaceRuntimeState({isPlaying: true, isPaused: true})).toEqual({
            playtestState: "paused",
            playtestActive: true,
            playing: false,
            paused: true,
        });
    });
});
