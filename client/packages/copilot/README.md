# @stem/copilot

Pluggable AI copilot contract for the StemStudio open-source editor. The
editor consumes copilots through the `CopilotProvider` interface — anyone
can swap in their own implementation by mounting a different provider in
`<CopilotContextProvider>` at the top of the React tree.

## Why

The editor itself shouldn't be tied to any specific LLM, transport, or
agent framework. Implementing your own copilot should only require
satisfying a small interface — connect, send a message, stream chunks
back. Everything else (chat UI, scene mutation handler, command
registry) stays in the editor.

## Quick start

```tsx
import {
    CopilotContextProvider,
    OpenAICopilotProvider,
} from "@stem/copilot";

const provider = new OpenAICopilotProvider({
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: "https://api.openai.com/v1", // any OpenAI-compatible endpoint
    model: "gpt-4o-mini",
});

<CopilotContextProvider provider={provider}>
    <Editor />
</CopilotContextProvider>;
```

If you don't configure a provider, the editor mounts `EmptyCopilotProvider`
which renders an "AI copilot is not configured" message in the chat panel.

## The contract

```typescript
interface CopilotProvider {
    connect(options: CopilotConnectOptions): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    sendMessage(
        message: string,
        history: CopilotMessage[],
        signal?: AbortSignal,
    ): AsyncIterable<CopilotResponseChunk>;
    cancel?(): void;
}
```

`sendMessage` streams `CopilotResponseChunk` values:

- `{type: "text", text}` — assistant text deltas
- `{type: "thought", text}` — optional reasoning trace
- `{type: "tool_call", callId, toolName, args}` — provider asked the
  editor (or itself) to run a tool
- `{type: "tool_result", callId, output}` — result of a previous tool call
- `{type: "mutation", command}` — JSON-RPC mutation the editor should
  apply against the engine
- `{type: "error", error}` — fatal failure for this turn
- `{type: "done"}` — provider finished streaming (always last)

A minimal provider only needs to emit `text` chunks and a final `done`.

## Built-in chat panel

`BasicCopilotPanel` is a minimal chat UI that consumes any `CopilotProvider`
through `useCopilot()`. Forks of the editor that don't ship StemStudio's
rich `AiCopilot` panel (which depends on the private ACP/Claude
integration) can render this instead:

```tsx
import {BasicCopilotPanel, CopilotContextProvider, OpenAICopilotProvider} from "@stem/copilot";

const provider = new OpenAICopilotProvider({apiKey: process.env.OPENAI_API_KEY});

<CopilotContextProvider provider={provider}>
    <BasicCopilotPanel title="Assistant" />
</CopilotContextProvider>;
```

It's intentionally style-light (single inline stylesheet, no design-system
dependency) so it works in any host. Wrap or replace it as needed.

## Built-in providers

### `EmptyCopilotProvider`

No-op. Mounted when no LLM is configured. Yields a single text chunk
explaining how to wire up a real provider, then `done`.

### `OpenAICopilotProvider`

Streams from any OpenAI-compatible `/v1/chat/completions` endpoint. Works
with:

- OpenAI proper (`https://api.openai.com/v1`)
- OpenRouter (any OpenRouter model that supports streaming)
- Local Ollama servers exposing `/v1`
- Anthropic via their OpenAI compatibility layer
- LiteLLM proxy, vLLM, etc.

Options:

| Option         | Default                          | Notes                          |
|----------------|----------------------------------|--------------------------------|
| `apiKey`       | _(required)_                     | Bearer token                   |
| `baseUrl`      | `https://api.openai.com/v1`      | Trailing `/` is stripped       |
| `model`        | `gpt-4o-mini`                    |                                |
| `systemPrompt` | _(none)_                         | Prepended to every conversation|
| `fetchImpl`    | `globalThis.fetch`               | Override for tests             |

This reference implementation is intentionally minimal — no tool calling,
no scene-mutation routing. Forks that want richer behavior should either
extend it or implement their own `CopilotProvider`.

## Building a custom provider

```typescript
import type {CopilotProvider, CopilotResponseChunk} from "@stem/copilot";

export class MyCopilot implements CopilotProvider {
    private connected = false;
    async connect() { this.connected = true; }
    async disconnect() { this.connected = false; }
    isConnected() { return this.connected; }
    async *sendMessage(message: string): AsyncIterable<CopilotResponseChunk> {
        yield {type: "text", text: `You said: ${message}`};
        yield {type: "done"};
    }
}
```

Mount it through `<CopilotContextProvider provider={new MyCopilot()}>`.

## Relationship to `@stem/copilot-stemstudio`

The StemStudio production builds use a private `@stem/copilot-stemstudio`
package that implements `CopilotProvider` over the StemStudio Agent
Client Protocol (ACP) + Claude Code. That package is **not** part of the
open-source distribution and depends on the private `stemstudio-copilot`
service.

The open-source editor falls back to `OpenAICopilotProvider` (or
`EmptyCopilotProvider` if no key is configured) at build time.
