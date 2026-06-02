import {beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({
    generateText: vi.fn(),
    createOpenAI: vi.fn(),
    createAnthropic: vi.fn(),
    createGoogleGenerativeAI: vi.fn(),
    openAIResponses: vi.fn(),
    anthropicModel: vi.fn(),
    googleModel: vi.fn(),
}));

vi.mock("ai", () => ({
    generateText: mocks.generateText,
}));

vi.mock("@ai-sdk/openai", () => ({
    createOpenAI: mocks.createOpenAI,
}));

vi.mock("@ai-sdk/anthropic", () => ({
    createAnthropic: mocks.createAnthropic,
}));

vi.mock("@ai-sdk/google", () => ({
    createGoogleGenerativeAI: mocks.createGoogleGenerativeAI,
}));

import {createPlaygroundLLMClient} from "./playgroundLLMClient";

describe("createPlaygroundLLMClient", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.generateText.mockResolvedValue({text: "{\"reply\":\"ok\",\"stemscript\":\"\"}"});
        mocks.openAIResponses.mockReturnValue({provider: "openai"});
        mocks.anthropicModel.mockReturnValue({provider: "anthropic"});
        mocks.googleModel.mockReturnValue({provider: "google"});
        mocks.createOpenAI.mockReturnValue({responses: mocks.openAIResponses});
        mocks.createAnthropic.mockReturnValue(mocks.anthropicModel);
        mocks.createGoogleGenerativeAI.mockReturnValue(mocks.googleModel);
    });

    it("uses OpenAI Responses with prompt caching provider options", async () => {
        const fetchImpl = vi.fn() as unknown as typeof fetch;
        const client = createPlaygroundLLMClient(fetchImpl);

        const text = await client.generateText({
            key: {provider: "openai", apiKey: "sk-openai", model: "gpt-5.2-codex"},
            prompt: "User request",
            systemPrompt: "System prompt",
            knowledgePrompt: "Knowledge prompt",
            promptCacheKey: "cache-key",
            maxOutputTokens: 1234,
        });

        expect(text).toBe("{\"reply\":\"ok\",\"stemscript\":\"\"}");
        expect(mocks.createOpenAI).toHaveBeenCalledWith({apiKey: "sk-openai", fetch: fetchImpl});
        expect(mocks.openAIResponses).toHaveBeenCalledWith("gpt-5.2-codex");
        expect(mocks.generateText).toHaveBeenCalledWith(expect.objectContaining({
            model: {provider: "openai"},
            system: "System prompt\n\nKnowledge prompt",
            prompt: "User request",
            maxOutputTokens: 1234,
            providerOptions: {
                openai: {
                    promptCacheKey: "cache-key",
                    promptCacheRetention: "24h",
                },
            },
        }));
    });

    it("marks Anthropic knowledge prompt as cacheable and uses browser direct-access headers", async () => {
        const fetchImpl = vi.fn() as unknown as typeof fetch;
        const client = createPlaygroundLLMClient(fetchImpl);

        await client.generateText({
            key: {
                provider: "anthropic",
                apiKey: "sk-anthropic",
                model: "claude-sonnet-4-5-20250929",
            },
            prompt: "User request",
            systemPrompt: "System prompt",
            knowledgePrompt: "Knowledge prompt",
        });

        expect(mocks.createAnthropic).toHaveBeenCalledWith({
            apiKey: "sk-anthropic",
            fetch: fetchImpl,
            headers: {
                "anthropic-dangerous-direct-browser-access": "true",
            },
        });
        expect(mocks.anthropicModel).toHaveBeenCalledWith("claude-sonnet-4-5-20250929");
        expect(mocks.generateText).toHaveBeenCalledWith(expect.objectContaining({
            model: {provider: "anthropic"},
            system: [
                {role: "system", content: "System prompt"},
                {
                    role: "system",
                    content: "Knowledge prompt",
                    providerOptions: {
                        anthropic: {
                            cacheControl: {type: "ephemeral"},
                        },
                    },
                },
            ],
        }));
    });

    it("uses the Google provider for Gemini and enables structured output support", async () => {
        const fetchImpl = vi.fn() as unknown as typeof fetch;
        const client = createPlaygroundLLMClient(fetchImpl);

        await client.generateText({
            key: {provider: "gemini", apiKey: "sk-gemini", model: "gemini-2.5-flash"},
            prompt: "User request",
            systemPrompt: "System prompt",
            knowledgePrompt: "Knowledge prompt",
        });

        expect(mocks.createGoogleGenerativeAI).toHaveBeenCalledWith({apiKey: "sk-gemini", fetch: fetchImpl});
        expect(mocks.googleModel).toHaveBeenCalledWith("gemini-2.5-flash");
        expect(mocks.generateText).toHaveBeenCalledWith(expect.objectContaining({
            model: {provider: "google"},
            providerOptions: {
                google: {
                    structuredOutputs: true,
                },
            },
        }));
    });
});
