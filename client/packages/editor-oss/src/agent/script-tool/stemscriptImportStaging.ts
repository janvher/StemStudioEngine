/**
 * Cross-navigation staging for the dashboard's "Import stemscript folder"
 * flow. The user picks a folder containing a `.stemscript` file plus
 * referenced assets (models, audio, etc) on one page, then we navigate to
 * a fresh `/create/project/<id>` route. The new page reads the staged
 * payload, runs the existing `exec` script-tool pipeline against it, and
 * the resulting scene is auto-saved into whichever ProjectStore is active
 * (IndexedDB or filesystem) — same path a user would take by typing
 * `exec` in the Copilot terminal.
 *
 * The payload is large — base64-encoded GLB/PNG/audio bytes for a typical
 * game routinely run to tens of MB. `sessionStorage` caps at ~5 MB and
 * throws `QuotaExceededError`, so staging lives in IndexedDB, which has a
 * far larger quota and still survives the hard navigation that
 * `openEditorRoute()` triggers. The entry is removed on consume; a TTL
 * guards against a stale entry from a crashed prior run.
 */

export interface StagedStemscriptFile {
    /** Relative path including subfolders, e.g. "models/pawn.gltf". */
    name: string;
    /** MIME type best-guess; used by the import resolver for type checks. */
    mime?: string;
    /** Base64-encoded file bytes. */
    data: string;
}

export interface StagedStemscriptImport {
    /** Plain-text stemscript content. */
    content: string;
    /** Companion files referenced by the script (models, textures, audio). */
    files: StagedStemscriptFile[];
    /** Display label, surfaced in toasts/loader UI. */
    label?: string;
    /** ISO timestamp when the payload was staged. Used to TTL stale state. */
    stagedAt: string;
}

const DB_NAME = "stemstudio-import-staging";
const STORE_NAME = "staging";
const RECORD_KEY = "current";
const DB_VERSION = 1;
const STAGED_TTL_MS = 10 * 60 * 1000;

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
            req.onerror = () => reject(req.error ?? new Error("Failed to open import-staging DB"));
        });
    }
    return dbPromise;
};

/**
 * Persist an import payload for the upcoming `/create/project` navigation.
 * Resolves `true` on success, `false` if storage is unavailable or fails.
 */
export async function stageStemscriptImport(
    payload: Omit<StagedStemscriptImport, "stagedAt">,
): Promise<boolean> {
    try {
        const body: StagedStemscriptImport = {...payload, stagedAt: new Date().toISOString()};
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).put(body, RECORD_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error ?? new Error("Failed to stage import payload"));
            tx.onabort = () => reject(tx.error ?? new Error("Import-staging transaction aborted"));
        });
        return true;
    } catch (err) {
        console.warn("[stemscriptImportStaging] failed to stage payload", err);
        return false;
    }
}

/** Read the staged import payload without removing it. */
export async function peekStemscriptImport(): Promise<StagedStemscriptImport | null> {
    try {
        const db = await openDb();
        const parsed = await new Promise<StagedStemscriptImport | undefined>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const req = tx.objectStore(STORE_NAME).get(RECORD_KEY);
            req.onsuccess = () => resolve(req.result as StagedStemscriptImport | undefined);
            req.onerror = () => reject(req.error ?? new Error("Failed to read import payload"));
        });
        if (!parsed?.content || !Array.isArray(parsed.files)) return null;
        // TTL guard so a stale staging entry from a crashed prior run
        // doesn't ambush a fresh project.
        const age = Date.now() - new Date(parsed.stagedAt).getTime();
        if (Number.isFinite(age) && age > STAGED_TTL_MS) {
            await clearStemscriptImport();
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

/** Read the staged import payload and remove it. */
export async function consumeStemscriptImport(): Promise<StagedStemscriptImport | null> {
    const value = await peekStemscriptImport();
    await clearStemscriptImport();
    return value;
}

/** Remove any staged import payload. */
export async function clearStemscriptImport(): Promise<void> {
    try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).delete(RECORD_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error ?? new Error("Failed to clear import payload"));
        });
    } catch {
        // ignore
    }
}
