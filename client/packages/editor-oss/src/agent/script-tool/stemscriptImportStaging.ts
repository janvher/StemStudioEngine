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
 * SessionStorage is the right surface here: the payload is large
 * (potentially 30MB+ of base64-encoded GLB/PNG bytes for a typical game)
 * but bounded, doesn't need to survive a tab close, and must persist
 * across the hard navigation that `openEditorRoute()` triggers.
 */

const STAGING_KEY = "stemstudio.oss.stemscriptImport";

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

const STAGED_TTL_MS = 10 * 60 * 1000;

export function stageStemscriptImport(payload: Omit<StagedStemscriptImport, "stagedAt">): boolean {
    if (typeof sessionStorage === "undefined") return false;
    try {
        const body: StagedStemscriptImport = {...payload, stagedAt: new Date().toISOString()};
        sessionStorage.setItem(STAGING_KEY, JSON.stringify(body));
        return true;
    } catch (err) {
        console.warn("[stemscriptImportStaging] failed to stage payload", err);
        return false;
    }
}

export function peekStemscriptImport(): StagedStemscriptImport | null {
    if (typeof sessionStorage === "undefined") return null;
    try {
        const raw = sessionStorage.getItem(STAGING_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StagedStemscriptImport;
        if (!parsed?.content || !Array.isArray(parsed.files)) return null;
        // TTL guard so a stale staging entry from a crashed prior run
        // doesn't ambush a fresh project.
        const age = Date.now() - new Date(parsed.stagedAt).getTime();
        if (Number.isFinite(age) && age > STAGED_TTL_MS) {
            sessionStorage.removeItem(STAGING_KEY);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

export function consumeStemscriptImport(): StagedStemscriptImport | null {
    const value = peekStemscriptImport();
    if (typeof sessionStorage !== "undefined") {
        try { sessionStorage.removeItem(STAGING_KEY); } catch { /* ignore */ }
    }
    return value;
}

export function clearStemscriptImport(): void {
    if (typeof sessionStorage !== "undefined") {
        try { sessionStorage.removeItem(STAGING_KEY); } catch { /* ignore */ }
    }
}
