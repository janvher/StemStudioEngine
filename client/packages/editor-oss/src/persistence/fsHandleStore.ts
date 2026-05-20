/**
 * Tiny IndexedDB wrapper for persisting a File System Access API directory
 * handle across reloads. Without this the user has to re-pick their project
 * folder every time they refresh the editor.
 *
 * Permission semantics:
 *   - A persisted handle may have its permission revoked by the browser or
 *     by the user (Site Settings). Always call `verifyPermission()` before
 *     using a returned handle.
 *   - Returning `null` from `loadHandle()` means "ask the user again."
 */

const DB_NAME = "stemstudio-fs-handle";
const STORE_NAME = "handles";
const KEY = "project-dir";
const DB_VERSION = 1;

type DirHandle = {
    kind: "directory";
    queryPermission?: (opts: {mode: "readwrite" | "read"}) => Promise<PermissionState>;
    requestPermission?: (opts: {mode: "readwrite" | "read"}) => Promise<PermissionState>;
};

let dbPromise: Promise<IDBDatabase> | undefined;

const openDb = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === "undefined") {
                reject(new Error("IndexedDB is not available"));
                return;
            }
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error ?? new Error("Failed to open FS handle DB"));
        });
    }
    return dbPromise;
};

export async function saveHandle(handle: DirHandle): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(handle, KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("Failed to persist handle"));
    });
}

export async function loadHandle(): Promise<DirHandle | null> {
    try {
        const db = await openDb();
        return await new Promise<DirHandle | null>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const req = tx.objectStore(STORE_NAME).get(KEY);
            req.onsuccess = () => resolve((req.result as DirHandle | undefined) ?? null);
            req.onerror = () => reject(req.error ?? new Error("Failed to read handle"));
        });
    } catch {
        return null;
    }
}

export async function clearHandle(): Promise<void> {
    try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).delete(KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error ?? new Error("Failed to clear handle"));
        });
    } catch {
        // ignore
    }
}

/**
 * Verifies the persisted handle still has readwrite permission. Returns
 * `true` if the handle is usable without further user interaction, `false`
 * if the caller must re-prompt.
 *
 * Handles obtained via `showDirectoryPicker` expose `queryPermission` /
 * `requestPermission` (non-standard Chromium APIs). Handles obtained via
 * `navigator.storage.getDirectory()` (OPFS) do not — they are always
 * accessible to their origin and Chromium never gates them. Treat absent
 * permission methods as implicit grant rather than failing closed.
 */
export async function verifyPermission(handle: DirHandle): Promise<boolean> {
    if (!handle.queryPermission) return true;
    try {
        const state = await handle.queryPermission({mode: "readwrite"});
        if (state === "granted") return true;
        if (state === "prompt" && handle.requestPermission) {
            const next = await handle.requestPermission({mode: "readwrite"});
            return next === "granted";
        }
        return false;
    } catch {
        return false;
    }
}
