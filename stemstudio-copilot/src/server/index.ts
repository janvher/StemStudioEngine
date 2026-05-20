import express from "express";
import cors from "cors";
import expressWs from "express-ws";
import { mountAcpRoutes } from "../acp/routes.js";
import { mountMcpRoutes } from "../mcp/index.js";
import { vercelAiSDKRestAgentRouter } from "../vercel-rest/routes.js";
import { healthRouter } from "../health/routes.js";
import { pricingRouter } from "../pricing/index.js";
import { verifyFirebaseToken } from "../middleware/auth.js";
import { disableCacheMiddleware } from "../middleware/cache.js";
import { BackupService } from '../backup/backup-service.js';
import { validateBackupConfig } from '../utils/config.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('server');

export const initWebServices = () => {
    // Validate backup config — throws immediately if BACKUP_FS_ENABLED=true but BACKUP_FS_PATH is missing
    validateBackupConfig();

    // Start the periodic backup timer
    BackupService.getInstance();

    // Graceful shutdown: backup all active sessions before exit
    const handleShutdown = async (signal: string) => {
        log.info(`Received ${signal} — running final backup for all sessions...`);
        await BackupService.getInstance().shutdown();
        process.exit(0);
    };
    process.on('SIGTERM', () => { void handleShutdown('SIGTERM'); });
    process.on('SIGINT', () => { void handleShutdown('SIGINT'); });

    const exprs = express();
    const app = expressWs(exprs).app;

    app.disable('etag');

    // Default middlewares
    app.use(cors());
    app.use(express.json());
    app.use(disableCacheMiddleware);

    // Health / management routes
    app.use(healthRouter());

    // ACP endpoints — each route multiplexes ACP + MCP channels over one WebSocket:
    //   WS  /claude/:sessionId  — Claude agent (acp channel) + Studio proxy (mcp channel)
    //   WS  /codex/:sessionId   — Codex agent  (acp channel) + Studio proxy (mcp channel)
    mountAcpRoutes(app);

    // MCP REST proxy — JSON-RPC is tunnelled through the mcp multiplex channel;
    // only the REST read-command routes are mounted here.
    mountMcpRoutes(app);

    if (process.env.SUPPORT_VERCEL_AI_SDK === 'true') {
        app.use('/api/vercel-rest', vercelAiSDKRestAgentRouter());
    }

    app.use('/api/pricing', verifyFirebaseToken, pricingRouter());

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log('WS endpoints: /claude/:sessionId  /codex/:sessionId');
        console.log('Each WS multiplexes: acp (agent stream) | mcp (Studio JSON-RPC proxy)');
    });
};
