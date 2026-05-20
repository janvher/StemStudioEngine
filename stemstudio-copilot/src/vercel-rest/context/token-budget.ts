/**
 * Token budget awareness for the agent loop.
 * Estimates token usage and determines when context compression is needed.
 */

import type { ModelMessage } from 'ai';

/** Known context windows per model family (in tokens) */
const CONTEXT_WINDOWS: Record<string, number> = {
    // Anthropic
    'claude-sonnet-4-5-20250929': 200_000,
    'claude-opus-4-6': 200_000,
    'claude-haiku-4-5-20251001': 200_000,
    // OpenAI
    'gpt-4o': 128_000,
    'gpt-4o-mini': 128_000,
    'gpt-4-turbo': 128_000,
    'gpt-5-codex': 400_000,
    'gpt-5.1-codex-mini': 400_000,
    'gpt-5.1-codex': 400_000,
    'gpt-5.1-codex-max': 400_000,
    'codex-mini-latest': 400_000,
    // Google
    'gemini-2.0-flash': 1_000_000,
    'gemini-2.0-pro': 1_000_000,
    'gemini-1.5-pro': 2_000_000,
    // Zhipu
    'glm-4': 128_000,
    // MiniMax
    'minimax-m2': 128_000,
};

const DEFAULT_CONTEXT_WINDOW = 128_000;

/** Look up the context window size for a model. */
export function getContextWindowTokens(model: string): number {
    return CONTEXT_WINDOWS[model] ?? DEFAULT_CONTEXT_WINDOW;
}

/** Rough token estimate: ~4 chars per token (byte-length / 4). */
export function estimateTokens(content: string | object): number {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    return Math.ceil(Buffer.byteLength(text, 'utf-8') / 4);
}

export type BudgetReport = {
    systemPromptTokens: number;
    messagesTokens: number;
    sceneContextTokens: number;
    totalUsed: number;
    contextWindow: number;
    remainingForCompletion: number;
    compressionNeeded: boolean;
};

/**
 * Compute a token budget report for the current agent turn.
 * `compressionNeeded` is true when total usage exceeds 50% of the context window.
 */
export function computeBudget(
    systemPrompt: string,
    messages: ModelMessage[],
    sceneContext: string | undefined,
    model: string,
): BudgetReport {
    const contextWindow = getContextWindowTokens(model);
    const systemPromptTokens = estimateTokens(systemPrompt);
    const messagesTokens = estimateTokens(messages);
    const sceneContextTokens = sceneContext ? estimateTokens(sceneContext) : 0;
    const totalUsed = systemPromptTokens + messagesTokens + sceneContextTokens;
    const remainingForCompletion = contextWindow - totalUsed;
    const compressionNeeded = totalUsed > contextWindow * 0.5;

    return {
        systemPromptTokens,
        messagesTokens,
        sceneContextTokens,
        totalUsed,
        contextWindow,
        remainingForCompletion,
        compressionNeeded,
    };
}
