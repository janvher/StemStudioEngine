import {useCallback} from "react";

import {UpdateSceneBehaviorRevisionOptions, useUpdateSceneBehaviorRevision} from "./behaviors";
import {saveScene} from "@stem/network/api/scene";
import global from "@stem/editor-oss/global";

export const useApplySceneBehaviorRevision = () => {
    const updateSceneBehaviorRevision = useUpdateSceneBehaviorRevision();

    return useCallback(
        async (
            behaviorId: string,
            revisionId: string,
            options: UpdateSceneBehaviorRevisionOptions = {},
        ): Promise<void> => {
            const updated = await updateSceneBehaviorRevision(behaviorId, revisionId, options);

            if (!updated || !global.app?.editor?.isCollaborative) {
                return;
            }

            await saveScene(false, false);
        },
        [updateSceneBehaviorRevision],
    );
};
