import {createAssetRevisionWithData, getAsset, isConflictError, isNoChangesError} from "@stem/network/api/asset";
import {getAssetResolutionContext, resolveAssetRevisionId, setAssetRevision} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import global from "@stem/editor-oss/global";
import {serializePrefab} from "@stem/editor-oss/prefab/serialization";
import {getPrefabId} from "@stem/editor-oss/prefab/util";
import {showToast} from "@stem/editor-oss/showToast";
import {ElementsUtils} from "@stem/editor-oss/utils/ElementsUtils";
import TimeUtils from "@stem/editor-oss/utils/TimeUtils";

export type StemEditorMetadata = {
    assetId: string;
};

/**
 * Find the stem instance in the scene. It's the direct child of the scene
 * root that has a prefabId matching the stem asset ID.
 * @param stemAssetId
 */
const findStemInstance = (stemAssetId: string) => {
    const scene = global.app?.scene;
    if (!scene) return null;

    for (const child of scene.children) {
        if (getPrefabId(child) === stemAssetId) {
            return child;
        }
    }
    return null;
};

/**
 * Save the stem being edited in the stem editor.
 *
 * Serializes the stem instance, reads the dependency list from the local
 * AssetResolutionContext (maintained by add/remove/change operations during
 * the session), and creates a new asset revision.
 */
export const saveStemEditor = async (): Promise<void> => {
    const app = global.app;
    const editor = app?.editor;
    const scene = app?.scene;

    if (!editor || !scene) {
        showToast({type: "error", title: "Cannot save: editor not initialized."});
        app?.call("sceneSaveFailed");
        return;
    }

    const stemMeta = scene.userData.stemEditor as StemEditorMetadata | undefined;
    if (!stemMeta) {
        showToast({type: "error", title: "Cannot save: not in stem editor mode."});
        app.call("sceneSaveFailed");
        return;
    }

    const {assetId: stemAssetId} = stemMeta;

    const stemInstance = findStemInstance(stemAssetId);
    if (!stemInstance) {
        showToast({type: "error", title: "Cannot save: stem instance not found in scene."});
        app.call("sceneSaveFailed");
        return;
    }

    const context = getAssetResolutionContext(scene);
    const baseRevisionId = context ? resolveAssetRevisionId(stemAssetId, context) : undefined;
    if (!baseRevisionId) {
        showToast({type: "error", title: "Cannot save: stem base revision not resolved."});
        app.call("sceneSaveFailed");
        return;
    }

    // Deselect before serialization (required by serializePrefab)
    const previousSelection = editor.selected;
    editor.select(null);

    let serializeResult;
    try {
        serializeResult = serializePrefab(stemInstance);
    } catch (err) {
        showToast({type: "error", title: "Failed to serialize stem.", body: String(err)});
        console.error("[StemEditor] Serialization failed:", err);
        if (previousSelection) editor.select(previousSelection);
        app.call("sceneSaveFailed");
        return;
    }

    if (previousSelection) editor.select(previousSelection);

    try {
        app.call("sceneSaveStart");

        // Read the dependency list from the local context resolved above.
        // The context is the source of truth — it's kept up to date by
        // add/remove/change operations during the editing session. Exclude
        // the stem's own entry (it's in the context for unlock resolution,
        // not a real dependency).
        const allRevisions = context?.assetIdToRevisionId || {};
        const dependencies: Record<string, string> = {};
        for (const [assetId, revisionId] of Object.entries(allRevisions)) {
            if (assetId !== stemAssetId) {
                dependencies[assetId] = revisionId;
            }
        }

        const revision = await createAssetRevisionWithData({
            assetId: stemAssetId,
            parentRevisionId: baseRevisionId,
            data: serializeResult.data,
            format: "json",
            contentType: "application/json",
            options: {
                dependencies,
                metadata: {
                    logicalAssetIdMap: serializeResult.assetResolutionContext.logicalIdToAssetId,
                },
            },
        });

        // Update the scene's AssetResolutionContext with the new stem revision.
        // This is the single source of truth for the current revision — read
        // via `resolveAssetRevisionId(stemAssetId, context)` on the next save.
        setAssetRevision(scene, stemAssetId, revision.id);

        // Update the unlocked stem's prefabEditRevisionId
        stemInstance.userData.prefabEditRevisionId = revision.id;

        // Update unsaved-changes tracking
        scene.userData.lastSaveTime = TimeUtils.getServerUTCTime();

        // Notify parent window (for iframe integration)
        if (window.parent !== window) {
            window.parent.postMessage(
                {
                    type: "stem-editor:saved",
                    assetId: stemAssetId,
                    revisionId: revision.id,
                },
                window.location.origin,
            );
        }

        app.call("sceneSaved", null, {showToast: true});
        showToast({type: "success", title: "Stem saved."});
    } catch (err) {
        // No-changes (400 "no changes") means the server is already at our
        // parent revision — treat as a successful no-op save.
        if (isNoChangesError(err)) {
            app.call("sceneSaved", null, {showToast: false});
            showToast({type: "info", title: "No changes to save."});
            return;
        }

        // Conflict (409) means the server's head moved past our parent
        // revision. After the post-create sync in StemAssetSource this is
        // rare — it usually means another client edited the stem, or a
        // create didn't sync (e.g. the auto-sync failed silently). Give
        // the user the option to overwrite the server state with their
        // own changes by re-anchoring on the current head and retrying.
        if (isConflictError(err)) {
            console.error("[StemEditor] Save conflict:", err);
            ElementsUtils.confirm({
                title: "Stem has been updated elsewhere",
                content: "Another change was saved to this stem. Overwriting will discard those changes. Continue?",
                okText: "Overwrite",
                cancelText: "Cancel",
                onOK: async () => {
                    try {
                        const freshStem = await getAsset(stemAssetId);
                        if (freshStem.headRevisionId) {
                            setAssetRevision(scene, stemAssetId, freshStem.headRevisionId);
                        }
                        // Recursive retry: saveStemEditor re-reads state, so
                        // the new head becomes the parent revision.
                        await saveStemEditor();
                    } catch (retryErr) {
                        app.call("sceneSaveFailed");
                        showToast({type: "error", title: "Failed to save stem.", body: String(retryErr)});
                        console.error("[StemEditor] Overwrite save failed:", retryErr);
                    }
                },
                onCancel: () => {
                    app.call("sceneSaveFailed");
                    showToast({type: "info", title: "Save canceled."});
                },
            });
            return;
        }

        app.call("sceneSaveFailed");
        showToast({type: "error", title: "Failed to save stem.", body: String(err)});
        console.error("[StemEditor] Save failed:", err);
    }
};
