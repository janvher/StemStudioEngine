import type {
    CopilotConnectOptions,
    CopilotMessage,
    CopilotProvider,
    CopilotProviderDescriptor,
    CopilotResponseChunk,
} from "./types";

/**
 * No-op CopilotProvider mounted when the host hasn't configured a real
 * LLM. Keeps the chat panel renderable and tells the user the assistant
 * is not configured rather than failing silently.
 */
export class EmptyCopilotProvider implements CopilotProvider {
    static descriptor: CopilotProviderDescriptor = {
        id: "empty",
        displayName: "Disabled",
        description: "No AI copilot is configured. Implement CopilotProvider to enable one.",
    };

    private connected = false;

    async connect(_options: CopilotConnectOptions): Promise<void> {
        this.connected = true;
    }

    async disconnect(): Promise<void> {
        this.connected = false;
    }

    isConnected(): boolean {
        return this.connected;
    }

    async *sendMessage(
        _message: string,
        _history: CopilotMessage[],
        _signal?: AbortSignal,
    ): AsyncIterable<CopilotResponseChunk> {
        yield {
            type: "text",
            text: "AI copilot is not configured. The editor is shipping with EmptyCopilotProvider — implement CopilotProvider and mount it through <CopilotContext.Provider> to enable an assistant.",
        };
        yield {type: "done"};
    }
}
