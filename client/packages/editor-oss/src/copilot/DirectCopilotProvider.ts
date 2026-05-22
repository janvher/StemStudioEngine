// DirectCopilotProvider — a browser-only copilot for the playground.
//
// The integrated build talks to a hosted agent (the proprietary
// StudioACPClient) over Agent Client Protocol. The OSS playground has no such
// server, so this provider streams a plain conversation straight from the
// visitor's chosen AI provider (Anthropic or OpenAI-compatible) using a key
// they supply via the BYOK panel. Nothing is proxied through the Go AI server.
//
// Scope: this is a *conversational* copilot only. It does not perform scene
// mutations / tool calls — that is the integrated agent's job. The ACP methods
// the editor never drives for a plain chat (executeCommand, interactive
// results, permission requests) are intentionally inert.

import type {RequestPermissionResponse} from "@agentclientprotocol/sdk";

import type {CommandExecutionResult} from "../agent/CommandsExecutor";
import type {ACPEvent, ACPEventType, InteractiveSelectionResolution} from "../agent/types/ACPTypes";
import {ConnectionState} from "../agent/types/ACPTypes";
import type {CopilotEventHandler, ICopilotProvider} from "./ICopilotProvider";
import {resolveCopilotChatKey, type CopilotChatKey} from "./playgroundCopilotKeys";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-3-5-sonnet-latest";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";
const MAX_TOKENS = 1024;

const SYSTEM_PROMPT =
    "You are the StemStudio playground copilot, helping a visitor explore a " +
    "browser-based 3D game editor. Answer questions about 3D scenes, game " +
    "behaviors, and how to build with the editor. Be concise. You are running " +
    "as a direct browser client, so you cannot modify the scene yourself — " +
    "explain the steps the user should take instead.";

const NO_KEY_MESSAGE =
    "No AI provider key is configured. Click the **Keys** button above to add " +
    "an Anthropic or OpenAI key — it is stored locally in this browser and " +
    "never leaves your machine.";

type ChatMessage = {role: "user" | "assistant"; content: string};

export class DirectCopilotProvider implements ICopilotProvider {
    readonly isSuppressingSessionUpdates = false;

    private connected = false;
    private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
    private sessionId: string | null = null;
    private history: ChatMessage[] = [];
    private readonly handlers = new Map<ACPEventType, Set<CopilotEventHandler>>();
    private abortController: AbortController | null = null;

    private emit(type: ACPEventType, data?: ACPEvent["data"]): void {
        const set = this.handlers.get(type);
        if (!set) return;
        for (const handler of set) {
            try {
                handler({type, data});
            } catch (err) {
                console.error(`[DirectCopilotProvider] handler for "${type}" threw`, err);
            }
        }
    }

    on(eventType: ACPEventType, handler: CopilotEventHandler): void {
        let set = this.handlers.get(eventType);
        if (!set) {
            set = new Set();
            this.handlers.set(eventType, set);
        }
        set.add(handler);
    }

    async connect(): Promise<void> {
        // The conversation is per-request HTTPS — there is no persistent
        // transport to open. "Connected" simply means the panel is usable;
        // key resolution happens lazily on each prompt so the visitor can add
        // a key after the panel is already open.
        this.connected = true;
        this.connectionState = ConnectionState.CONNECTED;
        this.emit("connected");
    }

    disconnect(): void {
        this.cancel();
        this.connected = false;
        this.connectionState = ConnectionState.DISCONNECTED;
        this.emit("disconnected");
    }

    isConnected(): boolean {
        return this.connected;
    }

    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    private cancel(): void {
        this.abortController?.abort();
        this.abortController = null;
    }

    async cancelCurrentTask(): Promise<void> {
        this.cancel();
        this.emit("taskCancelled");
    }

    async createSession(): Promise<string> {
        this.sessionId =
            typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `direct-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        this.history = [];
        this.emit("sessionCreated", {sessionId: this.sessionId});
        return this.sessionId;
    }

    async loadSession(sessionId: string): Promise<void> {
        // No server-side session store in the playground — adopt the id so
        // history message ids stay stable, but there is nothing to replay.
        this.sessionId = sessionId;
    }

    getCurrentSessionId(): string | null {
        return this.sessionId;
    }

    getSessionId(): string | null {
        return this.sessionId;
    }

    async prompt(promptText: string): Promise<string> {
        this.emit("promptStarted", {prompt: promptText});

        const key = await resolveCopilotChatKey();
        if (!key) {
            this.emit("agentMessage", {message: NO_KEY_MESSAGE});
            this.emit("promptCompleted");
            return NO_KEY_MESSAGE;
        }

        this.history.push({role: "user", content: promptText});

        const controller = new AbortController();
        this.abortController = controller;

        let answer = "";
        try {
            for await (const chunk of this.streamCompletion(key, controller.signal)) {
                answer += chunk;
                this.emit("agentMessage", {message: chunk});
            }
        } catch (err) {
            const message =
                err instanceof DOMException && err.name === "AbortError"
                    ? "(cancelled)"
                    : `Copilot request failed: ${err instanceof Error ? err.message : String(err)}`;
            this.emit("agentMessage", {message});
            answer = answer || message;
        } finally {
            this.abortController = null;
        }

        if (answer) this.history.push({role: "assistant", content: answer});
        this.emit("promptCompleted");
        return answer;
    }

    private async *streamCompletion(
        key: CopilotChatKey,
        signal: AbortSignal,
    ): AsyncGenerator<string> {
        const response =
            key.provider === "anthropic"
                ? await this.requestAnthropic(key.apiKey, signal)
                : await this.requestOpenAI(key.apiKey, signal);

        if (!response.ok || !response.body) {
            const body = await response.text().catch(() => "");
            throw new Error(`HTTP ${response.status} ${body.slice(0, 300)}`);
        }

        for await (const payload of readSseData(response.body)) {
            const text =
                key.provider === "anthropic"
                    ? extractAnthropicDelta(payload)
                    : extractOpenAIDelta(payload);
            if (text) yield text;
        }
    }

    private requestAnthropic(apiKey: string, signal: AbortSignal): Promise<Response> {
        return fetch(ANTHROPIC_URL, {
            method: "POST",
            signal,
            headers: {
                "content-type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                // Required for browser-origin requests to the Anthropic API.
                "anthropic-dangerous-direct-browser-access": "true",
            },
            body: JSON.stringify({
                model: ANTHROPIC_MODEL,
                max_tokens: MAX_TOKENS,
                system: SYSTEM_PROMPT,
                stream: true,
                messages: this.history,
            }),
        });
    }

    private requestOpenAI(apiKey: string, signal: AbortSignal): Promise<Response> {
        return fetch(OPENAI_URL, {
            method: "POST",
            signal,
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                stream: true,
                messages: [{role: "system", content: SYSTEM_PROMPT}, ...this.history],
            }),
        });
    }

    // --- Inert ACP surface (plain chat has no tool/agent loop) -------------

    async executeCommand(): Promise<CommandExecutionResult> {
        throw new Error("DirectCopilotProvider does not support command execution.");
    }

    respondToPermissionRequest(_requestId: string, _response: RequestPermissionResponse): void {
        // No tool-permission flow in plain chat.
    }

    hasPendingInteractiveResults(): boolean {
        return false;
    }

    submitInteractiveSelectionResolution(_resolution: InteractiveSelectionResolution): boolean {
        return false;
    }

    checkPendingInteractiveResult(_id: string): boolean {
        return false;
    }
}

/** Yields the JSON payload of each `data:` line in an SSE stream. */
async function* readSseData(body: ReadableStream<Uint8Array>): AsyncGenerator<unknown> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
        for (;;) {
            const {value, done} = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, {stream: true});
            let newlineIndex: number;
            while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
                const line = buffer.slice(0, newlineIndex).trim();
                buffer = buffer.slice(newlineIndex + 1);
                if (!line.startsWith("data:")) continue;
                const payload = line.slice(5).trim();
                if (!payload || payload === "[DONE]") continue;
                try {
                    yield JSON.parse(payload);
                } catch {
                    // Skip malformed SSE frames.
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}

function extractAnthropicDelta(payload: unknown): string {
    const event = payload as {type?: string; delta?: {type?: string; text?: string}};
    if (event?.type === "content_block_delta" && event.delta?.type === "text_delta") {
        return event.delta.text ?? "";
    }
    return "";
}

function extractOpenAIDelta(payload: unknown): string {
    const event = payload as {choices?: Array<{delta?: {content?: string}}>};
    const text = event?.choices?.[0]?.delta?.content;
    return typeof text === "string" ? text : "";
}
