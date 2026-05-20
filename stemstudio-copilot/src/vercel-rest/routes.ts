/**
 * Provider-agnostic HTTP endpoint for the AI agent.
 * Complements the Claude-specific ACP WebSocket route at /standalone.
 *
 * POST /api/vercel-rest/query — Run agent with any configured provider
 * POST /api/vercel-rest/stream — Streaming variant
 * GET  /api/vercel-rest/providers — List available providers
 */

import express from 'express';
import { runAgent, runAgentStream } from './agent.js';
import { getAvailableProviders, getDefaultModel, resolveThinkingConfig } from './provider-config.js';
import { providerAvailability } from '../utils/provider-availability/index.js';
import { createLogger } from '../utils/logger.js';
import { getRecentSessions, getSessionStats } from '../utils/session/session-recorder.js';

const log = createLogger('routes');

export function vercelAiSDKRestAgentRouter() {
    const router = express.Router();

    /**
     * POST /api/vercel-rest/query
     * Body: { prompt, provider?, model?, sessionId, messages? }
     * Returns: AgentResult JSON
     */
    router.post('/query', async (req, res) => {
        const {
            prompt,
            provider,
            model,
            sessionId,
            messages,
            systemPrompt,
            systemPromptMode,
            allowWebResearch,
            thinking,
            thinkingModel,
            thinkingBudget,
            options,
        } = req.body;
        const clientSystemPrompt = systemPrompt ?? options?.systemPrompt;
        const clientSystemPromptMode = systemPromptMode ?? options?.systemPromptMode;

        if (!prompt && !messages) {
            res.status(400).json({ error: 'Either prompt or messages is required' });
            return;
        }
        if (!sessionId) {
            res.status(400).json({ error: 'sessionId is required' });
            return;
        }

        try {
            const result = await runAgent(prompt || '', {
                provider,
                model,
                sessionId,
                messages,
                systemPrompt: clientSystemPrompt,
                systemPromptMode: clientSystemPromptMode,
                webResearchEnabled: allowWebResearch,
                thinking,
                thinkingModel,
                thinkingBudget,
            });

            res.status(200).json(result);
        } catch (err) {
            log.error('Agent error', { error: err instanceof Error ? err.message : String(err) });
            const message = err instanceof Error ? err.message : String(err);
            res.status(500).json({ error: 'Agent execution failed', message });
        }
    });

    /**
     * POST /api/vercel-rest/stream
     * Body: { prompt, provider?, model?, sessionId, messages?, allowWebResearch? }
     * Returns: Server-Sent Events stream of text deltas
     */
    router.post('/stream', async (req, res) => {
        const {
            prompt,
            provider,
            model,
            sessionId,
            messages,
            systemPrompt,
            systemPromptMode,
            allowWebResearch,
            thinking,
            thinkingModel,
            thinkingBudget,
            options,
        } = req.body;
        const clientSystemPrompt = systemPrompt ?? options?.systemPrompt;
        const clientSystemPromptMode = systemPromptMode ?? options?.systemPromptMode;

        if (!prompt && !messages) {
            res.status(400).json({ error: 'Either prompt or messages is required' });
            return;
        }
        if (!sessionId) {
            res.status(400).json({ error: 'sessionId is required' });
            return;
        }

        try {
            const stream = await runAgentStream(prompt || '', {
                provider,
                model,
                sessionId,
                messages,
                systemPrompt: clientSystemPrompt,
                systemPromptMode: clientSystemPromptMode,
                webResearchEnabled: allowWebResearch,
                thinking,
                thinkingModel,
                thinkingBudget,
            });

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const textStream = stream.textStream;
            for await (const chunk of textStream) {
                res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
            }

            res.write(`data: [DONE]\n\n`);
            res.end();
        } catch (err) {
            log.error('Stream error', { error: err instanceof Error ? err.message : String(err) });
            const message = err instanceof Error ? err.message : String(err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Agent stream failed', message });
            } else {
                res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
                res.end();
            }
        }
    });

    /**
     * GET /api/vercel-rest/providers
     * Returns: List of available providers with their default models
     */
    router.get('/providers', (_req, res) => {
        const available = getAvailableProviders();
        const providers = available.map((name) => ({
            name,
            defaultModel: getDefaultModel(name),
            configured: true,
        }));

        const thinkingConfig = resolveThinkingConfig();

        res.status(200).json({
            providers,
            defaultProvider: process.env.AI_PROVIDER || 'anthropic',
            defaultModel: process.env.AI_MODEL || undefined,
            fallbackChain: (process.env.AI_FALLBACK_PROVIDERS || '').split(',').filter(Boolean),
            availability: providerAvailability.getStatus(),
            thinking: {
                enabled: thinkingConfig.enabled,
                model: thinkingConfig.model,
                budgetTokens: thinkingConfig.budgetTokens,
            },
        });
    });

    /**
     * GET /api/vercel-rest/sessions
     * Returns: Recent session records
     */
    router.get('/sessions', (req, res) => {
        const limit = parseInt(req.query.limit as string) || 20;
        res.status(200).json({ sessions: getRecentSessions(limit) });
    });

    /**
     * GET /api/vercel-rest/stats
     * Returns: Aggregate session statistics
     */
    router.get('/stats', (_req, res) => {
        res.status(200).json(getSessionStats());
    });

    return router;
}
