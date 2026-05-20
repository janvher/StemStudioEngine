import {CommandExecutionResult} from "../CommandsExecutor";
import {splitJsonObjects, stripMarkdownCodeFences} from "../utils/jsonParsing";
import {ServiceHandler} from "./ServiceHandler";
import {ACPEventType} from "../types/ACPTypes";

type CommandExecutor = {
    executeCommand(method: string, params: Record<string, unknown>): Promise<CommandExecutionResult>;
};

type EventEmitter = (eventType: ACPEventType, data: unknown) => void;

export interface ToolOutputPayload {
    text: string;
    status: string;
}

/**
 * Handles tool output parsing and execution of JSON-RPC commands emitted by the agent.
 */
export class ToolOutputHandler implements ServiceHandler<ToolOutputPayload, void> {
    constructor(
        private readonly executor: CommandExecutor,
        private readonly emit: EventEmitter,
    ) {}

    extractOutputText(update: any): string {
        const chunks: string[] = [];

        if (Array.isArray(update?.content)) {
            for (const entry of update.content) {
                const text = this.getTextFromEntry(entry);
                if (text) {
                    chunks.push(text);
                }
            }
        }

        // Only use fallback fields if content[] didn't produce anything.
        // rawOutput often duplicates content[] — collecting both causes
        // every JSONRPC command to execute twice (creating duplicate objects).
        if (chunks.length === 0) {
            const fallbackFields = [update?.rawOutput, update?.stderr, update?.stdout];
            for (const value of fallbackFields) {
                if (typeof value === "string" && value.trim() !== "") {
                    chunks.push(value);
                }
            }
        }

        if (chunks.length === 0) {
            return "";
        }

        const merged = chunks.join("\n");

        return merged;
    }

    async execute({text, status}: ToolOutputPayload): Promise<void> {
        if (!text || text.trim() === "") {
            return;
        }

        const trimmed = text.trim();
        const hasJsonRpc = trimmed.includes('"jsonrpc"');

        if (!hasJsonRpc) {
            if (status === "completed") {
                this.emit("toolOutput", {output: text});
            }
            return;
        }

        // Strip markdown code fences that Claude may wrap around JSONRPC output.
        const cleaned = stripMarkdownCodeFences(trimmed);
        // Support mixed output: warnings/logs + one or more JSONRPC objects.
        const jsonObjects = splitJsonObjects(cleaned).filter(json => json.includes('"jsonrpc"'));

        if (jsonObjects.length === 0) {
            if (status === "completed") {
                this.emit("toolOutput", {output: text});
            }
            return;
        }

        for (let index = 0; index < jsonObjects.length; index++) {
            const jsonText = jsonObjects[index];
            if (!jsonText) continue;
            try {
                const jsonRpcCommand = JSON.parse(jsonText);

                if (!jsonRpcCommand.jsonrpc || !jsonRpcCommand.method) {
                    console.warn("[StudioACP] Invalid JSONRPC structure:", jsonRpcCommand);
                    this.emit("toolOutput", {output: jsonText});
                    continue;
                }

                this.emit("commandWillExecute", {
                    command: jsonRpcCommand.method,
                    params: jsonRpcCommand.params,
                    index,
                    total: jsonObjects.length,
                });

                const result = await this.executor.executeCommand(jsonRpcCommand.method, jsonRpcCommand.params || {});

                if (result.success) {
                    this.emit("commandExecuted", {
                        command: jsonRpcCommand.method,
                        params: jsonRpcCommand.params,
                        index,
                        total: jsonObjects.length,
                        result: result.result,
                    });
                    continue;
                }

                console.error(
                    `[StudioACP][ToolOutput] JSONRPC failed: method=${jsonRpcCommand.method} id=${jsonRpcCommand.id ?? "n/a"} error=${result.error}`,
                );
                this.emit("commandExecutionFailed", {
                    command: jsonRpcCommand.method,
                    params: jsonRpcCommand.params,
                    index,
                    total: jsonObjects.length,
                    error: result.error,
                });
            } catch (error) {
                console.error("[StudioACP] Failed to parse JSONRPC:", error, "\nText:", jsonText);
                this.emit("toolOutput", {output: jsonText});
            }
        }
    }

    private getTextFromEntry(entry: any): string {
        if (!entry) {
            return "";
        }

        const contentText = entry?.content?.text;
        if (typeof contentText === "string" && contentText.trim() !== "") {
            return contentText;
        }

        if (typeof entry?.content === "string" && entry.content.trim() !== "") {
            return entry.content;
        }

        if (typeof entry?.rawOutput === "string" && entry.rawOutput.trim() !== "") {
            return entry.rawOutput;
        }

        if (typeof entry?.stderr === "string" && entry.stderr.trim() !== "") {
            return entry.stderr;
        }

        if (typeof entry?.stdout === "string" && entry.stdout.trim() !== "") {
            return entry.stdout;
        }

        return "";
    }
}
