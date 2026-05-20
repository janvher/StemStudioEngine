#!/usr/bin/env node

/**
 * Interactive ACP test client — connects to a running ACP agent and sends prompts.
 *
 * Runtime:  bun src/server/cli/client.ts <local|websocket> [ws-url]
 * Scripts:
 *   `bun run acp:test:local` — spawn Claude agent as a local subprocess (stdio)
 *   `bun run acp:test:ws`   — connect to ws://localhost:3000/claude over WebSocket
 *   `bun run acp:test:ws ws://localhost:3000/codex` — connect to Codex agent
 *
 * This is a development/testing tool, not a production entry point.
 * Requires the Express server to be running for WebSocket mode.
 */

import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {Readable, Writable} from "node:stream";
import readline, {createInterface} from "node:readline/promises";

import * as acp from "@agentclientprotocol/sdk";
import {Content, TextContent, ToolCallUpdate} from "@agentclientprotocol/sdk";
import WebSocketStream from "websocket-stream";

import {parse as jsonrpc_parse} from 'json-rpc-protocol';
import {trimAfterLastBrace} from "../../utils/string-helpers.js";

function stringifyUnknown(value: unknown): string {
    if (typeof value === "string") return value;
    try {
        const serialized = JSON.stringify(value);
        return serialized ?? "[unserializable]";
    } catch {
        return "[unserializable]";
    }
}

class ExampleClient implements acp.Client {
    extMethod?(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
        console.log(`[Client] Ext method called: ${method} ${stringifyUnknown(params)}`);
        return Promise.resolve({});
    }

    async requestPermission(
        params: acp.RequestPermissionRequest,
    ): Promise<acp.RequestPermissionResponse> {
        console.log(`\n🔐 Permission requested: ${params.toolCall.title}`);

        console.log(`\nOptions:`);
        params.options.forEach((option, index) => {
            console.log(`   ${index + 1}. ${option.name} (${option.kind})`);
        });

        while (true) {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });

            const answer = await rl.question("\nChoose an option: ");
            const trimmedAnswer = answer.trim();

            const optionIndex = parseInt(trimmedAnswer) - 1;
            if (optionIndex >= 0 && optionIndex < params.options.length) {
                return {
                    outcome: {
                        outcome: "selected",
                        optionId: params.options[optionIndex].optionId,
                    },
                };
            } else {
                console.log("Invalid option. Please try again.");
            }
        }
    }

    sessionUpdate(params: acp.SessionNotification): Promise<void> {
        const update = params.update;

        console.log(`sessionUpdate: ${update.sessionUpdate}`);
        switch (update.sessionUpdate) {
            case "agent_message_chunk":
                if (update.content.type === "text") {
                    console.log(update.content.text);
                } else {
                    console.log(`[${update.content.type}]`);
                }
                break;
            case "tool_call":
                console.log(`\n🔧 ${update.title} (${update.status})`);
                break;
            case "tool_call_update":
                console.log(
                    `\n🔧 Tool call \`${update.toolCallId}\` updated: ${update.status} ${stringifyUnknown((update as ToolCallUpdate).content)} ${stringifyUnknown((update as ToolCallUpdate)._meta)} ${stringifyUnknown((update as ToolCallUpdate).rawOutput)}\n`,
                    JSON.stringify(update)
                );

                const toolUpdate = (update as ToolCallUpdate);
                if (toolUpdate?.status === "completed" &&
                    toolUpdate?.content &&
                    toolUpdate?.content.length > 0 &&
                    toolUpdate?.content[0]?.type === "content" &&
                    (toolUpdate?.content[0] as Content).content.type === "text"
                ) {
                    const  content = ((toolUpdate?.content[0] as Content).content as TextContent).text;
                    try {
                        const callResult = jsonrpc_parse(trimAfterLastBrace(content));
                        console.log(`JSONRPC: ${JSON.stringify(callResult)}`);
                    } catch (e: any) {
                        console.error("ERROR: failed to parse tools output", content, e);
                    }
                }
                break;
            case "plan":
            case "agent_thought_chunk":
            case "user_message_chunk":
                console.log(`[${update.sessionUpdate}]`);
                break;
            default:
                break;
        }
        return Promise.resolve();
    }

    writeTextFile(
        params: acp.WriteTextFileRequest,
    ): Promise<acp.WriteTextFileResponse> {
        console.error(
            "[Client] Write text file called with:",
            JSON.stringify(params, null, 2),
        );

        return Promise.resolve({});
    }

    readTextFile(
        params: acp.ReadTextFileRequest,
    ): Promise<acp.ReadTextFileResponse> {
        console.error(
            "[Client] Read text file called with:",
            JSON.stringify(params, null, 2),
        );

        return Promise.resolve({
            content: "Mock file content",
        });
    }
}

async function readMultilineInput(promptText: string) {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });
    console.log(promptText);

    const lines: string[] = [];
    // Use a 'line' event listener to capture each line of input
    rl.on('line', (line) => {
        // If the line is empty (user just pressed Enter), the input is complete
        if (line.trim() === '') {
            rl.close(); // This will stop the input stream and resolve the promise implicitly
        } else {
            lines.push(line);
        }
    });

    // Since rl.on('line', ...) is an event handler, we need a way to wait
    // for the 'close' event to signal completion. The readline interface
    // itself is an async iterator, which can be used in a different pattern,
    // but for this specific event-based approach, a manual Promise works well.
    // A simpler way with the Promises API is to listen for the 'close' event.
    await new Promise((resolve) => rl.on('close', resolve));

    return lines.join('\n');
}

async function main(type: "websocket" | "local", args: string[] = []) {
    let input: WritableStream<any>;
    let output: ReadableStream<any>;
    switch (type) {
        case "local": {
            // Get the current file's directory to find agent.ts
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            const agentPath = join(__dirname, "../../../../node_modules/@zed-industries/standalone-code-acp/dist/index.js");

            // Spawn the agent as a subprocess using tsx
            const agentProcess = spawn("node", [agentPath], {
                stdio: ["pipe", "pipe", "inherit"],
            });

            // Create streams to communicate with the agent
            input = Writable.toWeb(agentProcess.stdin);
            output = Readable.toWeb(
                agentProcess.stdout,
            ) as ReadableStream<Uint8Array>;

            break;
        }
        case "websocket": {
            //acp
            const stream = WebSocketStream(args.length > 0 ? args[0] : "ws://localhost:3000/standalone");
            input = Writable.toWeb(stream);
            output = Readable.toWeb(stream);
            break;
        }
        default:
            throw new Error("ERROR: Unsupported connection type. Usage client <websocket|local> <ws url>");
    }
    // Create the client connection
    const client = new ExampleClient();
    const stream = acp.ndJsonStream(input, output);
    const connection = new acp.ClientSideConnection((_agent) => client, stream);

    while(true) {
        const prompt = "using stemstudio-3d skill change color of all wall objects"; //await readMultilineInput('Enter prompt: ');

        if (prompt.trim() === "q") {
            break;
        }

        console.log(`PROMPT: ${prompt}`);

        try {
            // Initialize the connection
            const initResult = await connection.initialize({
                protocolVersion: acp.PROTOCOL_VERSION,
                clientCapabilities: {
                    fs: {
                        readTextFile: true,
                        writeTextFile: true,
                    },
                },
                _meta: {
                    systemPrompt: {
                        append: ""
                    }
                }
            });

            console.log(
                `✅ Connected to agent (protocol v${initResult.protocolVersion})`,
            );

            // Create a new session
            const sessionResult = await connection.newSession({
                cwd: "/tmp", //process.cwd(),
                mcpServers: [/*{
                    type: "http",
                    name: "StemStudioMcpServer",
                    url: "http://localhost:3000/mcp",
                    headers: [
                        { name: "STUDIO_SCENE_ID", value: "123" }
                    ]
                } as McpServerHttp & {
                    type: "http";
                }*/],
            });

            console.log(`📝 Created session: ${sessionResult.sessionId}`);
            //console.log(`💬 User: Hello, agent!\n`);
            process.stdout.write(" ");

            // Send a test prompt
            const promptResult = await connection.prompt({
                sessionId: sessionResult.sessionId,
                prompt: [
                    {
                        type: "text",
                        text: prompt,
                    },
                ],
            });

            console.log(`\n\n✅ Agent completed with: ${promptResult.stopReason}`);
        } catch (error) {
            console.error("[Client] Error:", error);
        } finally {
            // agentProcess.kill();
            // process.exit(0);
        }
    }
}

main(process.argv[2] as "websocket"|"local", process.argv.slice(3)).catch(console.error);
