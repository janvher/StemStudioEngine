import {useEffect, useMemo, useState} from "react";

import {useAuthorizationContext} from "@stem/editor-oss/context";
import {checkIsSceneCollaborator} from "@stem/network/api/scene";
import global from "@stem/editor-oss/global";
import {IS_OSS} from "@stem/editor-oss/mode/buildMode";
import {isTemplateScene} from "@stem/editor-oss/utils/isTemplateScene";

// Cache the collaborator status for 1 minute
type CacheEntry = {
    isCollaborator: boolean;
    lastCheckTime: number;
};

const sceneCollaboratorCache = new Map<string, CacheEntry>();
const sceneCollaboratorInflight = new Map<string, Promise<boolean>>();

const SCENE_COLLABORATOR_CACHE_MAX_AGE = 60 * 1000;

type UseCanEditAssetParams = {
    assetOwnerId?: string | null;
};

export const useCanEditAsset = ({assetOwnerId}: UseCanEditAssetParams) => {
    const app = global.app;
    const sceneId = app?.editor?.sceneID;
    const sceneOwnerId = app?.editor?.projectUserId;
    const {isAdmin, dbUser} = useAuthorizationContext();
    const currentUserId = dbUser?.id;

    const [isCollaborator, setIsCollaborator] = useState(false);
    const [isCheckingCollaborator, setIsCheckingCollaborator] = useState(false);

    const isSceneOwner = currentUserId && sceneOwnerId ? currentUserId === sceneOwnerId : false;

    useEffect(() => {
        if (!sceneId) {
            setIsCollaborator(false);
            return;
        }

        // Check if the collaborator status is already cached
        const cachedValue = sceneCollaboratorCache.get(sceneId);
        if (cachedValue !== undefined) {
            const now = Date.now();
            if (now - cachedValue.lastCheckTime < SCENE_COLLABORATOR_CACHE_MAX_AGE) {
                setIsCollaborator(cachedValue.isCollaborator);
                return;
            } else {
                sceneCollaboratorCache.delete(sceneId);
            }
        }

        setIsCheckingCollaborator(true);

        let request = sceneCollaboratorInflight.get(sceneId);
        if (!request) {
            request = checkIsSceneCollaborator(sceneId)
                .then(result => {
                    sceneCollaboratorCache.set(sceneId, {
                        isCollaborator: result,
                        lastCheckTime: Date.now(),
                    });
                    return result;
                })
                .catch(error => {
                    console.warn("Failed to check collaborator status:", error);
                    throw error;
                })
                .finally(() => {
                    sceneCollaboratorInflight.delete(sceneId);
                });
            sceneCollaboratorInflight.set(sceneId, request);
        }

        request
            .then(result => {
                setIsCollaborator(result);
            })
            .catch(() => {
                setIsCollaborator(false);
            })
            .finally(() => {
                setIsCheckingCollaborator(false);
            });
    }, [sceneId]);

    const isTemplate = isTemplateScene(sceneId);

    // DOT-7545 Gap #3: read-only inspection gates all asset-edit affordances
    // even if the user would otherwise qualify (e.g. explicit `?readOnly=1`).
    const isReadOnly = !!app?.editor?.isReadOnly;

    const isContributor = isAdmin || isSceneOwner || isCollaborator;

    const canEdit = useMemo(() => {
        if (isTemplate) return false;
        if (isReadOnly) return false;
        // OSS: there's no cross-user ownership — everything is local and
        // the current "user" is a synthetic single-account stamp
        // (`OSS_LOCAL_USER_ID`) shared by AuthorizationContext and every
        // synth adapter. Owning the scene is sufficient; short-circuit
        // ahead of the cross-user check so a missing/stale `assetOwnerId`
        // (e.g. on a freshly-converted Stem before `getAsset` resolves)
        // doesn't strip the Stem actions ("Edit Stem", "Open in Stem
        // Editor", "Save Stem", "Export Stem") from the right-click menu.
        if (IS_OSS) return !!sceneOwnerId;
        const assetBelongsToSceneOwner = !!assetOwnerId && !!sceneOwnerId && assetOwnerId === sceneOwnerId;
        return isContributor && assetBelongsToSceneOwner;
    }, [assetOwnerId, sceneOwnerId, isContributor, isTemplate, isReadOnly]);

    // True when the user has a path to edit the asset *via fork*: they're a
    // scene contributor on a non-template, non-readonly scene. Used by
    // useEnsureEditableAsset to decide whether to fork-on-edit, and by
    // editor UIs to unlock writes ahead of an actual save. The server
    // remains authoritative — if the asset's IsForkable is nil/false, the
    // fork attempt will be rejected and the caller's error path surfaces it.
    const canFork = useMemo(() => {
        if (isTemplate) return false;
        if (isReadOnly) return false;
        return isContributor;
    }, [isContributor, isTemplate, isReadOnly]);

    return {
        canEdit,
        canFork,
        isCollaborator,
        isCheckingCollaborator,
        isAdmin,
        isSceneOwner,
    };
};
