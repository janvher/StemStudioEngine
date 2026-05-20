const STORAGE_KEY = "stemstudio_url_cache";
const MAX_ENTRIES = 10_000;

interface CacheEntry {
    url: string;
    expiresAt: string; // ISO date
}

type CacheData = Record<string, CacheEntry>;

/** Expiry buffer — treat URLs as expired 5 minutes early so the browser
 *  still has time to use them from HTTP disk cache. */
const EXPIRY_BUFFER_MS = 5 * 60_000;

/**
 * Persistent signed-URL cache backed by localStorage.
 *
 * Stores signed CDN URLs so the browser HTTP disk cache can hit on reload
 * even though the backend generates new signatures every time.
 */
export class SignedUrlCache {
    private data: CacheData;
    private dirty = false;

    constructor() {
        this.data = this.load();
    }

    /**
     * Get a cached URL if it exists and hasn't expired (with 5-min buffer).
     *
     * @param key - Cache key (e.g. `${assetId}:${revisionId}:${derivativeId}`)
     * @returns The cached entry, or null if missing/expired
     */
    get(key: string): CacheEntry | null {
        const entry = this.data[key];
        if (!entry) return null;
        if (Date.now() > new Date(entry.expiresAt).getTime() - EXPIRY_BUFFER_MS) {
            delete this.data[key];
            this.dirty = true;
            return null;
        }
        return entry;
    }

    /**
     * Stage a URL for caching. Call flush() to persist.
     *
     * @param key - Cache key (e.g. `${assetId}:${revisionId}:${derivativeId}`)
     * @param url - The signed CDN URL
     * @param expiresAt - ISO date string when the signed URL expires
     */
    set(key: string, url: string, expiresAt: string): void {
        this.data[key] = { url, expiresAt };
        this.dirty = true;
    }

    /** Persist staged changes to localStorage. */
    flush(): void {
        if (!this.dirty) return;
        this.evictExpired();
        this.enforceMaxEntries();
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch { /* quota exceeded — non-fatal */ }
        this.dirty = false;
    }

    /** Clear all cached URLs (both in-memory and localStorage). */
    clear(): void {
        this.data = {};
        this.dirty = false;
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch { /* non-fatal */ }
    }

    private load(): CacheData {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
            return parsed as CacheData;
        } catch {
            return {};
        }
    }

    private evictExpired(): void {
        const now = Date.now();
        for (const key of Object.keys(this.data)) {
            const entry = this.data[key];
            if (!entry || now > new Date(entry.expiresAt).getTime() - EXPIRY_BUFFER_MS) {
                delete this.data[key];
            }
        }
    }

    private enforceMaxEntries(): void {
        const keys = Object.keys(this.data);
        if (keys.length <= MAX_ENTRIES) return;
        // Evict oldest-expiring entries first
        keys.sort((a, b) =>
            new Date(this.data[a]!.expiresAt).getTime() - new Date(this.data[b]!.expiresAt).getTime(),
        );
        const toRemove = keys.length - MAX_ENTRIES;
        for (let i = 0; i < toRemove; i++) {
            delete this.data[keys[i]!];
        }
    }
}
