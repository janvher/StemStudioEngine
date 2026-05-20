/**
 * Studio MCP proxy routes.
 *
 * Bridges AI agent skill scripts and the StemStudio frontend via
 * StudioMcpProxy (JSON-RPC 2.0).
 *
 * REST  /api/studio/scene/<command>/:sessionId — read-only endpoints + batch,
 *       called by agent Python skill scripts.
 *
 * The JSON-RPC channel to Studio is no longer a standalone WebSocket endpoint.
 * It arrives as the `mcp` named sub-stream from the multiplex layer on the ACP
 * connection (`/claude/:sessionId`). StudioMcpProxy.registerSession() is called
 * from `src/acp/routes.ts` once the multiplex is ready.
 */

import type { Application } from 'express-ws';
import { StudioMcpProxy } from './mcp_client_proxy.js';

export function mountMcpRoutes(app: Application): void {
    const proxy = StudioMcpProxy.getInstance();

    // REST API — agent skill scripts call these to read scene state.
    // Proxy forwards them as JSON-RPC over the session's mcp multiplex channel.
    app.use('/api/studio', proxy.agentsRequestsRouter());
}
