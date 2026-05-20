/**
 * Context compression for long Studio sessions.
 * When conversation history approaches the token limit, older messages are
 * summarized via an LLM call and replaced with a compact handoff summary.
 */

import { generateText, type LanguageModel, type ModelMessage } from 'ai';
import { estimateTokens } from './token-budget.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('compressor');

export type CompressionConfig = {
    maxContextTokens: number;
    model: LanguageModel;
};

export type CompressionResult = {
    messages: ModelMessage[];
    compressed: boolean;
};

const HANDOFF_PROMPT =
    'Create a handoff summary for another LLM resuming this 3D scene manipulation task. Include: overall goal, scene state achieved so far, completed actions, active constraints, pending work. Be concise but comprehensive.';

/**
 * Compress conversation history if it exceeds 50% of the context window.
 * Keeps the latest 30% of messages intact and summarizes the older 70%.
 * Splits only at user-message boundaries to avoid breaking tool-call sequences.
 */
export async function compressIfNeeded(
    messages: ModelMessage[],
    config: CompressionConfig,
): Promise<CompressionResult> {
    const currentTokens = estimateTokens(messages);

    // Only compress if over 50% of context window
    if (currentTokens < config.maxContextTokens * 0.5) {
        return { messages, compressed: false };
    }

    if (messages.length <= 4) {
        // Too few messages to meaningfully compress
        return { messages, compressed: false };
    }

    // Find the split point: keep latest ~30% of messages
    const keepCount = Math.max(2, Math.ceil(messages.length * 0.3));
    let splitIndex = messages.length - keepCount;

    // Adjust to a user-message boundary (never split mid-tool-call sequence)
    while (splitIndex > 0 && splitIndex < messages.length) {
        const msg = messages[splitIndex];
        if (msg.role === 'user') break;
        splitIndex--;
    }

    if (splitIndex <= 0) {
        return { messages, compressed: false };
    }

    const olderMessages = messages.slice(0, splitIndex);
    const recentMessages = messages.slice(splitIndex);

    // Generate summary of older messages
    const olderTokens = estimateTokens(olderMessages);
    const recentTokens = estimateTokens(recentMessages);

    try {
        const summaryResult = await generateText({
            model: config.model,
            system: HANDOFF_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: `Summarize the following conversation history (${olderMessages.length} messages, ~${olderTokens} tokens):\n\n${JSON.stringify(olderMessages)}`,
                },
            ],
        });

        const summaryText = summaryResult.text;
        const summaryTokens = estimateTokens(summaryText);

        log.info('Compressed conversation history', {
            olderMessages: olderMessages.length,
            olderTokens,
            summaryTokens,
            recentMessages: recentMessages.length,
            recentTokens,
        });

        // Replace older messages with summary
        const compressedMessages: ModelMessage[] = [
            {
                role: 'user',
                content: `[CONTEXT SUMMARY — earlier conversation compressed]\n\n${summaryText}`,
            },
            {
                role: 'assistant',
                content: 'Understood. I have the context from the previous conversation. Continuing from where we left off.',
            },
            ...recentMessages,
        ];

        return { messages: compressedMessages, compressed: true };
    } catch (err) {
        log.warn('Failed to compress context', { error: err instanceof Error ? err.message : String(err) });
        return { messages, compressed: false };
    }
}
