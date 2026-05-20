import {useMemo} from "react";

import {AssetType} from "@stem/network/api/asset";
import {resolveAssetRevisionId} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import {isScriptsEnabled} from "@stem/editor-oss/utils/featureFlags";
import {useListSceneAssets} from "../../../../../asset-management/hooks/assets";
import type {AssetEditorEntry, AssetKind, SortMode} from "../types";

/**
 * File extensions treated as plain text — copied intentionally from
 * `client/src/editor/assets/v2/LeftPanel/MainTabs/AssetsTab/SubTabs/FilesTab.tsx`
 * so the unified editor and the Files tab agree on what is editable.
 *
 * Keep this list in sync with FilesTab's `TEXT_EXTENSIONS`. A shared util
 * would be nicer but the existing `isTextFile` predicate is not exported.
 */
const TEXT_EXTENSIONS = new Set([
    "json", "xml", "txt", "md", "markdown", "html", "htm", "css", "js", "mjs",
    "cjs", "ts", "tsx", "jsx", "yaml", "yml", "toml", "ini", "csv", "tsv",
    "svg", "log", "conf", "cfg", "env", "properties", "sh", "bash", "py",
    "rb", "go", "rs", "java", "c", "cpp", "h", "hpp", "glsl", "vert", "frag",
    "stemscript",
]);

/**
 * Replicates `FilesTab.tsx#isTextFile`. Accepts the subset of the asset
 * shape we care about so it works on either Asset or unknown input.
 * @param fileObj
 * @param fileObj.name
 * @param fileObj.format
 * @param fileObj.contentType
 */
function isTextFile(fileObj: {name: string; format?: string; contentType?: string}): boolean {
    const format = fileObj.format?.toLowerCase();
    if (format && TEXT_EXTENSIONS.has(format)) return true;

    const ct = fileObj.contentType?.toLowerCase() || "";
    if (ct.startsWith("text/")) return true;
    if (ct.includes("json") || ct.includes("xml") || ct.includes("yaml") || ct.includes("javascript")) return true;

    const parts = fileObj.name.split(".");
    if (parts.length > 1) {
        const ext = parts.pop()?.toLowerCase() || "";
        if (TEXT_EXTENSIONS.has(ext)) return true;
    }
    return false;
}

/**
 * Display name rule for file assets (from FilesTab.tsx):
 * "if format exists and name has no dot, append .format". Keeps
 * folder-tree labels consistent with the scene's Files tab.
 * @param f
 * @param f.name
 * @param f.format
 */
function displayFileName(f: {name: string; format?: string}): string {
    return f.format && !f.name.includes(".") ? `${f.name}.${f.format}` : f.name;
}

/** Extra fields the tree carries so leaves can render head-revision metadata and dirty badges. */
export interface AssetTreeEntry extends AssetEditorEntry {
    /**
     * Head-revision id resolved via AssetResolutionContext — used by
     * behaviors for scene-pinned revisions and by files/lambdas to seed
     * content fetches.
     */
    headRevisionId: string;
    /** Last-modified timestamp from the API response — used for "Sort by Last Modified". */
    updateTime?: string;
    /** File-specific — carried forward so the file panel can show metadata without refetching. */
    format?: string;
    contentType?: string;
    size?: number;
}

/** Folder-tree shape returned by the hook. Each folder is an ordered array. */
export interface AssetTreeFolders {
    behaviors: AssetTreeEntry[];
    lambdas: AssetTreeEntry[];
    scripts: AssetTreeEntry[];
    files: AssetTreeEntry[];
}

export interface UseAssetTreeArgs {
    sceneId: string;
    /**
     * Case-insensitive term applied across all three folders. Empty string
     * returns the full tree. Matching is against name + tags.
     */
    search?: string;
    /** Optional owner id used to mark foreign-owned assets as read-only in the tree. */
    currentUserId?: string;
    /** Active sort/filter mode. Defaults to "name" (alphabetical). */
    sortMode?: SortMode;
    /** Set of `${kind}:${id}` keys for entries with unsaved edits — used by "changed" filter. */
    changedIds?: Set<string>;
}

export interface UseAssetTreeResult {
    folders: AssetTreeFolders;
    /** True while any of the three underlying queries are still loading. */
    isLoading: boolean;
    /** Total count across all folders (post-search). Useful for the empty state. */
    totalCount: number;
    /** Find an entry by (kind, id) — O(n) but the tree is small in practice. */
    findEntry: (kind: AssetKind, id: string) => AssetTreeEntry | undefined;
}

/**
 * Case-insensitive substring match on name and, if present, any tag.
 * @param entry
 * @param term
 */
function matchesSearch(entry: AssetTreeEntry, term: string): boolean {
    if (!term) return true;
    const needle = term.toLowerCase();
    if (entry.name.toLowerCase().includes(needle)) return true;
    if (entry.tags?.some(t => t.toLowerCase().includes(needle))) return true;
    return false;
}

/**
 *
 * @param a
 * @param b
 */
function sortByName(a: AssetTreeEntry, b: AssetTreeEntry): number {
    return a.name.localeCompare(b.name);
}

/**
 *
 * @param a
 * @param b
 */
function sortByModified(a: AssetTreeEntry, b: AssetTreeEntry): number {
    // Most recent first. Entries without updateTime sort last.
    const ta = a.updateTime ?? "";
    const tb = b.updateTime ?? "";
    if (ta === tb) return sortByName(a, b);
    return tb.localeCompare(ta);
}

/**
 * Apply the active sort mode and optional "changed" filter to a list of entries.
 * @param entries
 * @param mode
 * @param changedIds
 */
function applySortAndFilter(
    entries: AssetTreeEntry[],
    mode: SortMode,
    changedIds: Set<string> | undefined,
): AssetTreeEntry[] {
    let result = entries;
    if (mode === "changed" && changedIds) {
        result = result.filter(e => changedIds.has(`${e.kind}:${e.id}`));
    }
    if (mode === "modified") {
        return [...result].sort(sortByModified);
    }
    return [...result].sort(sortByName);
}

/**
 * Merges behaviors + lambdas + file assets (scene-scoped) into a
 * Merges behaviors + lambdas + scripts + file assets (scene-scoped) into a
 * folder-tree shape suitable for the unified asset editor's left panel.
 *
 * - Each kind uses the same `useListSceneAssets` query, filtered by
 *   {@link AssetType}. Queries are cached independently by React Query
 *   because the filter is part of the query key.
 * - File entries are gated by {@link isTextFile} — non-text files do not
 *   appear in the tree since Monaco can't meaningfully edit them.
 * - The optional `currentUserId` lets the tree mark foreign-owned
 *   behaviors/lambdas as `isReadOnly: true` up-front so the editor can
 *   gate toolbar actions without an extra fetch.
 * @param root0
 * @param root0.sceneId
 * @param root0.search
 * @param root0.currentUserId
 * @param root0.sortMode
 * @param root0.changedIds
 */
export function useAssetTree({sceneId, search = "", currentUserId, sortMode = "name", changedIds}: UseAssetTreeArgs): UseAssetTreeResult {
    const {context: resolutionContext} = useAssetResolutionContext();

    const behaviorsQuery = useListSceneAssets(sceneId, {types: [AssetType.Behavior]});
    const lambdasQuery = useListSceneAssets(sceneId, {types: [AssetType.Lambda]});
    const scriptsQuery = useListSceneAssets(sceneId, {types: [AssetType.Script], enabled: isScriptsEnabled()});
    const filesQuery = useListSceneAssets(sceneId, {types: [AssetType.File]});

    const behaviors = useMemo<AssetTreeEntry[]>(() => {
        const list = behaviorsQuery.data?.assets ?? [];
        const mapped = list
            .map((a: any) => ({
                kind: "behavior" as const,
                id: a.id,
                name: a.name,
                tags: a.tags,
                ownerId: a.userId,
                isReadOnly: currentUserId !== null && currentUserId !== undefined && a.userId !== null && a.userId !== undefined && a.userId !== currentUserId,
                headRevisionId: resolveAssetRevisionId(a.id, resolutionContext) || a.headRevisionId,
                updateTime: a.updateTime,
            }))
            .filter((e: AssetTreeEntry) => matchesSearch(e, search));
        return applySortAndFilter(mapped, sortMode, changedIds);
    }, [behaviorsQuery.data, resolutionContext, search, currentUserId, sortMode, changedIds]);

    const lambdas = useMemo<AssetTreeEntry[]>(() => {
        const list = lambdasQuery.data?.assets ?? [];
        const mapped = list
            .map((a: any) => ({
                kind: "lambda" as const,
                id: a.id,
                name: a.name,
                tags: a.tags,
                ownerId: a.userId,
                isReadOnly: currentUserId !== null && currentUserId !== undefined && a.userId !== null && a.userId !== undefined && a.userId !== currentUserId,
                headRevisionId: resolveAssetRevisionId(a.id, resolutionContext) || a.headRevisionId,
                updateTime: a.updateTime,
            }))
            .filter((e: AssetTreeEntry) => matchesSearch(e, search));
        return applySortAndFilter(mapped, sortMode, changedIds);
    }, [lambdasQuery.data, resolutionContext, search, currentUserId, sortMode, changedIds]);

    const scripts = useMemo<AssetTreeEntry[]>(() => {
        const list = scriptsQuery.data?.assets ?? [];
        const mapped = list
            .map((a: any) => ({
                kind: "script" as const,
                id: a.id,
                name: a.name,
                tags: a.tags,
                ownerId: a.userId,
                isReadOnly: currentUserId !== null && currentUserId !== undefined && a.userId !== null && a.userId !== undefined && a.userId !== currentUserId,
                headRevisionId: resolveAssetRevisionId(a.id, resolutionContext) || a.headRevisionId,
                updateTime: a.updateTime,
            }))
            .filter((e: AssetTreeEntry) => matchesSearch(e, search));
        return applySortAndFilter(mapped, sortMode, changedIds);
    }, [scriptsQuery.data, resolutionContext, search, currentUserId, sortMode, changedIds]);

    const files = useMemo<AssetTreeEntry[]>(() => {
        const list = filesQuery.data?.assets ?? [];
        const mapped = list
            .filter((a: any) =>
                isTextFile({name: a.name, format: a.format, contentType: a.contentType}),
            )
            .map((a: any) => ({
                kind: "file" as const,
                id: a.id,
                name: displayFileName(a),
                tags: a.tags,
                ownerId: a.userId,
                // Files are always read-only in the unified editor for now.
                isReadOnly: true,
                headRevisionId: a.headRevisionId,
                updateTime: a.updateTime,
                format: a.format,
                contentType: a.contentType,
                size: a.size,
            }))
            .filter((e: AssetTreeEntry) => matchesSearch(e, search));
        return applySortAndFilter(mapped, sortMode, changedIds);
    }, [filesQuery.data, search, sortMode, changedIds]);

    const folders = useMemo<AssetTreeFolders>(
        () => ({behaviors, lambdas, scripts, files}),
        [behaviors, lambdas, scripts, files],
    );

    const totalCount = behaviors.length + lambdas.length + scripts.length + files.length;

    const findEntry = useMemo(() => {
        return (kind: AssetKind, id: string): AssetTreeEntry | undefined => {
            const bucket =
                kind === "behavior"
                    ? behaviors
                    : kind === "lambda"
                        ? lambdas
                        : kind === "script"
                            ? scripts
                            : files;
            return bucket.find(e => e.id === id);
        };
    }, [behaviors, lambdas, scripts, files]);

    const isLoading = behaviorsQuery.isLoading || lambdasQuery.isLoading || scriptsQuery.isLoading || filesQuery.isLoading;

    return {folders, isLoading, totalCount, findEntry};
}
