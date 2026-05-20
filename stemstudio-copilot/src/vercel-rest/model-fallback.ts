/**
 * Model fallback chain adapted from OpenClaw's model-fallback.ts.
 * When the primary provider fails, tries configured fallback providers in order.
 *
 * Error classification:
 * - Rate limit / server error → try next provider
 * - Context overflow → rethrow (smaller models would fail worse)
 * - Abort / cancellation → rethrow
 * - Auth error → try next provider
 */

import {
    type ProviderConfig,
    type ProviderName,
    DEFAULT_MODELS,
    API_KEY_ENV_VARS,
} from './provider-config.js';
import { retryAsync } from '../utils/retry.js';
import { providerAvailability } from '../utils/provider-availability/index.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('fallback');

type FallbackAttempt = {
    provider: string;
    model: string;
    error: string;
};

type FallbackRunResult<T> = {
    result: T;
    provider: string;
    model: string;
    attempts: FallbackAttempt[];
};

type FallbackErrorHandler = (attempt: {
    provider: string;
    model: string;
    error: unknown;
    attempt: number;
    total: number;
}) => void | Promise<void>;

function toError(err: unknown, fallbackMessage: string): Error {
    if (err instanceof Error) return err;
    if (typeof err === 'string') return new Error(err);
    if (err && typeof err === 'object') {
        try {
            return new Error(JSON.stringify(err));
        } catch {
            return new Error(fallbackMessage);
        }
    }
    return new Error(fallbackMessage);
}

/** Errors that suggest the model's context window was exceeded */
function isContextOverflowError(message: string): boolean {
    const patterns = [
        'context_length_exceeded',
        'context window',
        'maximum context length',
        'token limit',
        'max_tokens',
        'too many tokens',
        'prompt is too long',
    ];
    const lower = message.toLowerCase();
    return patterns.some((p) => lower.includes(p));
}

/** Errors caused by user cancellation */
function isAbortError(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const name = 'name' in err ? String((err as any).name) : '';
    return name === 'AbortError';
}

/** Errors that indicate the provider should be skipped (try next) */
function isFailoverError(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const errObj = err as any;

    // Rate limit
    if (errObj.status === 429) return true;

    // Server errors
    if (typeof errObj.status === 'number' && errObj.status >= 500) return true;

    // Auth errors
    if (errObj.status === 401 || errObj.status === 403) return true;

    // Network errors
    const message = errObj.message || '';
    if (typeof message === 'string') {
        const lower = message.toLowerCase();
        if (lower.includes('econnrefused') || lower.includes('enotfound') || lower.includes('timeout')) {
            return true;
        }
    }

    return false;
}

/**
 * Build the list of provider/model candidates to try.
 * Primary first, then fallbacks in order.
 */
export function buildCandidates(config: ProviderConfig): Array<{
    provider: ProviderName;
    model: string;
    apiKey: string;
}> {
    const candidates = [
        {
            provider: config.provider,
            model: config.model,
            apiKey: config.apiKey,
        },
    ];

    // Add fallback providers
    for (const fallbackProvider of config.fallbackProviders) {
        const apiKey = API_KEY_ENV_VARS[fallbackProvider]
            .map((envVar) => process.env[envVar])
            .find((value): value is string => !!value);
        if (!apiKey) {
            log.warn(`Skipping ${fallbackProvider}: no API key configured`);
            continue;
        }
        candidates.push({
            provider: fallbackProvider,
            model: DEFAULT_MODELS[fallbackProvider],
            apiKey,
        });
    }

    return candidates;
}

/**
 * Run a function with model fallback. If the primary provider fails with a
 * retryable error, tries the next provider in the fallback chain.
 */
export async function runWithModelFallback<T>(params: {
    config: ProviderConfig;
    run: (provider: string, model: string, apiKey: string) => Promise<T>;
    onError?: FallbackErrorHandler;
}): Promise<FallbackRunResult<T>> {
    const allCandidates = buildCandidates(params.config);
    // Prefer available providers, but fall back to all if none are available
    const available = allCandidates.filter(c => providerAvailability.isAvailable(c.provider));
    const candidates = available.length > 0 ? available : allCandidates;
    const attempts: FallbackAttempt[] = [];
    let lastError: unknown;

    for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];

        try {
            const result = await retryAsync(
                () => params.run(candidate.provider, candidate.model, candidate.apiKey),
                {
                    attempts: 2,
                    minDelayMs: 500,
                    maxDelayMs: 10_000,
                    jitter: 0.3,
                    label: `${candidate.provider}/${candidate.model}`,
                    shouldRetry: (err) => {
                        if (isAbortError(err)) return false;
                        const msg = err instanceof Error ? err.message : String(err);
                        if (isContextOverflowError(msg)) return false;
                        return isFailoverError(err);
                    },
                    retryAfterMs: (err) => {
                        const header = (err as any)?.headers?.['retry-after'];
                        if (typeof header === 'string') {
                            const seconds = parseInt(header, 10);
                            if (Number.isFinite(seconds)) return seconds * 1000;
                        }
                        return undefined;
                    },
                    onRetry: (info) => {
                        log.warn(`Retrying ${candidate.provider}/${candidate.model}`, { attempt: info.attempt, maxAttempts: info.maxAttempts, delayMs: info.delayMs });
                    },
                },
            );
            providerAvailability.recordSuccess(candidate.provider);
            return {
                result,
                provider: candidate.provider,
                model: candidate.model,
                attempts,
            };
        } catch (err) {
            providerAvailability.recordFailure(candidate.provider);
            // Abort errors always rethrow
            if (isAbortError(err)) throw err;

            // Context overflow — rethrow, don't try smaller models
            const errMessage = err instanceof Error ? err.message : String(err);
            if (isContextOverflowError(errMessage)) throw err;

            // If it's a failover-eligible error and we have more candidates, continue
            if (!isFailoverError(err) && i < candidates.length - 1) {
                // Unknown error type — still try next as a best effort
                log.warn(`Unknown error from ${candidate.provider}/${candidate.model}, trying next`, { error: errMessage });
            }

            lastError = err;
            attempts.push({
                provider: candidate.provider,
                model: candidate.model,
                error: errMessage,
            });

            await params.onError?.({
                provider: candidate.provider,
                model: candidate.model,
                error: err,
                attempt: i + 1,
                total: candidates.length,
            });
        }
    }

    // All candidates failed
    if (attempts.length <= 1 && lastError) {
        throw toError(lastError, 'Model fallback failed');
    }

    const summary = attempts.map((a) => `${a.provider}/${a.model}: ${a.error}`).join(' | ');
    throw new Error(`All ${attempts.length} model(s) failed: ${summary}`);
}
