/**
 * Token pricing data, cost estimation utilities, and Express router.
 *
 * Prices are in USD per 1 million tokens (input/output).
 * Source: provider pricing pages (as of 2026-02).
 *
 * Intentionally standalone — no dependency on src/vercel-rest/.
 */

import express from 'express';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TokenPricing = {
    inputPerMillion: number;
    outputPerMillion: number;
};

export type CostEstimate = {
    provider: string;
    model: string;
    inputTokens: number;
    tokenCountMethod: 'api' | 'estimate';
    pricing: (TokenPricing & { currency: 'USD' }) | null;
    estimatedCost: { inputUSD: number } | null;
};

// ---------------------------------------------------------------------------
// Provider defaults and key resolution (standalone, mirrors provider-config)
// ---------------------------------------------------------------------------

const DEFAULT_MODELS: Record<string, string> = {
    anthropic: 'claude-sonnet-4-5-20250929',
    openai: 'gpt-4o',
    codex: 'gpt-5-codex',
    google: 'gemini-2.0-flash',
    zhipu: 'glm-4',
    minimax: 'minimax-m2',
};

const API_KEY_ENV: Record<string, string[]> = {
    anthropic: ['ANTHROPIC_API_KEY'],
    openai: ['OPENAI_API_KEY'],
    codex: ['OPENAI_CODEX_API_KEY', 'OPENAI_API_KEY'],
    google: ['GOOGLE_API_KEY'],
    zhipu: ['GLM_API_KEY'],
    minimax: ['MINIMAX_API_KEY'],
};

function resolveProvider(requestProvider?: string): string {
    return requestProvider || process.env.AI_PROVIDER || 'anthropic';
}

function resolveModel(provider: string, requestModel?: string): string {
    return requestModel || process.env.AI_MODEL || DEFAULT_MODELS[provider] || '';
}

function resolveApiKey(provider: string): string {
    const envVars = API_KEY_ENV[provider] ?? [];
    for (const v of envVars) {
        if (process.env[v]) return process.env[v];
    }
    return '';
}

// ---------------------------------------------------------------------------
// Pricing table
// ---------------------------------------------------------------------------

/** Pricing per model in USD / 1M tokens. Unknown models return null. */
export const MODEL_PRICING: Record<string, TokenPricing> = {
    // Anthropic
    'claude-sonnet-4-5-20250929': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
    'claude-sonnet-4-6': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
    'claude-opus-4-6': { inputPerMillion: 15.0, outputPerMillion: 75.0 },
    'claude-haiku-4-5-20251001': { inputPerMillion: 0.8, outputPerMillion: 4.0 },
    'claude-haiku-4-5': { inputPerMillion: 0.8, outputPerMillion: 4.0 },
    // OpenAI
    'gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10.0 },
    'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
    'gpt-4-turbo': { inputPerMillion: 10.0, outputPerMillion: 30.0 },
    'gpt-4-turbo-preview': { inputPerMillion: 10.0, outputPerMillion: 30.0 },
    // Google
    'gemini-2.0-flash': { inputPerMillion: 0.1, outputPerMillion: 0.4 },
    'gemini-2.0-pro': { inputPerMillion: 1.25, outputPerMillion: 10.0 },
    'gemini-1.5-pro': { inputPerMillion: 1.25, outputPerMillion: 5.0 },
    'gemini-1.5-flash': { inputPerMillion: 0.075, outputPerMillion: 0.3 },
    // Zhipu GLM
    'glm-4': { inputPerMillion: 0.14, outputPerMillion: 0.14 },
    'glm-4-flash': { inputPerMillion: 0.0, outputPerMillion: 0.0 },
    // MiniMax
    'minimax-m2': { inputPerMillion: 0.3, outputPerMillion: 1.1 },
};

export function getPricing(model: string): TokenPricing | null {
    return MODEL_PRICING[model] ?? null;
}

export function calculateInputCost(inputTokens: number, pricing: TokenPricing): number {
    return (inputTokens / 1_000_000) * pricing.inputPerMillion;
}

// ---------------------------------------------------------------------------
// Token counting
// ---------------------------------------------------------------------------

/** Rough token estimate: ~4 chars per token (UTF-8 byte length / 4). */
export function estimateInputTokens(text: string): number {
    return Math.ceil(Buffer.byteLength(text, 'utf-8') / 4);
}

/**
 * Count tokens via the Anthropic token-counting API.
 * Returns null on any failure — caller falls back to local estimate.
 */
export async function countTokensAnthropic(
    apiKey: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string,
): Promise<number | null> {
    try {
        const body: Record<string, unknown> = { model, messages };
        if (systemPrompt) body.system = systemPrompt;

        const response = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) return null;
        const data = (await response.json()) as { input_tokens?: number };
        return data.input_tokens ?? null;
    } catch {
        return null;
    }
}

/**
 * Convert Vercel AI SDK ModelMessage array (or a plain prompt string) to
 * Anthropic-compatible { role, content: string } pairs.
 */
export function toAnthropicMessages(
    prompt: string | undefined,
    messages: Array<{ role: string; content: unknown }> | undefined,
): Array<{ role: string; content: string }> {
    if (messages && messages.length > 0) {
        return messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({
                role: m.role as 'user' | 'assistant',
                content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
            }));
    }
    return [{ role: 'user', content: prompt ?? '' }];
}

/** Flatten prompt + messages + systemPrompt into a single string for local estimation. */
export function buildTextForEstimate(
    prompt: string | undefined,
    messages: Array<{ role: string; content: unknown }> | undefined,
    systemPrompt: string | undefined,
): string {
    const parts: string[] = [];
    if (systemPrompt) parts.push(systemPrompt);
    if (messages && messages.length > 0) {
        for (const m of messages) {
            parts.push(typeof m.content === 'string' ? m.content : JSON.stringify(m.content));
        }
    } else if (prompt) {
        parts.push(prompt);
    }
    return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Express router
// ---------------------------------------------------------------------------

/**
 * POST /estimate-cost
 * Body: { prompt?, messages?, provider?, model?, systemPrompt? }
 * Returns: token count + estimated input cost in USD.
 *
 * For Anthropic: uses /v1/messages/count_tokens API (exact).
 * For other providers: uses the local ~4-chars/token heuristic.
 */
export function pricingRouter() {
    const router = express.Router();

    router.post('/estimate-cost', async (req, res) => {
        const { prompt, messages, provider: reqProvider, model: reqModel, systemPrompt } = req.body;

        if (!prompt && (!messages || !Array.isArray(messages) || messages.length === 0)) {
            res.status(400).json({ error: 'Either prompt or messages is required' });
            return;
        }

        const provider = resolveProvider(reqProvider);
        const model = resolveModel(provider, reqModel);
        const apiKey = resolveApiKey(provider);

        if (!apiKey) {
            res.status(400).json({
                error: `Missing API key for provider "${provider}"`,
            });
            return;
        }

        const pricing = getPricing(model);

        let inputTokens: number;
        let tokenCountMethod: 'api' | 'estimate';

        if (provider === 'anthropic') {
            const anthropicMessages = toAnthropicMessages(prompt, messages);
            const apiCount = await countTokensAnthropic(apiKey, model, anthropicMessages, systemPrompt);
            if (apiCount !== null) {
                inputTokens = apiCount;
                tokenCountMethod = 'api';
            } else {
                inputTokens = estimateInputTokens(buildTextForEstimate(prompt, messages, systemPrompt));
                tokenCountMethod = 'estimate';
            }
        } else {
            inputTokens = estimateInputTokens(buildTextForEstimate(prompt, messages, systemPrompt));
            tokenCountMethod = 'estimate';
        }

        res.status(200).json({
            provider,
            model,
            inputTokens,
            tokenCountMethod,
            pricing: pricing ? { ...pricing, currency: 'USD' } : null,
            estimatedCost: pricing ? { inputUSD: calculateInputCost(inputTokens, pricing) } : null,
        });
    });

    return router;
}
