/**
 * OSS-mode replacement for the cloud `saveScene` flow. Installed by
 * `bootstrap.ts` when the OSS persistence singleton is registered. Routes
 * every editor save through the active `ProjectStore` — IndexedDB or File
 * System Access — instead of POSTing to the cloud Scene API.
 *
 * The handler mirrors the cloud flow's high-level shape (read-only guard,
 * copilot preview block, stem-editor redirect, `sceneSaveStart` /
 * `sceneSaved` / `sceneSaveFailed` events, optional toast) while replacing
 * cloud persistence with the local ProjectStore.
 */

import {getOssAssetsForProject} from "@stem/network/api/asset";

import {
    getActiveCopilotPreviewPersistence,
    isCopilotPreviewSceneSaveBlocked,
} from "../agent/copilotPreviewPersistence";
import {saveStemEditor} from "../editor/stem-editor/saveStemEditor";
import Converter from "../serialization/Converter";
import global from "../global";
import {showToast} from "../showToast";

import {getProjectStore} from "./projectStoreFactory";
import type {ProjectBody, ProjectMeta, StoredAsset} from "./types";

/**
 * Persist the binary OSS assets (models, images, audio) a project depends
 * on into the active ProjectStore. OSS synthesizes these as in-memory
 * `data:` URLs with no asset service behind them; without this the scene
 * JSON's model references would dangle after a reload. A failure here means
 * the scene was saved but its binary assets were NOT — a reload would show a
 * scene with missing models. That is a real save failure, so this throws and
 * the caller surfaces it instead of reporting a clean "Saved".
 */
async function persistProjectAssets(projectId: string): Promise<void> {
    const splitDataUrl = (url: string): {contentType?: string; base64: string} => {
        // `data:<mime>;base64,<payload>` → {mime, payload}
        const comma = url.indexOf(",");
        if (comma < 0) return {base64: url};
        const header = url.slice(5, comma); // skip "data:"
        const semi = header.indexOf(";");
        const mime = semi >= 0 ? header.slice(0, semi) : header;
        return {contentType: mime || undefined, base64: url.slice(comma + 1)};
    };
    const assets: StoredAsset[] = getOssAssetsForProject(projectId)
        .filter(record => record.dataUrl)
        .map(record => {
            const main = splitDataUrl(record.dataUrl!);
            const thumb = record.thumbnailDataUrl ? splitDataUrl(record.thumbnailDataUrl) : undefined;
            return {
                assetId: record.assetId,
                revisionId: record.revisionId,
                type: record.type,
                format: record.format,
                name: record.name,
                contentType: record.contentType,
                metadata: record.metadata,
                data: main.base64,
                ...(thumb ? {thumbnailData: thumb.base64, thumbnailContentType: thumb.contentType} : {}),
            };
        });
    await getProjectStore().saveAssets(projectId, assets);
}

/**
 * Build a minimal stable project id when the editor doesn't have one yet
 * (first save of a new project in OSS). Format: `oss-<timestamp>-<rand>`
 * stays unique enough for local-only storage without bringing in a UUID dep.
 */
function generateOSSProjectId(): string {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 8);
    return `oss-${ts}-${rand}`;
}

/**
 * Serialize the live editor state and persist it via the registered
 * `ProjectStore`. Wired into `network/scene/setSceneSaveHandler` by the
 * OSS bootstrap so existing `saveScene(...)` call sites work unchanged.
 */
export async function ossSaveScene(_createThumbnail: boolean, shouldShowToast: boolean): Promise<void> {
    const app = global.app;
    const editor = app?.editor;
    if (!app || !editor) {
        if (shouldShowToast) showToast({type: "error", title: "Cannot save — editor not ready."});
        return;
    }

    // Read-only inspection mode parity with the cloud flow.
    if (editor.isReadOnly) {
        console.warn("ossSaveScene: ignored — editor is in read-only inspection mode");
        return;
    }

    if (isCopilotPreviewSceneSaveBlocked()) {
        const preview = getActiveCopilotPreviewPersistence();
        console.warn("ossSaveScene: ignored — Copilot temporary preview is active", preview);
        app.call("copilotPreviewSaveBlocked", null, preview);
        return;
    }

    if (app.scene?.userData?.stemEditor) {
        await saveStemEditor();
        return;
    }

    app.call("sceneSaveStart");
    editor.onSaveScene();

    let sceneJson: string;
    try {
        const experience = new (Converter as unknown as new () => {toJSON: (opts: unknown) => unknown})().toJSON({
            options: app.options,
            camera: app.camera,
            scripts: app.scripts,
            scene: app.scene,
        });
        sceneJson = JSON.stringify(experience);
    } catch (err) {
        console.error("ossSaveScene: serialization failed", err);
        if (shouldShowToast) showToast({type: "error", title: "Save failed — could not serialize scene."});
        app.call("sceneSaveFailed");
        return;
    }

    const id = editor.sceneID || generateOSSProjectId();
    const now = new Date().toISOString();
    // Editor doesn't track `sceneCreatedAt` directly; the ProjectStore
    // implementations (IndexedDB / FS Access) preserve the existing
    // `createdAt` on update and only stamp it on first save.
    const body: ProjectBody = {
        meta: {
            id,
            name: editor.sceneName ?? "Untitled",
            updatedAt: now,
            createdAt: now,
            thumbnailUrl: editor.sceneThumbnail || undefined,
        },
        sceneJson,
    };

    let saved: ProjectMeta;
    try {
        saved = await getProjectStore().save(body);
    } catch (err) {
        console.error("ossSaveScene: ProjectStore.save failed", err);
        if (shouldShowToast) showToast({type: "error", title: "Save failed."});
        app.call("sceneSaveFailed");
        return;
    }

    // Persist the assigned id back onto the editor so subsequent saves
    // overwrite the same project entry instead of creating duplicates.
    if (!editor.sceneID) {
        editor.sceneID = saved.id;
    }

    // Persist binary assets (models/images/audio) alongside the project so
    // the scene's asset references resolve after a reload. If this fails the
    // scene JSON is saved but its assets are not — a reload would render a
    // scene with missing models. Surface that as a save failure rather than
    // reporting a clean "Saved".
    try {
        await persistProjectAssets(saved.id);
    } catch (err) {
        console.error("ossSaveScene: failed to persist project assets", err);
        if (shouldShowToast) showToast({type: "error", title: "Save failed — could not persist assets."});
        app.call("sceneSaveFailed");
        return;
    }

    if (shouldShowToast) {
        showToast({type: "success", title: "Saved"});
    }
    app.call("sceneSaved", null, saved);
}
