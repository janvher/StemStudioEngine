import {HttpAIBackend, setAIBackend} from "@stem/editor-oss/ai";

import {backendUrlFromPath} from "../utils/UrlUtils";

let initialized = false;

/**
 * Wire the integrated build's AIBackend singleton so HTTP requests resolve
 * against `global.app.options.server` / Discord proxy via `backendUrlFromPath`,
 * matching the production-correct URL the editor has always used.
 *
 * OSS does not call this — its factory default falls back to same-origin,
 * which is the correct behaviour when the editor and ai-server share a host
 * (or run together under `bun run dev:oss`).
 *
 * Idempotent. Safe to call from multiple bootstrap paths.
 */
export function initIntegratedAIBackend(): void {
    if (initialized) return;
    setAIBackend(
        new HttpAIBackend({
            resolveUrl: (path: string) => backendUrlFromPath(path) ?? path,
        }),
    );
    initialized = true;
}
