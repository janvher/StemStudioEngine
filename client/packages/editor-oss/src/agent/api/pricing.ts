/**
 * Pricing API client
 *
 * Wraps POST /api/pricing/estimate-cost from the Copilot backend.
 * Mirrors the types from the backend index.ts (src/pricing/index.ts).
 */

import {copilotClient} from "./client";

// ---------------------------------------------------------------------------
// Types (mirrored from backend)
// ---------------------------------------------------------------------------

export type TokenPricing = {
    inputPerMillion: number;
    outputPerMillion: number;
    currency: "USD";
};

export type CostEstimate = {
    provider: string;
    model: string;
    inputTokens: number;
    tokenCountMethod: "api" | "estimate";
    pricing: TokenPricing | null;
    estimatedCost: {inputUSD: number} | null;
};

export type EstimateCostRequest = {
    /** Plain-text prompt (alternative to messages). */
    prompt?: string;
    /** Vercel AI SDK-compatible message array. */
    messages?: Array<{role: string; content: string | unknown}>;
    /** AI provider identifier, e.g. "anthropic", "openai", "google". */
    provider?: string;
    /** Model identifier, e.g. "claude-sonnet-4-5-20250929". */
    model?: string;
    /** Optional system prompt included in the token count. */
    systemPrompt?: string;
};

// ---------------------------------------------------------------------------
// API call
// ---------------------------------------------------------------------------

/**
 * Estimate the input token count and cost for a given prompt / message array.
 *
 * @param request
 * @example
 * const estimate = await estimateCost({ prompt: 'Hello world', provider: 'anthropic' });
 * console.log(estimate.estimatedCost?.inputUSD);
 */
export async function estimateCost(request: EstimateCostRequest): Promise<CostEstimate> {
    if (!request.prompt && (!request.messages || request.messages.length === 0)) {
        throw new Error("estimateCost: either prompt or messages is required");
    }

    return copilotClient.post<CostEstimate>("/api/pricing/estimate-cost", request);
}
