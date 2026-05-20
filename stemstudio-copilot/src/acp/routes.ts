/**
 * ACP (Agent Client Protocol) routes.
 *
 * WS  /claude/:sessionId — Claude ACP
 * WS  /codex/:sessionId  — OpenAI Codex ACP (experimental)
 *
 * A single WebSocket connection per session is multiplexed into two named
 * sub-streams using the `multiplex` package:
 *
 *   'acp' channel — raw ACP protocol frames piped to/from the agent runner
 *   'mcp' channel — JSON-RPC 2.0 proxy between the agent's REST skill calls
 *                   and StemStudio's scene engine (registered with StudioMcpProxy)
 *
 * Both channels share the same underlying TCP/WebSocket connection.
 */

import type { Application } from 'express-ws';
import type { Duplex } from 'node:stream';
import WebSocket from 'ws';
import express from 'express';
import websocketStream from 'websocket-stream';
import multiplex from 'multiplex';
import { runAcp as runClaudeAgent, runAcpWithUsageCallback as runClaudeAgentWithUsage } from './claude/claude-agent.js';
import { runCodexAgent } from './codex/codex-agent.js';
import { providerAvailability } from '../utils/provider-availability/index.js';
import { agentEvents } from '../utils/hooks/agent-events.js';
import { createLogger } from '../utils/logger.js';
import { recordSession } from '../utils/session/session-recorder.js';
import { verifyFirebaseTokenWs } from '../middleware/auth.js';
import { getUserAiCredits, decrementAiCredits } from '../firebase/credits.js';
import { StudioMcpProxy } from '../mcp/mcp_client_proxy.js';
import { BackupService } from '../backup/backup-service.js';

const log = createLogger('acp');

const CREDIT_FLUSH_THRESHOLD_TOKENS = 1000;

type AcpProvider = 'claude' | 'codex';

interface UsageInfo {
    inputTokens: number;
    outputTokens: number;
    totalCostUsd: number;
}

const ACP_PROVIDERS: Record<AcpProvider, {
    runFn: (streamIn: any, streamOut: any, studioSessionId?: string) => { signal: AbortSignal };
    runFnWithUsage?: (streamIn: any, streamOut: any, onUsage: (u: UsageInfo) => Promise<void>, studioSessionId?: string) => { signal: AbortSignal };
    providerName: string;
    model: string;
}> = {
    claude: {
        runFn: runClaudeAgent,
        runFnWithUsage: runClaudeAgentWithUsage,
        providerName: 'anthropic',
        model: 'claude-opus-4-6',
    },
    codex: {
        runFn: runCodexAgent,
        providerName: 'openai',
        model: 'gpt-5-codex',
    },
};

/**
 * Mount ACP WebSocket routes.
 * URL includes :sessionId so both the ACP agent and the MCP proxy channel
 * can be keyed to the same Studio session.
 */
export function mountAcpRoutes(app: Application): void {
    app.ws('/claude/:sessionId', createAcpHandler('claude'));
    // experimental
    app.ws('/codex/:sessionId', createAcpHandler('codex'));
}

function createAcpHandler(provider: AcpProvider) {
    const { runFn, runFnWithUsage, providerName, model } = ACP_PROVIDERS[provider];

    return async (ws: WebSocket, req: express.Request) => {
        const decodedToken = await verifyFirebaseTokenWs(ws, req);
        log.info('WebSocket connection attempt', { provider, userId: decodedToken?.uid ?? 'unauthenticated' });
        if (!decodedToken) {
            log.warn('Authentication failed', { provider });
            ws.close(401, 'Authentication failed');
            return;
        }

        const credits = await getUserAiCredits(decodedToken.uid);
        if (credits !== null && credits <= 0) {
            log.warn('User has no AI credits remaining', { user: decodedToken.uid, credits });
            ws.close(4003, 'Insufficient AI credits');
            return;
        }

        const sessionId = req.params.sessionId as string;
        log.info('Client connected', { provider, sessionId, credits: credits ?? 'unknown' });

        const startedAt = Date.now();
        const acpSessionId = `acp-${provider}-${Date.now()}`;

        req.setTimeout(1000 * 60 * 5, () => {
            log.warn('Connection timed out', { provider, sessionId });
        });

        // Wrap the raw WS in a duplex stream, then layer multiplex on top.
        // This gives us two independent sub-streams over one WebSocket connection.
        const rawStream = websocketStream(ws as any, {});
        const mplex = multiplex();
        rawStream.pipe(mplex).pipe(rawStream);

        const acpChannel = mplex.createSharedStream('acp');
        const mcpChannel = mplex.createSharedStream('mcp');

        // Register the mcp channel with the proxy so REST skill scripts can
        // forward JSON-RPC commands to Studio through this connection.
        StudioMcpProxy.getInstance().registerSession(sessionId, mcpChannel, () => {
            log.info('MCP channel cleanup triggered', { sessionId });
        });

        const wsStream = wrapWithLogging(acpChannel, provider, acpSessionId);

        let connectionClosed = false;
        const closeConnection = (code: number, reason: string) => {
            if (connectionClosed) return;
            connectionClosed = true;
            ws.close(code, reason);
            mplex.destroy();
        };

        ws.on('close', () => { connectionClosed = true; });
        ws.on('error', () => { connectionClosed = true; });

        let flushCredits: (force?: boolean) => Promise<void> = async () => {};

        rawStream.on('close', async () => {
            await flushCredits(true);
            await BackupService.getInstance().unregister(decodedToken.uid)
                .catch(err => log.error('Backup unregister failed on close', { uid: decodedToken.uid, error: String(err) }));
            StudioMcpProxy.getInstance().unregisterSession(sessionId);
        });
        rawStream.on('error', () => {
            StudioMcpProxy.getInstance().unregisterSession(sessionId);
        });

        agentEvents.emit('agentStart', { sessionId: acpSessionId, provider: providerName, path: 'acp' });

        wsStream.on('end', () => {
            const durationMs = Date.now() - startedAt;
            log.info('ACP stream ended', { provider, durationMs });
            providerAvailability.recordSuccess(providerName);
            agentEvents.emit('agentFinish', { sessionId: acpSessionId, provider: providerName, path: 'acp', durationMs });
            recordSession({
                sessionId: acpSessionId,
                startedAt,
                completedAt: Date.now(),
                durationMs,
                provider: providerName,
                model,
                path: 'acp',
            });
        });
        wsStream.on('close', () => {
            log.info('ACP stream closed', { provider });
            closeConnection(4005, 'Stale connection');
        });
        wsStream.on('error', (err) => {
            log.error('ACP stream error', { provider, error: err instanceof Error ? err.message : String(err) });
            providerAvailability.recordFailure(providerName);
        });

        let agent: { signal: AbortSignal };
        if (runFnWithUsage) {
            let bufferedInputTokens = 0;
            let bufferedOutputTokens = 0;
            let bufferedCostUsd = 0;

            flushCredits = async (force = false) => {
                const totalBuffered = bufferedInputTokens + bufferedOutputTokens;
                if (totalBuffered === 0) return;
                if (!force && totalBuffered < CREDIT_FLUSH_THRESHOLD_TOKENS) return;
                const [inp, out, cost] = [bufferedInputTokens, bufferedOutputTokens, bufferedCostUsd];
                bufferedInputTokens = 0;
                bufferedOutputTokens = 0;
                bufferedCostUsd = 0;
                try {
                    await decrementAiCredits(decodedToken.uid, inp, out);
                    const remaining = await getUserAiCredits(decodedToken.uid);
                    if (remaining !== null && remaining <= 0) {
                        log.warn('User ran out of AI credits during session', { user: decodedToken.uid });
                        closeConnection(4003, 'Insufficient AI credits');
                        return;
                    }
                    log.info('Usage flush', {
                        user: decodedToken.uid,
                        inputTokens: inp,
                        outputTokens: out,
                        totalCostUsd: cost.toFixed(4),
                    });
                } catch (e) {
                    log.error('Failed to decrement AI credits', { error: e instanceof Error ? e.message : String(e) });
                }
            };

            agent = runFnWithUsage(wsStream, wsStream, async ({ inputTokens, outputTokens, totalCostUsd }: UsageInfo) => {
                if (connectionClosed) return;
                bufferedInputTokens += inputTokens;
                bufferedOutputTokens += outputTokens;
                bufferedCostUsd += totalCostUsd;
                await flushCredits();
            }, sessionId);
        } else {
            agent = runFn(wsStream, wsStream, sessionId);
        }

        agent.signal.addEventListener('abort', () => {
            const durationMs = Date.now() - startedAt;
            log.info('Agent aborted — cleanup', { provider, durationMs });
            StudioMcpProxy.getInstance().unregisterSession(sessionId);
            closeConnection(1011, 'Agent transport aborted');
        });
    };
}

// ---------------------------------------------------------------------------
// Debug stream tap
// ---------------------------------------------------------------------------

const isDebug = (process.env.LOG_LEVEL || 'info') === 'debug';

function wrapWithLogging(stream: Duplex, provider: string, sessionId: string): Duplex {
    if (!isDebug) return stream;

    stream.on('data', (chunk: Buffer) => {
        log.debug('ACP ← client', { provider, sessionId, size: chunk.length, payload: chunk.toString('utf-8').slice(0, 2000) });
    });

    const origWrite = stream.write.bind(stream);
    stream.write = function (chunk: any, ...args: any[]) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        log.debug('ACP → client', { provider, sessionId, size: buf.length, payload: buf.toString('utf-8').slice(0, 2000) });
        return origWrite(chunk, ...args);
    } as typeof stream.write;

    return stream;
}
