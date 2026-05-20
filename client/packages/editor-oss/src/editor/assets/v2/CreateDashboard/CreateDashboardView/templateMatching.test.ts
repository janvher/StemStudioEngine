import {describe, expect, it} from "vitest";

import {extractKeywords, getPromptMatchedTemplates, templateMatchesPrompt} from "./templateMatching";

const createTemplate = (overrides: {ID: string; Name?: string; Description?: string; Tags?: string}) => ({
    Name: "",
    Description: "",
    Tags: "",
    ...overrides,
});

describe("templateMatching", () => {
    it("extracts useful prompt keywords", () => {
        expect(extractKeywords("Create a cozy farming game for me")).toEqual(["cozy", "farming"]);
    });

    it("returns no matches when no templates are configured", () => {
        expect(getPromptMatchedTemplates([], "make a racing game")).toEqual([]);
    });

    it("matches configured templates by name, tags, and description", () => {
        const farm = createTemplate({
            ID: "farm",
            Name: "Cozy Farm Starter",
            Description: "Grow crops and trade goods.",
            Tags: JSON.stringify(["simulation", "farming"]),
        });
        const racer = createTemplate({
            ID: "racer",
            Name: "Arcade Racer",
            Description: "Fast driving laps.",
            Tags: JSON.stringify(["cars"]),
        });
        const platformer = createTemplate({
            ID: "platformer",
            Name: "Jump Starter",
            Description: "A side scrolling platform challenge.",
            Tags: JSON.stringify(["action"]),
        });

        expect(getPromptMatchedTemplates([farm, racer, platformer], "I want a cozy crop game").map(t => t.ID))
            .toEqual(["farm"]);
        expect(getPromptMatchedTemplates([farm, racer, platformer], "Build a racing car game").map(t => t.ID))
            .toEqual(["racer"]);
        expect(getPromptMatchedTemplates([farm, racer, platformer], "Make a platformer").map(t => t.ID))
            .toEqual(["platformer"]);
    });

    it("does not match unrelated templates", () => {
        const template = createTemplate({
            ID: "racer",
            Name: "Arcade Racer",
            Description: "Fast driving laps.",
            Tags: JSON.stringify(["cars"]),
        });

        expect(templateMatchesPrompt(template, "make a cozy farming sim")).toBe(false);
    });

    it("handles non-json tag text without throwing", () => {
        const template = createTemplate({
            ID: "maze",
            Name: "Puzzle Rooms",
            Tags: "maze labyrinth",
        });

        expect(templateMatchesPrompt(template, "create a maze challenge")).toBe(true);
    });
});
