import {
    fetchMyScenes,
    saveScene as remoteSaveScene,
    type FetchScenesParams,
} from "@stem/network/api/scene";
import {loadScene as remoteLoadScene} from "@stem/network/api/scene";
import Ajax from "../utils/Ajax";
import global from "../global";
import {backendUrlFromPath} from "../utils/UrlUtils";

import {RemoteProjectStore, setProjectStore} from "@stem/editor-oss";
import type {
    RemoteProjectStoreDeps,
    RemoteSceneListResult,
    RemoteSceneLoadResult,
    ProjectMeta,
    ProjectBody,
} from "@stem/editor-oss";

/**
 * Builds a RemoteProjectStoreDeps backed by the integrated cloud Scene API.
 * The OSS package never imports the Scene API directly — this glue lives in
 * shared/ so the boundary stays clean.
 *
 * Right now `list` and `load` are wired to the real API. `save` and `delete`
 * surface explicit "not yet wired" errors; their integrated mappings come in
 * a follow-up that migrates editor-side save flows onto the interface.
 */
const integratedDeps: RemoteProjectStoreDeps = {
    async fetchScenes(params): Promise<RemoteSceneListResult> {
        const ssParams: FetchScenesParams = {
            page: params.page,
            limit: params.limit,
        };
        const result = await fetchMyScenes(ssParams);
        return {
            Scenes: (result?.Scenes ?? []).map(s => ({
                ID: s.ID,
                Name: s.Name,
                UpdateTime: s.UpdateTime,
                CreateTime: (s as {CreateTime?: string}).CreateTime,
                Thumbnail: s.Thumbnail,
            })),
            Page: result?.Page ?? params.page,
            HasMore: result?.HasMore ?? false,
            TotalCount: result?.TotalCount ?? (result?.Scenes ?? []).length,
        };
    },

    async loadScene(id): Promise<RemoteSceneLoadResult> {
        const result = await remoteLoadScene(id);
        return {data: result.data, metadata: result.metadata};
    },

    async saveScene(body: ProjectBody): Promise<ProjectMeta> {
        // The cloud Scene API mutates the live editor state — `body` is
        // informational only here. The editor is the canonical source of
        // truth; calling `ProjectStore.save()` in integrated mode means
        // "persist the current editor state to the cloud."
        //
        // Callers that already drive the editor (e.g., CreateDashboard,
        // ScriptTool exportSceneBundle) can use this path freely. Callers
        // that hand-build a ProjectBody from scratch (rare, mostly OSS) get
        // the live editor state instead of their body — a documented
        // limitation of the integrated adapter.
        await remoteSaveScene(false, false);
        const editor = global.app?.editor;
        const meta: ProjectMeta = {
            id: body.meta.id || editor?.sceneID || "",
            name: editor?.sceneName ?? body.meta.name ?? "Untitled",
            createdAt: body.meta.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            thumbnailUrl: editor?.sceneThumbnail ?? body.meta.thumbnailUrl,
        };
        return meta;
    },

    async deleteScene(id): Promise<void> {
        const url = backendUrlFromPath(`/api/Scene/Delete?ID=${id}`);
        if (!url) throw new Error("Failed to resolve backend URL for scene delete");
        await Ajax.post({url, data: {}, needAuthorization: true});
    },
};

let initialized = false;

/**
 * Wire the integrated build's ProjectStore singleton to the cloud Scene API.
 * Idempotent — safe to call from multiple bootstrap paths. The factory throws
 * in integrated mode if you try `getProjectStore()` without calling this
 * first, so registering it at app boot is the right pattern.
 */
export function initIntegratedProjectStore(): void {
    if (initialized) return;
    setProjectStore(new RemoteProjectStore(integratedDeps));
    initialized = true;
}
