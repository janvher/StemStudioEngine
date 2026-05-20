import {describe, expect, it} from "vitest";

import {OpenAICopilotProvider} from "./OpenAICopilotProvider";
import type {CopilotResponseChunk} from "./types";

function makeSseResponse(events: string[]): Response {
    const body = events.map(e => `data: ${e}\n`).join("") + "data: [DONE]\n";
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            controller.enqueue(encoder.encode(body));
            controller.close();
        },
    });
    return new Response(stream, {status: 200, headers: {"content-type": "text/event-stream"}});
}

async function collect(it: AsyncIterable<CopilotResponseChunk>): Promise<CopilotResponseChunk[]> {
    const out: CopilotResponseChunk[] = [];
    for await (const chunk of it) {
        out.push(chunk);
    }
    return out;
}

describe("OpenAICopilotProvider", () => {
    it("yields an error chunk when apiKey is missing", async () => {
        const provider = new OpenAICopilotProvider();
        const chunks = await collect(provider.sendMessage("hi", []));

        expect(chunks).toHaveLength(2);
        expect(chunks[0]).toMatchObject({type: "error"});
        expect(chunks[1]).toEqual({type: "done"});
    });

    it("streams text deltas from an OpenAI-compatible SSE response", async () => {
        const fetchImpl = async () =>
            makeSseResponse([
                JSON.stringify({choices: [{delta: {content: "Hello"}}]}),
                JSON.stringify({choices: [{delta: {content: ", world"}}]}),
                JSON.stringify({choices: [{delta: {}}]}),
            ]);

        const provider = new OpenAICopilotProvider({apiKey: "test-key", fetchImpl: fetchImpl as any});
        const chunks = await collect(provider.sendMessage("hi", []));

        expect(chunks).toEqual([
            {type: "text", text: "Hello"},
            {type: "text", text: ", world"},
            {type: "done"},
        ]);
    });

    it("surfaces HTTP errors as a single error chunk", async () => {
        const fetchImpl = async () =>
            new Response("nope", {status: 401, statusText: "Unauthorized"});

        const provider = new OpenAICopilotProvider({apiKey: "bad", fetchImpl: fetchImpl as any});
        const chunks = await collect(provider.sendMessage("hi", []));

        expect(chunks).toHaveLength(2);
        expect(chunks[0]).toMatchObject({type: "error", error: expect.stringContaining("HTTP 401")});
        expect(chunks[1]).toEqual({type: "done"});
    });

    it("prepends systemPrompt to the messages sent upstream", async () => {
        let captured: any = null;
        const fetchImpl = async (_url: string, init: RequestInit) => {
            captured = JSON.parse(init.body as string);
            return makeSseResponse([JSON.stringify({choices: [{delta: {content: "ok"}}]})]);
        };

        const provider = new OpenAICopilotProvider({
            apiKey: "k",
            systemPrompt: "Be terse.",
            fetchImpl: fetchImpl as any,
        });
        await collect(provider.sendMessage("hello", []));

        expect(captured.messages[0]).toEqual({role: "system", content: "Be terse."});
        expect(captured.messages.at(-1)).toEqual({role: "user", content: "hello"});
    });
});
