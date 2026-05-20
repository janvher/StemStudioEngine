import {describe, expect, it, vi} from "vitest";

import {ScriptExecutor} from "./ScriptExecutor";

describe("ScriptExecutor.parseScript", () => {
    it("parses comments, blank lines, and commands", () => {
        const script = `# A comment
add box name="Ground" position=0,-0.5,0

# Another comment
physics enable Ground`;

        const lines = ScriptExecutor.parseScript(script);

        expect(lines).toHaveLength(5);
        expect(lines[0]!.isComment).toBe(true);
        expect(lines[0]!.parsed).toBeNull();

        expect(lines[1]!.isComment).toBe(false);
        expect(lines[1]!.isEmpty).toBe(false);
        expect(lines[1]!.parsed).not.toBeNull();
        expect(lines[1]!.parsed!.command).toBe("create_primitive");

        expect(lines[2]!.isEmpty).toBe(true);

        expect(lines[3]!.isComment).toBe(true);

        expect(lines[4]!.parsed).not.toBeNull();
        expect(lines[4]!.parsed!.command).toBe("enable_physics");
    });

    it("handles empty script", () => {
        const lines = ScriptExecutor.parseScript("");
        expect(lines).toHaveLength(1);
        expect(lines[0]!.isEmpty).toBe(true);
    });
});

describe("ScriptExecutor.extractImports", () => {
    it("extracts multiple imports with correct indices and names", () => {
        const script = `# Scene setup
import model PlayerCharacter player.glb "Player character"
add box name="Ground"
import behavior NpcController npc.yaml "NPC controller"
import audio BgMusic bgm.mp3 "Background music"`;

        const imports = ScriptExecutor.extractImports(script);

        expect(imports).toHaveLength(3);
        expect(imports[0]).toMatchObject({index: 0, type: "model", name: "PlayerCharacter", filepath: "player.glb", message: "Player character"});
        expect(imports[0]!.extensions).toContain(".glb");
        expect(imports[1]).toMatchObject({index: 1, type: "behavior", name: "NpcController", filepath: "npc.yaml", message: "NPC controller"});
        expect(imports[1]!.extensions).toContain(".yaml");
        expect(imports[2]).toMatchObject({index: 2, type: "audio", name: "BgMusic", filepath: "bgm.mp3", message: "Background music"});
        expect(imports[2]!.extensions).toContain(".mp3");
    });

    it("returns empty array when no imports", () => {
        const script = `add box name="Ground"
physics enable Ground`;

        expect(ScriptExecutor.extractImports(script)).toHaveLength(0);
    });

    it("skips import without type", () => {
        const script = `import`;
        expect(ScriptExecutor.extractImports(script)).toHaveLength(0);
    });

    it("skips import with unknown type", () => {
        const script = `import unknowntype SomeName "some file"`;
        expect(ScriptExecutor.extractImports(script)).toHaveLength(0);
    });

    it("handles import with name only (no filepath or comment)", () => {
        const script = `import image MyTexture`;
        const imports = ScriptExecutor.extractImports(script);
        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({index: 0, type: "image", name: "MyTexture"});
        expect(imports[0]!.filepath).toBeUndefined();
        expect(imports[0]!.message).toBeUndefined();
    });

    it("extracts name and filepath from import command", () => {
        const script = `import model Kart assets/kart.glb "The racing kart"`;
        const imports = ScriptExecutor.extractImports(script);
        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({index: 0, type: "model", name: "Kart", filepath: "assets/kart.glb", message: "The racing kart"});
    });

    it("extracts name and filepath without comment", () => {
        const script = `import audio EngineSound engine.mp3`;
        const imports = ScriptExecutor.extractImports(script);
        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({index: 0, type: "audio", name: "EngineSound", filepath: "engine.mp3"});
        expect(imports[0]!.message).toBeUndefined();
    });

    it("handles quoted name with comment (no filepath)", () => {
        const script = `import behavior "NPC Controller" "The NPC logic"`;
        const imports = ScriptExecutor.extractImports(script);
        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({index: 0, type: "behavior", name: "NPC Controller", message: "The NPC logic"});
        expect(imports[0]!.filepath).toBeUndefined();
    });

    it("handles sound as import type", () => {
        const script = `import sound BgMusic bgm.mp3 "Background music"`;
        const imports = ScriptExecutor.extractImports(script);
        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({index: 0, type: "sound", name: "BgMusic", filepath: "bgm.mp3", message: "Background music"});
    });

    it("supports named parameter style", () => {
        const script = `import model name=Kart filepath=kart.glb comment="The kart"`;
        const imports = ScriptExecutor.extractImports(script);
        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({index: 0, type: "model", name: "Kart", filepath: "kart.glb", message: "The kart"});
    });

    it("handles quoted name with spaces", () => {
        const script = `import model "Racing Kart" kart.glb`;
        const imports = ScriptExecutor.extractImports(script);
        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({index: 0, type: "model", name: "Racing Kart", filepath: "kart.glb"});
    });

    it("handles quoted filepath with spaces", () => {
        const script = `import model Kart "my models/racing kart.glb" "The kart"`;
        const imports = ScriptExecutor.extractImports(script);
        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({index: 0, type: "model", name: "Kart", filepath: "my models/racing kart.glb", message: "The kart"});
    });

    it("handles both quoted name and quoted filepath with spaces", () => {
        const script = `import model "Racing Kart" "my models/racing kart.glb" "The racing kart"`;
        const imports = ScriptExecutor.extractImports(script);
        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({index: 0, type: "model", name: "Racing Kart", filepath: "my models/racing kart.glb", message: "The racing kart"});
    });

    it("handles named params with quoted spaces", () => {
        const script = `import model name="Racing Kart" filepath="my models/kart.glb" comment="The kart"`;
        const imports = ScriptExecutor.extractImports(script);
        expect(imports).toHaveLength(1);
        expect(imports[0]).toMatchObject({index: 0, type: "model", name: "Racing Kart", filepath: "my models/kart.glb", message: "The kart"});
    });
});

describe("ScriptExecutor.extractProxyRequirements", () => {
    it("extracts proxy requirements from script", () => {
        const script = `# Setup
require proxy alias="/api/weather" destination="https://api.weather.com" comment="Weather API"
add box name="Box1"
require proxy alias="/api/maps" destination="https://maps.example.com"`;

        const reqs = ScriptExecutor.extractProxyRequirements(script);
        expect(reqs).toHaveLength(2);
        expect(reqs[0]).toEqual({alias: "/api/weather", destination: "https://api.weather.com", comment: "Weather API"});
        expect(reqs[1]).toEqual({alias: "/api/maps", destination: "https://maps.example.com", comment: undefined});
    });

    it("returns empty array when no require commands", () => {
        const script = `add box name="Box1"`;
        expect(ScriptExecutor.extractProxyRequirements(script)).toEqual([]);
    });

    it("skips require proxy with missing alias or destination", () => {
        const script = `require proxy alias="/api/weather"`;
        expect(ScriptExecutor.extractProxyRequirements(script)).toEqual([]);
    });
});

describe("ScriptExecutor.execute", () => {
    it("executes commands sequentially and reports results", async () => {
        const script = `# Scene: Test
add box name="Box1"
add sphere name="Ball"`;

        const mockExecutor = vi.fn().mockResolvedValue({success: true, message: "Created"});

        const result = await ScriptExecutor.execute(script, mockExecutor);

        expect(result.executedCommands).toBe(2);
        expect(result.successCount).toBe(2);
        expect(result.failCount).toBe(0);
        expect(mockExecutor).toHaveBeenCalledTimes(2);
    });

    it("continues on error", async () => {
        const script = `add box name="Box1"
delete NonExistent
add sphere name="Ball"`;

        const mockExecutor = vi.fn()
            .mockResolvedValueOnce({success: true, message: "Created"})
            .mockResolvedValueOnce({success: false, error: "Object not found"})
            .mockResolvedValueOnce({success: true, message: "Created"});

        const result = await ScriptExecutor.execute(script, mockExecutor);

        expect(result.executedCommands).toBe(3);
        expect(result.successCount).toBe(2);
        expect(result.failCount).toBe(1);
        expect(result.results[1]!.success).toBe(false);
        expect(result.results[1]!.error).toBe("Object not found");
    });

    it("handles thrown errors gracefully", async () => {
        const script = `add box name="Box1"`;

        const mockExecutor = vi.fn().mockRejectedValue(new Error("Network error"));

        const result = await ScriptExecutor.execute(script, mockExecutor);

        expect(result.failCount).toBe(1);
        expect(result.results[0]!.error).toBe("Network error");
    });

    it("reports progress", async () => {
        const script = `add box name="A"
add box name="B"
add box name="C"`;

        const mockExecutor = vi.fn().mockResolvedValue({success: true});
        const progressCalls: [number, number, string][] = [];

        await ScriptExecutor.execute(script, mockExecutor, (current, total, line) => {
            progressCalls.push([current, total, line]);
        });

        expect(progressCalls).toHaveLength(3);
        expect(progressCalls[0]).toEqual([1, 3, 'add box name="A"']);
        expect(progressCalls[2]).toEqual([3, 3, 'add box name="C"']);
    });

    it("skips built-in commands in script mode", async () => {
        const script = `help
add box name="Box1"
clear
dump scene
check
test`;

        const mockExecutor = vi.fn().mockResolvedValue({success: true});

        const result = await ScriptExecutor.execute(script, mockExecutor);

        // Builtins are skipped but counted as success.
        expect(result.executedCommands).toBe(6);
        expect(result.successCount).toBe(6);
        expect(mockExecutor).toHaveBeenCalledTimes(1); // Only the add box call
    });

    it("skips comments and empty lines", async () => {
        const script = `# Comment

add box name="Box1"

# Another comment`;

        const mockExecutor = vi.fn().mockResolvedValue({success: true});

        const result = await ScriptExecutor.execute(script, mockExecutor);

        expect(result.totalLines).toBe(5);
        expect(result.executedCommands).toBe(1);
        expect(mockExecutor).toHaveBeenCalledTimes(1);
    });
});
