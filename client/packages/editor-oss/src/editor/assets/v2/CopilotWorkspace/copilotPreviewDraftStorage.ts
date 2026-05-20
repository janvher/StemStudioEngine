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

const localStorageKey = (sceneId: string) => `${LOCAL_STORAGE_PREFIX}:${encodeURIComponent(sceneId)}`;

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

const writeLocalDraft = (draft: StoredCopilotPreviewDraft) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(localStorageKey(draft.sceneId), JSON.stringify(draft));
};

const readLocalDraft = (sceneId: string): StoredCopilotPreviewDraft | null => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(localStorageKey(sceneId));
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as StoredCopilotPreviewDraft;
        if (parsed.schemaVersion !== 1 || parsed.sceneId !== sceneId || !parsed.session?.previewId) return null;
        return parsed;
    } catch (error) {
        console.warn("[copilotPreviewDraftStorage] Failed to read local preview draft:", error);
        return null;
    }
};

const clearLocalDraft = (sceneId: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(localStorageKey(sceneId));
};

export const persistCopilotPreviewDraft = async (
    app: EngineRuntime,
    session: CopilotPreviewSession,
): Promise<void> => {
    const draft = createDraft(app, session);
    if (!draft || typeof window === "undefined") return;

    try {
        await runStoreRequest("readwrite", store => store.put(draft));
        clearLocalDraft(draft.sceneId);
    } catch (error) {
        try {
            writeLocalDraft(draft);
        } catch (fallbackError) {
            console.warn("[copilotPreviewDraftStorage] Failed to persist preview draft:", error, fallbackError);
        }
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
        const localDraft = readLocalDraft(sceneId);
        if (localDraft) return localDraft;
        console.warn("[copilotPreviewDraftStorage] Failed to read preview draft:", error);
    }

    return readLocalDraft(sceneId);
};

export const clearCopilotPreviewDraft = async (sceneId?: string | null): Promise<void> => {
    if (!sceneId || typeof window === "undefined") return;

    clearLocalDraft(sceneId);
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
