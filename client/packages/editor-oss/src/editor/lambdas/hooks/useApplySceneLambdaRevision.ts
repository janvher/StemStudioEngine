import {useCallback} from "react";

import {UpdateSceneLambdaRevisionOptions, useUpdateSceneLambdaRevision} from "./lambdas";
import {saveScene} from "@stem/network/api/scene";
import global from "@stem/editor-oss/global";

/**
 * Hook for applying a lambda revision to the current scene. Mirrors
 * `useApplySceneBehaviorRevision`: pins the new revision via
 * `useUpdateSceneLambdaRevision`, then triggers `saveScene` when the editor
 * is in collaborative mode so other clients pick up the change.
 */
export const useApplySceneLambdaRevision = () => {
    const updateSceneLambdaRevision = useUpdateSceneLambdaRevision();

    return useCallback(
        async (
            lambdaId: string,
            revisionId: string,
            options: UpdateSceneLambdaRevisionOptions = {},
        ): Promise<void> => {
            const updated = await updateSceneLambdaRevision(lambdaId, revisionId, options);

            if (!updated || !global.app?.editor?.isCollaborative) {
                return;
            }

            await saveScene(false, false);
        },
        [updateSceneLambdaRevision],
    );
};
