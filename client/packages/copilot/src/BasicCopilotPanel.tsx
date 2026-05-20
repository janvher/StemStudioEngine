import {useCallback, useEffect, useRef, useState} from "react";

import {useCopilot} from "./CopilotContext";
import type {CopilotMessage} from "./types";

/**
 * Minimal chat panel for the open-source editor distribution.
 *
 * Consumes a CopilotProvider through `useCopilot()` and renders a basic
 * conversation interface — message log + composer. Forks that don't have
 * access to StemStudio's internal ACP/Claude panel
 * (`web/packages/shared/src/editor/assets/v2/AiCopilot/AiCopilot.tsx`)
 * can render this component instead.
 *
 * Intentionally style-light: a single self-contained CSS-in-style block
 * so this works without pulling in the editor's design system. Forks
 * can wrap or replace it as needed.
 */

export interface BasicCopilotPanelProps {
    /** Optional title shown at the top of the panel. */
    title?: string;
    /** Optional system prompt sent on every turn. */
    systemPrompt?: string;
    /** Session ID. Defaults to a stable per-mount value. */
    sessionId?: string;
    /** Placeholder text in the composer. */
    placeholder?: string;
    /** Called whenever a turn finishes (whether successfully or with an error). */
    onTurnComplete?: () => void;
}

interface UiMessage {
    id: string;
    role: CopilotMessage["role"];
    content: string;
    error?: boolean;
}

const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const BasicCopilotPanel = ({
    title = "AI Copilot",
    systemPrompt,
    sessionId,
    placeholder = "Ask the assistant…",
    onTurnComplete,
}: BasicCopilotPanelProps) => {
    const provider = useCopilot();
    const [messages, setMessages] = useState<UiMessage[]>([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [connected, setConnected] = useState(false);
    const sessionIdRef = useRef(sessionId ?? generateId());
    const logRef = useRef<HTMLDivElement | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Connect on mount, disconnect on unmount.
    useEffect(() => {
        let cancelled = false;
        void provider
            .connect({sessionId: sessionIdRef.current, systemPrompt})
            .then(() => {
                if (!cancelled) setConnected(true);
            })
            .catch(err => {
                if (cancelled) return;
                setMessages(prev => [
                    ...prev,
                    {
                        id: generateId(),
                        role: "assistant",
                        content: `Failed to connect to copilot: ${(err as Error).message}`,
                        error: true,
                    },
                ]);
            });
        return () => {
            cancelled = true;
            void provider.disconnect();
        };
    }, [provider, systemPrompt]);

    // Autoscroll the log on new messages.
    useEffect(() => {
        const node = logRef.current;
        if (!node) return;
        node.scrollTop = node.scrollHeight;
    }, [messages]);

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            const trimmed = input.trim();
            if (!trimmed || busy) return;

            const userMessage: UiMessage = {id: generateId(), role: "user", content: trimmed};
            const assistantMessage: UiMessage = {id: generateId(), role: "assistant", content: ""};
            setMessages(prev => [...prev, userMessage, assistantMessage]);
            setInput("");
            setBusy(true);

            const history: CopilotMessage[] = messages.map(m => ({role: m.role, content: m.content}));
            const controller = new AbortController();
            abortRef.current = controller;

            try {
                for await (const chunk of provider.sendMessage(trimmed, history, controller.signal)) {
                    if (chunk.type === "text") {
                        setMessages(prev =>
                            prev.map(m =>
                                m.id === assistantMessage.id ? {...m, content: m.content + chunk.text} : m,
                            ),
                        );
                    } else if (chunk.type === "error") {
                        setMessages(prev =>
                            prev.map(m =>
                                m.id === assistantMessage.id ? {...m, content: chunk.error, error: true} : m,
                            ),
                        );
                    } else if (chunk.type === "done") {
                        break;
                    }
                }
            } catch (err) {
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantMessage.id
                            ? {...m, content: `Error: ${(err as Error).message}`, error: true}
                            : m,
                    ),
                );
            } finally {
                setBusy(false);
                abortRef.current = null;
                onTurnComplete?.();
            }
        },
        [busy, input, messages, onTurnComplete, provider],
    );

    const handleCancel = useCallback(() => {
        abortRef.current?.abort();
        provider.cancel?.();
    }, [provider]);

    return (
        <div style={styles.root}>
            <div style={styles.header}>
                <span>{title}</span>
                <span
                    aria-label={connected ? "connected" : "disconnected"}
                    title={connected ? "Connected" : "Disconnected"}
                    style={{
                        ...styles.dot,
                        backgroundColor: connected ? "#42d392" : "#888",
                    }}
                />
            </div>

            <div ref={logRef} style={styles.log}>
                {messages.length === 0 && (
                    <div style={styles.empty}>Send a message to start the conversation.</div>
                )}
                {messages.map(message => (
                    <div
                        key={message.id}
                        style={{
                            ...styles.message,
                            ...(message.role === "user" ? styles.user : styles.assistant),
                            ...(message.error ? styles.errorMessage : {}),
                        }}
                    >
                        {message.content || (message.role === "assistant" && busy ? "…" : "")}
                    </div>
                ))}
            </div>

            <form onSubmit={handleSubmit} style={styles.composer}>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={placeholder}
                    disabled={busy}
                    style={styles.input}
                />
                {busy ? (
                    <button type="button" onClick={handleCancel} style={styles.button}>
                        Stop
                    </button>
                ) : (
                    <button type="submit" disabled={!input.trim()} style={styles.button}>
                        Send
                    </button>
                )}
            </form>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    root: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#1a1a1f",
        color: "#e8e8ea",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: "13px",
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid #2a2a30",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 14px",
        background: "#22222a",
        borderBottom: "1px solid #2a2a30",
        fontWeight: 600,
    },
    dot: {
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
    },
    log: {
        flex: 1,
        overflowY: "auto",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
    },
    empty: {
        textAlign: "center",
        color: "#777",
        marginTop: 24,
    },
    message: {
        padding: "8px 12px",
        borderRadius: 8,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        maxWidth: "92%",
        lineHeight: 1.4,
    },
    user: {
        background: "#3b3b48",
        alignSelf: "flex-end",
    },
    assistant: {
        background: "#252531",
        alignSelf: "flex-start",
    },
    errorMessage: {
        background: "#4a1f1f",
        color: "#ffcccc",
    },
    composer: {
        display: "flex",
        gap: 8,
        padding: "10px 14px",
        borderTop: "1px solid #2a2a30",
        background: "#22222a",
    },
    input: {
        flex: 1,
        padding: "8px 12px",
        borderRadius: 6,
        border: "1px solid #3a3a44",
        background: "#1a1a22",
        color: "#e8e8ea",
        fontSize: "13px",
        outline: "none",
    },
    button: {
        padding: "8px 16px",
        borderRadius: 6,
        border: "none",
        background: "#4f46e5",
        color: "#fff",
        fontSize: "13px",
        fontWeight: 500,
        cursor: "pointer",
    },
};
