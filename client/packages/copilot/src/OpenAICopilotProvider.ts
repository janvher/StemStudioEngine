import type {
    CopilotConnectOptions,
    CopilotMessage,
    CopilotProvider,
    CopilotProviderDescriptor,
    CopilotResponseChunk,
} from "./types";

export interface OpenAICopilotProviderOptions {
    /** Required: API key for the OpenAI-compatible endpoint. */
    apiKey?: string;
    /** Default `https://api.openai.com/v1`. Any OpenAI-compatible `/v1` works. */
    baseUrl?: string;
    /** Default `gpt-4o-mini`. */
    model?: string;
    /** Optional: bake a system prompt into every request. */
    systemPrompt?: string;
    /** Override fetch (mostly for tests). */
    fetchImpl?: typeof fetch;
}

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

/**
 * Reference CopilotProvider that streams from any OpenAI-compatible
 * Chat Completions endpoint. Suitable for OpenAI, OpenRouter, local
 * Ollama with `/v1` shim, Anthropic via its compatibility layer, etc.
 *
 * Intentionally minimal — no tool calling, no scene-mutation routing,
 * no thinking blocks. Forks that need richer behavior should subclass
 * or implement their own provider.
 */
export class OpenAICopilotProvider implements CopilotProvider {
    static descriptor: CopilotProviderDescriptor = {
        id: "openai-compatible",
        displayName: "OpenAI-compatible API",
        description:
            "Streams chat completions from any OpenAI-compatible /v1 endpoint. Configure apiKey + baseUrl.",
    };

    private readonly apiKey: string;
    private readonly baseUrl: string;
    private readonly model: string;
    private readonly systemPrompt: string | undefined;
    private readonly fetchImpl: typeof fetch;
    private connected = false;
    private abortController: AbortController | null = null;

    constructor(options: OpenAICopilotProviderOptions = {}) {
        this.apiKey = options.apiKey ?? "";
        this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
        this.model = options.model ?? DEFAULT_MODEL;
        this.systemPrompt = options.systemPrompt;
        this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    }

    async connect(_options: CopilotConnectOptions): Promise<void> {
        // No persistent transport — chat completions are per-request.
        this.connected = true;
    }

    async disconnect(): Promise<void> {
        this.cancel();
        this.connected = false;
    }

    isConnected(): boolean {
        return this.connected;
    }

    cancel(): void {
        this.abortController?.abort();
        this.abortController = null;
    }

    async *sendMessage(
        message: string,
        history: CopilotMessage[],
        signal?: AbortSignal,
    ): AsyncIterable<CopilotResponseChunk> {
        if (!this.apiKey) {
            yield {
                type: "error",
                error: "OpenAICopilotProvider: missing API key. Pass `apiKey` in the constructor options.",
            };
            yield {type: "done"};
            return;
        }

        const controller = new AbortController();
        this.abortController = controller;
        if (signal) {
            signal.addEventListener("abort", () => controller.abort(), {once: true});
        }

        const messages: Array<{role: string; content: string}> = [];
        if (this.systemPrompt) {
            messages.push({role: "system", content: this.systemPrompt});
        }
        for (const msg of history) {
            messages.push({role: msg.role, content: msg.content});
        }
        messages.push({role: "user", content: message});

        let response: Response;
        try {
            response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    stream: true,
                }),
                signal: controller.signal,
            });
        } catch (err) {
            yield {type: "error", error: `Request failed: ${(err as Error).message}`};
            yield {type: "done"};
            return;
        }

        if (!response.ok || !response.body) {
            const body = await response.text().catch(() => "");
            yield {
                type: "error",
                error: `HTTP ${response.status}: ${body.slice(0, 500)}`,
            };
            yield {type: "done"};
            return;
        }

        yield* this.parseSseStream(response.body);
        yield {type: "done"};
    }

    private async *parseSseStream(
        body: ReadableStream<Uint8Array>,
    ): AsyncIterable<CopilotResponseChunk> {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
            while (true) {
                const {value, done} = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, {stream: true});

                let newlineIndex;
                while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
                    const rawLine = buffer.slice(0, newlineIndex).trim();
                    buffer = buffer.slice(newlineIndex + 1);
                    if (!rawLine.startsWith("data:")) continue;
                    const payload = rawLine.slice(5).trim();
                    if (!payload || payload === "[DONE]") continue;

                    let parsed: {choices?: Array<{delta?: {content?: string}}>};
                    try {
                        parsed = JSON.parse(payload);
                    } catch {
                        continue;
                    }
                    const text = parsed.choices?.[0]?.delta?.content;
                    if (typeof text === "string" && text.length > 0) {
                        yield {type: "text", text};
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
}
