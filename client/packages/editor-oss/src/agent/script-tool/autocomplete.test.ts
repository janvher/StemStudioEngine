import {describe, expect, it} from "vitest";

import {applyParameterSuggestion, getParameterSuggestions} from "./autocomplete";

describe("getParameterSuggestions", () => {
    it("suggests update params after a target is provided", () => {
        const result = getParameterSuggestions("update MyBox ");

        expect(result).toEqual({
            suggestions: [
                "position=",
                "rotation=",
                "scale=",
                "color=",
                "name=",
                "tag=",
                "objectSettings=",
            ],
            replaceMode: "append",
        });
    });

    it("suggests matching flag-style params when typing a partial flag", () => {
        const result = getParameterSuggestions('update --target "My Box" --co');

        expect(result).toEqual({
            suggestions: ["--color"],
            replaceMode: "replace-token",
        });
    });

    it("does not suggest params before a required target is provided", () => {
        expect(getParameterSuggestions("update ")).toBeNull();
    });

    it("supports raw registry command names", () => {
        const result = getParameterSuggestions("modify_object target=MyBox ");

        expect(result?.suggestions).toContain("position=");
        expect(result?.suggestions).toContain("color=");
    });
});

describe("applyParameterSuggestion", () => {
    it("appends suggestions when the input ends with a space", () => {
        expect(applyParameterSuggestion("update MyBox ", "position=", "append")).toBe("update MyBox position=");
    });

    it("replaces the current partial token", () => {
        expect(applyParameterSuggestion("update MyBox po", "position=", "replace-token")).toBe("update MyBox position=");
        expect(applyParameterSuggestion("update MyBox --co", "--color", "replace-token")).toBe("update MyBox --color ");
    });
});
