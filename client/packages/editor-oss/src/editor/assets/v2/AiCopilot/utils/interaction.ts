import {Object3D} from "three";

import {CommandExecutionResult} from "@stem/editor-oss/agent/CommandsExecutor";
import {SupportedCommands} from "@stem/editor-oss/agent/CommandsRegistry";
import type {ICopilotProvider} from "@stem/editor-oss/copilot";
import {
    InteractiveResult,
    InteractiveSelectionEvent,
    InteractiveSelectionResolution,
} from "@stem/editor-oss/agent/types/ACPTypes";
import {showToast} from "@stem/editor-oss/showToast";

export interface InteractiveSelectionHandlingResult {
    resumedPrompt: boolean;
    results: CommandExecutionResult[];
}

/**
 * Handle user selection for interactive results
 * @param selection
 * @param interactiveResult
 * @param acpClient
 * @param handleLoad
 */
export const handleInteractiveSelection = async (
    selection: InteractiveSelectionEvent,
    interactiveResult: InteractiveResult,
    acpClient: ICopilotProvider | null,
    handleLoad?: (isLoading: boolean, itemId: string) => void,
): Promise<InteractiveSelectionHandlingResult> => {
    console.log("✅ [AiCopilot] User selection:", selection);

    // Check if this interactive result is currently pending
    const isPending = acpClient?.checkPendingInteractiveResult(interactiveResult.id);
    let resumedPrompt = false;

    if (selection.action === "confirm") {
        const results: CommandExecutionResult[] = [];

        // Execute commands for selected items
        for (const item of selection.selectedItems) {
            handleLoad?.(true, item.id);
        }
        console.log("🚀 [AiCopilot] Processing interactiveResult", interactiveResult);
        try {
            for (const item of selection.selectedItems) {
                switch (interactiveResult.command) {
                    case SupportedCommands.AddModelToScene: {
                        const result = await handleInteractiveAddModel(item, acpClient);
                        if (result) results.push(result);
                        break;
                    }
                    case SupportedCommands.SetExternalTexture: {
                        const result = await handleInteractiveSetExternalTexture(
                            item,
                            acpClient,
                            selection.selectedObjects,
                        );
                        if (result) results.push(...result);
                        break;
                    }
                    case SupportedCommands.AddPrefabToScene: {
                        const result = await handleInteractiveAddPrefab(item, acpClient);
                        if (result) results.push(result);
                        break;
                    }
                    default:
                        console.warn(
                            `⚠️ [AiCopilot] No handler for command ${interactiveResult.command} in interactive selection`,
                        );
                        break;
                }

                handleLoad?.(false, item.id);
            }
        } catch (error) {
            console.error("[AiCopilot] Error during interactive selection execution:", error);
        } finally {
            // Always notify the ACP client so the copilot session resumes
            // even when command execution fails.
            if (isPending) {
                const resolution: InteractiveSelectionResolution = {
                    interactiveResult,
                    selection,
                    results,
                };
                resumedPrompt = acpClient?.submitInteractiveSelectionResolution(resolution) ?? false;
            }
        }
        return {resumedPrompt, results};
    } else if (selection.action === "cancel" && isPending) {
        // User cancelled - resolve with empty results
        const resolution: InteractiveSelectionResolution = {
            interactiveResult,
            selection,
            results: [],
        };
        resumedPrompt = acpClient?.submitInteractiveSelectionResolution(resolution) ?? false;
        return {resumedPrompt, results: []};
    }

    return {resumedPrompt: false, results: []};
};

/**
 * Handle interactive result cancellation
 */
export const handleInteractiveCancel = () => {
    console.log("❌ [AiCopilot] User cancelled selection");
    // The cancel selection event is already sent by InteractiveResults component
};

/**
 * Add a model to the scene from interactive selection
 * @param item
 * @param acpClient
 */
export const handleInteractiveAddModel = async (
    item: any,
    acpClient: ICopilotProvider | null,
): Promise<CommandExecutionResult | undefined> => {
    if (!acpClient) return;

    try {
        const params = {
            id: item.id,
            name: item.name,
            provider: item.metadata?.provider || "local",
            downloadUrl: item.metadata?.downloadUrl || "",
        };

        console.log("📤 [AiCopilot] Calling add_model_to_scene with params:", params);

        const result = await acpClient.executeCommand(SupportedCommands.AddModelToScene, params);

        if (result.success) {
            showToast({type: "success", title: "Selected asset added to scene"});
        } else {
            showToast({
                type: "error",
                title: "Failed to add selected asset to scene",
            });
        }
        return result;
    } catch (error: any) {
        console.error("Failed to execute command with selected item:", error);
        showToast({
            type: "error",
            title: "Failed to add selected asset to scene",
        });
        return {
            success: false,
            error: error.message || "Failed to add model to scene",
        } as CommandExecutionResult;
    }
};

export const handleInteractiveSetExternalTexture = async (
    item: any,
    acpClient: ICopilotProvider | null,
    selectedObjects?: Object3D[],
): Promise<CommandExecutionResult[] | undefined> => {
    if (!acpClient) return;

    if (!selectedObjects || selectedObjects.length === 0) {
        showToast({
            type: "error",
            title: "No objects selected",
        });
        return;
    }
    let results: CommandExecutionResult[] = [];
    for (const object of selectedObjects) {
        try {
            const params = {
                target: object.uuid,
                name: item.name,
                assetId: item.id,
                assetType: item.metadata?.assetType || "unknown",
                provider: item.metadata?.provider || "local",
            };
            const result = await acpClient.executeCommand(SupportedCommands.SetExternalTexture, params);

            console.log("📤 [AiCopilot] Calling set_external_texture with params:", params);
            console.log("📥 [AiCopilot] Result:", result);
            results.push(result);
        } catch (error: any) {
            console.error("Failed to execute set_external_texture command:", error);
            showToast({
                type: "error",
                title: `Failed to set texture on object ${object.name}`,
            });
        }
    }
    return results;
};

export const handleInteractiveAddPrefab = async (
    item: any,
    acpClient: ICopilotProvider | null,
): Promise<CommandExecutionResult | undefined> => {
    if (!acpClient) return;

    try {
        const params = {
            id: item.id,
            name: item.name,
        };

        console.log("📤 [AiCopilot] Calling add_prefab_to_scene with params:", params);

        const result = await acpClient.executeCommand(SupportedCommands.AddPrefabToScene, params);

        if (result.success) {
            showToast({type: "success", title: "Selected stem added to scene"});
        } else {
            showToast({
                type: "error",
                title: "Failed to add selected stem to scene",
            });
        }
        return result;
    } catch (error: any) {
        console.error("Failed to execute add_prefab_to_scene command:", error);
        showToast({
            type: "error",
            title: "Failed to add selected stem to scene",
        });
        return {
            success: false,
            error: error.message || "Failed to add prefab to scene",
        } as CommandExecutionResult;
    }
};
