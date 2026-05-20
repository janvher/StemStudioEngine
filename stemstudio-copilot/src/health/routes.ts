import { Router } from 'express';
import { StudioMcpProxy } from '../mcp/mcp_client_proxy.js';

export function healthRouter(): Router {
    const router = Router();
    const proxy = StudioMcpProxy.getInstance();

    router.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            studio: {
                activeSessions: proxy.getActiveSessionCount(),
                sessions: proxy.getSessionsInfo(),
            },
        });
    });

    return router;
}
