import {
    type ReadonlyAssetResolutionContext,
    emptyAssetResolutionContext,
    getAssetResolutionContext,
} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {updateSceneDependencies} from "@stem/network/api/scene/v2";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import type {CopilotPreviewSnapshot} from "./copilotPreviewSession";

export type CopilotPreviewDependencyCleanupPlan = {
    needsSync: boolean;
    dependencies: Record<string, string>;
    removedAssetIds: string[];
    restoredAssetIds: string[];
};

const cloneDependencies = (context?: ReadonlyAssetResolutionContext | null): Record<string, string> => ({
    ...(context?.assetIdToRevisionId ?? {}),
});

const recordsEqual = (left: Record<string, string>, right: Record<string, string>): boolean => {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every(key => left[key] === right[key]);
};

export const planDependencyCleanupForSnapshot = (
    snapshot: CopilotPreviewSnapshot,
    previewContext?: ReadonlyAssetResolutionContext | null,
): CopilotPreviewDependencyCleanupPlan => {
    const baseDependencies = {...snapshot.assetResolutionContext.assetIdToRevisionId};
    const previewDependencies = cloneDependencies(previewContext ?? emptyAssetResolutionContext);

    const removedAssetIds = Object.keys(previewDependencies).filter(assetId => !(assetId in baseDependencies));
    const restoredAssetIds = Object.keys(baseDependencies).filter(assetId => previewDependencies[assetId] !== baseDependencies[assetId]);

    return {
        needsSync: !recordsEqual(baseDependencies, previewDependencies),
        dependencies: baseDependencies,
        removedAssetIds,
        restoredAssetIds,
    };
};

export const cleanupSceneDependenciesForSnapshot = async (
    app: EngineRuntime,
    snapshot: CopilotPreviewSnapshot,
): Promise<CopilotPreviewDependencyCleanupPlan> => {
    const sceneId = snapshot.baseSceneId ?? app.editor?.sceneID ?? "";
    const previewContext = app.scene ? getAssetResolutionContext(app.scene) : null;
    const plan = planDependencyCleanupForSnapshot(snapshot, previewContext);

    if (!sceneId || !plan.needsSync || app.editor?.assetSource?.kind !== "scene") {
        return plan;
    }

    await updateSceneDependencies(sceneId, plan.dependencies);
    plan.removedAssetIds.forEach(assetId => {
        app.call("assetRemoved", null, {assetId});
    });
    app.call("copilotPreviewDependenciesRestored", null, {
        sceneId,
        dependencies: plan.dependencies,
        removedAssetIds: plan.removedAssetIds,
        restoredAssetIds: plan.restoredAssetIds,
    });
    return plan;
};
