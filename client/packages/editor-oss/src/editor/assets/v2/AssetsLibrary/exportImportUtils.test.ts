import {describe, it, expect, vi, beforeEach} from "vitest";
import {stringify} from "yaml";

import {exportBehavior, exportLambda, exportImportAsset, buildImportDocument, exportStem, importBehaviorFile, importLambdaFile, importImportFile, importStemFile, resolveImportedLambdaId, EXPORT_VERSION} from "./exportImportUtils";
import type {LambdaConfig} from "../../../../lambdas/Lambda";
import type {BehaviorConfig} from "../../../behaviors/BehaviorConfig";

// Mock DOM APIs for download
beforeEach(() => {
    vi.restoreAllMocks();
    // Stub URL.createObjectURL / revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();
});

const sampleBehaviorConfig: BehaviorConfig = {
    name: "TestBehavior",
    id: "author.testbehavior",
    author: "author",
    isScript: true,
    main: "script.js",
    version: "1.0.0",
    attributes: {
        speed: {name: "Speed", type: "number", default: 5, array: false, invisible: false, order: 0},
    },
    description: "A test behavior",
};

const sampleLambdaConfig: LambdaConfig = {
    name: "TestLambda",
    id: "author.testlambda",
    author: "author",
    version: "1.0.0",
    main: "lambda.ts",
    attributes: {
        range: {name: "Range", type: "number", default: 10},
    },
    componentSchema: {
        health: {name: "Health", type: "number", default: 100},
    },
};

const sampleCode = "function init() { console.log('hello'); }";

const buildYaml = (type: "behavior" | "lambda", config: Record<string, any>, code: string): string => {
    return `# StemStudio Export File\n# Do not edit manually unless you know what you're doing\n\n${stringify({
        meta: {
            tool: "StemStudio",
            type,
            exportVersion: EXPORT_VERSION,
            exportedAt: new Date().toISOString(),
        },
        config,
        code,
    }, {lineWidth: 0})}`;
};

const toFile = (content: string, name = "test.yaml"): File => {
    return new File([content], name, {type: "text/yaml"});
};

describe("exportImportUtils", () => {
    describe("exportBehavior", () => {
        it("triggers download with correct filename pattern", () => {
            const appendSpy = vi.spyOn(document.body, "appendChild").mockImplementation(el => el);
            const removeSpy = vi.spyOn(document.body, "removeChild").mockImplementation(el => el);

            exportBehavior(sampleBehaviorConfig, sampleCode);

            expect(appendSpy).toHaveBeenCalledOnce();
            const anchor = appendSpy.mock.calls[0]![0] as HTMLAnchorElement;
            expect(anchor.download).toMatch(/^testbehavior-behavior-\d{4}-\d{2}-\d{2}\.yaml$/);
            expect(removeSpy).toHaveBeenCalledOnce();
        });
    });

    describe("exportLambda", () => {
        it("triggers download with correct filename pattern", () => {
            const appendSpy = vi.spyOn(document.body, "appendChild").mockImplementation(el => el);
            const removeSpy = vi.spyOn(document.body, "removeChild").mockImplementation(el => el);

            exportLambda(sampleLambdaConfig, sampleCode);

            expect(appendSpy).toHaveBeenCalledOnce();
            const anchor = appendSpy.mock.calls[0]![0] as HTMLAnchorElement;
            expect(anchor.download).toMatch(/^testlambda-lambda-\d{4}-\d{2}-\d{2}\.yaml$/);
            expect(removeSpy).toHaveBeenCalledOnce();
        });
    });

    describe("importBehaviorFile", () => {
        it("parses valid behavior YAML and returns config + code", async () => {
            const yaml = buildYaml("behavior", sampleBehaviorConfig, sampleCode);
            const file = toFile(yaml);

            const result = await importBehaviorFile(file);

            expect(result.config.name).toBe("TestBehavior");
            expect(result.config.id).toBe("author.testbehavior");
            expect(result.config.attributes).toHaveProperty("speed");
            expect(result.code).toBe(sampleCode);
        });

        it("rejects lambda file imported as behavior", async () => {
            const yaml = buildYaml("lambda", sampleLambdaConfig, sampleCode);
            const file = toFile(yaml);

            await expect(importBehaviorFile(file)).rejects.toThrow("Expected behavior file but got lambda");
        });

        it("rejects non-StemStudio file", async () => {
            const yaml = stringify({meta: {tool: "OtherTool", type: "behavior"}, config: {}, code: ""});
            const file = toFile(yaml);

            await expect(importBehaviorFile(file)).rejects.toThrow("Not a valid StemStudio export file");
        });

        it("rejects file with missing config", async () => {
            const yaml = stringify({meta: {tool: "StemStudio", type: "behavior", exportVersion: 1}, code: "x"});
            const file = toFile(yaml);

            await expect(importBehaviorFile(file)).rejects.toThrow("Missing config");
        });

        it("rejects file with missing code", async () => {
            const yaml = stringify({meta: {tool: "StemStudio", type: "behavior", exportVersion: 1}, config: {name: "x", id: "y"}});
            const file = toFile(yaml);

            await expect(importBehaviorFile(file)).rejects.toThrow("Missing code");
        });

        it("rejects config without name or id", async () => {
            const yaml = buildYaml("behavior", {author: "x"}, sampleCode);
            const file = toFile(yaml);

            await expect(importBehaviorFile(file)).rejects.toThrow("missing name or id");
        });
    });

    describe("importLambdaFile", () => {
        it("parses valid lambda YAML and returns config + code", async () => {
            const yaml = buildYaml("lambda", sampleLambdaConfig, sampleCode);
            const file = toFile(yaml);

            const result = await importLambdaFile(file);

            expect(result.config.name).toBe("TestLambda");
            expect(result.config.id).toBe("author.testlambda");
            expect(result.config.componentSchema).toHaveProperty("health");
            expect(result.code).toBe(sampleCode);
        });

        it("rejects behavior file imported as lambda", async () => {
            const yaml = buildYaml("behavior", sampleBehaviorConfig, sampleCode);
            const file = toFile(yaml);

            await expect(importLambdaFile(file)).rejects.toThrow("Expected lambda file but got behavior");
        });

        it("keeps original ID when importing user handle matches", async () => {
            const yaml = buildYaml("lambda", sampleLambdaConfig, sampleCode);
            const file = toFile(yaml);

            const result = await importLambdaFile(file, "author");

            expect(result.config.id).toBe("author.testlambda");
        });

        it("generates new ID when importing user handle differs", async () => {
            const yaml = buildYaml("lambda", sampleLambdaConfig, sampleCode);
            const file = toFile(yaml);

            const result = await importLambdaFile(file, "otheruser");

            expect(result.config.id).toBe("otheruser.testlambda");
        });

        it("keeps original ID when no user handle provided", async () => {
            const yaml = buildYaml("lambda", sampleLambdaConfig, sampleCode);
            const file = toFile(yaml);

            const result = await importLambdaFile(file);

            expect(result.config.id).toBe("author.testlambda");
        });
    });

    describe("exportImportAsset", () => {
        it("triggers download with correct filename pattern", () => {
            const appendSpy = vi.spyOn(document.body, "appendChild").mockImplementation(el => el);
            const removeSpy = vi.spyOn(document.body, "removeChild").mockImplementation(el => el);

            exportImportAsset({name: "math-helpers", description: "clamp/lerp"}, "function clamp() {}");

            expect(appendSpy).toHaveBeenCalledOnce();
            const anchor = appendSpy.mock.calls[0]![0] as HTMLAnchorElement;
            expect(anchor.download).toMatch(/^math-helpers-import-\d{4}-\d{2}-\d{2}\.yaml$/);
            expect(removeSpy).toHaveBeenCalledOnce();
        });
    });

    describe("buildImportDocument + importImportFile", () => {
        it("round-trips name, description, and code", async () => {
            const yaml = buildImportDocument(
                {name: "math-helpers", description: "Shared clamp/lerp/easing"},
                "function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }\n",
            );
            expect(yaml).toContain("type: import");
            expect(yaml).toContain("name: math-helpers");

            const file = new File([yaml], "math-helpers.yaml", {type: "text/yaml"});
            const result = await importImportFile(file);
            expect(result.config.name).toBe("math-helpers");
            expect(result.config.description).toBe("Shared clamp/lerp/easing");
            expect(result.code).toContain("function clamp");
        });

        it("omits description when missing", async () => {
            const yaml = buildImportDocument({name: "hud-helpers"}, "function updateTimer() {}");
            const file = new File([yaml], "hud-helpers.yaml", {type: "text/yaml"});
            const result = await importImportFile(file);
            expect(result.config.name).toBe("hud-helpers");
            expect(result.config.description).toBeUndefined();
        });

        it("rejects a behavior file imported as an import asset", async () => {
            const behaviorYaml = buildYaml("behavior", {name: "X", id: "a.x"}, "code");
            const file = new File([behaviorYaml], "x.yaml", {type: "text/yaml"});
            await expect(importImportFile(file)).rejects.toThrow(/Expected import file/);
        });

        it("rejects an import file with missing name", async () => {
            const yaml = `# StemStudio Export File\n\n${stringify({
                meta: {tool: "StemStudio", type: "import", exportVersion: EXPORT_VERSION, exportedAt: new Date().toISOString()},
                config: {description: "no name"},
                code: "function x() {}",
            }, {lineWidth: 0})}`;
            const file = new File([yaml], "bad.yaml", {type: "text/yaml"});
            await expect(importImportFile(file)).rejects.toThrow(/missing name/);
        });
    });

    describe("exportStem", () => {
        it("triggers download with correct filename pattern", () => {
            const appendSpy = vi.spyOn(document.body, "appendChild").mockImplementation(el => el);
            const removeSpy = vi.spyOn(document.body, "removeChild").mockImplementation(el => el);

            exportStem(
                "My Stem",
                '[{"type":"Group"}]',
                {logicalIdToAssetId: {"l1": "a1"}, assetIdToRevisionId: {"a1": "r1"}},
                {behaviors: [], lambdas: [], imports: []},
                "https://sandbox.develop.erth.xyz",
            );

            expect(appendSpy).toHaveBeenCalledOnce();
            const anchor = appendSpy.mock.calls[0]![0] as HTMLAnchorElement;
            expect(anchor.download).toMatch(/^my-stem-stem-\d{4}-\d{2}-\d{2}\.yaml$/);
            expect(removeSpy).toHaveBeenCalledOnce();
        });
    });

    describe("importStemFile", () => {
        const buildStemYaml = (overrides: Record<string, any> = {}): string => {
            const doc = {
                meta: {tool: "StemStudio", type: "stem", exportVersion: EXPORT_VERSION, exportedAt: new Date().toISOString()},
                sourceServer: "https://sandbox.develop.erth.xyz",
                stemName: "My Stem",
                data: '[{"type":"Group"}]',
                assetResolutionContext: {
                    logicalIdToAssetId: {"l1": "a1"},
                    assetIdToRevisionId: {"a1": "r1"},
                },
                embeddedAssets: {behaviors: [], lambdas: [], imports: []},
                ...overrides,
            };
            return `# StemStudio Export File\n# Do not edit manually\n\n${stringify(doc, {lineWidth: 0})}`;
        };

        it("parses valid stem YAML and returns all fields", async () => {
            const yaml = buildStemYaml();
            const file = toFile(yaml);
            const result = await importStemFile(file);

            expect(result.stemName).toBe("My Stem");
            expect(result.sourceServer).toBe("https://sandbox.develop.erth.xyz");
            expect(result.data).toBe('[{"type":"Group"}]');
            expect(result.assetResolutionContext.logicalIdToAssetId).toEqual({"l1": "a1"});
            expect(result.assetResolutionContext.assetIdToRevisionId).toEqual({"a1": "r1"});
            expect(result.embeddedAssets.imports).toEqual([]);
        });

        it("defaults missing embedded imports to an empty list", async () => {
            const yaml = buildStemYaml({embeddedAssets: {behaviors: [], lambdas: []}});
            const file = toFile(yaml);

            const result = await importStemFile(file);

            expect(result.embeddedAssets.imports).toEqual([]);
        });

        it("rejects behavior file imported as stem", async () => {
            const yaml = buildYaml("behavior", sampleBehaviorConfig, sampleCode);
            const file = toFile(yaml);
            await expect(importStemFile(file)).rejects.toThrow("Expected stem file but got behavior");
        });

        it("rejects file with missing data", async () => {
            const yaml = buildStemYaml({data: undefined});
            const file = toFile(yaml);
            await expect(importStemFile(file)).rejects.toThrow("Missing data");
        });

        it("rejects file with missing assetResolutionContext", async () => {
            const yaml = buildStemYaml({assetResolutionContext: undefined});
            const file = toFile(yaml);
            await expect(importStemFile(file)).rejects.toThrow("Missing assetResolutionContext");
        });

        it("rejects file with missing stemName", async () => {
            const yaml = buildStemYaml({stemName: undefined});
            const file = toFile(yaml);
            await expect(importStemFile(file)).rejects.toThrow("Missing stemName");
        });
    });

    describe("resolveImportedLambdaId", () => {
        it("keeps ID when handles match", () => {
            expect(resolveImportedLambdaId("author.mylamb", "MyLamb", "author")).toBe("author.mylamb");
        });

        it("generates new ID when handles differ", () => {
            expect(resolveImportedLambdaId("author.mylamb", "MyLamb", "otheruser")).toBe("otheruser.mylamb");
        });

        it("handles IDs without a dot", () => {
            expect(resolveImportedLambdaId("nodot", "NoDot", "newuser")).toBe("newuser.nodot");
        });

        it("normalises user handle with spaces and uppercase", () => {
            expect(resolveImportedLambdaId("author.mylamb", "MyLamb", "Other User")).toBe("other_user.mylamb");
        });
    });
});
