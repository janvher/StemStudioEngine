import {beforeEach, describe, expect, it} from "vitest";

import {
    readProjectAdvancedModePreference,
    resolveAdvancedModePreferenceForProject,
    writeAdvancedModePreference,
    writePendingProjectAdvancedModePreference,
    writeProjectAdvancedModePreference,
} from "./advancedModeStorage";

describe("advancedModeStorage", () => {
    beforeEach(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
    });

    it("uses a project preference before pending handoff and AiPromptMode", () => {
        writeProjectAdvancedModePreference("scene-1", true);
        writePendingProjectAdvancedModePreference(false);

        const resolved = resolveAdvancedModePreferenceForProject({
            sceneID: "scene-1",
            aiPromptMode: true,
        });

        expect(resolved).toEqual({value: true, source: "project"});
        expect(readProjectAdvancedModePreference("scene-1")).toBe(true);
    });

    it("consumes pending handoff and persists it to the first project", () => {
        writePendingProjectAdvancedModePreference(false);

        const resolved = resolveAdvancedModePreferenceForProject({sceneID: "new-scene"});

        expect(resolved).toEqual({value: false, source: "pending"});
        expect(readProjectAdvancedModePreference("new-scene")).toBe(false);

        const nextResolved = resolveAdvancedModePreferenceForProject({sceneID: "another-scene"});
        expect(nextResolved).toEqual({value: true, source: "default"});
    });

    it("does not let stale session-level mode leak into regular projects", () => {
        writeAdvancedModePreference(false);

        const resolved = resolveAdvancedModePreferenceForProject({sceneID: "regular-scene"});

        expect(resolved).toEqual({value: true, source: "default"});
        expect(readProjectAdvancedModePreference("regular-scene")).toBe(true);
    });

    it("defaults AiPromptMode projects to non-advanced when no explicit project preference exists", () => {
        const resolved = resolveAdvancedModePreferenceForProject({
            sceneID: "ai-scene",
            aiPromptMode: true,
        });

        expect(resolved).toEqual({value: false, source: "aiPromptMode"});
        expect(readProjectAdvancedModePreference("ai-scene")).toBe(false);
    });

    it("ignores AiPromptMode for OSS projects outside the playground", () => {
        const resolved = resolveAdvancedModePreferenceForProject({
            sceneID: "oss-ai-scene",
            aiPromptMode: true,
            isOSS: true,
        });

        expect(resolved).toEqual({value: true, source: "default"});
        expect(readProjectAdvancedModePreference("oss-ai-scene")).toBe(true);
    });

    it("honours AiPromptMode for OSS projects inside the playground", () => {
        const resolved = resolveAdvancedModePreferenceForProject({
            sceneID: "playground-ai-scene",
            aiPromptMode: true,
            isOSS: true,
            isPlayground: true,
        });

        expect(resolved).toEqual({value: false, source: "aiPromptMode"});
        expect(readProjectAdvancedModePreference("playground-ai-scene")).toBe(false);
    });

    it("opens the AI layout in the playground when a copilot key is present", () => {
        const resolved = resolveAdvancedModePreferenceForProject({
            sceneID: "playground-keyed-scene",
            aiPromptMode: true,
            isOSS: true,
            isPlayground: true,
            hasCopilotKeys: true,
        });

        expect(resolved).toEqual({value: false, source: "aiPromptMode"});
    });

    it("falls back to advanced mode in the playground when no copilot key exists", () => {
        const resolved = resolveAdvancedModePreferenceForProject({
            sceneID: "playground-keyless-scene",
            aiPromptMode: true,
            isOSS: true,
            isPlayground: true,
            hasCopilotKeys: false,
        });

        expect(resolved).toEqual({value: true, source: "default"});
    });
});
