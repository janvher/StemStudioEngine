/**
 * Session metrics recorder.
 * Ring buffer of recent sessions with aggregate statistics for operational visibility.
 */

const MAX_SESSIONS = 100;

export type SessionRecord = {
    id: string;
    sessionId: string;
    startedAt: number;
    completedAt: number;
    durationMs: number;
    provider: string;
    model?: string;
    path?: string;
    steps?: number;
    toolCalls?: Array<{ tool: string; durationMs: number; success: boolean }>;
    tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
    finishReason?: string;
    fallbackAttempts?: number;
    compressed?: boolean;
    loopDetected?: boolean;
    thinkingModel?: string;
    thinkingDurationMs?: number;
    thinkingTokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
};

const sessions: SessionRecord[] = [];
let idCounter = 0;

/** Record a completed session. */
export function recordSession(record: Omit<SessionRecord, 'id'>): void {
    const entry: SessionRecord = { id: `session-${++idCounter}`, ...record };
    sessions.push(entry);

    // Ring buffer: drop oldest when full
    if (sessions.length > MAX_SESSIONS) {
        sessions.shift();
    }
}

/** Get recent sessions (newest first). */
export function getRecentSessions(limit = 20): SessionRecord[] {
    return sessions.slice(-limit).reverse();
}

export type SessionStats = {
    total: number;
    avgDurationMs: number;
    avgSteps: number;
    providerUsage: Record<string, number>;
    topTools: Array<{ tool: string; count: number }>;
    errorRate: number;
    compressionRate: number;
    loopDetectionRate: number;
};

/** Compute aggregate statistics across all recorded sessions. */
export function getSessionStats(): SessionStats {
    const total = sessions.length;
    if (total === 0) {
        return {
            total: 0,
            avgDurationMs: 0,
            avgSteps: 0,
            providerUsage: {},
            topTools: [],
            errorRate: 0,
            compressionRate: 0,
            loopDetectionRate: 0,
        };
    }

    let totalDuration = 0;
    let totalSteps = 0;
    let errors = 0;
    let compressions = 0;
    let loops = 0;
    const providerUsage: Record<string, number> = {};
    const toolUsage: Record<string, number> = {};

    for (const session of sessions) {
        totalDuration += session.durationMs;
        totalSteps += session.steps ?? 0;
        providerUsage[session.provider] = (providerUsage[session.provider] || 0) + 1;

        if (session.finishReason === 'error') errors++;
        if (session.compressed) compressions++;
        if (session.loopDetected) loops++;

        if (session.toolCalls) {
            for (const tc of session.toolCalls) {
                toolUsage[tc.tool] = (toolUsage[tc.tool] || 0) + 1;
            }
        }
    }

    const topTools = Object.entries(toolUsage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tool, count]) => ({ tool, count }));

    return {
        total,
        avgDurationMs: Math.round(totalDuration / total),
        avgSteps: Math.round((totalSteps / total) * 10) / 10,
        providerUsage,
        topTools,
        errorRate: Math.round((errors / total) * 100) / 100,
        compressionRate: Math.round((compressions / total) * 100) / 100,
        loopDetectionRate: Math.round((loops / total) * 100) / 100,
    };
}
