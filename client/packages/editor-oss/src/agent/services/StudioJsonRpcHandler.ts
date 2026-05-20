import {CommandExecutionResult} from "../CommandsExecutor";
import {ServiceHandler} from "./ServiceHandler";
import {ACPEventType} from "../types/ACPTypes";

type CommandExecutor = {
    executeCommand(method: string, params: Record<string, unknown>): Promise<CommandExecutionResult>;
};

type EventEmitter = (eventType: ACPEventType, data: unknown) => void;

type JsonRpcSender = (payload: Record<string, unknown>) => void;

/**
 * Handles Studio-side JSON-RPC 2.0 message processing.
 */
export class StudioJsonRpcHandler implements ServiceHandler<string | Blob | ArrayBuffer, void> {
    constructor(
        private readonly executor: CommandExecutor,
        private readonly emit: EventEmitter,
        private readonly send: JsonRpcSender,
    ) {}

    async execute(data: string | Blob | ArrayBuffer): Promise<void> {
        try {
            const textData = await this.toText(data);
            const message = JSON.parse(textData);

            if (message.method && message.id !== undefined) {
                await this.handleRequest(message);
                return;
            }

            if (message.method) {
                this.emit("studioNotification", {method: message.method, params: message.params});
            }
        } catch (error) {
            console.error("[StudioACP] Failed to parse Studio message:", error);
        }
    }

    private async toText(data: string | Blob | ArrayBuffer): Promise<string> {
        if (typeof data === "string") {
            return data;
        }

        if (data instanceof Blob) {
            return data.text();
        }

        if (data instanceof ArrayBuffer) {
            return new TextDecoder().decode(data);
        }

        throw new Error(`Unsupported Studio message payload type: ${typeof data}`);
    }

    private async handleRequest(request: {
        method: string;
        params?: unknown;
        id: number;
    }): Promise<void> {
        const {method, params, id} = request;

        try {
            const result = await this.executor.executeCommand(method, (params as Record<string, unknown>) || {});

            const response = {
                jsonrpc: "2.0",
                id,
                result: result.success ? result.result : undefined,
                error: result.success
                    ? undefined
                    : {
                          code: -32603,
                          message: result.error || "Command execution failed",
                      },
            };

            this.send(response);
        } catch (error: unknown) {
            const err = error as {message?: string};
            this.send({
                jsonrpc: "2.0",
                id,
                error: {
                    code: -32603,
                    message: err.message || "Internal error",
                },
            });
        }
    }
}
