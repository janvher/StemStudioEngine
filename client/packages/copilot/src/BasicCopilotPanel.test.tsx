/**
 * @vitest-environment jsdom
 */
import {render, screen, fireEvent, waitFor, act} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {BasicCopilotPanel} from "./BasicCopilotPanel";
import {CopilotContextProvider} from "./CopilotContext";
import {EmptyCopilotProvider} from "./EmptyCopilotProvider";
import type {CopilotProvider, CopilotResponseChunk} from "./types";

class FakeProvider implements CopilotProvider {
    private connected = false;
    private readonly chunks: CopilotResponseChunk[];

    constructor(chunks: CopilotResponseChunk[]) {
        this.chunks = chunks;
    }

    async connect() {
        this.connected = true;
    }

    async disconnect() {
        this.connected = false;
    }

    isConnected() {
        return this.connected;
    }

    async *sendMessage(): AsyncIterable<CopilotResponseChunk> {
        for (const chunk of this.chunks) {
            yield chunk;
        }
    }
}

describe("BasicCopilotPanel", () => {
    it("connects on mount and shows the empty-state hint", async () => {
        const provider = new EmptyCopilotProvider();
        render(
            <CopilotContextProvider provider={provider}>
                <BasicCopilotPanel />
            </CopilotContextProvider>,
        );

        await waitFor(() => expect(provider.isConnected()).toBe(true));
        expect(screen.getByText(/Send a message/)).toBeInTheDocument();
    });

    it("streams text chunks into the assistant message", async () => {
        const provider = new FakeProvider([
            {type: "text", text: "Hello"},
            {type: "text", text: ", world"},
            {type: "done"},
        ]);
        render(
            <CopilotContextProvider provider={provider}>
                <BasicCopilotPanel />
            </CopilotContextProvider>,
        );

        const input = screen.getByPlaceholderText("Ask the assistant…") as HTMLInputElement;
        await act(async () => {
            fireEvent.change(input, {target: {value: "hi"}});
            fireEvent.submit(input.closest("form")!);
        });

        await waitFor(() => expect(screen.getByText("Hello, world")).toBeInTheDocument());
        expect(screen.getByText("hi")).toBeInTheDocument();
    });

    it("renders error chunks with error styling", async () => {
        const provider = new FakeProvider([
            {type: "error", error: "API key missing"},
            {type: "done"},
        ]);
        render(
            <CopilotContextProvider provider={provider}>
                <BasicCopilotPanel />
            </CopilotContextProvider>,
        );

        const input = screen.getByPlaceholderText("Ask the assistant…") as HTMLInputElement;
        await act(async () => {
            fireEvent.change(input, {target: {value: "anything"}});
            fireEvent.submit(input.closest("form")!);
        });

        await waitFor(() => expect(screen.getByText("API key missing")).toBeInTheDocument());
    });
});
