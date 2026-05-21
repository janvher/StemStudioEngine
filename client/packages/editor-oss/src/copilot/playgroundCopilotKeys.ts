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
 * Providers that can back a conversational copilot. Ordered by preference —
 * `resolveCopilotChatKey()` returns the first one with a usable key.
 */
const CHAT_PROVIDERS: ReadonlyArray<Extract<AIProvider, "anthropic" | "openai">> = [
    "anthropic",
    "openai",
];

const COPILOT_READY_MARKER = "stem.playground.copilotReady";

export type CopilotChatKey = {
    provider: "anthropic" | "openai";
    apiKey: string;
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

/**
 * Resolve the chat key to use for direct provider calls. Returns `null` when
 * no chat-capable key is configured (or the encrypted store is locked).
 */
export async function resolveCopilotChatKey(): Promise<CopilotChatKey | null> {
    const store = getBYOKKeyStore();
    if (!store) return null;
    let keys: Partial<Record<AIProvider, string>>;
    try {
        keys = await store.all();
    } catch {
        return null;
    }
    for (const provider of CHAT_PROVIDERS) {
        const apiKey = keys[provider]?.trim();
        if (apiKey) return {provider, apiKey};
    }
    return null;
}

/**
 * Re-read the BYOK store and update the synchronous marker. Returns whether a
 * chat key is currently configured. Call at bootstrap and after any key
 * mutation.
 */
export async function refreshCopilotKeysMarker(): Promise<boolean> {
    const ready = (await resolveCopilotChatKey()) !== null;
    writeMarker(ready);
    return ready;
}
