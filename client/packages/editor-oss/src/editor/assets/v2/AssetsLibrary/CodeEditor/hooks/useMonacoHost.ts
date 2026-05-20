import {useMemo} from "react";

import type {AssetEditorEntry, AssetKind} from "../types";

/**
 * Shape accepted by the existing `<BehaviorEditor>` low-level component.
 * Mirrors `BehaviorEditorFile` in client/src/editor/assets/v2/BehaviorEditor/index.tsx
 * — duplicated here instead of imported to keep the circular dependency graph
 * shallow and the type surface explicit.
 */
export interface MonacoHostFile {
    id: string;
    name: string;
    language: string;
    content: string;
    isReadOnly?: boolean;
    contentVersion?: number;
}

/**
 * Kind-specific draft snapshot the host consumes. Each kind delegate
 * (behavior / lambda / file) populates exactly one shape; the host picks
 * (behavior / lambda / import / file) populates exactly one shape; the host picks
 * whichever matches the active entry's kind.
 */
export interface MonacoHostDraft {
    behavior?: {
        /** User-visible code (JS). */
        code: string;
        /** Pretty-printed behavior config JSON (shown read-only in a second tab). */
        configJson: string;
        /** Incremented when `code` is externally mutated (AI edit, config editor). */
        codeVersion?: number;
    };
    lambda?: {
        code: string;
        codeVersion?: number;
    };
    script?: {
        code: string;
        codeVersion?: number;
    };
    file?: {
        /** Lazy-loaded text content; empty string while loading. */
        text: string;
        /** Monaco language id derived from the file's format/extension. */
        language: string;
    };
}

export interface UseMonacoHostArgs {
    entry: AssetEditorEntry | null;
    draft: MonacoHostDraft;
    /** True when the host is fetching the draft content for `entry`. */
    isLoading?: boolean;
    /** When true, forces all files to readonly (e.g. copilot is editing this asset). */
    forcedReadOnly?: boolean;
}

export interface UseMonacoHostResult {
    /** Files array to pass to `<BehaviorEditor files=… />`. Empty when no selection. */
    files: MonacoHostFile[];
    /** File to preselect — always the code tab for behavior, the single tab otherwise. */
    initialSelectedId: string | undefined;
    /**
     * `scriptType` passed to `<BehaviorEditor>`. Drives the structure
     * validator (`validateScript`) + the autocomplete provider
     * (`registerScriptCompletions`). File entries reuse `"lambda"` so the
     * validator has something reasonable to offer; they are readOnly so it
     * never runs anyway.
     */
    scriptType: "behavior" | "lambda";
    /** True for read-only entries — forwarded to the editor's update-options. */
    isReadOnly: boolean;
}

const BEHAVIOR_CODE_SUFFIX = "-code";
const BEHAVIOR_CONFIG_SUFFIX = "-config";

/** Extensions for text-based file assets that should be editable in the editor. */
const TEXT_EDITABLE_EXTENSIONS = new Set([
    "js", "mjs", "cjs", "ts", "tsx", "jsx",
    "json", "html", "css", "md",
    "yaml", "yml", "xml", "svg",
    "glsl", "vert", "frag",
    "sh", "bash", "py", "go", "txt",
]);

const scriptTypeForKind = (kind: AssetKind): "behavior" | "lambda" =>
    kind === "behavior" ? "behavior" : "lambda";

/**
 * Adapts an active {@link AssetEditorEntry} + its kind-specific draft into
 * the `{files, scriptType, readOnly}` contract that `<BehaviorEditor>`
 * already accepts. The existing editor owns Monaco lifecycle, theme select,
 * keybindings panel, format, validate, breakpoints, model cache, and popout
 * cursor fixes — this hook is deliberately thin.
 *
 * Returning stable-identity arrays when inputs don't change keeps Monaco
 * model swaps to the minimum necessary (new id = new model, changing only
 * `contentVersion` applies server content to the existing model).
 * @param root0
 * @param root0.entry
 * @param root0.draft
 * @param root0.isLoading
 * @param root0.forcedReadOnly
 */
export function useMonacoHost({entry, draft, isLoading = false, forcedReadOnly = false}: UseMonacoHostArgs): UseMonacoHostResult {
    const files = useMemo<MonacoHostFile[]>(() => {
        if (!entry) return [];
        if (isLoading) return [];

        switch (entry.kind) {
            case "behavior": {
                const b = draft.behavior;
                if (!b) return [];
                return [
                    {
                        id: `${entry.id}${BEHAVIOR_CODE_SUFFIX}`,
                        name: `${entry.name}.js`,
                        language: "javascript",
                        content: b.code,
                        isReadOnly: forcedReadOnly || (entry.isReadOnly ?? false),
                        contentVersion: b.codeVersion ?? 0,
                    },
                    {
                        id: `${entry.id}${BEHAVIOR_CONFIG_SUFFIX}`,
                        name: `${entry.name}.json`,
                        language: "json",
                        content: b.configJson,
                        isReadOnly: true,
                    },
                ];
            }

            case "lambda": {
                const l = draft.lambda;
                if (!l) return [];
                return [
                    {
                        id: entry.id,
                        name: `${entry.name}.js`,
                        language: "javascript",
                        content: l.code,
                        isReadOnly: forcedReadOnly || (entry.isReadOnly ?? false),
                        contentVersion: l.codeVersion ?? 0,
                    },
                ];
            }

            case "script": {
                const scriptDraft = draft.script;
                if (!scriptDraft) return [];
                return [
                    {
                        id: entry.id,
                        name: `${entry.name}.js`,
                        language: "javascript",
                        content: scriptDraft.code,
                        isReadOnly: forcedReadOnly || (entry.isReadOnly ?? false),
                        contentVersion: scriptDraft.codeVersion ?? 0,
                    },
                ];
            }

            case "file": {
                const f = draft.file;
                if (!f) return [];
                const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
                const isTextEditable = TEXT_EDITABLE_EXTENSIONS.has(ext);
                return [
                    {
                        id: entry.id,
                        name: entry.name,
                        language: f.language,
                        content: f.text,
                        isReadOnly: forcedReadOnly || !isTextEditable,
                    },
                ];
            }
        }
    }, [entry, draft, isLoading, forcedReadOnly]);

    const initialSelectedId = useMemo<string | undefined>(() => {
        if (!entry) return undefined;
        if (entry.kind === "behavior") return `${entry.id}${BEHAVIOR_CODE_SUFFIX}`;
        return entry.id;
    }, [entry]);

    return {
        files,
        initialSelectedId,
        scriptType: entry ? scriptTypeForKind(entry.kind) : "behavior",
        isReadOnly: forcedReadOnly || !!(entry?.isReadOnly || (entry?.kind === "file" && !TEXT_EDITABLE_EXTENSIONS.has(entry.name.split(".").pop()?.toLowerCase() ?? ""))),
    };
}

/**
 * Parse a Monaco file id emitted by `onFileContentChange` back into
 * `{entryId, tab}`. Only behavior files carry a `-code` / `-config` suffix;
 * lambdas and files use the raw entry id.
 * @param fileId
 * @param kind
 */
export function parseMonacoFileId(
    fileId: string,
    kind: AssetKind,
): {entryId: string; tab: "code" | "config" | "file"} {
    if (kind !== "behavior") {
        return {entryId: fileId, tab: kind === "file" ? "file" : "code"};
    }
    if (fileId.endsWith(BEHAVIOR_CODE_SUFFIX)) {
        return {entryId: fileId.slice(0, -BEHAVIOR_CODE_SUFFIX.length), tab: "code"};
    }
    if (fileId.endsWith(BEHAVIOR_CONFIG_SUFFIX)) {
        return {entryId: fileId.slice(0, -BEHAVIOR_CONFIG_SUFFIX.length), tab: "config"};
    }
    return {entryId: fileId, tab: "code"};
}
