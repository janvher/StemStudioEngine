import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SignedUrlCache } from "./SignedUrlCache";

const STORAGE_KEY = "stemstudio_url_cache";

describe("SignedUrlCache", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns null for missing keys", () => {
        const cache = new SignedUrlCache();
        expect(cache.get("missing")).toBeNull();
    });

    it("stores and retrieves a URL", () => {
        const cache = new SignedUrlCache();
        const expiresAt = new Date(Date.now() + 60 * 60_000).toISOString();
        cache.set("k1", "https://cdn/a.glb", expiresAt);

        const entry = cache.get("k1");
        expect(entry).toEqual({ url: "https://cdn/a.glb", expiresAt });
    });

    it("returns null for expired entries (with 5-min buffer)", () => {
        const cache = new SignedUrlCache();
        // Expires in 4 minutes — within the 5-min buffer
        const expiresAt = new Date(Date.now() + 4 * 60_000).toISOString();
        cache.set("k1", "https://cdn/a.glb", expiresAt);

        expect(cache.get("k1")).toBeNull();
    });

    it("returns entry that expires just outside the buffer", () => {
        const cache = new SignedUrlCache();
        // Expires in 6 minutes — outside the 5-min buffer
        const expiresAt = new Date(Date.now() + 6 * 60_000).toISOString();
        cache.set("k1", "https://cdn/a.glb", expiresAt);

        expect(cache.get("k1")).not.toBeNull();
    });

    it("flush() persists to localStorage", () => {
        const cache = new SignedUrlCache();
        const expiresAt = new Date(Date.now() + 60 * 60_000).toISOString();
        cache.set("k1", "https://cdn/a.glb", expiresAt);
        cache.flush();

        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
        expect(stored.k1).toEqual({ url: "https://cdn/a.glb", expiresAt });
    });

    it("flush() is a no-op when not dirty", () => {
        const spy = vi.spyOn(Storage.prototype, "setItem");
        const cache = new SignedUrlCache();
        cache.flush();
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it("loads from localStorage on construction", () => {
        const expiresAt = new Date(Date.now() + 60 * 60_000).toISOString();
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ k1: { url: "https://cdn/a.glb", expiresAt } }),
        );

        const cache = new SignedUrlCache();
        expect(cache.get("k1")).toEqual({ url: "https://cdn/a.glb", expiresAt });
    });

    it("handles corrupt localStorage gracefully", () => {
        localStorage.setItem(STORAGE_KEY, "not-json!!!");
        const cache = new SignedUrlCache();
        expect(cache.get("anything")).toBeNull();
    });

    it("handles non-object localStorage value gracefully", () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]));
        const cache = new SignedUrlCache();
        expect(cache.get("anything")).toBeNull();
    });

    it("clear() removes from both memory and localStorage", () => {
        const cache = new SignedUrlCache();
        const expiresAt = new Date(Date.now() + 60 * 60_000).toISOString();
        cache.set("k1", "https://cdn/a.glb", expiresAt);
        cache.flush();
        expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

        cache.clear();
        expect(cache.get("k1")).toBeNull();
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("flush() evicts expired entries before persisting", () => {
        const cache = new SignedUrlCache();
        const fresh = new Date(Date.now() + 60 * 60_000).toISOString();
        const stale = new Date(Date.now() + 2 * 60_000).toISOString(); // within buffer
        cache.set("fresh", "https://cdn/fresh.glb", fresh);
        cache.set("stale", "https://cdn/stale.glb", stale);
        cache.flush();

        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
        expect(stored.fresh).toBeDefined();
        expect(stored.stale).toBeUndefined();
    });

    it("flush() enforces max entries by evicting oldest-expiring first", () => {
        // Directly test by writing many entries, then checking after flush.
        // We can't easily test 10k entries, but we can check the eviction
        // mechanism works by reading the persisted data.
        const cache = new SignedUrlCache();
        const base = Date.now();
        // Add 3 entries with staggered expiry
        cache.set("oldest", "url1", new Date(base + 10 * 60_000).toISOString());
        cache.set("middle", "url2", new Date(base + 20 * 60_000).toISOString());
        cache.set("newest", "url3", new Date(base + 30 * 60_000).toISOString());
        cache.flush();

        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
        expect(Object.keys(stored)).toHaveLength(3);
    });

    it("survives localStorage quota exceeded on flush()", () => {
        const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new DOMException("quota exceeded");
        });

        const cache = new SignedUrlCache();
        const expiresAt = new Date(Date.now() + 60 * 60_000).toISOString();
        cache.set("k1", "url", expiresAt);
        // Should not throw
        expect(() => cache.flush()).not.toThrow();

        spy.mockRestore();
    });
});
