/**
 * AgentEventBus — typed pub/sub for agent lifecycle events.
 *
 * Provides a central dispatch point for cross-cutting concerns (logging,
 * metrics, session recording, alerting) without coupling them to the agent
 * or tool execution code.
 *
 * Usage:
 *   import { agentEvents } from '../middleware/hooks/agent-events.js';
 *
 *   // Subscribe — returns an unsubscribe function
 *   const unsub = agentEvents.on('agentStart', (payload) => { ... });
 *
 *   // Emit — awaits all handlers, swallows errors
 *   await agentEvents.emit('agentFinish', { sessionId, provider, durationMs });
 *
 * Emitted from:
 *   - src/vercel-rest/agent.ts        — tool calls, agent start/finish, thinking phase
 *   - src/acp/index.ts      — ACP WebSocket session start/finish
 *
 * Consumed by:
 *   - src/vercel-rest/agent.ts        — loop detection (afterToolCall)
 *   - Session recorder, metrics, and any future observers
 *
 * Handler errors are caught and logged to stderr so they never crash the
 * agent or interrupt the request path.
 */

import type { AgentEvent, AgentEventPayloads } from './payloads.js';

export type { AgentEvent, AgentEventPayloads };
export type {
    BeforeToolCallPayload,
    AfterToolCallPayload,
    AgentStartPayload,
    AgentFinishPayload,
    ThinkingCompletePayload,
} from './payloads.js';

type Handler<T> = (payload: T) => void | Promise<void>;
type Unsubscribe = () => void;

class AgentEventBus {
    private handlers = new Map<AgentEvent, Set<Handler<any>>>();

    /** Subscribe to an event. Returns an unsubscribe function. */
    on<E extends AgentEvent>(event: E, handler: Handler<AgentEventPayloads[E]>): Unsubscribe {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event)!.add(handler);
        return () => {
            this.handlers.get(event)?.delete(handler);
        };
    }

    /** Emit an event to all subscribers. Errors are caught and logged. */
    async emit<E extends AgentEvent>(event: E, payload: AgentEventPayloads[E]): Promise<void> {
        const eventHandlers = this.handlers.get(event);
        if (!eventHandlers || eventHandlers.size === 0) return;

        for (const handler of eventHandlers) {
            try {
                await handler(payload);
            } catch (err) {
                // Use process.stderr directly to avoid circular dependency with createLogger
                process.stderr.write(
                    `[AgentEventBus] Error in ${event} handler: ${err instanceof Error ? err.message : String(err)}\n`,
                );
            }
        }
    }
}

/** Singleton instance shared across the application */
export const agentEvents = new AgentEventBus();
