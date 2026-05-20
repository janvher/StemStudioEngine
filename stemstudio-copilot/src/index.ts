/**
 * Main entry point — starts the Express server with all routes.
 *
 * Runtime:  bun src/index.ts
 * Scripts:  `bun run start`, `bun run dev` (watch mode)
 *
 * Mounts:
 *   WS  /claude              — Claude ACP agent
 *   WS  /codex               — Codex ACP agent (experimental)
 *   *   /api/studio/*        — MCP proxy (REST + WS to Studio 3D)
 *   *   /api/vercel-rest/*   — Provider-agnostic AI agent (REST)
 *   *   /api/pricing/*       — Token estimation / pricing
 *   GET /health              — Health check
 *
 * See src/server/index.ts for route wiring.
 */

import { config as envConfig } from 'dotenv';
import { initWebServices } from './server';

envConfig();

// Prevent silent crashes from un-awaited async errors in ACP SDK integrations.
process.on('unhandledRejection', (reason) => {
    console.error('[FATAL] Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught exception:', err);
    process.exit(1);
});

console.log('Starting ACP/Proxy Server...');

initWebServices();
