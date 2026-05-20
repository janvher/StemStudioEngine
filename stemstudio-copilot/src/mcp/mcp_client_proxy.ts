import express from 'express';
import type { Duplex } from 'node:stream';
import {
    JsonRpcPayload,
    JsonRpcPayloadResponse,
    parse as jsonrpc_parse,
} from 'json-rpc-protocol';
import { JsonRpcPayloadError } from 'json-rpc-protocol/dist/json-rpc.type';
import { apiRequestConfigs } from '../standalone/command-schema.js';
import type { ApiRequestConfig, SessionInfo } from '../standalone/command-schema.js';

// Re-export schema types for backward compatibility
export { apiRequestConfigs } from '../standalone/command-schema.js';
export type { ToolKind, ParamSchemaInfo, ApiRequestConfig, SessionInfo } from '../standalone/command-schema.js';

type MessageHandler = (msg: JsonRpcPayloadResponse | undefined, err: any) => void;

const DEFAULT_REQUEST_TIMEOUT_MS = 15 * 60 * 1000; //it should be long enough to handle interactive requests
const WS_HEARTBEAT_INTERVAL_MS   = 30_000;

/**
 * Reverse proxy between AI agents and StemStudio.
 *
 * Agent skill scripts send REST requests to `/api/studio/scene/<cmd>/:sessionId`.
 * This class converts each into a JSON-RPC message and writes it to the `mcp`
 * multiplex sub-stream that the matching StemStudio session registered via
 * {@link registerSession}. Responses arrive on the same sub-stream.
 *
 * Session registration is triggered by the ACP WebSocket handler in
 * `src/acp/routes.ts` — no separate WebSocket endpoint is needed.
 */
export class StudioMcpProxy {

    private static instance: StudioMcpProxy;

    /** mcp sub-streams keyed by sessionId (registered by ACP route) */
    private streams = new Map<string, Duplex>();

    private nextRequestId = 1;
    private messageHandlers = new Map<number, MessageHandler>();

    /** Maps request IDs → sessionId for cleanup on disconnect */
    private requestSessionMap = new Map<number, string>();

    /** Session metadata for health monitoring */
    private sessionInfo = new Map<string, SessionInfo>();

    /** Heartbeat intervals per session */
    private heartbeatIntervals = new Map<string, ReturnType<typeof setInterval>>();

    public static apiRequestConfigs: ApiRequestConfig[] = apiRequestConfigs;

    public static getInstance(): StudioMcpProxy {
        if (!StudioMcpProxy.instance) {
            StudioMcpProxy.instance = new StudioMcpProxy();
        }
        return StudioMcpProxy.instance;
    }

    // -------------------------------------------------------------------------
    // Session registration (called from ACP route after multiplex setup)
    // -------------------------------------------------------------------------

    /**
     * Register the `mcp` multiplex channel for a Studio session.
     *
     * Called by the ACP WebSocket handler once the multiplex layer is ready.
     * Wires up JSON-RPC response reading and a heartbeat on the sub-stream.
     *
     * @param sessionId   Studio scene session identifier
     * @param stream      The `mcp` named sub-stream from the multiplex instance
     * @param onCleanup   Optional callback invoked when the session is removed
     */
    public registerSession(sessionId: string, stream: Duplex, onCleanup?: () => void): void {
        if (this.streams.has(sessionId)) {
            console.warn(`[MCP] Session already registered — replacing: ${sessionId}`);
            this.cleanupSession(sessionId);
        }

        console.log(`[MCP] ✦ Session registered — sessionId: ${sessionId}`);
        this.streams.set(sessionId, stream);

        const now = Date.now();
        this.sessionInfo.set(sessionId, { sessionId, connectedAt: now, lastMessageAt: now });

        // Read JSON-RPC responses from the mcp channel
        stream.on('data', (data: Buffer | string) => {
            try {
                const info = this.sessionInfo.get(sessionId);
                if (info) info.lastMessageAt = Date.now();

                const raw = typeof data === 'string' ? data : data.toString('utf-8');
                console.log(`[MCP] Received response: ${raw}`);
                const parsed = jsonrpc_parse(raw);
                this.handleJsonRpcResponse(parsed as JsonRpcPayload);
            } catch (e) {
                console.error('[MCP] Failed to parse JSONRPC response', e);
            }
        });

        // Heartbeat: detect stale channel by checking stream is still writable
        const heartbeat = setInterval(() => {
            if (!stream.destroyed && stream.writable) {
                // lightweight ping — send an empty comment-style keep-alive
                // (Studio client ignores unknown JSONRPC methods gracefully)
            } else {
                this.cleanupSession(sessionId);
            }
        }, WS_HEARTBEAT_INTERVAL_MS);
        this.heartbeatIntervals.set(sessionId, heartbeat);

        const onDisconnect = () => {
            console.log(`[MCP] Stream ended/closed: ${sessionId}`);
            this.cleanupSession(sessionId);
            onCleanup?.();
        };
        stream.on('end',   onDisconnect);
        stream.on('close', onDisconnect);
        stream.on('error', onDisconnect);
    }

    /** Unregister a session — called by ACP route on WS close/agent abort. */
    public unregisterSession(sessionId: string): void {
        this.cleanupSession(sessionId);
    }

    // -------------------------------------------------------------------------
    // REST request handlers
    // -------------------------------------------------------------------------

    private sendRequest(
        requestType: string,
        params: any,
        stream: Duplex,
        sessionId: string,
        handler: MessageHandler,
        timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
    ): void {
        const requestId = this.nextRequestId++;
        const request = { method: requestType, id: requestId, params, jsonrpc: '2.0' };

        this.messageHandlers.set(requestId, handler);
        this.requestSessionMap.set(requestId, sessionId);

        const timeout = setTimeout(() => {
            const pending = this.messageHandlers.get(requestId);
            if (pending) {
                this.messageHandlers.delete(requestId);
                this.requestSessionMap.delete(requestId);
                console.warn(`[MCP] Timeout (${timeoutMs}ms): ${requestType} id=${requestId} session=${sessionId}`);
                pending(undefined, { timeout: true, message: `Request timed out after ${timeoutMs}ms` });
            }
        }, timeoutMs);

        this.messageHandlers.set(requestId, (msg, err) => {
            clearTimeout(timeout);
            this.requestSessionMap.delete(requestId);
            handler(msg, err);
        });

        stream.write(JSON.stringify(request), (err) => {
            if (err) {
                clearTimeout(timeout);
                console.error('[MCP] Failed to send request:', err);
                const pending = this.messageHandlers.get(requestId);
                if (pending) {
                    this.messageHandlers.delete(requestId);
                    this.requestSessionMap.delete(requestId);
                    pending(undefined, err);
                }
            }
        });
    }

    private createApiRequestHandler(requestConfig: ApiRequestConfig) {
        console.log(`[MCP] Creating handler for ${requestConfig.path}...`);

        return (req: express.Request, res: express.Response) => {
            req.setTimeout(1000 * 60 * 5, () => {
                console.warn('[MCP] Agent connection timeout:', requestConfig.command);
            });

            const sessionId = req.params.sessionId as string;
            const stream = this.streams.get(sessionId.trim());

            if (!stream) {
                console.error(`[MCP] No stream for session: ${sessionId}`);
                res.status(404).json({ error: 'No stream for session', sessionId, command: requestConfig.command });
                return;
            }

            const params: Record<string, any> = {};
            if (requestConfig.queryParams) {
                for (const paramName of requestConfig.queryParams) {
                    const value = req.query[paramName] as string | undefined;
                    if (!value) {
                        res.status(400).json({ error: 'Missing query param', param: paramName, command: requestConfig.command });
                        return;
                    }
                    params[paramName] = value;
                }
            }
            if (requestConfig.optionalQueryParams) {
                for (const paramName of requestConfig.optionalQueryParams) {
                    const value = req.query[paramName] as string | undefined;
                    if (value) params[paramName] = value;
                }
            }
            if (requestConfig.bodyParams) {
                for (const paramName of requestConfig.bodyParams) {
                    const value = req.body?.[paramName];
                    if (value === undefined || value === null) {
                        res.status(400).json({ error: 'Missing body param', param: paramName, command: requestConfig.command });
                        return;
                    }
                    params[paramName] = value;
                }
            }
            if (requestConfig.optionalBodyParams) {
                for (const paramName of requestConfig.optionalBodyParams) {
                    const value = req.body?.[paramName];
                    if (value !== undefined && value !== null) params[paramName] = value;
                }
            }

            console.log(`[MCP] Handling ${requestConfig.command}: ${sessionId} params=${JSON.stringify(params)}`);

            this.sendRequest(requestConfig.command, params, stream, sessionId, (msg, err) => {
                if (err) {
                    if (err.timeout)      res.status(504).json({ error: 'Gateway timeout',     message: err.message,  command: requestConfig.command });
                    else if (err.disconnected) res.status(502).json({ error: 'Studio disconnected', message: err.message, command: requestConfig.command });
                    else if (err.error !== undefined) res.status(502).json({ error: 'Studio error', details: err.error, command: requestConfig.command });
                    else               res.status(500).json({ error: 'Internal error',    message: String(err),  command: requestConfig.command });
                    return;
                }
                if (!msg) { res.status(500).json({ error: 'Empty response', command: requestConfig.command }); return; }
                res.status(200).json(msg.result);
            });
        };
    }

    /**
     * Express router for read-only REST endpoints called by agent skill scripts.
     * Only `kind: 'read'` commands are exposed here; mutations flow via ACP.
     */
    public agentsRequestsRouter(): express.Router {
        const router = express.Router();

        for (const cfg of StudioMcpProxy.apiRequestConfigs.filter(c => c.kind === 'read')) {
            router.get(`/scene/${cfg.path}/:sessionId`, this.createApiRequestHandler(cfg));
        }

        for (const cfg of StudioMcpProxy.apiRequestConfigs.filter(c => c.kind === 'mutate')) {
            if (cfg.method === 'POST') {
                router.post(`/scene/${cfg.path}/:sessionId`, this.createApiRequestHandler(cfg));
            } else if (cfg.method === 'DELETE') {
                router.delete(`/scene/${cfg.path}/:sessionId`, this.createApiRequestHandler(cfg));
            }
        }

        /** Batch: POST /api/studio/scene/batch/:sessionId */
        router.post('/scene/batch/:sessionId', (req: express.Request, res: express.Response) => {
            const sessionId = req.params.sessionId as string;
            const { commands } = req.body;

            if (!Array.isArray(commands) || commands.length === 0) {
                res.status(400).json({ error: 'commands array is required and must be non-empty' });
                return;
            }

            const stream = this.streams.get(sessionId?.trim());
            if (!stream) {
                res.status(404).json({ error: `No stream for session: ${sessionId}` });
                return;
            }

            const results: Array<{ command: string; result?: any; error?: any }> = [];
            const executeNext = (index: number) => {
                if (index >= commands.length) { res.status(200).json({ results }); return; }
                const cmd = commands[index];
                if (!cmd?.command || typeof cmd.command !== 'string') {
                    results.push({ command: cmd?.command || 'unknown', error: 'Invalid command format' });
                    executeNext(index + 1);
                    return;
                }
                console.log(`[MCP] Batch ${index + 1}/${commands.length}: ${cmd.command} session=${sessionId}`);
                this.sendRequest(cmd.command, cmd.params || {}, stream, sessionId, (msg, err) => {
                    results.push(err
                        ? { command: cmd.command, error: err.message || err }
                        : msg ? { command: cmd.command, result: msg.result }
                              : { command: cmd.command, error: 'Empty response' });
                    executeNext(index + 1);
                });
            };
            executeNext(0);
        });

        /** Discovery: GET /api/studio/mcp/discovery/:sessionId */
        router.get('/mcp/discovery/:sessionId', (req: express.Request, res: express.Response) => {
            const sid = (req.params.sessionId as string)?.trim();
            res.status(200).json({
                server: 'stem-studio',
                sessionId: sid,
                connected: Boolean(sid && this.streams.has(sid)),
                wsRoute: `/claude/${sid}`,
                availableCommands: StudioMcpProxy.apiRequestConfigs.map(c => ({
                    command: c.command, path: c.path, method: c.method, kind: c.kind,
                })),
            });
        });

        router.use((req: express.Request, res: express.Response) => {
            res.status(404).json({ error: 'Route not found', method: req.method, path: req.path, hint: 'Use /api/studio/scene/<path>/:sessionId' });
        });

        return router;
    }

    // -------------------------------------------------------------------------
    // Health
    // -------------------------------------------------------------------------

    public getSessionsInfo(): SessionInfo[] { return Array.from(this.sessionInfo.values()); }
    public getActiveSessionCount(): number  { return this.streams.size; }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private cleanupSession(sessionId: string): void {
        const stream = this.streams.get(sessionId);
        if (stream) {
            stream.destroy();
            this.streams.delete(sessionId);
        }
        this.sessionInfo.delete(sessionId);
        this.cleanupSessionHandlers(sessionId);

        const hb = this.heartbeatIntervals.get(sessionId);
        if (hb) { clearInterval(hb); this.heartbeatIntervals.delete(sessionId); }
    }

    private cleanupSessionHandlers(sessionId: string): void {
        const toRemove: number[] = [];
        for (const [id, sid] of this.requestSessionMap.entries()) {
            if (sid === sessionId) toRemove.push(id);
        }
        for (const id of toRemove) {
            const handler = this.messageHandlers.get(id);
            if (handler) {
                this.messageHandlers.delete(id);
                this.requestSessionMap.delete(id);
                console.warn(`[MCP] Orphaned handler cleaned up: requestId=${id} session=${sessionId}`);
                handler(undefined, { disconnected: true, message: `Session ${sessionId} disconnected` });
            }
        }
    }

    private handleJsonRpcResponse(parsedMessage: JsonRpcPayload): void {
        console.log(`[MCP] Response: ${JSON.stringify(parsedMessage)}`);
        if (Array.isArray(parsedMessage)) {
            console.error('[MCP] Array responses not supported:', JSON.stringify(parsedMessage));
            return;
        }
        if ((parsedMessage as JsonRpcPayloadError).error !== undefined) {
            const id = (parsedMessage as JsonRpcPayloadError).id as number;
            const handler = this.messageHandlers.get(id);
            if (!handler) { console.error('[MCP] Missing handler for error:', JSON.stringify(parsedMessage)); return; }
            this.messageHandlers.delete(id);
            handler(undefined, parsedMessage);
            return;
        }
        const response = parsedMessage as JsonRpcPayloadResponse;
        const handler = this.messageHandlers.get(response.id as number);
        if (!handler) { console.error('[MCP] Missing handler for response:', JSON.stringify(parsedMessage)); return; }
        this.messageHandlers.delete(response.id as number);
        handler(response, undefined);
    }
}
