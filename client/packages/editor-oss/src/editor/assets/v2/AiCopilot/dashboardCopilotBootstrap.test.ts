import {beforeEach, describe, expect, it} from "vitest";

import {
    clearDashboardCopilotBootstrap,
    readDashboardCopilotBootstrap,
    writeDashboardCopilotBootstrap,
} from "./dashboardCopilotBootstrap";
import {
    buildCopilotEntryGreeting,
    buildCopilotEntryPromptContext,
    prepareCreateFromPromptCopilotEntry,
    prepareEditCurrentGameCopilotEntry,
    prepareRemixCopilotEntry,
} from "./copilotWorkspaceEntry";
import {readProjectAdvancedModePreference} from "@stem/editor-oss/context/advancedModeStorage";

describe("dashboardCopilotBootstrap", () => {
    beforeEach(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
    });

    it("preserves prompt-created project handoff data", () => {
        prepareCreateFromPromptCopilotEntry({
            prompt: "  Make a floating island platformer  ",
            placeholderThumbnail: "placeholder-island",
        });

        expect(readDashboardCopilotBootstrap()).toEqual({
            entryMode: "create_from_prompt",
            prompt: "Make a floating island platformer",
            autoSubmit: true,
            placeholderThumbnail: "placeholder-island",
            sourceSceneId: undefined,
            sourceSceneName: undefined,
            sourceCreatorName: undefined,
        });
    });

    it("stores remix entry context without requiring an auto-submitted prompt", () => {
        prepareRemixCopilotEntry({
            newSceneId: "new-scene",
            sourceScene: {
                ID: "source-scene",
                Name: "City Chaos Online",
                Username: "Nia",
            },
        });

        expect(readProjectAdvancedModePreference("new-scene")).toBe(false);
        expect(readDashboardCopilotBootstrap()).toEqual({
            entryMode: "remix_existing_game",
            prompt: undefined,
            autoSubmit: false,
            placeholderThumbnail: undefined,
            sourceSceneId: "source-scene",
            sourceSceneName: "City Chaos Online",
            sourceCreatorName: "Nia",
        });
    });

    it("stores edit-current-game entry context for the target project", () => {
        prepareEditCurrentGameCopilotEntry({
            ID: "scene-1",
            Name: "Arena Draft",
        });

        expect(readProjectAdvancedModePreference("scene-1")).toBe(false);
        expect(readDashboardCopilotBootstrap()?.entryMode).toBe("edit_current_game");
        expect(readDashboardCopilotBootstrap()?.sourceSceneName).toBe("Arena Draft");
    });

    it("ignores empty legacy payloads with no entry mode", () => {
        writeDashboardCopilotBootstrap({prompt: "   "});

        expect(readDashboardCopilotBootstrap()).toBeNull();
    });

    it("builds a remix greeting with source and detected systems", () => {
        const greeting = buildCopilotEntryGreeting(
            {
                entryMode: "remix_existing_game",
                sourceSceneName: "Bullet Bloom",
                sourceCreatorName: "Stem Studio",
            },
            ["12 scene objects", "1 camera"],
        );

        expect(greeting).toContain("Original game: Bullet Bloom");
        expect(greeting).toContain("Creator: Stem Studio");
        expect(greeting).toContain("12 scene objects, 1 camera");
        expect(greeting).toContain("apply it directly to the scene");
    });

    it("builds MVP-first prompt context for create-from-prompt entries", () => {
        const context = buildCopilotEntryPromptContext({
            entryMode: "create_from_prompt",
            prompt: "Make a floating island platformer",
            autoSubmit: true,
        });

        expect(context?.copilotEntry).toEqual({
            entryMode: "create_from_prompt",
            promptStrategy: "mvp_first",
        });
        expect(context?.promptDirectives?.join(" ")).toContain("smallest playable MVP");
        expect(context?.promptDirectives?.join(" ")).toContain("not a full finished game");
    });

    it("clears the stored bootstrap payload", () => {
        writeDashboardCopilotBootstrap({entryMode: "edit_current_game", sourceSceneName: "Arena Draft"});

        clearDashboardCopilotBootstrap();

        expect(readDashboardCopilotBootstrap()).toBeNull();
    });
});
