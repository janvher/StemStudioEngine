import {useState, useCallback} from "react";

import {isNoChangesError} from "@stem/network/api/asset";
import {showToast} from "@stem/editor-oss/showToast";
import {useGetAsset, useUpdateAsset} from "../../../../../asset-management/hooks/assets";
import {BehaviorConfig} from "../../../../../behaviors/BehaviorConfig";
import {useGetBehaviorRevisionData} from "../../../../../behaviors/hooks/behaviors";
import {createBehaviorRevision} from "../../../../../behaviors/util";

/**
 * Recursively validate a behavior's attributes map. Returns the dotted path
 * of the first invalid attribute found, or null if all are valid. Validation
 * requires every entry to have a non-empty object key and a non-empty `name`,
 * and recurses into nested `attributes` maps used by group/array attributes.
 *
 * @param attributes Attributes record to validate
 * @param path Internal accumulator for the dotted path of the current entry
 * @returns Dotted path of the first invalid attribute, or null
 */
export const findInvalidAttributePath = (
    attributes: Record<string, any> | undefined | null,
    path = "",
): string | null => {
    if (!attributes) return null;
    for (const [key, attr] of Object.entries(attributes)) {
        const here = path ? `${path}.${key}` : key;
        if (!key || !attr?.name) return here;
        if (attr.attributes && typeof attr.attributes === "object") {
            const nested = findInvalidAttributePath(attr.attributes, here);
            if (nested) return nested;
        }
    }
    return null;
};

export type MergeRequest = {
    baseText: string;
    localText: string;
    latestText: string;
};

export type MergeResult = {
    canceled: boolean;
    mergedText: string;
};

export type MergeHandler = (request: MergeRequest) => Promise<MergeResult>;

export interface MergeCompleteParams {
    behaviorId: string;
    mergedCode: string;
    mergedConfig: BehaviorConfig;
    mergeRevisionId: string;
}

export interface SaveCompleteInfo {
    assetId: string;
    revisionId: string;
    code: string;
    config: BehaviorConfig;
}

export interface UseBehaviorSaveOptions {
    onMergeRequired: MergeHandler;
    onMergeComplete?: (params: MergeCompleteParams) => void;
    /** Called after a behavior is successfully saved. Should update scene dependencies and registries. */
    onSaveComplete?: (info: SaveCompleteInfo) => Promise<void> | void;
    /** Called after multiple behaviors are saved. Should update scene dependencies and registries. */
    onSaveAllComplete?: (infos: SaveCompleteInfo[]) => Promise<void> | void;
}

export interface SaveBehaviorParams {
    behaviorId: string;
    revisionId: string;
    code: string;
    config: BehaviorConfig;
    name?: string;
    tags?: string[];
    description?: string;
}

export interface SaveAllResult {
    savedCount: number;
    mergeRequiredCount: number;
    failedCount: number;
    savedBehaviorIds: string[];
    mergeRequiredBehaviorIds: string[];
}

export interface UseBehaviorSaveReturn {
    save: (params: SaveBehaviorParams) => Promise<boolean>;
    saveAll: (params: SaveBehaviorParams[]) => Promise<SaveAllResult>;
    isSaving: boolean;
}

/**
 * Hook for saving behavior changes with merge conflict resolution.
 * Handles checking for newer revisions, merging, creating new revisions,
 * and updating registries.
 * @param options
 */
export function useBehaviorSave(options: UseBehaviorSaveOptions): UseBehaviorSaveReturn {
    const {onMergeRequired, onMergeComplete, onSaveComplete, onSaveAllComplete} = options;
    const [isSaving, setIsSaving] = useState(false);
    const getAsset = useGetAsset();
    const {mutateAsync: updateAsset} = useUpdateAsset();
    const getBehaviorRevisionData = useGetBehaviorRevisionData();

    /**
     * Check if a behavior requires merge (has newer revisions on server).
     * Returns true if merge is needed, false if can save directly.
     */
    const checkMergeRequired = useCallback(
        async (behaviorId: string, revisionId: string): Promise<boolean> => {
            const {headRevisionId} = await getAsset(behaviorId);
            return revisionId !== headRevisionId;
        },
        [getAsset],
    );

    /**
     * Merge behavior code/config with latest revision if needed.
     * Returns merged content or signals cancellation.
     */
    const mergeBehavior = useCallback(
        async (
            behaviorId: string,
            codeRevisionId: string,
            code: string,
            configRevisionId: string,
            config: string,
        ): Promise<{canceled: boolean; mergeRevisionId: string; mergedCode: string; mergedConfig: string}> => {
            // Check for newer revisions
            const {headRevisionId} = await getAsset(behaviorId);

            // If no newer revisions, we're done
            if (codeRevisionId === headRevisionId && configRevisionId === headRevisionId) {
                return {
                    canceled: false,
                    mergeRevisionId: headRevisionId,
                    mergedCode: code,
                    mergedConfig: config,
                };
            }

            const latestRevision = await getBehaviorRevisionData(behaviorId, headRevisionId);

            // If there's a newer revision of the code, request merge
            if (codeRevisionId !== headRevisionId) {
                let mergedCode = code;

                // Only display the merge dialog if the code is different from the
                // latest revision
                if (code !== latestRevision.code) {
                    const baseRevision = await getBehaviorRevisionData(behaviorId, codeRevisionId);
                    const result = await onMergeRequired({
                        baseText: baseRevision.code,
                        localText: code,
                        latestText: latestRevision.code,
                    });

                    if (result.canceled) {
                        return {canceled: true, mergeRevisionId: "", mergedCode: "", mergedConfig: ""};
                    }
                }

                // Recursively merge config with the merged code
                return mergeBehavior(behaviorId, headRevisionId, mergedCode, configRevisionId, config);
            }

            // If there's a newer revision of the config, request merge
            const latestConfigText = JSON.stringify(latestRevision.config);
            let mergedConfigText = config;

            // Only display the merge dialog if the config is different from the
            // latest revision
            if (config !== latestConfigText) {
                const baseRevision = await getBehaviorRevisionData(behaviorId, configRevisionId);
                const baseConfigText = JSON.stringify(baseRevision.config);
                const result = await onMergeRequired({
                    baseText: baseConfigText,
                    localText: config,
                    latestText: latestConfigText,
                });

                if (result.canceled) {
                    return {canceled: true, mergeRevisionId: "", mergedCode: "", mergedConfig: ""};
                }

                mergedConfigText = result.mergedText;
            }

            return mergeBehavior(behaviorId, codeRevisionId, code, headRevisionId, mergedConfigText);
        },
        [getAsset, getBehaviorRevisionData, onMergeRequired],
    );

    /**
     * Save a behavior with merge conflict resolution.
     * Returns true if save was successful, false if canceled, merged (needs re-save), or failed.
     */
    const save = useCallback(
        async (params: SaveBehaviorParams): Promise<boolean> => {
            const {behaviorId, revisionId, code, config, name, description, tags} = params;

            setIsSaving(true);

            try {
                // Validate before merging
                if (!config.name) {
                    showToast({
                        type: "error",
                        title: "Error saving behavior name",
                        body: "Name cannot be empty.",
                        duration: 5000,
                    });
                    return false;
                }
                const attributes = config?.attributes;
                const invalidAttrPath = findInvalidAttributePath(attributes);
                if (invalidAttrPath !== null) {
                    showToast({
                        type: "error",
                        title: "Error saving behavior attributes",
                        body: `Each attribute must have both key and name (invalid: ${invalidAttrPath || "(empty)"}).`,
                        duration: 5000,
                    });
                    return false;
                }
                const configStr = JSON.stringify(config);

                const {canceled, mergeRevisionId, mergedCode, mergedConfig} = await mergeBehavior(
                    behaviorId,
                    revisionId,
                    code,
                    revisionId,
                    configStr,
                );

                if (canceled) {
                    showToast({
                        type: "warning",
                        title: "Merge canceled",
                        body: "Changes have not been saved.",
                    });
                    return false;
                }

                // If a merge happened, notify caller and stop (user must save again)
                const didMergeHappen = mergeRevisionId !== revisionId;
                if (didMergeHappen && onMergeComplete) {
                    onMergeComplete({
                        behaviorId,
                        mergedCode,
                        mergedConfig: JSON.parse(mergedConfig) as BehaviorConfig,
                        mergeRevisionId,
                    });
                    showToast({
                        type: "success",
                        title: "Changes merged successfully",
                        body: "Click 'Save' to save the changes.",
                    });
                    return false;
                }

                // Save the new revision and any name / description change in
                // parallel
                const newConfig = JSON.parse(mergedConfig) as BehaviorConfig;

                const savePromises = [];
                savePromises.push(
                    createBehaviorRevision({
                        assetId: behaviorId,
                        parentRevisionId: mergeRevisionId,
                        config: newConfig,
                        code: mergedCode,
                    }),
                );

                // Update asset name/description if provided
                if (name !== undefined || description !== undefined || tags !== undefined) {
                    // Saving the behavior name, description and tags is a
                    // "best-effort" operation; if it fails, we'll just ignore it
                    const updateAssetPromise = updateAsset({
                        assetId: behaviorId,
                        name,
                        description,
                        tags,
                    }).catch(error => {
                        console.error("Error saving behavior name, description, or tags:", error);
                        showToast({
                            type: "error",
                            title: "Error saving behavior details",
                            body: "Behavior name, description, or tags could not be saved.",
                        });
                    });

                    savePromises.push(updateAssetPromise);
                }

                const saveResult = await Promise.all(savePromises);
                const newRevisionId = saveResult[0]!.id;

                // Notify caller of successful save - caller handles registry updates and scene dependencies
                await onSaveComplete?.({
                    assetId: behaviorId,
                    revisionId: newRevisionId,
                    code: mergedCode,
                    config: newConfig,
                });

                showToast({type: "success", title: "Behavior saved successfully"});
                return true;
            } catch (error) {
                console.error("Error saving behavior:", error);
                if (isNoChangesError(error)) {
                    showToast({
                        type: "warning",
                        title: "No changes detected",
                    });
                } else {
                    showToast({type: "error", title: "Failed to save behavior"});
                }
                return false;
            } finally {
                setIsSaving(false);
            }
        },
        [mergeBehavior, onMergeComplete, onSaveComplete, updateAsset],
    );

    /**
     * Save multiple behaviors, skipping those that require merge.
     * Returns counts of saved, merge-required, and failed behaviors.
     */
    const saveAll = useCallback(
        async (params: SaveBehaviorParams[]): Promise<SaveAllResult> => {
            if (params.length === 0) {
                return {
                    savedCount: 0,
                    mergeRequiredCount: 0,
                    failedCount: 0,
                    savedBehaviorIds: [],
                    mergeRequiredBehaviorIds: [],
                };
            }

            setIsSaving(true);

            const result: SaveAllResult = {
                savedCount: 0,
                mergeRequiredCount: 0,
                failedCount: 0,
                savedBehaviorIds: [],
                mergeRequiredBehaviorIds: [],
            };

            try {
                // Phase 1: Check merge requirements for all behaviors in parallel
                const mergeChecks = await Promise.all(
                    params.map(async behavior => {
                        try {
                            const mergeRequired = await checkMergeRequired(behavior.behaviorId, behavior.revisionId);
                            return {behavior, mergeRequired, error: null};
                        } catch (error) {
                            return {behavior, mergeRequired: false, error};
                        }
                    }),
                );

                // Separate behaviors that need merge from those that can be saved
                const behaviorsToSave: SaveBehaviorParams[] = [];
                for (const {behavior, mergeRequired, error} of mergeChecks) {
                    if (error) {
                        console.error(`Error checking merge for behavior ${behavior.behaviorId}:`, error);
                        result.failedCount++;
                    } else if (mergeRequired) {
                        result.mergeRequiredCount++;
                        result.mergeRequiredBehaviorIds.push(behavior.behaviorId);
                    } else {
                        behaviorsToSave.push(behavior);
                    }
                }

                // Phase 2: Save all non-merge behaviors in parallel
                const saveResults = await Promise.all(
                    behaviorsToSave.map(async behavior => {
                        const {behaviorId, revisionId, code, config, name, description, tags} = behavior;

                        try {
                            if (!config.name) {
                                showToast({
                                    type: "error",
                                    title: "Error saving behavior name",
                                    body: "Name cannot be empty.",
                                    duration: 5000,
                                });
                                return;
                            }
                            const attributes = config?.attributes;

                            const invalidAttrPath = findInvalidAttributePath(attributes);
                if (invalidAttrPath !== null) {
                                showToast({
                                    type: "error",
                                    title: "Error saving behavior attributes",
                                    body: `Each attribute must have both key and name (invalid: ${invalidAttrPath || "(empty)"}).`,
                                    duration: 5000,
                                });
                                return;
                            }

                            // Save the new revision and any name / description change in
                            // parallel
                            const savePromises = [];
                            savePromises.push(
                                createBehaviorRevision({
                                    assetId: behaviorId,
                                    parentRevisionId: revisionId,
                                    config,
                                    code,
                                }),
                            );

                            // Update asset name/description if provided
                            if (name !== undefined || description !== undefined || tags !== undefined) {
                                // Saving the behavior name, description and tags is a
                                // "best-effort" operation; if it fails, we'll just ignore it
                                const updateAssetPromise = updateAsset({
                                    assetId: behaviorId,
                                    name,
                                    description,
                                    tags,
                                }).catch(error => {
                                    console.error("Error saving behavior name, description, or tags:", error);
                                    showToast({
                                        type: "error",
                                        title: "Error saving behavior details",
                                        body: "Behavior name, description, or tags could not be saved.",
                                    });
                                });

                                savePromises.push(updateAssetPromise);
                            }

                            const saveResult = await Promise.all(savePromises);
                            const newRevisionId = saveResult[0]!.id;

                            return {
                                success: true as const,
                                behaviorId,
                                newRevisionId,
                                code,
                                config,
                            };
                        } catch (error) {
                            console.error(`Error saving behavior ${behaviorId}:`, error);
                            return {success: false as const, behaviorId};
                        }
                    }),
                );

                // Collect successful saves - caller handles registry updates
                const savedRevisions: SaveCompleteInfo[] = [];
                for (const saveResult of saveResults) {
                    if (!saveResult) {
                        // Validation failed (e.g. empty name); counted as failure
                        result.failedCount++;
                        continue;
                    }
                    if (saveResult.success) {
                        result.savedCount++;
                        result.savedBehaviorIds.push(saveResult.behaviorId);
                        savedRevisions.push({
                            assetId: saveResult.behaviorId,
                            revisionId: saveResult.newRevisionId,
                            code: saveResult.code,
                            config: saveResult.config,
                        });
                    } else {
                        result.failedCount++;
                    }
                }

                // Notify caller of all successful saves - caller handles registry updates and scene dependencies
                if (savedRevisions.length > 0) {
                    await onSaveAllComplete?.(savedRevisions);
                }

                // Show summary toast
                if (result.savedCount > 0 && result.mergeRequiredCount === 0) {
                    showToast({
                        type: "success",
                        title: `Saved ${result.savedCount} behavior${result.savedCount > 1 ? "s" : ""}`,
                    });
                } else if (result.savedCount > 0 && result.mergeRequiredCount > 0) {
                    showToast({
                        type: "warning",
                        title: `Saved ${result.savedCount}, ${result.mergeRequiredCount} need merge`,
                        body: "Behaviors requiring merge must be saved individually.",
                    });
                } else if (result.mergeRequiredCount > 0) {
                    const title =
                        result.mergeRequiredCount > 1
                            ? `${result.mergeRequiredCount} behaviors need merge`
                            : "1 behavior needs merge";

                    showToast({
                        type: "warning",
                        title,
                        body: "These behaviors must be saved individually.",
                    });
                }

                if (result.failedCount > 0) {
                    showToast({
                        type: "error",
                        title: `Failed to save ${result.failedCount} behavior${result.failedCount > 1 ? "s" : ""}`,
                    });
                }

                return result;
            } finally {
                setIsSaving(false);
            }
        },
        [checkMergeRequired, updateAsset, onSaveAllComplete],
    );

    return {
        save,
        saveAll,
        isSaving,
    };
}
