/**
 * Environment-variable-driven AI provider configuration.
 * Inspired by OpenClaw's model-selection.ts and auth-profiles.ts patterns.
 *
 * Environment variables:
 *   AI_PROVIDER          - Provider name: anthropic|openai|codex|google|zhipu|minimax (default: anthropic)
 *   AI_MODEL             - Model ID (provider-specific, has sensible defaults)
 *   AI_FALLBACK_PROVIDERS - Comma-separated fallback chain (e.g., "codex,google")
 *   ANTHROPIC_API_KEY    - Anthropic API key
 *   OPENAI_API_KEY       - OpenAI API key
 *   OPENAI_CODEX_API_KEY - OpenAI Codex API key (optional; falls back to OPENAI_API_KEY)
 *   GOOGLE_API_KEY       - Google Gemini API key
 *   GLM_API_KEY          - Zhipu GLM API key
 *   MINIMAX_API_KEY      - MiniMax API key
 */

import type { LanguageModel } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export type ProviderName = 'anthropic' | 'openai' | 'codex' | 'google' | 'zhipu' | 'minimax';

export type ProviderConfig = {
    provider: ProviderName;
    model: string;
    apiKey: string;
    fallbackProviders: ProviderName[];
};

/** Default models per provider — optimized for code generation and tool use */
export const DEFAULT_MODELS: Record<ProviderName, string> = {
    anthropic: 'claude-sonnet-4-5-20250929',
    openai: 'gpt-4o',
    codex: 'gpt-5-codex',
    google: 'gemini-2.0-flash',
    zhipu: 'glm-4',
    minimax: 'minimax-m2',
};

/** Environment variable names for API keys per provider */
export const API_KEY_ENV_VARS: Record<ProviderName, string[]> = {
    anthropic: ['ANTHROPIC_API_KEY'],
    openai: ['OPENAI_API_KEY'],
    codex: ['OPENAI_CODEX_API_KEY', 'OPENAI_API_KEY'],
    google: ['GOOGLE_API_KEY'],
    zhipu: ['GLM_API_KEY'],
    minimax: ['MINIMAX_API_KEY'],
};

const VALID_PROVIDERS = new Set<string>(Object.keys(DEFAULT_MODELS));

function isValidProvider(name: string): name is ProviderName {
    return VALID_PROVIDERS.has(name);
}

function assertNever(value: never): never {
    throw new Error(`Unsupported provider: ${String(value)}`);
}

function resolveApiKey(provider: ProviderName): { apiKey: string; envVars: string[] } {
    const envVars = API_KEY_ENV_VARS[provider];
    for (const envVar of envVars) {
        const value = process.env[envVar];
        if (value) {
            return { apiKey: value, envVars };
        }
    }
    return { apiKey: '', envVars };
}

/**
 * Resolve provider configuration from environment variables and optional overrides.
 * Overrides (from request body) take precedence over env vars.
 */
export function resolveProviderConfig(overrides?: {
    provider?: string;
    model?: string;
}): ProviderConfig {
    const providerName = overrides?.provider || process.env.AI_PROVIDER || 'anthropic';

    if (!isValidProvider(providerName)) {
        throw new Error(
            `Invalid AI_PROVIDER "${providerName}". Valid options: ${[...VALID_PROVIDERS].join(', ')}`,
        );
    }

    const model = overrides?.model || process.env.AI_MODEL || DEFAULT_MODELS[providerName];
    const { apiKey, envVars } = resolveApiKey(providerName);

    if (!apiKey) {
        throw new Error(
            `Missing API key for provider "${providerName}". Set one of: ${envVars.join(', ')}`,
        );
    }

    // Parse fallback chain from env
    const fallbackRaw = process.env.AI_FALLBACK_PROVIDERS || '';
    const fallbackProviders = fallbackRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is ProviderName => isValidProvider(s) && s !== providerName);

    return { provider: providerName, model, apiKey, fallbackProviders };
}

/**
 * Create a Vercel AI SDK LanguageModel instance from a provider config.
 */
export function createLanguageModel(config: ProviderConfig): LanguageModel {
    return createLanguageModelForProvider(config.provider, config.model, config.apiKey);
}

/**
 * Create a LanguageModel for a specific provider/model/key combination.
 */
export function createLanguageModelForProvider(
    provider: ProviderName,
    model: string,
    apiKey: string,
): LanguageModel {
    switch (provider) {
        case 'anthropic': {
            const anthropic = createAnthropic({ apiKey });
            return anthropic(model);
        }
        case 'openai': {
            const openai = createOpenAI({ apiKey });
            return openai(model);
        }
        case 'codex': {
            const openai = createOpenAI({ apiKey });
            // Codex models are exposed through the OpenAI Responses API in @vercel-rest-sdk/openai.
            return openai.responses(model);
        }
        case 'google': {
            const google = createGoogleGenerativeAI({ apiKey });
            return google(model);
        }
        case 'zhipu': {
            // zhipu-vercel-rest-provider uses OpenAI-compatible API
            const zhipu = createOpenAI({
                apiKey,
                baseURL: 'https://open.bigmodel.cn/api/paas/v4',
            });
            return zhipu(model);
        }
        case 'minimax': {
            // MiniMax uses OpenAI-compatible API
            const minimax = createOpenAI({
                apiKey,
                baseURL: 'https://api.minimax.chat/v1',
            });
            return minimax(model);
        }
        default:
            return assertNever(provider);
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Thinking (two-phase) configuration
// ──────────────────────────────────────────────────────────────────────────────

export type ThinkingConfig = {
    enabled: boolean;
    model: string;
    budgetTokens: number; // 0 = adaptive
};

/**
 * Resolve thinking-phase configuration from per-request overrides and env vars.
 *
 * Priority: per-request override > env var > default.
 * Thinking defaults to enabled when the primary provider is anthropic.
 */
export function resolveThinkingConfig(overrides?: {
    thinking?: boolean;
    thinkingModel?: string;
    thinkingBudget?: number;
}): ThinkingConfig {
    const envEnabled = process.env.AI_THINKING_ENABLED;
    const defaultProvider = process.env.AI_PROVIDER || 'anthropic';

    // Determine enabled: override > env > default (true when anthropic)
    let enabled: boolean;
    if (overrides?.thinking !== undefined) {
        enabled = overrides.thinking;
    } else if (envEnabled !== undefined) {
        enabled = envEnabled === 'true' || envEnabled === '1';
    } else {
        enabled = defaultProvider === 'anthropic';
    }

    const model =
        overrides?.thinkingModel ||
        process.env.AI_THINKING_MODEL ||
        'claude-opus-4-6';

    const budgetRaw = overrides?.thinkingBudget ?? parseInt(process.env.AI_THINKING_BUDGET || '0', 10);
    const budgetTokens = Number.isFinite(budgetRaw) && budgetRaw >= 0 ? budgetRaw : 0;

    return { enabled, model, budgetTokens };
}

/**
 * List all available providers that have API keys configured.
 */
export function getAvailableProviders(): ProviderName[] {
    return (Object.keys(API_KEY_ENV_VARS) as ProviderName[]).filter((provider) =>
        API_KEY_ENV_VARS[provider].some((envVar) => !!process.env[envVar]),
    );
}

/**
 * Get the default model for a provider.
 */
export function getDefaultModel(provider: ProviderName): string {
    return DEFAULT_MODELS[provider];
}
