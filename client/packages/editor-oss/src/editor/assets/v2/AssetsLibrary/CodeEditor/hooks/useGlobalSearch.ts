import {useState, useCallback, useRef, useEffect} from "react";

import type {AssetTreeEntry, AssetTreeFolders} from "./useAssetTree";
import {useGetBehaviorRevisionData} from "../../../../../behaviors/hooks/behaviors";
import {useGetLambdaRevisionData} from "../../../../../lambdas/hooks/lambdas";
import {useGetScriptRevisionData} from "../../../../../scripts/hooks/scripts";
import type {AssetKind} from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GlobalSearchMatch {
    lineNumber: number;
    text: string;
}

export interface GlobalSearchResult {
    kind: AssetKind;
    id: string;
    name: string;
    matches: GlobalSearchMatch[];
}

export interface UseGlobalSearchArgs {
    folders: AssetTreeFolders;
    batchSize?: number;
}

export interface UseGlobalSearchReturn {
    search: (term: string) => GlobalSearchResult[];
    isLoading: boolean;
    loadedCount: number;
    totalCount: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Cross-file content search for behaviors, lambdas, and import assets.
 *
 * Reuses the prefetch + cache pattern from `useBehaviorSearch`:
 * - Prefetches code for all behaviors and lambdas in batches
 * - Caches by `{kind}:{id}:{revisionId}`
 * - `search(term)` scans cached code and returns line-level matches
 *
 * File assets are excluded because they are read-only and not all are
 * guaranteed to be text.
 * @param root0
 * @param root0.folders
 * @param root0.batchSize
 */
export function useGlobalSearch({folders, batchSize = 3}: UseGlobalSearchArgs): UseGlobalSearchReturn {
    const [loadedCount, setLoadedCount] = useState(0);
    const cacheRef = useRef<Map<string, string>>(new Map());
    const fetchingRef = useRef<Set<string>>(new Set());
    const abortRef = useRef<AbortController | null>(null);

    const getBehaviorRevisionData = useGetBehaviorRevisionData();
    const getScriptRevisionData = useGetScriptRevisionData();
    const getLambdaRevisionData = useGetLambdaRevisionData();

    const cacheKey = useCallback(
        (kind: AssetKind, id: string, revisionId: string) => `${kind}:${id}:${revisionId}`,
        [],
    );

    // Build a flat list of items to prefetch (behaviors + lambdas + imports only).
    const items = useCallback((): Array<{kind: AssetKind; entry: AssetTreeEntry}> => {
        const out: Array<{kind: AssetKind; entry: AssetTreeEntry}> = [];
        for (const e of folders.behaviors) out.push({kind: "behavior", entry: e});
        for (const e of folders.lambdas) out.push({kind: "lambda", entry: e});
        for (const e of folders.scripts) out.push({kind: "script", entry: e});
        return out;
    }, [folders.behaviors, folders.scripts, folders.lambdas]);

    // Fetch one asset's code.
    const fetchOne = useCallback(
        async (kind: AssetKind, entry: AssetTreeEntry) => {
            const key = cacheKey(kind, entry.id, entry.headRevisionId);
            if (cacheRef.current.has(key) || fetchingRef.current.has(key)) return;

            fetchingRef.current.add(key);
            try {
                let code = "";
                if (kind === "behavior") {
                    const data = await getBehaviorRevisionData(entry.id, entry.headRevisionId);
                    code = data.code;
                } else if (kind === "lambda") {
                    const data = await getLambdaRevisionData(entry.id, entry.headRevisionId);
                    code = data.code;
                } else if (kind === "script") {
                    const data = await getScriptRevisionData(entry.id, entry.headRevisionId);
                    code = data.code;
                }
                cacheRef.current.set(key, code);
                setLoadedCount(prev => prev + 1);
            } catch {
                cacheRef.current.set(key, "");
                setLoadedCount(prev => prev + 1);
            } finally {
                fetchingRef.current.delete(key);
            }
        },
        [cacheKey, getBehaviorRevisionData, getScriptRevisionData, getLambdaRevisionData],
    );

    // Background prefetch in batches.
    useEffect(() => {
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        const all = items();

        const alreadyCached = all.filter(
            ({kind, entry}) => cacheRef.current.has(cacheKey(kind, entry.id, entry.headRevisionId)),
        ).length;
        setLoadedCount(alreadyCached);

        const toFetch = all.filter(
            ({kind, entry}) => {
                const key = cacheKey(kind, entry.id, entry.headRevisionId);
                return !cacheRef.current.has(key) && !fetchingRef.current.has(key);
            },
        );

        if (toFetch.length === 0) return;

        const run = async () => {
            for (let i = 0; i < toFetch.length; i += batchSize) {
                if (abortRef.current?.signal.aborted) return;
                const batch = toFetch.slice(i, i + batchSize);
                await Promise.all(batch.map(({kind, entry}) => fetchOne(kind, entry)));
            }
        };
        void run();

        return () => {
            abortRef.current?.abort();
        };
    }, [items, batchSize, cacheKey, fetchOne]);

    // Search across all cached code.
    const search = useCallback(
        (term: string): GlobalSearchResult[] => {
            if (!term.trim()) return [];

            const needle = term.toLowerCase();
            const results: GlobalSearchResult[] = [];

            const all = items();
            for (const {kind, entry} of all) {
                const key = cacheKey(kind, entry.id, entry.headRevisionId);
                const code = cacheRef.current.get(key);
                if (code === null || code === undefined) continue;

                const matches: GlobalSearchMatch[] = [];
                const lines = code.split("\n");
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i]!;
                    if (line.toLowerCase().includes(needle)) {
                        matches.push({
                            lineNumber: i + 1,
                            text: line.trim().substring(0, 120),
                        });
                    }
                }

                if (matches.length > 0) {
                    results.push({kind, id: entry.id, name: entry.name, matches});
                }
            }

            return results;
        },
        [items, cacheKey],
    );

    const total = folders.behaviors.length + folders.lambdas.length + folders.scripts.length;

    return {search, isLoading: loadedCount < total, loadedCount, totalCount: total};
}
