import {
    AssetResolutionContext,
    emptyAssetResolutionContext,
    getAssetResolutionContext,
} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import Converter from "../../../../serialization/Converter";
import type {CopilotPreviewSession} from "./copilotPreviewSession";

const DB_NAME = "stemstudio-copilot-preview";
const DB_VERSION = 1;
const STORE_NAME = "previews";
const LOCAL_STORAGE_PREFIX = "stemstudio_copilot_preview";

export type StoredCopilotPreviewDraft = {
    schemaVersion: 1;
    sceneId: string;
    baseRevisionId: string | null;
    previewId: string;
    updatedAt: string;
    session: CopilotPreviewSession;
    previewSceneJson: unknown[];
    previewAssetResolutionContext: {
        logicalIdToAssetId: Record<string, string>;
        assetIdToRevisionId: Record<string, string>;
        nameToAssetId: Record<string, string>;
    };
};

// One-time cleanup: earlier builds mirrored the full preview scene snapshot
// into localStorage as a "fallback". That is scene-scoped data and has no
// business in the ~5MB localStorage budget — it bloated storage and threw
// QuotaExceededError. Drafts live in IndexedDB only now; purge any leftovers.
const purgeLegacyLocalDrafts = (): void => {
    if (typeof window === "undefined") return;
    try {
        const keys: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && key.startsWith(LOCAL_STORAGE_PREFIX)) keys.push(key);
        }
        keys.forEach(key => window.localStorage.removeItem(key));
    } catch {
        /* localStorage unavailable — nothing to purge */
    }
};
purgeLegacyLocalDrafts();

const cloneRecord = (record?: Readonly<Record<string, string>>): Record<string, string> => ({...(record ?? {})});

export const serializeCurrentAssetResolutionContext = (app: EngineRuntime): StoredCopilotPreviewDraft["previewAssetResolutionContext"] => {
    const context = app.scene ? getAssetResolutionContext(app.scene) ?? emptyAssetResolutionContext : emptyAssetResolutionContext;
    return {
        logicalIdToAssetId: cloneRecord(context.logicalIdToAssetId),
        assetIdToRevisionId: cloneRecord(context.assetIdToRevisionId),
        nameToAssetId: cloneRecord(context.nameToAssetId),
    };
};

const captureCurrentSceneJson = (app: EngineRuntime): unknown[] => new (Converter as any)().toJSON({
    options: app.options,
    camera: app.camera,
    scripts: app.scripts,
    scene: app.scene,
}) as unknown[];

const createDraft = (app: EngineRuntime, session: CopilotPreviewSession): StoredCopilotPreviewDraft | null => {
    const sceneId = session.baseSceneId ?? app.editor?.sceneID ?? "";
    if (!sceneId) return null;

    return {
        schemaVersion: 1,
        sceneId,
        baseRevisionId: session.baseRevisionId,
        previewId: session.previewId,
        updatedAt: new Date().toISOString(),
        session,
        previewSceneJson: captureCurrentSceneJson(app),
        previewAssetResolutionContext: serializeCurrentAssetResolutionContext(app),
    };
};

const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB is unavailable."));
        return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Failed to open Copilot preview database."));
    request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, {keyPath: "sceneId"});
        }
    };
    request.onsuccess = () => resolve(request.result);
});

const runStoreRequest = async <T>(
    mode: IDBTransactionMode,
    createRequest: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
    const db = await openDb();
    return await new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = createRequest(store);

        request.onerror = () => reject(request.error ?? new Error("Copilot preview storage request failed."));
        request.onsuccess = () => resolve(request.result);
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
            db.close();
            reject(transaction.error ?? new Error("Copilot preview storage transaction failed."));
        };
        transaction.onabort = () => {
            db.close();
            reject(transaction.error ?? new Error("Copilot preview storage transaction aborted."));
        };
    });
};

export const persistCopilotPreviewDraft = async (
    app: EngineRuntime,
    session: CopilotPreviewSession,
): Promise<void> => {
    const draft = createDraft(app, session);
    if (!draft || typeof window === "undefined") return;

    // IndexedDB only. The draft carries a full scene snapshot — it must never
    // touch localStorage. If IndexedDB is unavailable the draft is simply not
    // persisted (preview is recoverable from the authoritative scene anyway).
    try {
        await runStoreRequest("readwrite", store => store.put(draft));
    } catch (error) {
        console.warn("[copilotPreviewDraftStorage] Failed to persist preview draft:", error);
    }
};

export const readCopilotPreviewDraft = async (sceneId: string): Promise<StoredCopilotPreviewDraft | null> => {
    if (!sceneId || typeof window === "undefined") return null;

    try {
        const draft = await runStoreRequest<StoredCopilotPreviewDraft | undefined>(
            "readonly",
            store => store.get(sceneId),
        );
        if (draft?.schemaVersion === 1 && draft.sceneId === sceneId && draft.session?.previewId) {
            return draft;
        }
    } catch (error) {
        console.warn("[copilotPreviewDraftStorage] Failed to read preview draft:", error);
    }

    return null;
};

export const clearCopilotPreviewDraft = async (sceneId?: string | null): Promise<void> => {
    if (!sceneId || typeof window === "undefined") return;

    try {
        await runStoreRequest("readwrite", store => store.delete(sceneId));
    } catch (error) {
        console.warn("[copilotPreviewDraftStorage] Failed to clear preview draft:", error);
    }
};

export const toAssetResolutionContext = (
    context: StoredCopilotPreviewDraft["previewAssetResolutionContext"],
): AssetResolutionContext => ({
    logicalIdToAssetId: {...context.logicalIdToAssetId},
    assetIdToRevisionId: {...context.assetIdToRevisionId},
    nameToAssetId: {...context.nameToAssetId},
});
