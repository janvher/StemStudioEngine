import {useState, useCallback} from "react";

import {showToast} from "@stem/editor-oss/showToast";
import {useGetAsset, useUpdateAsset} from "../../../../../asset-management/hooks/assets";
import {useCreateLambdaRevision, useGetLambdaRevisionData} from "../../../../../lambdas/hooks/lambdas";

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
    lambdaAssetId: string;
    mergedCode: string;
    mergedConfigStr: string;
    mergeRevisionId: string;
}

export interface SaveCompleteInfo {
    assetId: string;
    revisionId: string;
    code: string;
    configStr: string;
}

export interface UseLambdaSaveOptions {
    onMergeRequired: MergeHandler;
    onMergeComplete?: (params: MergeCompleteParams) => void;
    onSaveComplete?: (info: SaveCompleteInfo) => Promise<void> | void;
}

export interface SaveLambdaParams {
    lambdaAssetId: string;
    revisionId: string;
    code: string;
    configStr: string;
    name?: string;
}

export interface UseLambdaSaveReturn {
    save: (params: SaveLambdaParams) => Promise<boolean>;
    isSaving: boolean;
}

/**
 * Hook for saving lambda changes with merge conflict resolution.
 * Mirrors the behavior of useBehaviorSave but for lambdas.
 * @param options
 */
export function useLambdaSave(options: UseLambdaSaveOptions): UseLambdaSaveReturn {
    const {onMergeRequired, onMergeComplete, onSaveComplete} = options;
    const [isSaving, setIsSaving] = useState(false);
    const getAsset = useGetAsset();
    const createLambdaRevision = useCreateLambdaRevision();
    const {mutateAsync: updateAsset} = useUpdateAsset();
    const getLambdaRevisionData = useGetLambdaRevisionData();

    /**
     * Merge lambda code/config with latest revision if needed.
     * Returns merged content or signals cancellation.
     */
    const mergeLambda = useCallback(async (
        lambdaAssetId: string,
        codeRevisionId: string,
        code: string,
        configRevisionId: string,
        configStr: string,
    ): Promise<{canceled: boolean; mergeRevisionId: string; mergedCode: string; mergedConfig: string}> => {
        const {headRevisionId} = await getAsset(lambdaAssetId);

        // If no newer revisions, no merge needed
        if (codeRevisionId === headRevisionId && configRevisionId === headRevisionId) {
            return {
                canceled: false,
                mergeRevisionId: headRevisionId,
                mergedCode: code,
                mergedConfig: configStr,
            };
        }

        const latestRevision = await getLambdaRevisionData(lambdaAssetId, headRevisionId);
        const latestCode = latestRevision.code || "";
        const latestConfigStr = JSON.stringify(latestRevision.config);

        // If there's a newer revision of the code, request merge
        if (codeRevisionId !== headRevisionId) {
            let mergedCode = code;

            // Only display the merge dialog if the code actually differs
            if (code !== latestCode) {
                const baseRevision = await getLambdaRevisionData(lambdaAssetId, codeRevisionId);
                const result = await onMergeRequired({
                    baseText: baseRevision.code || "",
                    localText: code,
                    latestText: latestCode,
                });

                if (result.canceled) {
                    return {canceled: true, mergeRevisionId: "", mergedCode: "", mergedConfig: ""};
                }

                mergedCode = result.mergedText;
            }

            // Recursively merge config with the merged code
            return mergeLambda(lambdaAssetId, headRevisionId, mergedCode, configRevisionId, configStr);
        }

        // If there's a newer revision of the config, request merge
        let mergedConfigText = configStr;

        // Only display the merge dialog if the config actually differs
        if (configStr !== latestConfigStr) {
            const baseRevision = await getLambdaRevisionData(lambdaAssetId, configRevisionId);
            const baseConfigStr = JSON.stringify(baseRevision.config);
            const result = await onMergeRequired({
                baseText: baseConfigStr,
                localText: configStr,
                latestText: latestConfigStr,
            });

            if (result.canceled) {
                return {canceled: true, mergeRevisionId: "", mergedCode: "", mergedConfig: ""};
            }

            mergedConfigText = result.mergedText;
        }

        return mergeLambda(lambdaAssetId, codeRevisionId, code, headRevisionId, mergedConfigText);
    }, [getAsset, getLambdaRevisionData, onMergeRequired]);

    /**
     * Save a lambda with merge conflict resolution.
     * Returns true if save was successful, false if canceled, merged (needs re-save), or failed.
     */
    const save = useCallback(async (params: SaveLambdaParams): Promise<boolean> => {
        const {lambdaAssetId, revisionId, code, configStr, name} = params;

        setIsSaving(true);

        try {
            // Perform merge with latest changes if needed
            const {canceled, mergeRevisionId, mergedCode, mergedConfig} = await mergeLambda(
                lambdaAssetId,
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
                    lambdaAssetId,
                    mergedCode,
                    mergedConfigStr: mergedConfig,
                    mergeRevisionId,
                });
                showToast({
                    type: "success",
                    title: "Changes merged successfully",
                    body: "Click 'Save' to save the changes.",
                });
                return false;
            }

            // Create new revision
            const newRevision = await createLambdaRevision({
                id: lambdaAssetId,
                parentRevisionId: mergeRevisionId,
                config: mergedConfig,
                code: mergedCode,
            });

            // Update asset name if provided
            if (name !== undefined) {
                await updateAsset({
                    assetId: lambdaAssetId,
                    name,
                });
            }

            // Notify caller of successful save
            await onSaveComplete?.({
                assetId: lambdaAssetId,
                revisionId: newRevision.id,
                code: mergedCode,
                configStr: mergedConfig,
            });

            showToast({type: "success", title: "Lambda saved successfully"});
            return true;
        } catch (error) {
            console.error("[useLambdaSave] Save failed:", error);
            showToast({type: "error", title: "Failed to save lambda"});
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [mergeLambda, createLambdaRevision, updateAsset, onMergeComplete, onSaveComplete]);

    return {
        save,
        isSaving,
    };
}
