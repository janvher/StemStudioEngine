import {describe, expect, it} from "vitest";

import {executeBuiltin} from "./builtins";
import {getAllHelp, getHelpForTopic} from "./helpData";

describe("script tool help markdown", () => {
    it("formats full help as markdown", () => {
        const help = getAllHelp();

        expect(help).toContain("## ");
        expect(help).toContain("- `help [command|category]`:");
        expect(help).toContain("- `export scene [name=<bundle-name>]`:");
        expect(help).toContain("Tip: Use `help <command>`");
    });

    it("formats command help as markdown", () => {
        const help = getHelpForTopic("add box");

        expect(help).toContain("## `add box`");
        expect(help).toContain("**Registry command:** `create_primitive`");
        expect(help).toContain("### Parameters");
        expect(help).toContain("widthSegments");
        expect(help).toContain("```text");
    });

    it("supports raw registry command help lookups", () => {
        const help = getHelpForTopic("set_external_texture");

        expect(help).toContain("## `set_external_texture`");
        expect(help).toContain("### Script Syntax");
        expect(help).toContain("- `texture external`");
    });

    it("marks builtin help output as markdown", async () => {
        const result = await executeBuiltin("help", {}, {
            commandBuffer: [],
            clearOutput: () => {},
        });

        expect(result.status).toBe("info");
        expect(result.format).toBe("markdown");
        expect(result.output).toContain("## ");
    });
});
