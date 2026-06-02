import {describe, expect, it, vi} from "vitest";

import global from "../global";
import {DirectCopilotProvider} from "./DirectCopilotProvider";
import type {CopilotChatKey} from "./playgroundCopilotKeys";
import type {PlaygroundLLMClient} from "./playgroundLLMClient";

const openAIKey: CopilotChatKey = {provider: "openai", apiKey: "sk-test", model: "gpt-5.2-codex"};
const anthropicKey: CopilotChatKey = {
    provider: "anthropic",
    apiKey: "sk-test",
    model: "claude-sonnet-4-5-20250929",
};

const makeLLMClient = (...responses: Array<Record<string, unknown>>): PlaygroundLLMClient => ({
    generateText: vi.fn().mockImplementation(async () => {
        const response = responses.shift();
        return JSON.stringify(response ?? {reply: "No changes.", stemscript: ""});
    }),
});

const makeExecutor = () => {
    const executeCommand = vi.fn().mockImplementation(async (command: string, parameters: Record<string, unknown>) => ({
        success: true,
        step: {
            id: "step-1",
            command,
            parameters,
            status: "completed",
        },
        result: {message: "ok"},
    }));

    return {
        executeCommand,
        hasPendingInteractiveResults: () => false,
        getPendingInteractiveResults: () => [],
        handleUserSelectionResult: () => false,
        on: vi.fn(),
    };
};

describe("DirectCopilotProvider", () => {
    it("generates StemScript through the provider and executes it in the registry path", async () => {
        const executor = makeExecutor();
        const llmClient = makeLLMClient({
            reply: "Added a box.",
            stemscript: "add box name=TestBox position=1,2,3 color=#ff0000",
        });
        const events: string[] = [];
        const provider = new DirectCopilotProvider({
            llmClient,
            resolveKey: async () => openAIKey,
            createExecutor: () => executor,
        });

        provider.on("commandWillExecute", event => events.push(`will:${event.data.command}`));
        provider.on("commandExecuted", event => events.push(`done:${event.data.command}`));

        const response = await provider.prompt("make a red test box");
        const llmRequest = vi.mocked(llmClient.generateText).mock.calls[0]?.[0];

        expect(llmClient.generateText).toHaveBeenCalledOnce();
        expect(llmRequest?.prompt).toContain("User request:");
        expect(llmRequest?.prompt).not.toContain("StemStudio playground knowledge base");
        expect(llmRequest?.systemPrompt).toContain("cached StemScript/API knowledge base");
        expect(llmRequest?.knowledgePrompt).toContain("StemStudio playground knowledge base");
        expect(llmRequest?.knowledgePrompt).toContain("1 unit = 1 meter");
        expect(llmRequest?.systemPrompt).toContain("complete playable changes");
        expect(llmRequest?.systemPrompt).toContain("Prefer existing built-in behavior components");
        expect(llmRequest?.knowledgePrompt).toContain("Behavior registry");
        expect(llmRequest?.knowledgePrompt).toContain("Built-in behavior catalog");
        expect(llmRequest?.knowledgePrompt).toContain("behaviorId=character");
        expect(llmRequest?.knowledgePrompt).toContain("behaviorId=consumable");
        expect(llmRequest?.knowledgePrompt).toContain("Import API reference");
        expect(llmRequest?.systemPrompt).toContain("set a project title");
        expect(llmRequest?.systemPrompt).toContain('project title "Arena Runner"');
        expect(llmRequest?.systemPrompt).toContain('description="Copilot generated for:');
        expect(llmRequest?.systemPrompt).toContain("inspected/reused assets");
        expect(llmRequest?.systemPrompt).toContain("inspectionStemscript");
        expect(llmRequest?.systemPrompt).toContain("lambda list");
        expect(llmRequest?.systemPrompt).toContain("list assets");
        expect(llmRequest?.systemPrompt).toContain("list imports");
        expect(llmRequest?.systemPrompt).toContain("list files");
        expect(llmRequest?.knowledgePrompt).toContain("Asset/import inspection");
        expect(llmRequest?.knowledgePrompt).toContain("Descriptions are searchable metadata");
        expect(llmRequest?.knowledgePrompt).toContain("list behavior packs");
        expect(llmRequest?.knowledgePrompt).toContain("list lambda packs");
        expect(llmRequest?.promptCacheKey).toBe("stemstudio-playground-copilot-v5");
        expect(llmRequest?.maxOutputTokens).toBe(4096);
        expect(llmRequest?.key).toMatchObject({provider: "openai", model: "gpt-5.2-codex"});
        expect(executor.executeCommand).toHaveBeenCalledWith("create_primitive", expect.objectContaining({
            type: "box",
            name: "TestBox",
        }));
        expect(events).toEqual(["will:create_primitive", "done:create_primitive"]);
        expect(response).toContain("Added a box.");
        expect(response).toContain("Applied 1/1 command");
    });

    it("includes available behavior registry details in the dynamic provider prompt", async () => {
        const previousApp = global.app;
        global.app = {
            editor: {
                behaviorConfigRegistry: {
                    getAllConfigs: () => [
                        {
                            id: "custom.doorController",
                            name: "Door Controller",
                            description: "Opens a door when a trigger activates it.",
                            isScript: true,
                            attributes: {
                                speed: {type: "number", default: 2},
                                separator: {type: "separator"},
                            },
                        },
                    ],
                },
                lambdaConfigRegistry: {
                    getAllConfigs: () => [
                        {
                            id: "custom.motionLambda",
                            name: "Motion Lambda",
                            description: "Moves registered objects.",
                            attributes: {
                                speed: {type: "number", default: 1},
                            },
                            componentSchema: {
                                enabled: {type: "boolean", default: true},
                            },
                        },
                    ],
                },
            },
        } as any;

        try {
            const llmClient = makeLLMClient({reply: "No changes.", stemscript: ""});
            const provider = new DirectCopilotProvider({
                llmClient,
                resolveKey: async () => openAIKey,
                createExecutor: makeExecutor,
            });

            await provider.prompt("what behavior can open a door?");
            const llmRequest = vi.mocked(llmClient.generateText).mock.calls[0]?.[0];

            expect(llmRequest?.prompt).toContain("Available behavior registry JSON");
            expect(llmRequest?.prompt).toContain('"id": "custom.doorController"');
            expect(llmRequest?.prompt).toContain('"key": "speed"');
            expect(llmRequest?.prompt).toContain("Available lambda registry JSON");
            expect(llmRequest?.prompt).toContain('"id": "custom.motionLambda"');
            expect(llmRequest?.prompt).toContain('"componentSchema"');
            expect(llmRequest?.prompt).not.toContain("separator");
        } finally {
            global.app = previousApp;
        }
    });

    it("runs read-only inspection and replans before mutating the scene", async () => {
        const executeCommand = vi.fn().mockImplementation(async (command: string, parameters: Record<string, unknown>) => {
            const result =
                command === "get_scene_objects"
                    ? {message: "Found objects", data: [{name: "Player", type: "Mesh"}]}
                    : command === "get_object"
                      ? {message: "Retrieved Player", data: {name: "Player", position: {x: 0, y: 1, z: 0}}}
                      : {message: "ok"};
            return {
                success: true,
                step: {id: "step-1", command, parameters, status: "completed"},
                result,
            };
        });
        const executor = {
            executeCommand,
            hasPendingInteractiveResults: () => false,
            getPendingInteractiveResults: () => [],
            handleUserSelectionResult: () => false,
            on: vi.fn(),
        };
        const llmClient = makeLLMClient(
            {
                reply: "I need to inspect the player first.",
                inspectionStemscript: "list objects filter=Player\nget Player",
                stemscript: "",
            },
            {
                reply: "Moved the existing player.",
                stemscript: "update Player position=1,1,0",
            },
        );
        const provider = new DirectCopilotProvider({
            llmClient,
            resolveKey: async () => openAIKey,
            createExecutor: () => executor,
        });

        const response = await provider.prompt("move the player right");
        const secondRequest = vi.mocked(llmClient.generateText).mock.calls[1]?.[0];

        expect(llmClient.generateText).toHaveBeenCalledTimes(2);
        expect(executeCommand).toHaveBeenCalledWith("get_scene_objects", expect.objectContaining({filter: "Player"}));
        expect(executeCommand).toHaveBeenCalledWith("get_object", expect.objectContaining({target: "Player"}));
        expect(executeCommand).toHaveBeenCalledWith("modify_object", expect.objectContaining({target: "Player"}));
        expect(secondRequest?.prompt).toContain("Inspection results JSON");
        expect(secondRequest?.prompt).toContain("Retrieved Player");
        expect(secondRequest?.prompt).toContain('"position": {');
        expect(secondRequest?.prompt).toContain('"x": 0');
        expect(response).toContain("Applied 1/1 command");
    });

    it("lets inspection query imported models, imports, files, and behavior/lambda packs", async () => {
        const executeCommand = vi.fn().mockImplementation(async (command: string, parameters: Record<string, unknown>) => ({
            success: true,
            step: {id: "step-1", command, parameters, status: "completed"},
            result: {
                message: `ok ${command}`,
                data: command === "list_scene_assets"
                    ? {assets: [{id: "asset-1", name: "Kart", type: parameters.type}]}
                    : {asset: {id: parameters.assetId ?? parameters.name, name: parameters.assetId ?? parameters.name}},
            },
        }));
        const executor = {
            executeCommand,
            hasPendingInteractiveResults: () => false,
            getPendingInteractiveResults: () => [],
            handleUserSelectionResult: () => false,
            on: vi.fn(),
        };
        const llmClient = makeLLMClient(
            {
                reply: "I need to inspect imported assets.",
                inspectionStemscript: [
                    "list models",
                    "list imports",
                    "list files",
                    "list behavior packs",
                    "list lambda packs",
                    "get asset assetId=model-1",
                ].join("\n"),
                stemscript: "",
            },
            {
                reply: "Used the existing imported asset context.",
                stemscript: "",
            },
        );
        const provider = new DirectCopilotProvider({
            llmClient,
            resolveKey: async () => openAIKey,
            createExecutor: () => executor,
        });

        const response = await provider.prompt("use the existing imported kart model");
        const secondRequest = vi.mocked(llmClient.generateText).mock.calls[1]?.[0];

        expect(executeCommand).toHaveBeenCalledWith("list_scene_assets", expect.objectContaining({type: "models"}));
        expect(executeCommand).toHaveBeenCalledWith("list_scene_assets", expect.objectContaining({type: "imports"}));
        expect(executeCommand).toHaveBeenCalledWith("list_scene_assets", expect.objectContaining({type: "files"}));
        expect(executeCommand).toHaveBeenCalledWith("list_scene_assets", expect.objectContaining({type: "behaviors"}));
        expect(executeCommand).toHaveBeenCalledWith("list_scene_assets", expect.objectContaining({type: "lambdas"}));
        expect(executeCommand).toHaveBeenCalledWith("get_scene_asset", expect.objectContaining({assetId: "model-1"}));
        expect(secondRequest?.prompt).toContain("Inspection results JSON");
        expect(secondRequest?.prompt).toContain("list_scene_assets");
        expect(response).toContain("Used the existing imported asset context.");
    });

    it("executes existing behavior attach and config commands", async () => {
        const executor = makeExecutor();
        const llmClient = makeLLMClient({
            reply: "Made the player controllable.",
            stemscript: [
                'behavior attach Player behaviorId=character config={isDefault:true,walkSpeed:3}',
                'behavior config Player behaviorId=character attributesData={runSpeed:8}',
            ].join("\n"),
        });
        const provider = new DirectCopilotProvider({
            llmClient,
            resolveKey: async () => openAIKey,
            createExecutor: () => executor,
        });

        const response = await provider.prompt("make player controllable");

        expect(executor.executeCommand).toHaveBeenCalledWith("attach_behavior", expect.objectContaining({
            target: "Player",
            behaviorId: "character",
        }));
        expect(executor.executeCommand).toHaveBeenCalledWith("set_behavior_config", expect.objectContaining({
            target: "Player",
            behaviorId: "character",
        }));
        expect(response).toContain("Applied 2/2 command");
    });

    it("executes game metadata commands when generating a playable game", async () => {
        const executor = makeExecutor();
        const llmClient = makeLLMClient({
            reply: "Created a playable arena game.",
            stemscript: [
                'project title "Crystal Dash"',
                "game settings isGame=true lives=3 maxScore=5 showHUD=true",
            ].join("\n"),
        });
        const provider = new DirectCopilotProvider({
            llmClient,
            resolveKey: async () => openAIKey,
            createExecutor: () => executor,
        });

        const response = await provider.prompt("make a crystal collection game");

        expect(executor.executeCommand).toHaveBeenCalledWith("set_project_title", expect.objectContaining({
            title: "Crystal Dash",
        }));
        expect(executor.executeCommand).toHaveBeenCalledWith("set_game_settings", expect.objectContaining({
            isGame: true,
            lives: 3,
            maxScore: 5,
            showHUD: true,
        }));
        expect(response).toContain("Applied 2/2 command");
    });

    it("passes Anthropic key and static knowledge to the LLM client", async () => {
        const executor = makeExecutor();
        const llmClient = makeLLMClient({
            reply: "Added behavior.",
            stemscript:
                'behavior add name="ScoreController" description="Copilot generated for: score over time" code="this.update = function(dt) {}"',
        });
        const provider = new DirectCopilotProvider({
            llmClient,
            resolveKey: async () => anthropicKey,
            createExecutor: () => executor,
        });

        await provider.prompt("add a score controller behavior");
        const llmRequest = vi.mocked(llmClient.generateText).mock.calls[0]?.[0];

        expect(llmRequest?.key).toMatchObject({provider: "anthropic", model: "claude-sonnet-4-5-20250929"});
        expect(llmRequest?.systemPrompt).toContain("StemStudio playground copilot");
        expect(llmRequest?.knowledgePrompt).toContain("StemStudio playground knowledge base");
        expect(llmRequest?.prompt).toContain("User request:");
        expect(executor.executeCommand).toHaveBeenCalledWith("add_behavior", expect.objectContaining({
            name: "ScoreController",
            description: "Copilot generated for: score over time",
        }));
    });

    it("does not call a provider without a BYOK chat key", async () => {
        const llmClient = makeLLMClient();
        const provider = new DirectCopilotProvider({
            llmClient,
            resolveKey: async () => null,
            createExecutor: makeExecutor,
        });

        const response = await provider.prompt("make a scene");

        expect(llmClient.generateText).not.toHaveBeenCalled();
        expect(response).toContain("No AI provider key");
    });

    it("asks for a model selection when multiple BYOK chat keys are configured", async () => {
        const llmClient = makeLLMClient();
        const provider = new DirectCopilotProvider({
            llmClient,
            resolveKeyChoice: async () => ({
                kind: "needs-selection",
                keys: [
                    openAIKey,
                    {provider: "gemini", apiKey: "gem-test", model: "gemini-2.5-flash"},
                ],
            }),
            createExecutor: makeExecutor,
        });

        const response = await provider.prompt("make a game");

        expect(llmClient.generateText).not.toHaveBeenCalled();
        expect(response).toContain("Multiple AI provider keys");
        expect(response).toContain("openai: gpt-5.2-codex");
        expect(response).toContain("gemini: gemini-2.5-flash");
    });
});
