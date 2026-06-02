// Playground copilot key plumbing.
//
// In the public-site playground there is no Go AI server — the copilot talks
// to the AI provider directly from the browser using a key the visitor
// supplies via the BYOK panel. These helpers answer two questions:
//
//   1. `hasCopilotKeysSync()` — a *synchronous* "is a chat key configured?"
//      check, backed by a localStorage marker. The editor-mode resolver runs
//      synchronously on scene load and cannot await IndexedDB, so it reads the
//      marker instead. The marker is refreshed asynchronously at bootstrap and
//      whenever the BYOK panel saves/clears a key.
//   2. `resolveCopilotChatKey()` — the actual decrypted key + provider used to
//      make requests, read from the BYOK key store on demand.

import {getBYOKKeyStore} from "../ai";
import type {AIProvider} from "../ai";

/**
 * Providers that can back the playground copilot. Ordered for stable UI and
 * legacy fallback behavior.
 */
export type CopilotChatProvider = Extract<AIProvider, "anthropic" | "openai" | "gemini">;

export const CHAT_PROVIDERS: ReadonlyArray<CopilotChatProvider> = [
    "anthropic",
    "openai",
    "gemini",
];

const COPILOT_READY_MARKER = "stem.playground.copilotReady";
const COPILOT_SELECTED_PROVIDER = "stem.playground.copilot.selectedProvider";
export const COPILOT_KEYS_CHANGED_EVENT = "stem:playground-copilot-keys-changed";

export const COPILOT_DEFAULT_MODELS: Record<CopilotChatProvider, string> = {
    anthropic: "claude-sonnet-4-5-20250929",
    openai: "gpt-5.2-codex",
    gemini: "gemini-2.5-flash",
};

export const COPILOT_MODEL_OPTIONS: Record<CopilotChatProvider, Array<{label: string; model: string}>> = {
    anthropic: [
        {label: "Claude Sonnet 4.5", model: "claude-sonnet-4-5-20250929"},
        {label: "Claude Sonnet 4", model: "claude-sonnet-4-20250514"},
        {label: "Claude Opus 4.5", model: "claude-opus-4-5-20251101"},
        {label: "Claude Haiku 4.5", model: "claude-haiku-4-5-20251001"},
    ],
    openai: [
        {label: "GPT-5.2 Codex", model: "gpt-5.2-codex"},
        {label: "GPT-5.1 Codex", model: "gpt-5.1-codex"},
        {label: "GPT-5.2", model: "gpt-5.2"},
        {label: "GPT-5.2 Chat", model: "gpt-5.2-chat-latest"},
    ],
    gemini: [
        {label: "Gemini 2.5 Flash", model: "gemini-2.5-flash"},
        {label: "Gemini 2.5 Pro", model: "gemini-2.5-pro"},
        {label: "Gemini Flash Latest", model: "gemini-flash-latest"},
        {label: "Gemini 3 Flash Preview", model: "gemini-3-flash-preview"},
    ],
};

export type CopilotChatKey = {
    provider: CopilotChatProvider;
    apiKey: string;
    model: string;
};

function getLocalStorage(): Storage | undefined {
    return typeof window === "undefined" ? undefined : window.localStorage;
}

/**
 * Synchronous best-effort answer to "can the playground copilot run?". Reads
 * the localStorage marker written by `refreshCopilotKeysMarker()`. When the
 * marker has never been written (first load before the async refresh lands)
 * this returns `false`, which makes AI-prompt projects fall back to advanced
 * mode until a key is confirmed — the intended conservative default.
 */
export function hasCopilotKeysSync(): boolean {
    const storage = getLocalStorage();
    if (!storage) return false;
    try {
        return storage.getItem(COPILOT_READY_MARKER) === "1";
    } catch {
        return false;
    }
}

function notifyKeysChanged(): void {
    if (typeof window === "undefined") return;
    try {
        window.dispatchEvent(new Event(COPILOT_KEYS_CHANGED_EVENT));
    } catch {
        // Ignore environments that do not support Event construction.
    }
}

function writeMarker(ready: boolean): void {
    const storage = getLocalStorage();
    if (!storage) return;
    try {
        if (ready) storage.setItem(COPILOT_READY_MARKER, "1");
        else storage.removeItem(COPILOT_READY_MARKER);
    } catch {
        // Ignore storage failures (private mode, denied access, quota).
    }
}

function modelStorageKey(provider: CopilotChatProvider): string {
    return `stem.playground.copilot.${provider}Model`;
}

function readProviderModel(provider: CopilotChatProvider): string {
    const storage = getLocalStorage();
    if (!storage) return COPILOT_DEFAULT_MODELS[provider];
    try {
        const override = storage.getItem(modelStorageKey(provider))?.trim();
        return override || COPILOT_DEFAULT_MODELS[provider];
    } catch {
        return COPILOT_DEFAULT_MODELS[provider];
    }
}

function readSelectedProvider(): CopilotChatProvider | null {
    const storage = getLocalStorage();
    if (!storage) return null;
    try {
        const provider = storage.getItem(COPILOT_SELECTED_PROVIDER);
        return CHAT_PROVIDERS.includes(provider as CopilotChatProvider)
            ? provider as CopilotChatProvider
            : null;
    } catch {
        return null;
    }
}

export function getCopilotModelSelectionSync(): {provider: CopilotChatProvider; model: string} | null {
    const provider = readSelectedProvider();
    return provider ? {provider, model: readProviderModel(provider)} : null;
}

export function setCopilotModelSelection(provider: CopilotChatProvider, model?: string): void {
    const storage = getLocalStorage();
    if (!storage) return;
    try {
        storage.setItem(COPILOT_SELECTED_PROVIDER, provider);
        if (model?.trim()) {
            storage.setItem(modelStorageKey(provider), model.trim());
        }
    } catch {
        // Ignore storage failures.
    }
}

export type CopilotChatKeyChoice =
    | {kind: "none"; keys: []}
    | {kind: "ready"; key: CopilotChatKey; keys: CopilotChatKey[]}
    | {kind: "needs-selection"; keys: CopilotChatKey[]};

/**
 * Resolve every chat-capable BYOK key currently available to the direct
 * playground copilot.
 */
export async function resolveCopilotChatKeys(): Promise<CopilotChatKey[]> {
    const store = getBYOKKeyStore();
    if (!store) return [];
    let keys: Partial<Record<AIProvider, string>>;
    try {
        keys = await store.all();
    } catch {
        return [];
    }
    const available: CopilotChatKey[] = [];
    for (const provider of CHAT_PROVIDERS) {
        const apiKey = keys[provider]?.trim();
        if (apiKey) available.push({provider, apiKey, model: readProviderModel(provider)});
    }
    return available;
}

export async function resolveCopilotChatKeyChoice(): Promise<CopilotChatKeyChoice> {
    const keys = await resolveCopilotChatKeys();
    if (keys.length === 0) return {kind: "none", keys: []};
    if (keys.length === 1) return {kind: "ready", key: keys[0]!, keys};

    const selectedProvider = readSelectedProvider();
    const selectedKey = selectedProvider
        ? keys.find(key => key.provider === selectedProvider)
        : undefined;
    if (selectedKey) return {kind: "ready", key: selectedKey, keys};

    return {kind: "needs-selection", keys};
}

/**
 * Resolve the chat key to use for direct provider calls. Returns `null` when
 * no chat-capable key is configured, the encrypted store is locked, or multiple
 * chat keys exist without a chosen copilot model.
 */
export async function resolveCopilotChatKey(): Promise<CopilotChatKey | null> {
    const choice = await resolveCopilotChatKeyChoice();
    return choice.kind === "ready" ? choice.key : null;
}

/**
 * Re-read the BYOK store and update the synchronous marker. Returns whether a
 * chat key is currently configured. Call at bootstrap and after any key
 * mutation.
 */
export async function refreshCopilotKeysMarker(): Promise<boolean> {
    const ready = (await resolveCopilotChatKeys()).length > 0;
    writeMarker(ready);
    notifyKeysChanged();
    return ready;
}
