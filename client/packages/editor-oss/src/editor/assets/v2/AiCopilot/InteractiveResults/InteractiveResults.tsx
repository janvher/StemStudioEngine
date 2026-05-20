import React from "react";
import * as THREE from "three";

import {AssetSearchResult} from "./components/AssetSearchResult";
import {TextureSearchResult} from "./components/TextureSearchResult";
import {SupportedCommands} from "@stem/editor-oss/agent/CommandsRegistry";
import {InteractiveResult, InteractiveSelectionEvent} from "@stem/editor-oss/agent/types/ACPTypes";

interface InteractiveResultsProps {
    result: InteractiveResult;
    onSelect: (selection: InteractiveSelectionEvent, handleLoad?: (isLoading: boolean, itemId: string) => void) => void;
    onCancel: () => void;
    isPending?: boolean; // If true, this is an active pending result waiting for user selection
    selectedObjects?: THREE.Object3D[]; // Currently selected objects in the scene
}

/**
 * InteractiveResults - Wrapper component that renders the appropriate result component
 * based on the command type. Each command can have its own validation and UI logic.
 * @param root0
 * @param root0.result
 * @param root0.onSelect
 * @param root0.onCancel
 * @param root0.isPending
 * @param root0.selectedObjects
 */
export const InteractiveResults: React.FC<InteractiveResultsProps> = ({
    result,
    onSelect,
    onCancel,
    isPending,
    selectedObjects,
}) => {
    // Route to appropriate component based on command
    switch (result.command) {
        case SupportedCommands.AddModelToScene:
            return <AssetSearchResult result={result}
                onSelect={onSelect}
                onCancel={onCancel}
                isPending={isPending}
                   />;

        case SupportedCommands.SetExternalTexture:
            return (
                <TextureSearchResult
                    result={result}
                    onSelect={onSelect}
                    onCancel={onCancel}
                    isPending={isPending}
                    selectedObjects={selectedObjects}
                />
            );

        // Fallback for asset_search type (legacy support)
        default:
            if (result.type === "asset_search") {
                return (
                    <AssetSearchResult result={result}
                        onSelect={onSelect}
                        onCancel={onCancel}
                        isPending={isPending}
                    />
                );
            }

            console.warn(
                `[InteractiveResults] No component found for command: ${result.command}, type: ${result.type}`,
            );
            return null;
    }
};
