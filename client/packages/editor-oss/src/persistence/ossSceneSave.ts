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

import {
    getActiveCopilotPreviewPersistence,
    isCopilotPreviewSceneSaveBlocked,
} from "../agent/copilotPreviewPersistence";
import {saveStemEditor} from "../editor/stem-editor/saveStemEditor";
import Converter from "../serialization/Converter";
import global from "../global";
import {showToast} from "../showToast";

import {getProjectStore} from "./projectStoreFactory";
import type {ProjectBody, ProjectMeta} from "./types";

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

    if (shouldShowToast) {
        showToast({type: "success", title: "Saved"});
    }
    app.call("sceneSaved", null, saved);
}
