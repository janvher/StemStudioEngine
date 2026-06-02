import type {generateText as generateTextType, LanguageModel, SystemModelMessage} from "ai";

import type {CopilotChatKey} from "./playgroundCopilotKeys";

export const PLAYGROUND_PROMPT_CACHE_KEY = "stemstudio-playground-copilot-v5";
export const PLAYGROUND_MAX_OUTPUT_TOKENS = 4096;

export type PlaygroundLLMGenerateRequest = {
    key: CopilotChatKey;
    prompt: string;
    systemPrompt: string;
    knowledgePrompt: string;
    promptCacheKey?: string;
    maxOutputTokens?: number;
    signal?: AbortSignal;
};

export type PlaygroundLLMClient = {
    generateText(request: PlaygroundLLMGenerateRequest): Promise<string>;
};

type ProviderOptions = NonNullable<Parameters<typeof generateTextType>[0]["providerOptions"]>;

export function createPlaygroundLLMClient(fetchImpl: typeof fetch = fetch.bind(globalThis)): PlaygroundLLMClient {
    return {
        async generateText(request: PlaygroundLLMGenerateRequest): Promise<string> {
            const {generateText} = await import("ai");
            const model = await createLanguageModel(request.key, fetchImpl);
            const result = await generateText({
                model,
                system: buildSystemPrompt(request),
                prompt: request.prompt,
                maxOutputTokens: request.maxOutputTokens ?? PLAYGROUND_MAX_OUTPUT_TOKENS,
                abortSignal: request.signal,
                maxRetries: 1,
                providerOptions: buildProviderOptions(request),
            });

            if (result.text.trim()) return result.text;
            throw new Error(`${request.key.provider} response did not include text content.`);
        },
    };
}

async function createLanguageModel(key: CopilotChatKey, fetchImpl: typeof fetch): Promise<LanguageModel> {
    switch (key.provider) {
        case "anthropic": {
            const {createAnthropic} = await import("@ai-sdk/anthropic");
            const anthropic = createAnthropic({
                apiKey: key.apiKey,
                fetch: fetchImpl,
                headers: {
                    "anthropic-dangerous-direct-browser-access": "true",
                },
            });
            return anthropic(key.model);
        }
        case "gemini": {
            const {createGoogleGenerativeAI} = await import("@ai-sdk/google");
            const google = createGoogleGenerativeAI({
                apiKey: key.apiKey,
                fetch: fetchImpl,
            });
            return google(key.model);
        }
        case "openai":
        default: {
            const {createOpenAI} = await import("@ai-sdk/openai");
            const openai = createOpenAI({
                apiKey: key.apiKey,
                fetch: fetchImpl,
            });
            return openai.responses(key.model);
        }
    }
}

function buildSystemPrompt(request: PlaygroundLLMGenerateRequest): string | SystemModelMessage[] {
    if (request.key.provider !== "anthropic") {
        return `${request.systemPrompt}\n\n${request.knowledgePrompt}`;
    }

    return [
        {
            role: "system",
            content: request.systemPrompt,
        },
        {
            role: "system",
            content: request.knowledgePrompt,
            providerOptions: {
                anthropic: {
                    cacheControl: {type: "ephemeral"},
                },
            },
        },
    ];
}

function buildProviderOptions(request: PlaygroundLLMGenerateRequest): ProviderOptions | undefined {
    if (request.key.provider === "openai") {
        return {
            openai: {
                promptCacheKey: request.promptCacheKey ?? PLAYGROUND_PROMPT_CACHE_KEY,
                promptCacheRetention: "24h",
            },
        };
    }

    if (request.key.provider === "gemini") {
        return {
            google: {
                structuredOutputs: true,
            },
        };
    }

    return undefined;
}
