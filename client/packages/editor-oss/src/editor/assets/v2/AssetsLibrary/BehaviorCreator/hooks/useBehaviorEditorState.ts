import {isEqual} from "lodash";
import {useState, useCallback, useMemo} from "react";

import {BehaviorConfig} from "../../../../../behaviors/BehaviorConfig";

export type ModifiedBehavior = {
    /**
     * The revision that the user's working copy is based on (required).
     * Used for merge conflict detection - even if the scene's current revision
     * changes (e.g., another user saves), we compare against this base revision.
     */
    baseRevisionId: string;
    name?: string;
    description?: string;
    tags?: string[];
    code?: string;
    config?: BehaviorConfig;
    // Original values for revert detection
    originalCode?: string;
    originalConfig?: BehaviorConfig;
    originalName?: string;
    originalDescription?: string;
    originalTags?: string[];
};

export type BehaviorModification = Omit<Partial<ModifiedBehavior>, "baseRevisionId">;

export interface OriginalValues {
    code?: string;
    config?: BehaviorConfig;
    name?: string;
    description?: string;
    tags?: string[];
}

export interface UpdateBehaviorOptions {
    originals?: OriginalValues;
    /**
     * If true, forces the baseRevisionId to be updated even if an entry already exists.
     * Use this after a merge to update the base to the merged revision.
     */
    forceBaseRevisionId?: boolean;
}

export interface UseBehaviorEditorStateReturn {
    modifiedBehaviors: Record<string, ModifiedBehavior>;
    /**
     * Update a behavior's local modifications.
     * @param id - The behavior ID
     * @param changes - The changes to apply
     * @param baseRevisionId - Required when creating a new entry (first edit). The revision the code is based on.
     * @param options - Optional settings including originals for revert detection and forceBaseRevisionId for merge completion
     */
    updateBehavior: (
        id: string,
        changes: BehaviorModification,
        baseRevisionId: string,
        options?: UpdateBehaviorOptions,
    ) => void;
    clearChanges: (id: string) => void;
    clearAllChanges: () => void;
    hasChanges: (id: string) => boolean;
    hasAnyChanges: boolean;
    getModified: (id: string) => ModifiedBehavior | undefined;
}

/**
 * Hook for managing local modifications to behaviors before saving.
 * Tracks changes per behavior ID and provides utilities for updating/clearing.
 * @param initialModifiedBehaviors
 */
export function useBehaviorEditorState(
    initialModifiedBehaviors: Record<string, ModifiedBehavior> = {},
): UseBehaviorEditorStateReturn {
    const [modifiedBehaviors, setModifiedBehaviors] = useState<Record<string, ModifiedBehavior>>(
        () => ({...initialModifiedBehaviors}),
    );

    const updateBehavior = useCallback(
        (id: string, changes: BehaviorModification, baseRevisionId: string, options?: UpdateBehaviorOptions) => {
            setModifiedBehaviors(prev => {
                const existing = prev[id];
                const originals = options?.originals;

                // Store originals on first modification (if provided)
                // Use nullish coalescing to only capture if not already set
                const originalCode = existing?.originalCode ?? originals?.code;
                const originalConfig = existing?.originalConfig ?? originals?.config;
                const originalName = existing?.originalName ?? originals?.name;
                const originalDescription = existing?.originalDescription ?? originals?.description;
                const originalTags = existing?.originalTags ?? originals?.tags;

                // Apply changes, preserving baseRevisionId from existing entry or using provided one
                // Use forceBaseRevisionId to override (e.g., after a merge)
                const effectiveBaseRevisionId = options?.forceBaseRevisionId
                    ? baseRevisionId
                    : (existing?.baseRevisionId ?? baseRevisionId);

                const updated: ModifiedBehavior = {
                    ...existing,
                    ...changes,
                    baseRevisionId: effectiveBaseRevisionId,
                    originalCode,
                    originalConfig,
                    originalName,
                    originalDescription,
                    originalTags,
                };
                // Check if user has reverted to original values
                // If originals aren't available yet (async loading), we can't do revert detection
                const hasOriginals = originalCode !== undefined || originalConfig !== undefined;
                if (!hasOriginals) {
                    // No originals available, keep the modification
                    return {
                        ...prev,
                        [id]: updated,
                    };
                }

                const currentCode = updated.code;
                const currentConfig = updated.config;
                const currentName = updated.name;
                const currentDescription = updated.description;
                const currentTags = updated.tags;

                // Check each field - undefined means "not modified", so it matches original
                const codeMatchesOriginal = currentCode === undefined || currentCode === originalCode;
                const configMatchesOriginal = currentConfig === undefined || isEqual(currentConfig, originalConfig);
                const nameMatchesOriginal = currentName === undefined || currentName === originalName;
                const descriptionMatchesOriginal =
                    currentDescription === undefined || currentDescription === originalDescription;
                const tagsMatchesOriginal =
                    currentTags === undefined || isEqual([...currentTags].sort(), [...(originalTags ?? [])].sort());

                // If all fields match originals, clear the modification fields but keep baseRevisionId
                if (
                    codeMatchesOriginal &&
                    configMatchesOriginal &&
                    nameMatchesOriginal &&
                    descriptionMatchesOriginal &&
                    tagsMatchesOriginal
                ) {
                    return {
                        ...prev,
                        [id]: {
                            baseRevisionId: updated.baseRevisionId,
                            // Keep originals for future revert detection
                            originalCode,
                            originalConfig,
                            originalName,
                            originalDescription,
                            originalTags,
                        },
                    };
                }

                return {
                    ...prev,
                    [id]: updated,
                };
            });
        },
        [],
    );

    const clearChanges = useCallback((id: string) => {
        setModifiedBehaviors(prev => {
            const next = {...prev};
            delete next[id];
            return next;
        });
    }, []);

    const clearAllChanges = useCallback(() => {
        setModifiedBehaviors({});
    }, []);

    /**
     * Check if a behavior has actual modifications (not just baseRevisionId tracking).
     */
    const hasChanges = useCallback(
        (id: string) => {
            const modified = modifiedBehaviors[id];
            if (!modified) return false;
            // Check if any actual modification fields are set
            return (
                modified.code !== undefined ||
                modified.config !== undefined ||
                modified.name !== undefined ||
                modified.description !== undefined ||
                modified.tags !== undefined
            );
        },
        [modifiedBehaviors],
    );

    const hasAnyChanges = useMemo(() => {
        return Object.values(modifiedBehaviors).some(
            modified =>
                modified.code !== undefined ||
                modified.config !== undefined ||
                modified.name !== undefined ||
                modified.description !== undefined ||
                modified.tags !== undefined,
        );
    }, [modifiedBehaviors]);

    const getModified = useCallback(
        (id: string) => {
            return modifiedBehaviors[id];
        },
        [modifiedBehaviors],
    );

    return {
        modifiedBehaviors,
        updateBehavior,
        clearChanges,
        clearAllChanges,
        hasChanges,
        hasAnyChanges,
        getModified,
    };
}
