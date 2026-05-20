/**
 * Scene context auto-injection.
 * Fetches current scene state from Studio and produces a compact summary
 * for inclusion in the system prompt. Eliminates the need for the agent to
 * always manually call get_scene_objects as its first step.
 *
 * Includes a TTL cache to avoid redundant HTTP fetches during rapid
 * multi-turn tool call sequences. Cache is invalidated when mutating
 * commands are executed.
 */

import { STUDIO_API_BASE } from '../../utils/config.js';

const MAX_CONTEXT_CHARS = 5000; // ~1250 tokens — room for behavior configs + physics info
const CACHE_TTL_MS = 10_000; // 10 seconds

type SceneObject = {
    name?: string;
    type?: string;
    id?: string;
    children?: SceneObject[];
    behaviors?: Array<{
        name?: string;
        id?: string;
        config?: Record<string, unknown>;
        enabled?: boolean;
    }>;
    physics?: {
        enabled?: boolean;
        bodyType?: string;
        shape?: string;
        mass?: number;
    };
    position?: { x: number; y: number; z: number };
    material?: { color?: string; opacity?: number };
};

/** TTL cache keyed by sessionId */
const contextCache = new Map<string, { summary: string; fetchedAt: number }>();

// MUTATING_COMMANDS is now derived from apiRequestConfigs in generate-tools.ts

function toDisplayValue(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') return '{}';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return value.toString();
    }
    return (value as any).description ?? 'Symbol()';
}

/** Invalidate cached scene context for a session (call after mutating tool calls). */
export function invalidateSceneContext(sessionId: string): void {
    contextCache.delete(sessionId);
}

/**
 * Fetch scene objects and produce a human-readable summary.
 * Returns undefined if the session is unavailable.
 * Uses a TTL cache to avoid redundant fetches in rapid tool-call sequences.
 */
export async function getSceneContextSummary(sessionId: string, forceRefresh = false): Promise<string | undefined> {
    // Check cache
    if (!forceRefresh) {
        const cached = contextCache.get(sessionId);
        if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
            return cached.summary;
        }
    }

    try {
        // 5s timeout — don't block the agent
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${STUDIO_API_BASE}/objects/${sessionId}`, {
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return undefined;
        }

        const data = await response.json();
        const summary = summarizeScene(data);

        // Store in cache
        if (summary) {
            contextCache.set(sessionId, { summary, fetchedAt: Date.now() });
        }

        return summary;
    } catch {
        // Session not available or Studio not connected — that's fine
        return undefined;
    }
}

function summarizeScene(data: unknown): string {
    if (!data) return 'Empty scene.';

    const objects = Array.isArray(data) ? data : (data as any)?.objects || (data as any)?.items || [];
    if (!Array.isArray(objects) || objects.length === 0) {
        return 'Scene is empty (no objects).';
    }

    const lines: string[] = [];
    lines.push(`Scene contains ${objects.length} root object(s):`);

    // Collect stats
    let totalObjects = 0;
    let physicsEnabled = 0;
    let behaviorsAttached = 0;
    const typeCount: Record<string, number> = {};

    function walkObjects(objs: SceneObject[], depth: number) {
        for (const obj of objs) {
            totalObjects++;
            const objType = obj.type || 'unknown';
            typeCount[objType] = (typeCount[objType] || 0) + 1;

            if (obj.physics?.enabled) physicsEnabled++;
            if (obj.behaviors && obj.behaviors.length > 0) behaviorsAttached += obj.behaviors.length;

            // Show top-level and second-level objects with detail
            if (depth <= 1) {
                const indent = depth === 0 ? '  ' : '    ';
                const childCount = obj.children?.length || 0;
                const parts = [obj.name || obj.id || 'unnamed'];
                parts.push(`type=${objType}`);
                if (childCount > 0) parts.push(`children=${childCount}`);

                // Behavior details with key config values
                if (obj.behaviors && obj.behaviors.length > 0) {
                    const behaviorDetails = obj.behaviors.map((b) => {
                        const name = b.name || b.id || '?';
                        const config = b.config;
                        if (config && typeof config === 'object') {
                            const keyVals = Object.entries(config)
                                .slice(0, 3) // limit to 3 most relevant config values
                                .map(([k, v]) => `${k}=${toDisplayValue(v)}`)
                                .join(',');
                            return keyVals ? `${name}(${keyVals})` : name;
                        }
                        return name;
                    }).join(', ');
                    parts.push(`behaviors=[${behaviorDetails}]`);
                }

                // Physics details
                if (obj.physics?.enabled) {
                    const pParts = ['on'];
                    if (obj.physics.bodyType) pParts.push(obj.physics.bodyType);
                    if (obj.physics.shape) pParts.push(obj.physics.shape);
                    if (obj.physics.mass !== undefined) pParts.push(`mass=${obj.physics.mass}`);
                    parts.push(`physics=${pParts.join('/')}`);
                }

                lines.push(`${indent}- ${parts.join(', ')}`);
            }

            if (obj.children) {
                walkObjects(obj.children, depth + 1);
            }
        }
    }

    walkObjects(objects, 0);

    // Summary stats
    lines.push('');
    lines.push('Summary:');
    lines.push(`  Total objects: ${totalObjects}`);
    if (physicsEnabled > 0) lines.push(`  Physics-enabled: ${physicsEnabled}`);
    if (behaviorsAttached > 0) lines.push(`  Behaviors attached: ${behaviorsAttached}`);

    const types = Object.entries(typeCount)
        .sort((a, b) => b[1] - a[1])
        .map(([t, c]) => `${t}(${c})`)
        .join(', ');
    lines.push(`  Types: ${types}`);

    // Truncate if too long
    let result = lines.join('\n');
    if (result.length > MAX_CONTEXT_CHARS) {
        result = result.slice(0, MAX_CONTEXT_CHARS) + '\n  ... (truncated)';
    }

    return result;
}
