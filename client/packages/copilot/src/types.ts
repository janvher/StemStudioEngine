/**
 * Public contract for AI copilot providers.
 *
 * The editor consumes copilots through this interface. Anyone shipping
 * an editor distribution can drop in their own implementation by
 * mounting a different provider in `<CopilotContext.Provider>`.
 *
 * The reference implementations in this package are:
 *   - `EmptyCopilotProvider` — no-op, used when no LLM is configured.
 *   - `OpenAICopilotProvider` — streams from any OpenAI-compatible
 *     `/v1/chat/completions` endpoint (OpenAI, OpenRouter, local Ollama
 *     with a /v1 shim, Anthropic via compatibility layer, etc).
 *
 * StemStudio's internal Claude/ACP integration lives in
 * `@stem/copilot-stemstudio` and is intentionally NOT part of the
 * open-source distribution.
 */

export type CopilotMessageRole = "user" | "assistant" | "system";

export interface CopilotMessage {
    role: CopilotMessageRole;
    content: string;
    /** Provider-specific opaque metadata (tool calls, attachments, etc). */
    metadata?: Record<string, unknown>;
}

export interface CopilotConnectOptions {
    /** Stable per-scene session identifier. Providers may use it to scope memory or a reverse proxy. */
    sessionId: string;
    /** Optional auth token; the provider decides how to use it. */
    authToken?: string;
    /** Optional system prompt to prepend to the conversation. */
    systemPrompt?: string;
}

/**
 * One JSON-RPC mutation command emitted by a tool-calling copilot.
 * The host applies it against the engine via the existing JSON-RPC handler.
 */
export interface CopilotMutationCommand {
    jsonrpc?: "2.0";
    method: string;
    params?: Record<string, unknown>;
    id?: string | number;
}

export type CopilotResponseChunk =
    | {type: "text"; text: string}
    | {type: "thought"; text: string}
    | {type: "tool_call"; callId: string; toolName: string; args: unknown}
    | {type: "tool_result"; callId: string; output: unknown}
    | {type: "mutation"; command: CopilotMutationCommand}
    | {type: "error"; error: string}
    | {type: "done"};

export interface CopilotProvider {
    connect(options: CopilotConnectOptions): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;

    /**
     * Send a user message and stream response chunks back.
     * Implementations should yield chunks as they arrive and end with `{type: "done"}`.
     * On fatal failure, yield a `{type: "error", ...}` chunk and then `{type: "done"}`.
     */
    sendMessage(
        message: string,
        history: CopilotMessage[],
        signal?: AbortSignal,
    ): AsyncIterable<CopilotResponseChunk>;

    /** Optional: cancel an in-flight response without disconnecting. */
    cancel?(): void;
}

/**
 * Human-readable label for a provider, used in editor settings UI.
 * Providers may export this as a static field; not required.
 */
export interface CopilotProviderDescriptor {
    id: string;
    displayName: string;
    description?: string;
}
