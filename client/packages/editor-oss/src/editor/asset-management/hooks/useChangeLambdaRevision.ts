import {useCallback} from "react";

import {useChangeAssetRevision} from "./useChangeAssetRevision";
import {getLambdaRevisionData} from "@stem/network/api/lambda";
import global from "@stem/editor-oss/global";
import {updateLambdaRegistries} from "../../lambdas/util";

/**
 * Hook that changes a lambda asset's revision in the scene: re-registers
 * the new config in the editor's `lambdaConfigRegistry` (and the runtime
 * lambdaManager when a game is playing), then runs through the shared
 * orchestrator to remap every `lambdaComponent.lambdaId` and refresh
 * AssetRefs.
 *
 * Optionally swaps the asset id at the same time (fork-on-edit case): when
 * newAssetId is provided and differs from lambdaId, the new revision is
 * fetched from the fork's id, the registry is re-keyed from old → new,
 * and `mapAssetIds` rewrites every scene reference.
 *
 * @returns A function that performs the lambda revision change.
 */
export const useChangeLambdaRevision = () => {
    const changeAssetRevision = useChangeAssetRevision();

    return useCallback(
        async (lambdaId: string, newRevisionId: string, newAssetId?: string): Promise<void> => {
            const editor = global.app?.editor;
            if (!editor) {
                console.warn("[useChangeLambdaRevision] No editor available.");
                return;
            }

            const isAssetIdChange = !!newAssetId && newAssetId !== lambdaId;
            const effectiveLambdaId = newAssetId ?? lambdaId;

            // Fetch the new revision's config so we can register it before
            // scene refs are rewritten. Code isn't needed here — runtime
            // LambdaManager loads it from scene assets when the scene plays.
            const {config} = await getLambdaRevisionData(effectiveLambdaId, newRevisionId);

            await changeAssetRevision(
                lambdaId,
                newRevisionId,
                async () => {
                    updateLambdaRegistries({
                        lambdaId: effectiveLambdaId,
                        config,
                        previousLambdaId: isAssetIdChange ? lambdaId : undefined,
                    });
                },
                newAssetId,
            );
        },
        [changeAssetRevision],
    );
};
