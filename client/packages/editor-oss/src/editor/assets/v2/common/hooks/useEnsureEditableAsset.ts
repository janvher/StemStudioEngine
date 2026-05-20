import {useCallback, useRef} from "react";

import {useCanEditAsset} from "./useCanEditAsset";
import {AssetType, forkAsset as forkAssetApi} from "@stem/network/api/asset";
import {useReplaceAsset} from "../../../../asset-management/hooks/useReplaceAsset";

export type EnsureEditableAssetParams = {
    /** The asset id currently referenced in the scene. */
    assetId: string;
    /** The owner id of the asset. Used by `useCanEditAsset` to drive the canEdit / canFork gates. */
    assetOwnerId?: string | null;
    /** The asset type — passed to `useReplaceAsset` to route to the right per-type swap helper. */
    assetType: (typeof AssetType)[keyof typeof AssetType];
    /** The revision id pinned in the scene. Required by the backend fork endpoint. */
    revisionId: string;
};

export type EditableAssetRef = {
    assetId: string;
    revisionId: string;
};

/**
 * Hook that exposes the permission gates for an asset plus a `fork()` action
 * the caller invokes explicitly (typically from a "Remix" button shown when
 * the user is a contributor on the scene but doesn't own the asset).
 *
 * The button click *is* the user's consent — there's no separate prompt.
 * After fork, every scene reference is swapped to the new id and the
 * fork's {assetId, revisionId} is returned. The caller updates its local
 * state to point at the fork id (e.g. by switching the editor's
 * selection) and proceeds.
 *
 * Concurrent calls share a single in-flight fork promise so a double-click
 * doesn't create two forks.
 *
 * Throws when called without a fork-eligible state (read-only scene,
 * template scene, anonymous user, or anyone who isn't a contributor on
 * the scene). Callers should hide the Remix button when `canFork` is
 * false so this path isn't reachable.
 * @param root0
 * @param root0.assetId
 * @param root0.assetOwnerId
 * @param root0.assetType
 * @param root0.revisionId
 */
export const useEnsureEditableAsset = ({
    assetId,
    assetOwnerId,
    assetType,
    revisionId,
}: EnsureEditableAssetParams) => {
    const {canEdit, canFork, isCheckingCollaborator} = useCanEditAsset({assetOwnerId});
    const replaceAsset = useReplaceAsset();

    // Dedupe concurrent forks on the same id within this hook instance —
    // covers double-clicks on the Remix button.
    const inflightRef = useRef(new Map<string, Promise<EditableAssetRef>>());

    const fork = useCallback(async (): Promise<EditableAssetRef> => {
        if (!canFork) {
            throw new Error("Cannot fork this asset: you are not a contributor on this scene.");
        }

        const existing = inflightRef.current.get(assetId);
        if (existing) {
            return existing;
        }

        const inflight = (async (): Promise<EditableAssetRef> => {
            const forked = await forkAssetApi({assetId, revisionId});
            await replaceAsset({
                originalAssetId: assetId,
                newAssetId: forked.assetId,
                newRevisionId: forked.revisionId,
                assetType,
            });
            return {assetId: forked.assetId, revisionId: forked.revisionId};
        })();

        inflightRef.current.set(assetId, inflight);
        try {
            return await inflight;
        } finally {
            inflightRef.current.delete(assetId);
        }
    }, [canFork, assetId, revisionId, assetType, replaceAsset]);

    return {
        /** Perform the fork-and-swap. Caller invokes from an explicit user gesture. */
        fork,
        /** True when the user can edit directly without forking (owns the asset in this scene). */
        canEdit,
        /** True when the user has a path to edit by forking (contributor on a non-template, non-readonly scene). */
        canFork,
        /** True while the collaborator check that feeds canEdit is pending. */
        isCheckingPermissions: isCheckingCollaborator,
    };
};
