import {useCallback, useMemo, useState} from "react";

import {
    useBehaviorEditorState,
    type ModifiedBehavior,
    type BehaviorModification,
    type UpdateBehaviorOptions,
} from "../../BehaviorCreator/hooks/useBehaviorEditorState";
import type {AssetEditorEntry, AssetKind, InitialSelection} from "../types";
import {toAssetKey} from "../types";

/**
 * Per-lambda draft snapshot. Intentionally simpler than `ModifiedBehavior`:
 * lambdas have a single code file and no separate config JSON tab.
 *
 * The `originalCode` field enables revert-detection parity with the behavior
 * flow — if a user edits code and then undoes back to the server value, the
 * entry drops out of the dirty set.
 */
export interface ModifiedLambda {
    baseRevisionId: string;
    code?: string;
    originalCode?: string;
    /** Free-form config string from the lambda's attributes editor. */
    configStr?: string;
    originalConfigStr?: string;
    name?: string;
    originalName?: string;
}

export interface ModifiedScript {
    baseRevisionId: string;
    code?: string;
    originalCode?: string;
    name?: string;
    originalName?: string;
}

export interface LambdaModification {
    code?: string;
    configStr?: string;
    name?: string;
}

export interface ScriptModification {
    code?: string;
    name?: string;
}

export interface LambdaOriginalValues {
    code?: string;
    configStr?: string;
    name?: string;
}

export interface ScriptOriginalValues {
    code?: string;
    name?: string;
}

/**
 * Per-file draft snapshot. Tracks text edits to text-based file assets.
 */
export interface ModifiedFile {
    baseRevisionId: string;
    text?: string;
    originalText?: string;
}

export interface FileModification {
    text?: string;
}

export interface FileOriginalValues {
    text?: string;
}

export interface UpdateLambdaOptions {
    originals?: LambdaOriginalValues;
    forceBaseRevisionId?: boolean;
}

export interface UpdateScriptOptions {
    originals?: ScriptOriginalValues;
    forceBaseRevisionId?: boolean;
}

/**
 * Initial drafts carried across a popout boundary or a component remount.
 * Each kind's drafts are passed through opaquely so kind-specific shapes
 * (e.g. `ModifiedBehavior`) stay unchanged.
 */
export interface InitialDrafts {
    behavior?: Record<string, ModifiedBehavior>;
    lambda?: Record<string, ModifiedLambda>;
    script?: Record<string, ModifiedScript>;
    file?: Record<string, ModifiedFile>;
}

export interface UseUnifiedEditorStateArgs {
    initialSelection?: InitialSelection;
    initialDrafts?: InitialDrafts;
}

export interface UseUnifiedEditorStateReturn {
    /** The entry currently visible in the center Monaco surface. */
    activeEntry: AssetEditorEntry | null;
    /** Swap the active entry. Drafts for the previous entry remain in memory. */
    setActiveEntry: (entry: AssetEditorEntry | null) => void;

    /** Behavior-kind draft map (identical shape to `useBehaviorEditorState`). */
    modifiedBehaviors: Record<string, ModifiedBehavior>;
    updateBehavior: (
        id: string,
        changes: BehaviorModification,
        baseRevisionId: string,
        options?: UpdateBehaviorOptions,
    ) => void;
    clearBehaviorChanges: (id: string) => void;
    getModifiedBehavior: (id: string) => ModifiedBehavior | undefined;

    /** Lambda-kind draft map. */
    modifiedLambdas: Record<string, ModifiedLambda>;
    updateLambda: (
        id: string,
        changes: LambdaModification,
        baseRevisionId: string,
        options?: UpdateLambdaOptions,
    ) => void;
    clearLambdaChanges: (id: string) => void;
    getModifiedLambda: (id: string) => ModifiedLambda | undefined;

    /** Import-kind draft map. */
    modifiedScripts: Record<string, ModifiedScript>;
    updateScript: (
        id: string,
        changes: ScriptModification,
        baseRevisionId: string,
        options?: UpdateScriptOptions,
    ) => void;
    clearScriptChanges: (id: string) => void;
    getModifiedScript: (id: string) => ModifiedScript | undefined;

    /** File-kind draft map. */
    modifiedFiles: Record<string, ModifiedFile>;
    updateFile: (id: string, changes: FileModification, baseRevisionId: string) => void;
    clearFileChanges: (id: string) => void;
    getModifiedFile: (id: string) => ModifiedFile | undefined;

    /** True iff the (kind, id) tuple currently has unsaved modifications. */
    hasChanges: (kind: AssetKind, id: string) => boolean;
    /** True iff anything across any kind is dirty — used by the shell's Save-All enabled state. */
    hasAnyChanges: boolean;

    /** Clear drafts for a specific (kind, id). */
    clearChanges: (kind: AssetKind, id: string) => void;
}

/**
 * Cross-kind state container for the CodeEditor shell.
 *
 * Internally delegates behavior tracking to the existing
 * `useBehaviorEditorState` (bug-for-bug compatible with the current
 * BehaviorCreator merge / revert semantics) and owns a parallel-but-simpler
 * tracker for lambdas. Files are read-only and never hold drafts.
 *
 * Save orchestration is not owned here — the shell composes `useBehaviorSave`
 * and `useLambdaSave` directly and calls `clearChanges` on success. Keeping
 * those hooks at the shell level preserves their UI-driven merge-request
 * surface (modal promises) without threading them through this hook.
 * @param root0
 * @param root0.initialSelection
 * @param root0.initialDrafts
 */
export function useCodeEditorState({
    initialSelection,
    initialDrafts,
}: UseUnifiedEditorStateArgs = {}): UseUnifiedEditorStateReturn {
    // Active-entry state is carried as the full entry rather than just (kind,id)
    // so consumers never have to round-trip through useAssetTree.findEntry()
    // on every render.
    const [activeEntry, setActiveEntry] = useState<AssetEditorEntry | null>(() => {
        if (!initialSelection) return null;
        return {
            kind: initialSelection.kind,
            // Placeholder name; the shell replaces this with the resolved
            // entry from useAssetTree as soon as the tree loads.
            id: initialSelection.id,
            name: "",
        };
    });

    // Delegate behavior tracking wholesale — keeps merge / revert semantics
    // identical to the existing BehaviorCreator.
    const behaviorState = useBehaviorEditorState(initialDrafts?.behavior);

    // Parallel lambda tracker. Separate from behavior state so the behavior
    // hook can stay untouched.
    const [modifiedLambdas, setModifiedLambdas] = useState<Record<string, ModifiedLambda>>(
        () => ({...(initialDrafts?.lambda ?? {})}),
    );
    const [modifiedScripts, setModifiedScripts] = useState<Record<string, ModifiedScript>>(
        () => ({...(initialDrafts?.script ?? {})}),
    );

    const updateLambda = useCallback(
        (
            id: string,
            changes: LambdaModification,
            baseRevisionId: string,
            options?: UpdateLambdaOptions,
        ) => {
            setModifiedLambdas(prev => {
                const existing = prev[id];
                const originals = options?.originals;

                const originalCode = existing?.originalCode ?? originals?.code;
                const originalConfigStr = existing?.originalConfigStr ?? originals?.configStr;
                const originalName = existing?.originalName ?? originals?.name;

                const effectiveBaseRevisionId = options?.forceBaseRevisionId
                    ? baseRevisionId
                    : (existing?.baseRevisionId ?? baseRevisionId);

                const updated: ModifiedLambda = {
                    ...existing,
                    ...changes,
                    baseRevisionId: effectiveBaseRevisionId,
                    originalCode,
                    originalConfigStr,
                    originalName,
                };

                // Revert detection — if every edited field matches its
                // original, drop the modification fields but keep the
                // baseRevisionId so future dirty tracking stays anchored.
                const hasOriginals = originalCode !== undefined || originalConfigStr !== undefined;
                if (hasOriginals) {
                    const codeMatches = updated.code === undefined || updated.code === originalCode;
                    const configMatches =
                        updated.configStr === undefined || updated.configStr === originalConfigStr;
                    const nameMatches = updated.name === undefined || updated.name === originalName;

                    if (codeMatches && configMatches && nameMatches) {
                        return {
                            ...prev,
                            [id]: {
                                baseRevisionId: updated.baseRevisionId,
                                originalCode,
                                originalConfigStr,
                                originalName,
                            },
                        };
                    }
                }

                return {...prev, [id]: updated};
            });
        },
        [],
    );

    const clearLambdaChanges = useCallback((id: string) => {
        setModifiedLambdas(prev => {
            const next = {...prev};
            delete next[id];
            return next;
        });
    }, []);

    const getModifiedLambda = useCallback(
        (id: string): ModifiedLambda | undefined => modifiedLambdas[id],
        [modifiedLambdas],
    );

    const updateScript = useCallback(
        (
            id: string,
            changes: ScriptModification,
            baseRevisionId: string,
            options?: UpdateScriptOptions,
        ) => {
            setModifiedScripts(prev => {
                const existing = prev[id];
                const originals = options?.originals;
                const originalCode = existing?.originalCode ?? originals?.code;
                const originalName = existing?.originalName ?? originals?.name;
                const effectiveBaseRevisionId = options?.forceBaseRevisionId
                    ? baseRevisionId
                    : (existing?.baseRevisionId ?? baseRevisionId);

                const updated: ModifiedScript = {
                    ...existing,
                    ...changes,
                    baseRevisionId: effectiveBaseRevisionId,
                    originalCode,
                    originalName,
                };

                const hasOriginals = originalCode !== undefined || originalName !== undefined;
                if (hasOriginals) {
                    const codeMatches = updated.code === undefined || updated.code === originalCode;
                    const nameMatches = updated.name === undefined || updated.name === originalName;
                    if (codeMatches && nameMatches) {
                        return {
                            ...prev,
                            [id]: {
                                baseRevisionId: updated.baseRevisionId,
                                originalCode,
                                originalName,
                            },
                        };
                    }
                }

                return {...prev, [id]: updated};
            });
        },
        [],
    );

    const clearScriptChanges = useCallback((id: string) => {
        setModifiedScripts(prev => {
            const next = {...prev};
            delete next[id];
            return next;
        });
    }, []);

    const getModifiedScript = useCallback(
        (id: string): ModifiedScript | undefined => modifiedScripts[id],
        [modifiedScripts],
    );

    // Parallel file tracker. Mirrors lambda tracker pattern.
    const [modifiedFiles, setModifiedFiles] = useState<Record<string, ModifiedFile>>(
        () => ({...(initialDrafts?.file ?? {})}),
    );

    const updateFile = useCallback(
        (id: string, changes: FileModification, baseRevisionId: string) => {
            setModifiedFiles(prev => {
                const existing = prev[id];
                const originalText = existing?.originalText;
                const effectiveBaseRevisionId = existing?.baseRevisionId ?? baseRevisionId;

                const updated: ModifiedFile = {
                    ...existing,
                    ...changes,
                    baseRevisionId: effectiveBaseRevisionId,
                    originalText,
                };

                // Revert detection
                if (originalText !== undefined && updated.text === originalText) {
                    const next = {...prev};
                    delete next[id];
                    return next;
                }

                return {...prev, [id]: updated};
            });
        },
        [],
    );

    const clearFileChanges = useCallback((id: string) => {
        setModifiedFiles(prev => {
            const next = {...prev};
            delete next[id];
            return next;
        });
    }, []);

    const getModifiedFile = useCallback(
        (id: string): ModifiedFile | undefined => modifiedFiles[id],
        [modifiedFiles],
    );

    const hasFileChanges = useCallback(
        (id: string): boolean => {
            const m = modifiedFiles[id];
            if (!m) return false;
            return m.text !== undefined;
        },
        [modifiedFiles],
    );

    const hasAnyFileChanges = useMemo(
        () => Object.values(modifiedFiles).some(m => m.text !== undefined),
        [modifiedFiles],
    );

    const hasImportChanges = useCallback(
        (id: string): boolean => {
            const m = modifiedScripts[id];
            if (!m) return false;
            return m.code !== undefined || m.name !== undefined;
        },
        [modifiedScripts],
    );

    const hasAnyImportChanges = useMemo(
        () => Object.values(modifiedScripts).some(m => m.code !== undefined || m.name !== undefined),
        [modifiedScripts],
    );

    const hasLambdaChanges = useCallback(
        (id: string): boolean => {
            const m = modifiedLambdas[id];
            if (!m) return false;
            return m.code !== undefined || m.configStr !== undefined || m.name !== undefined;
        },
        [modifiedLambdas],
    );

    const hasAnyLambdaChanges = useMemo(
        () =>
            Object.values(modifiedLambdas).some(
                m => m.code !== undefined || m.configStr !== undefined || m.name !== undefined,
            ),
        [modifiedLambdas],
    );

    const hasChanges = useCallback(
        (kind: AssetKind, id: string): boolean => {
            if (kind === "behavior") return behaviorState.hasChanges(id);
            if (kind === "lambda") return hasLambdaChanges(id);
            if (kind === "script") return hasImportChanges(id);
            if (kind === "file") return hasFileChanges(id);
            return false;
        },
        [behaviorState, hasLambdaChanges, hasImportChanges, hasFileChanges],
    );

    const hasAnyChanges =
        behaviorState.hasAnyChanges || hasAnyLambdaChanges || hasAnyImportChanges || hasAnyFileChanges;

    const clearChanges = useCallback(
        (kind: AssetKind, id: string) => {
            if (kind === "behavior") behaviorState.clearChanges(id);
            else if (kind === "lambda") clearLambdaChanges(id);
            else if (kind === "script") clearScriptChanges(id);
            else if (kind === "file") clearFileChanges(id);
        },
        [behaviorState, clearLambdaChanges, clearScriptChanges, clearFileChanges],
    );

    return {
        activeEntry,
        setActiveEntry,

        modifiedBehaviors: behaviorState.modifiedBehaviors,
        updateBehavior: behaviorState.updateBehavior,
        clearBehaviorChanges: behaviorState.clearChanges,
        getModifiedBehavior: behaviorState.getModified,

        modifiedLambdas,
        updateLambda,
        clearLambdaChanges,
        getModifiedLambda,

        modifiedScripts,
        updateScript,
        clearScriptChanges,
        getModifiedScript,

        modifiedFiles,
        updateFile,
        clearFileChanges,
        getModifiedFile,

        hasChanges,
        hasAnyChanges,
        clearChanges,
    };
}

// Re-export helper so shell code that imports from this module gets a
// single, discoverable API surface.
export {toAssetKey};
