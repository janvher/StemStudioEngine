/**
 * Tool loop detection adapted from OpenClaw's tool-loop-detection.ts.
 * Detects when the AI agent is stuck repeating the same tool calls without progress.
 *
 * Three detectors:
 * 1. Generic Repeat — same tool+params called N times
 * 2. Ping-Pong — alternating A→B→A→B pattern with no progress
 * 3. Global Circuit Breaker — blocks after N identical no-progress outcomes
 */

import { createHash } from 'node:crypto';

export type LoopDetectorKind = 'generic_repeat' | 'ping_pong' | 'global_circuit_breaker';

export type LoopDetectionResult =
    | { stuck: false }
    | {
          stuck: true;
          level: 'warning' | 'critical';
          detector: LoopDetectorKind;
          count: number;
          message: string;
      };

export type LoopDetectionConfig = {
    historySize?: number;
    warningThreshold?: number;
    criticalThreshold?: number;
    globalCircuitBreakerThreshold?: number;
};

const DEFAULTS = {
    historySize: 30,
    warningThreshold: 5,
    criticalThreshold: 10,
    globalCircuitBreakerThreshold: 15,
};

type ToolCallRecord = {
    toolName: string;
    argsHash: string;
    resultHash?: string;
    timestamp: number;
};

export type LoopDetectionState = {
    toolCallHistory: ToolCallRecord[];
};

export function createLoopDetectionState(): LoopDetectionState {
    return { toolCallHistory: [] };
}

/** Stable hash of tool name + params for pattern matching */
function hashToolCall(toolName: string, params: unknown): string {
    return `${toolName}:${digestStable(params)}`;
}

function digestStable(value: unknown): string {
    const serialized = stableStringify(value);
    return createHash('sha256').update(serialized).digest('hex').slice(0, 16);
}

function stableStringify(value: unknown): string {
    if (value === null || value === undefined) return String(value);
    if (typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

function hashOutcome(result: unknown, error: unknown): string | undefined {
    if (error !== undefined) {
        const msg = error instanceof Error ? error.message : stableStringify(error);
        return `error:${digestStable(msg)}`;
    }
    if (result === undefined) return undefined;
    return digestStable(result);
}

/** Count consecutive identical no-progress calls from the end of history */
function getNoProgressStreak(
    history: ToolCallRecord[],
    toolName: string,
    argsHash: string,
): { count: number; latestResultHash?: string } {
    let streak = 0;
    let latestResultHash: string | undefined;

    for (let i = history.length - 1; i >= 0; i--) {
        const record = history[i];
        if (record.toolName !== toolName || record.argsHash !== argsHash) continue;
        if (!record.resultHash) continue;

        if (!latestResultHash) {
            latestResultHash = record.resultHash;
            streak = 1;
            continue;
        }
        if (record.resultHash !== latestResultHash) break;
        streak++;
    }

    return { count: streak, latestResultHash };
}

/** Detect A→B→A→B alternating patterns */
function getPingPongStreak(
    history: ToolCallRecord[],
    currentHash: string,
): { count: number; noProgressEvidence: boolean } {
    if (history.length < 3) return { count: 0, noProgressEvidence: false };

    const last = history[history.length - 1];
    if (!last) return { count: 0, noProgressEvidence: false };

    // Find the "other" signature
    let otherHash: string | undefined;
    for (let i = history.length - 2; i >= 0; i--) {
        if (history[i].argsHash !== last.argsHash) {
            otherHash = history[i].argsHash;
            break;
        }
    }

    if (!otherHash) return { count: 0, noProgressEvidence: false };

    // Count alternating tail
    let count = 0;
    for (let i = history.length - 1; i >= 0; i--) {
        const expected = count % 2 === 0 ? last.argsHash : otherHash;
        if (history[i].argsHash !== expected) break;
        count++;
    }

    if (count < 2) return { count: 0, noProgressEvidence: false };

    // Check if the incoming call continues the pattern
    const expectedNext = count % 2 === 0 ? last.argsHash : otherHash;
    if (currentHash !== expectedNext) return { count: 0, noProgressEvidence: false };

    // Check no-progress evidence
    const tailStart = Math.max(0, history.length - count);
    let firstA: string | undefined;
    let firstB: string | undefined;
    let noProgress = true;

    for (let i = tailStart; i < history.length; i++) {
        const call = history[i];
        if (!call.resultHash) { noProgress = false; break; }
        if (call.argsHash === last.argsHash) {
            if (!firstA) firstA = call.resultHash;
            else if (firstA !== call.resultHash) { noProgress = false; break; }
        } else {
            if (!firstB) firstB = call.resultHash;
            else if (firstB !== call.resultHash) { noProgress = false; break; }
        }
    }

    return { count: count + 1, noProgressEvidence: noProgress && !!firstA && !!firstB };
}

/**
 * Check if the agent is stuck in a loop before executing a tool call.
 */
export function detectToolCallLoop(
    state: LoopDetectionState,
    toolName: string,
    params: unknown,
    config?: LoopDetectionConfig,
): LoopDetectionResult {
    const cfg = { ...DEFAULTS, ...config };
    const history = state.toolCallHistory;
    const currentHash = hashToolCall(toolName, params);
    const noProgress = getNoProgressStreak(history, toolName, currentHash);
    const pingPong = getPingPongStreak(history, currentHash);

    // Global circuit breaker
    if (noProgress.count >= cfg.globalCircuitBreakerThreshold) {
        return {
            stuck: true,
            level: 'critical',
            detector: 'global_circuit_breaker',
            count: noProgress.count,
            message: `CRITICAL: ${toolName} has repeated ${noProgress.count} times with identical results. Stopping to prevent runaway loops. Try a different approach.`,
        };
    }

    // Ping-pong critical
    if (pingPong.count >= cfg.criticalThreshold && pingPong.noProgressEvidence) {
        return {
            stuck: true,
            level: 'critical',
            detector: 'ping_pong',
            count: pingPong.count,
            message: `CRITICAL: Alternating tool call pattern detected (${pingPong.count} consecutive calls) with no progress. Try a different approach.`,
        };
    }

    // Generic repeat critical
    const recentCount = history.filter((h) => h.toolName === toolName && h.argsHash === currentHash).length;
    if (recentCount >= cfg.criticalThreshold) {
        return {
            stuck: true,
            level: 'critical',
            detector: 'generic_repeat',
            count: recentCount,
            message: `CRITICAL: ${toolName} called ${recentCount} times with identical arguments. Stopping. Try a different approach.`,
        };
    }

    // Warnings
    if (pingPong.count >= cfg.warningThreshold) {
        return {
            stuck: true,
            level: 'warning',
            detector: 'ping_pong',
            count: pingPong.count,
            message: `WARNING: Alternating tool call pattern (${pingPong.count} calls). If not making progress, try a different approach.`,
        };
    }

    if (recentCount >= cfg.warningThreshold) {
        return {
            stuck: true,
            level: 'warning',
            detector: 'generic_repeat',
            count: recentCount,
            message: `WARNING: ${toolName} called ${recentCount} times with identical arguments. If not making progress, try a different approach.`,
        };
    }

    return { stuck: false };
}

/**
 * Record a tool call in the session's history.
 */
export function recordToolCall(
    state: LoopDetectionState,
    toolName: string,
    params: unknown,
    config?: LoopDetectionConfig,
): void {
    const cfg = { ...DEFAULTS, ...config };
    state.toolCallHistory.push({
        toolName,
        argsHash: hashToolCall(toolName, params),
        timestamp: Date.now(),
    });

    // Maintain sliding window
    if (state.toolCallHistory.length > cfg.historySize) {
        state.toolCallHistory.shift();
    }
}

/**
 * Record the outcome of a tool call for no-progress detection.
 */
export function recordToolCallOutcome(
    state: LoopDetectionState,
    toolName: string,
    params: unknown,
    result?: unknown,
    error?: unknown,
): void {
    const argsHash = hashToolCall(toolName, params);
    const resultHash = hashOutcome(result, error);
    if (!resultHash) return;

    // Find the most recent matching call without a result hash
    for (let i = state.toolCallHistory.length - 1; i >= 0; i--) {
        const call = state.toolCallHistory[i];
        if (call.toolName === toolName && call.argsHash === argsHash && !call.resultHash) {
            call.resultHash = resultHash;
            break;
        }
    }
}
