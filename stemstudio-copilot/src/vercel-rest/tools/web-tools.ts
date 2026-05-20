/**
 * Controlled web research tools using Anthropic's native provider tools.
 *
 * Domain-restricted, opt-in, server-gated, rate-limited, read-only.
 * Only available when:
 *   1. WEB_RESEARCH_ENABLED=true (server gate)
 *   2. Client sends allowWebResearch: true (opt-in)
 *   3. Provider is 'anthropic' (only Anthropic supports these tools)
 *
 * Domain enforcement is handled by Anthropic's API via allowedDomains —
 * impossible to bypass from agent-side.
 */

import { anthropic } from '@ai-sdk/anthropic';
import type { ProviderName } from '../provider-config.js';

/** Domains allowed for gaming research + GitHub. No exceptions. */
const WEB_RESEARCH_ALLOWED_DOMAINS = [
    // GitHub
    'github.com',
    'gist.github.com',
    'raw.githubusercontent.com',
    'docs.github.com',
    // Game design & development
    'gamedeveloper.com',
    'gdcvault.com',
    'gamedev.net',
    'itch.io',
    'gamejolt.com',
    'indiedb.com',
    // Knowledge & reference
    'wikipedia.org',
    'stackoverflow.com',
    'developer.mozilla.org',
    'threejs.org',
    // Game news & analysis
    'polygon.com',
    'kotaku.com',
    'pcgamer.com',
    'eurogamer.net',
    // Dev communities
    'reddit.com',
    'dev.to',
    'medium.com',
    // Engine docs (concept transfer)
    'docs.unity3d.com',
    'docs.godotengine.org',
    'docs.unrealengine.com',
];

const DEFAULT_MAX_SEARCHES = 5;
const DEFAULT_MAX_FETCHES = 3;

/**
 * Create Anthropic provider web tools (search + fetch) with domain restrictions.
 * Returns an empty object for non-Anthropic providers.
 */
export function createWebTools(provider: ProviderName): Record<string, any> {
    if (provider !== 'anthropic') return {};

    const maxSearches = parseInt(process.env.WEB_RESEARCH_MAX_SEARCHES || '') || DEFAULT_MAX_SEARCHES;
    const maxFetches = parseInt(process.env.WEB_RESEARCH_MAX_FETCHES || '') || DEFAULT_MAX_FETCHES;

    return {
        web_search: anthropic.tools.webSearch_20250305({
            allowedDomains: WEB_RESEARCH_ALLOWED_DOMAINS,
            maxUses: maxSearches,
        }),
        web_fetch: anthropic.tools.webFetch_20250910({
            allowedDomains: WEB_RESEARCH_ALLOWED_DOMAINS,
            maxUses: maxFetches,
            citations: { enabled: true },
        }),
    };
}

/** Check if web research is enabled at the server level. */
export function isWebResearchEnabled(): boolean {
    return process.env.WEB_RESEARCH_ENABLED === 'true';
}
