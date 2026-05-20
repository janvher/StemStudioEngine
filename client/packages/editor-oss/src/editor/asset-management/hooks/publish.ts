import {useMutation} from "@tanstack/react-query";

import type {DomainSceneDto} from "@stem/network/api/client/api";
import {publishScene, unpublishScene} from "@stem/network/api/scene/v2";
import global from "@stem/editor-oss/global";

/**
 * Payload shape broadcast on the `scenePublishStateUpdated` event bus topic
 * whenever a scene is published or unpublished.
 *
 * The legacy emit (from `Footer.tsx`) passed `global.app.editor` directly so
 * subscribers could read `data.isPublished` / `data.publishRevisionId` off it.
 * The new payload keeps those fields and adds `sceneId` / `assetId` so
 * cross-surface subscribers (dashboard, version modal) can filter.
 */
export type ScenePublishStateUpdatedPayload = {
    sceneId: string;
    assetId?: string;
    publishRevisionId: string;
    isPublished: boolean;
    isPublic: boolean;
};

/**
 * Broadcast the `scenePublishStateUpdated` event after a publish/unpublish
 * has succeeded. Subscribers (editor TopMenu, version modal, dashboard
 * overview action bar) read the payload to update their local UI.
 *
 * No query caches need invalidating: `PublishScene` / `UnpublishScene` only
 * mutate scene-collection fields (`publishRevisionId`, `isPublished`,
 * `isPublic`), none of which appear on `DomainAssetDto` or
 * `DomainAssetRevisionDto` responses.
 * @param sceneId Scene that was (un)published; broadcast so subscribers can filter.
 * @param sceneAssetId Optional asset ID of the scene; forwarded on the event payload so subscribers can filter.
 * @param result The API response from `publishScene` / `unpublishScene`.
 */
export const emitScenePublishStateUpdated = (
    sceneId: string,
    sceneAssetId: string | undefined,
    result: DomainSceneDto,
) => {
    const payload: ScenePublishStateUpdatedPayload = {
        sceneId,
        assetId: sceneAssetId,
        publishRevisionId: result.publishRevisionId ?? "",
        isPublished: !!result.isPublished,
        isPublic: !!result.isPublic,
    };
    global.app?.call("scenePublishStateUpdated", null, payload);
};

type PublishSceneVariables = {
    sceneId: string;
    revisionId: string;
    /** Asset ID of the scene, forwarded on the `scenePublishStateUpdated` event payload. Optional when unknown at call site. */
    sceneAssetId?: string;
    /** Optional publish options forwarded to the API. */
    options?: {isPublic?: boolean};
};

/**
 * React Query mutation for publishing a scene revision. On success emits
 * `scenePublishStateUpdated` with a structured payload.
 * @returns A React Query `UseMutationResult` wrapping `publishScene`.
 */
export const usePublishScene = () => {
    return useMutation({
        mutationFn: ({sceneId, revisionId, options}: PublishSceneVariables) =>
            publishScene(sceneId, revisionId, options),
        onSuccess: (result, variables) => {
            emitScenePublishStateUpdated(variables.sceneId, variables.sceneAssetId, result);
        },
    });
};

type UnpublishSceneVariables = {
    sceneId: string;
    sceneAssetId?: string;
};

/**
 * React Query mutation for unpublishing a scene. See `usePublishScene` for
 * the event side-effects on success.
 * @returns A React Query `UseMutationResult` wrapping `unpublishScene`.
 */
export const useUnpublishScene = () => {
    return useMutation({
        mutationFn: ({sceneId}: UnpublishSceneVariables) => unpublishScene(sceneId),
        onSuccess: (result, variables) => {
            emitScenePublishStateUpdated(variables.sceneId, variables.sceneAssetId, result);
        },
    });
};
