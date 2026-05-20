/**
 * Provider-agnostic agentic loop using the Vercel AI SDK.
 * Replaces the Claude-specific query() call in src/standalone/main.ts.
 *
 * Supports all configured providers (Anthropic, OpenAI, Google, Zhipu, MiniMax)
 * with automatic tool calling, model fallback, loop detection, context
 * compression, token budget awareness, and hook-based extensibility.
 */

import { generateText, streamText, stepCountIs, type ModelMessage } from 'ai';
import { generateStudioTools, MUTATING_COMMANDS } from './tools/generate-tools.js';
import { createWebTools, isWebResearchEnabled } from './tools/web-tools.js';
import { buildSystemPrompt, mergeSystemPrompt, type SystemPromptMergeMode } from './system-prompt.js';
import { getSceneContextSummary, invalidateSceneContext } from './context/scene-context.js';
import {
    resolveProviderConfig,
    resolveThinkingConfig,
    createLanguageModel,
    createLanguageModelForProvider,
    type ProviderName,
    type ThinkingConfig,
} from './provider-config.js';
import { providerAvailability } from '../utils/provider-availability/index.js';
import { runWithModelFallback, buildCandidates } from './model-fallback.js';
import { loadAllSkills, resetSkillHints } from './skills/skill-loader.js';
import {
    createLoopDetectionState,
    detectToolCallLoop,
    recordToolCall,
    recordToolCallOutcome,
    type LoopDetectionState,
} from '../utils/loop-detection.js';
import { computeBudget } from './context/token-budget.js';
import { compressIfNeeded } from './context/context-compressor.js';
import { agentEvents } from '../utils/hooks/agent-events.js';
import { createLogger } from '../utils/logger.js';
import { recordSession } from '../utils/session/session-recorder.js';

const log = createLogger('agent');

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

// Tier 1: Load skill metadata on module init (cached for all subsequent requests)
loadAllSkills();
log.info('Skills system initialized');

// ──────────────────────────────────────────────────────────────────────────────
// Register hook subscribers for cross-cutting concerns
// ──────────────────────────────────────────────────────────────────────────────

// Hook: scene cache invalidation after mutating commands
agentEvents.on('afterToolCall', (payload) => {
    if (MUTATING_COMMANDS.has(payload.toolName)) {
        invalidateSceneContext(payload.sessionId);
    }
});

// Hook: reset skill hints per agent session so each new session gets fresh hints
agentEvents.on('agentStart', () => {
    resetSkillHints();
});

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type AgentOptions = {
    /** Override the default provider (from AI_PROVIDER env var) */
    provider?: string;
    /** Override the default model (from AI_MODEL env var) */
    model?: string;
    /** Studio session ID (required for tool calls) */
    sessionId: string;
    /** Maximum agentic steps (tool call rounds). Default: 30 */
    maxSteps?: number;
    /** Whether to stream the response */
    stream?: boolean;
    /** Conversation history for multi-turn */
    messages?: ModelMessage[];
    /** Optional client-provided system prompt extension or override */
    systemPrompt?: string;
    /** Merge strategy for client systemPrompt. Default: append */
    systemPromptMode?: SystemPromptMergeMode;
    /** Enable web research tools (requires WEB_RESEARCH_ENABLED=true on server). */
    webResearchEnabled?: boolean;
    /** Enable/disable two-phase thinking (Opus planning). Overrides AI_THINKING_ENABLED env. */
    thinking?: boolean;
    /** Override the thinking model (default: standalone-opus-4-6). */
    thinkingModel?: string;
    /** Override the thinking token budget (0 = adaptive). */
    thinkingBudget?: number;
};

export type AgentResult = {
    text: string;
    provider: string;
    model: string;
    steps: number;
    toolCalls: Array<{ toolName: string; args: unknown; result: unknown }>;
    finishReason: string;
    usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
    fallbackAttempts?: Array<{ provider: string; model: string; error: string }>;
    loopDetection?: { detector: string; message: string };
    compressed?: boolean;
    /** Model used for the thinking phase (if enabled). */
    thinkingModel?: string;
    /** Plan text produced by the thinking phase. */
    thinkingText?: string;
    /** Token usage for the thinking phase. */
    thinkingUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
    /** Wall-clock duration of the thinking phase in ms. */
    thinkingDurationMs?: number;
};

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Build SDK callbacks that wire loop detection + hooks for both generateText and streamText. */
function buildToolCallbacks(
    loopState: LoopDetectionState,
    sessionId: string,
    onLoopDetected: (info: { detector: string; message: string }) => void,
) {
    let stepCounter = 0;

    return {
        experimental_onToolCallStart: ({ toolCall }: any) => {
            const detection = detectToolCallLoop(loopState, toolCall.toolName, toolCall.input);
            if (detection.stuck && detection.level === 'critical') {
                onLoopDetected({ detector: detection.detector, message: detection.message });
                log.warn('Loop detected', { message: detection.message });
            }
            recordToolCall(loopState, toolCall.toolName, toolCall.input);
            agentEvents.emit('beforeToolCall', {
                toolName: toolCall.toolName,
                args: toolCall.input,
                sessionId,
                stepNumber: stepCounter++,
            });
        },
        experimental_onToolCallFinish: (event: any) => {
            const success = !!event.success;
            const output = success ? event.output : undefined;
            const error = success ? undefined : event.error;
            recordToolCallOutcome(loopState, event.toolCall.toolName, event.toolCall.input, output, error);
            agentEvents.emit('afterToolCall', {
                toolName: event.toolCall.toolName,
                args: event.toolCall.input,
                sessionId,
                success,
                output,
                error,
                durationMs: event.durationMs ?? 0,
            });
        },
    };
}

// ──────────────────────────────────────────────────────────────────────────────
// Two-phase thinking helpers
// ──────────────────────────────────────────────────────────────────────────────

type ThinkingPhaseResult = {
    planText: string;
    model: string;
    durationMs: number;
    usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
};

/**
 * Wrap the copilot system prompt with planning-only instructions.
 * The thinking model produces a structured plan — no tools, no execution.
 */
function buildThinkingSystemPrompt(baseSystemPrompt: string): string {
    return `You are the PLANNING phase of a two-phase AI agent for 3D scene manipulation.

Your role is to analyze the user's request and produce a detailed execution plan.
You do NOT have access to tools — another model will execute your plan.

## Your Base Knowledge

${baseSystemPrompt}

## Output Format

Produce a structured plan with these sections:

1. **Analysis** — What is the user asking for? Break down the request.
2. **Scene Assessment** — What scene state is relevant? What objects/behaviors exist?
3. **Step-by-Step Plan** — Numbered list of concrete tool calls the executor should make, in order. Include expected parameters.
4. **Risk Mitigation** — What could go wrong? Edge cases to handle.
5. **Verification** — How should the executor verify success after each step?

Be specific about tool names, object IDs, parameter values, and execution order.
Keep the plan concise but thorough.`;
}

/**
 * Run the thinking phase: Opus + extended thinking, no tools.
 * Returns null on failure or when skipped (graceful fallback).
 */
async function runThinkingPhase(
    prompt: string,
    messages: ModelMessage[],
    systemPrompt: string,
    thinkingConfig: ThinkingConfig,
    providerConfig: { provider: string; apiKey: string },
    sessionId: string,
): Promise<ThinkingPhaseResult | null> {
    // Guard: only run for anthropic provider
    if (!thinkingConfig.enabled || providerConfig.provider !== 'anthropic') {
        return null;
    }

    const startedAt = Date.now();
    const thinkingSystemPrompt = buildThinkingSystemPrompt(systemPrompt);

    try {
        const thinkingModel = createLanguageModelForProvider(
            'anthropic',
            thinkingConfig.model,
            providerConfig.apiKey,
        );

        // Build thinking provider options
        const thinkingOption = thinkingConfig.budgetTokens > 0
            ? { type: 'enabled' as const, budgetTokens: thinkingConfig.budgetTokens }
            : { type: 'enabled' as const, budgetTokens: 10000 };

        const result = await generateText({
            model: thinkingModel,
            system: thinkingSystemPrompt,
            messages,
            // No tools — planning only
            stopWhen: [stepCountIs(1)],
            providerOptions: {
                anthropic: {
                    thinking: thinkingOption,
                },
            },
        });

        const durationMs = Date.now() - startedAt;
        const planText = result.text;

        if (!planText || planText.trim().length === 0) {
            log.warn('Thinking phase produced empty plan, skipping');
            return null;
        }

        log.info('Thinking phase complete', {
            model: thinkingConfig.model,
            durationMs,
            planLength: planText.length,
        });

        // Emit hook
        await agentEvents.emit('thinkingComplete', {
            sessionId,
            model: thinkingConfig.model,
            durationMs,
            planLength: planText.length,
            usage: result.usage as any,
        });

        return {
            planText,
            model: thinkingConfig.model,
            durationMs,
            usage: result.usage as any,
        };
    } catch (err) {
        const durationMs = Date.now() - startedAt;
        log.warn('Thinking phase failed, falling back to single-model mode', {
            model: thinkingConfig.model,
            durationMs,
            error: err instanceof Error ? err.message : String(err),
        });
        return null;
    }
}

/**
 * Inject the thinking plan into the system prompt for the executor model.
 */
function injectThinkingPlan(baseSystemPrompt: string, planText: string): string {
    return `${baseSystemPrompt}

## Reasoning Model Analysis

A reasoning model (Opus) has analyzed this request and produced the following plan.
Follow the plan step by step, but adapt if you discover the scene state differs from assumptions.

<reasoning-plan>
${planText}
</reasoning-plan>

Execute each step using the available tools. If a step fails, note the error and continue with the remaining steps where possible.`;
}

// ──────────────────────────────────────────────────────────────────────────────
// runAgent (non-streaming)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Run the AI agent with a prompt. Provider-agnostic — works with any configured provider.
 *
 * @example
 * const result = await runAgent('Create a red cube at position 0, 5, 0', {
 *   sessionId: 'abc123',
 *   provider: 'openai',  // optional override
 *   model: 'gpt-4o',     // optional override
 * });
 */
export async function runAgent(prompt: string, options: AgentOptions): Promise<AgentResult> {
    const { sessionId, maxSteps = 30 } = options;
    const startedAt = Date.now();

    // Auto-inject scene context
    let sceneContext: string | undefined;
    try {
        sceneContext = await getSceneContextSummary(sessionId);
    } catch (err) {
        log.warn('Failed to fetch scene context', { error: err instanceof Error ? err.message : String(err) });
    }

    // Build tools for this session
    const config = resolveProviderConfig({
        provider: options.provider,
        model: options.model,
    });

    const webResearch = options.webResearchEnabled && isWebResearchEnabled();
    const tools = {
        ...generateStudioTools(sessionId),
        ...(webResearch ? createWebTools(config.provider) : {}),
    };

    // Token budget check — determine if compression or minimal prompt is needed
    let agentMessages = options.messages || [{ role: 'user' as const, content: prompt }];
    const budget = computeBudget(
        '', // placeholder — we'll build the real prompt after deciding mode
        agentMessages,
        sceneContext,
        config.model,
    );

    let promptMode: 'full' | 'minimal' = 'full';
    let compressed = false;

    if (budget.compressionNeeded && agentMessages.length > 4) {
        const languageModelForCompression = createLanguageModel({
            provider: config.provider,
            model: config.model,
            apiKey: config.apiKey,
            fallbackProviders: [],
        });
        const compressionResult = await compressIfNeeded(agentMessages, {
            maxContextTokens: budget.contextWindow,
            model: languageModelForCompression,
        });
        agentMessages = compressionResult.messages;
        compressed = compressionResult.compressed;
    }

    if (budget.remainingForCompletion < 10_000) {
        promptMode = 'minimal';
    }

    const canonicalSystemPrompt = buildSystemPrompt({
        provider: config.provider,
        mode: promptMode,
        sessionId,
        sceneContext,
        webResearchEnabled: !!webResearch,
    });
    const systemPrompt = mergeSystemPrompt(
        canonicalSystemPrompt,
        options.systemPrompt,
        options.systemPromptMode ?? 'append',
    );

    // ── Phase 1: Thinking (Opus planning) ──
    const thinkingConfig = resolveThinkingConfig({
        thinking: options.thinking,
        thinkingModel: options.thinkingModel,
        thinkingBudget: options.thinkingBudget,
    });

    const thinkingResult = await runThinkingPhase(
        prompt,
        agentMessages,
        systemPrompt,
        thinkingConfig,
        { provider: config.provider, apiKey: config.apiKey },
        sessionId,
    );

    // If thinking produced a plan, inject it into the system prompt for execution
    const executionSystemPrompt = thinkingResult
        ? injectThinkingPlan(systemPrompt, thinkingResult.planText)
        : systemPrompt;

    // Loop detection state
    const loopState = createLoopDetectionState();
    let loopAborted = false;
    let loopDetectionInfo: { detector: string; message: string } | undefined;

    const callbacks = buildToolCallbacks(loopState, sessionId, (info) => {
        loopAborted = true;
        loopDetectionInfo = info;
    });

    // Emit agentStart hook
    await agentEvents.emit('agentStart', { sessionId, provider: config.provider, model: config.model, path: 'vercel-rest-sdk' });

    // Run with model fallback chain
    const fallbackResult = await runWithModelFallback({
        config,
        run: async (provider, model, apiKey) => {
            const languageModel = createLanguageModel({
                provider: provider as ProviderName,
                model,
                apiKey,
                fallbackProviders: [],
            });

            const result = await generateText({
                model: languageModel,
                system: executionSystemPrompt,
                messages: agentMessages,
                tools,
                stopWhen: [stepCountIs(maxSteps), () => loopAborted],
                ...callbacks,
            });

            return result;
        },
    });

    const result = fallbackResult.result;

    // Collect all tool calls across steps
    const allToolCalls = result.steps.flatMap((step: any) =>
        (step.toolCalls || []).map((tc: any, i: number) => ({
            toolName: tc.toolName,
            args: tc.args,
            result: step.toolResults?.[i]?.result,
        })),
    );

    const agentResult: AgentResult = {
        text: result.text,
        provider: fallbackResult.provider,
        model: fallbackResult.model,
        steps: result.steps.length,
        toolCalls: allToolCalls,
        finishReason: loopAborted ? 'loop-detected' : result.finishReason,
        usage: result.usage as any,
        fallbackAttempts: fallbackResult.attempts.length > 0 ? fallbackResult.attempts : undefined,
        loopDetection: loopDetectionInfo,
        compressed: compressed || undefined,
        thinkingModel: thinkingResult?.model,
        thinkingText: thinkingResult?.planText,
        thinkingUsage: thinkingResult?.usage,
        thinkingDurationMs: thinkingResult?.durationMs,
    };

    const durationMs = Date.now() - startedAt;

    // Emit agentFinish hook
    await agentEvents.emit('agentFinish', {
        sessionId,
        provider: fallbackResult.provider,
        model: fallbackResult.model,
        path: 'vercel-rest-sdk',
        durationMs,
        steps: agentResult.steps,
        finishReason: agentResult.finishReason,
    });

    // Record session metrics
    recordSession({
        sessionId,
        startedAt,
        completedAt: Date.now(),
        durationMs,
        provider: fallbackResult.provider,
        model: fallbackResult.model,
        path: 'vercel-rest-sdk',
        steps: agentResult.steps,
        toolCalls: allToolCalls.map(tc => ({ tool: tc.toolName, durationMs: 0, success: true })),
        tokenUsage: agentResult.usage,
        finishReason: agentResult.finishReason,
        fallbackAttempts: agentResult.fallbackAttempts?.length,
        compressed: agentResult.compressed,
        loopDetected: !!agentResult.loopDetection,
        thinkingModel: thinkingResult?.model,
        thinkingDurationMs: thinkingResult?.durationMs,
        thinkingTokenUsage: thinkingResult?.usage,
    });

    return agentResult;
}

// ──────────────────────────────────────────────────────────────────────────────
// runAgentStream (streaming with fallback)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Run the AI agent with streaming. Returns a readable stream of text deltas.
 * Uses a fallback candidate loop — if the primary provider fails before
 * producing a stream, tries the next available provider.
 */
export async function runAgentStream(prompt: string, options: AgentOptions) {
    const { sessionId, maxSteps = 30 } = options;

    let sceneContext: string | undefined;
    try {
        sceneContext = await getSceneContextSummary(sessionId);
    } catch {
        // Scene context is optional — continue without it
    }

    const config = resolveProviderConfig({
        provider: options.provider,
        model: options.model,
    });

    const webResearch = options.webResearchEnabled && isWebResearchEnabled();
    const tools = {
        ...generateStudioTools(sessionId),
        ...(webResearch ? createWebTools(config.provider) : {}),
    };

    const canonicalSystemPrompt = buildSystemPrompt({
        provider: config.provider,
        mode: 'full',
        sessionId,
        sceneContext,
        webResearchEnabled: !!webResearch,
    });
    const systemPrompt = mergeSystemPrompt(
        canonicalSystemPrompt,
        options.systemPrompt,
        options.systemPromptMode ?? 'append',
    );

    // ── Phase 1: Thinking (non-streaming, even for streaming requests) ──
    const thinkingConfig = resolveThinkingConfig({
        thinking: options.thinking,
        thinkingModel: options.thinkingModel,
        thinkingBudget: options.thinkingBudget,
    });

    const thinkingResult = await runThinkingPhase(
        prompt,
        options.messages || [{ role: 'user' as const, content: prompt }],
        systemPrompt,
        thinkingConfig,
        { provider: config.provider, apiKey: config.apiKey },
        sessionId,
    );

    const executionSystemPrompt = thinkingResult
        ? injectThinkingPlan(systemPrompt, thinkingResult.planText)
        : systemPrompt;

    // Loop detection for streaming
    const loopState = createLoopDetectionState();
    let loopAborted = false;

    const callbacks = buildToolCallbacks(loopState, sessionId, () => {
        loopAborted = true;
    });

    const streamOptions = {
        system: executionSystemPrompt,
        messages: options.messages || [{ role: 'user' as const, content: prompt }],
        tools,
        stopWhen: [stepCountIs(maxSteps), () => loopAborted],
        ...callbacks,
    };

    // Emit agentStart hook
    await agentEvents.emit('agentStart', { sessionId, provider: config.provider, model: config.model, path: 'vercel-rest-sdk-stream' });

    // Fallback candidate loop for streaming
    const candidates = buildCandidates(config);
    let lastError: unknown;

    for (const candidate of candidates) {
        if (!providerAvailability.isAvailable(candidate.provider)) continue;

        try {
            const model = createLanguageModelForProvider(candidate.provider, candidate.model, candidate.apiKey);
            const result = streamText({ model, ...streamOptions });
            providerAvailability.recordSuccess(candidate.provider);
            return result;
        } catch (err) {
            providerAvailability.recordFailure(candidate.provider);
            lastError = err;
            log.warn('Stream fallback: provider failed, trying next', { provider: candidate.provider, model: candidate.model });
            continue;
        }
    }

    throw toError(lastError, 'All providers failed for streaming');
}
