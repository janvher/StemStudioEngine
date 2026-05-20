import type {Message} from "./utils/history";

const WORKSPACE_CHAT_SNAPSHOT_PREFIX = "ai_copilot_workspace_chat_snapshot";
const MAX_STORED_MESSAGES = 80;
const MAX_MESSAGE_CHARS = 20_000;

export type WorkspaceChatSnapshot = {
    sceneID: string;
    sessionID?: string | null;
    updatedAt: number;
    messages: Message[];
};

type StoredWorkspaceMessage = {
    id: string;
    type: Message["type"];
    content: string;
    timestamp: number;
};

type StoredWorkspaceChatSnapshot = {
    sceneID: string;
    sessionID?: string | null;
    updatedAt: number;
    messages: StoredWorkspaceMessage[];
};

const storageKey = (sceneID: string, sessionID?: string | null): string => {
    const safeSceneID = encodeURIComponent(sceneID);
    if (!sessionID) return `${WORKSPACE_CHAT_SNAPSHOT_PREFIX}:${safeSceneID}:latest`;
    return `${WORKSPACE_CHAT_SNAPSHOT_PREFIX}:${safeSceneID}:session:${encodeURIComponent(sessionID)}`;
};

const normalizeText = (value: unknown, limit: number): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.length > limit ? `${trimmed.slice(0, limit).trim()}...` : trimmed;
};

const normalizeMessageType = (value: unknown): Message["type"] | null => {
    if (value === "user" || value === "agent" || value === "thought") return value;
    if (value === "interactive") return "agent";
    return null;
};

const serializeMessage = (message: Message): StoredWorkspaceMessage | null => {
    const type = normalizeMessageType(message.type);
    const content = normalizeText(message.content, MAX_MESSAGE_CHARS);
    if (!type || !content) return null;

    return {
        id: message.id,
        type,
        content,
        timestamp: Number.isFinite(message.timestamp) ? message.timestamp : Date.now(),
    };
};

const deserializeMessage = (message: unknown): Message | null => {
    if (!message || typeof message !== "object") return null;
    const value = message as Partial<StoredWorkspaceMessage>;
    const type = normalizeMessageType(value.type);
    const content = normalizeText(value.content, MAX_MESSAGE_CHARS);
    if (!type || !content) return null;

    return {
        id: typeof value.id === "string" && value.id ? value.id : `workspace-${Date.now()}`,
        type,
        content,
        timestamp: typeof value.timestamp === "number" && Number.isFinite(value.timestamp)
            ? value.timestamp
            : 0,
    };
};

const writeSnapshot = (snapshot: StoredWorkspaceChatSnapshot) => {
    if (typeof window === "undefined") return;
    try {
        const serialized = JSON.stringify(snapshot);
        window.localStorage.setItem(storageKey(snapshot.sceneID), serialized);
        if (snapshot.sessionID) {
            window.localStorage.setItem(storageKey(snapshot.sceneID, snapshot.sessionID), serialized);
        }
    } catch (error) {
        console.warn("[workspaceChatSnapshot] Failed to write workspace chat snapshot:", error);
    }
};

export const saveWorkspaceChatSnapshot = (input: {
    sceneID: string | null | undefined;
    sessionID?: string | null;
    messages: Message[];
}) => {
    const sceneID = input.sceneID?.trim();
    if (!sceneID || input.messages.length === 0 || typeof window === "undefined") return;

    const messages = input.messages
        .slice(-MAX_STORED_MESSAGES)
        .map(serializeMessage)
        .filter((message): message is StoredWorkspaceMessage => Boolean(message));
    if (messages.length === 0) return;

    writeSnapshot({
        sceneID,
        sessionID: input.sessionID || null,
        updatedAt: Date.now(),
        messages,
    });
};

export const readWorkspaceChatSnapshot = (
    sceneID: string | null | undefined,
    sessionID?: string | null,
): WorkspaceChatSnapshot | null => {
    const normalizedSceneID = sceneID?.trim();
    if (!normalizedSceneID || typeof window === "undefined") return null;

    const raw = window.localStorage.getItem(storageKey(normalizedSceneID, sessionID));
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as Partial<StoredWorkspaceChatSnapshot>;
        if (parsed.sceneID !== normalizedSceneID) return null;

        const messages = Array.isArray(parsed.messages)
            ? parsed.messages
                .map(deserializeMessage)
                .filter((message): message is Message => Boolean(message))
            : [];
        if (messages.length === 0) return null;

        return {
            sceneID: normalizedSceneID,
            sessionID: typeof parsed.sessionID === "string" ? parsed.sessionID : null,
            updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
            messages,
        };
    } catch (error) {
        console.warn("[workspaceChatSnapshot] Failed to read workspace chat snapshot:", error);
        return null;
    }
};
