/**
 * Retry infrastructure adapted from OpenClaw's retryAsync pattern.
 * Provides exponential backoff with jitter, configurable retry predicates,
 * and rate-limit header support.
 */

export type RetryConfig = {
    attempts?: number;
    minDelayMs?: number;
    maxDelayMs?: number;
    jitter?: number;
};

export type RetryInfo = {
    attempt: number;
    maxAttempts: number;
    delayMs: number;
    err: unknown;
    label?: string;
};

export type RetryOptions = RetryConfig & {
    label?: string;
    shouldRetry?: (err: unknown, attempt: number) => boolean;
    retryAfterMs?: (err: unknown) => number | undefined;
    onRetry?: (info: RetryInfo) => void;
};

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
    attempts: 3,
    minDelayMs: 300,
    maxDelayMs: 5_000,
    jitter: 0.2,
};

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function resolveConfig(overrides?: RetryConfig): Required<RetryConfig> {
    const attempts = Math.max(1, Math.round(overrides?.attempts ?? DEFAULT_RETRY_CONFIG.attempts));
    const minDelayMs = Math.max(0, Math.round(overrides?.minDelayMs ?? DEFAULT_RETRY_CONFIG.minDelayMs));
    const maxDelayMs = Math.max(minDelayMs, Math.round(overrides?.maxDelayMs ?? DEFAULT_RETRY_CONFIG.maxDelayMs));
    const jitter = clamp(overrides?.jitter ?? DEFAULT_RETRY_CONFIG.jitter, 0, 1);
    return { attempts, minDelayMs, maxDelayMs, jitter };
}

function applyJitter(delayMs: number, jitter: number): number {
    if (jitter <= 0) return delayMs;
    const offset = (Math.random() * 2 - 1) * jitter;
    return Math.max(0, Math.round(delayMs * (1 + offset)));
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

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

/**
 * Retry an async function with exponential backoff and jitter.
 *
 * @example
 * const result = await retryAsync(
 *   () => fetch(url),
 *   {
 *     attempts: 3,
 *     minDelayMs: 300,
 *     maxDelayMs: 5000,
 *     jitter: 0.2,
 *     shouldRetry: (err) => !(err instanceof TypeError), // don't retry type errors
 *     label: 'studio/sendRequest',
 *   },
 * );
 */
export async function retryAsync<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
): Promise<T> {
    const config = resolveConfig(options);
    const shouldRetry = options.shouldRetry ?? (() => true);
    let lastErr: unknown;

    for (let attempt = 1; attempt <= config.attempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            if (attempt >= config.attempts || !shouldRetry(err, attempt)) {
                break;
            }

            // Check for rate-limit retry-after hint
            const retryAfterMs = options.retryAfterMs?.(err);
            const hasRetryAfter = typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs);

            const baseDelay = hasRetryAfter
                ? Math.max(retryAfterMs, config.minDelayMs)
                : config.minDelayMs * 2 ** (attempt - 1);

            let delay = Math.min(baseDelay, config.maxDelayMs);
            delay = applyJitter(delay, config.jitter);
            delay = clamp(delay, config.minDelayMs, config.maxDelayMs);

            options.onRetry?.({
                attempt,
                maxAttempts: config.attempts,
                delayMs: delay,
                err,
                label: options.label,
            });

            await sleep(delay);
        }
    }

    throw toError(lastErr, 'Retry failed');
}
