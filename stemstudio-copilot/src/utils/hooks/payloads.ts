/**
 * Agent lifecycle event payloads.
 *
 * Pure data types describing what happened during the agent lifecycle.
 * These are decoupled from the event bus so they can be reused by
 * consumers (session recorder, metrics, logging) without pulling in
 * the emitter machinery.
 */

// ── Tool-level events ───────────────────────────────────────────────────────

export type BeforeToolCallPayload = {
    toolName: string;
    args: unknown;
    sessionId: string;
    stepNumber?: number;
};

export type AfterToolCallPayload = BeforeToolCallPayload & {
    success: boolean;
    output?: unknown;
    error?: unknown;
    durationMs: number;
};

// ── Agent-level events ──────────────────────────────────────────────────────

export type AgentStartPayload = {
    sessionId: string;
    provider: string;
    model?: string;
    path?: string;
};

export type AgentFinishPayload = {
    sessionId: string;
    provider: string;
    model?: string;
    path?: string;
    durationMs: number;
    steps?: number;
    finishReason?: string;
};

// ── Thinking-phase events ───────────────────────────────────────────────────

export type ThinkingCompletePayload = {
    sessionId: string;
    model: string;
    durationMs: number;
    planLength: number;
    usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
};

// ── Event name → payload mapping ────────────────────────────────────────────

export type AgentEvent =
    | 'beforeToolCall'
    | 'afterToolCall'
    | 'agentStart'
    | 'agentFinish'
    | 'thinkingComplete';

export type AgentEventPayloads = {
    beforeToolCall: BeforeToolCallPayload;
    afterToolCall: AfterToolCallPayload;
    agentStart: AgentStartPayload;
    agentFinish: AgentFinishPayload;
    thinkingComplete: ThinkingCompletePayload;
};
