import {afterEach, beforeEach, describe, expect, it} from "vitest";

import {
    _resetPlaygroundModeForTests,
    applyPlaygroundModeAttribute,
    isPlaygroundMode,
} from "./playgroundMode";

// Navigate the jsdom window to a URL so isPlaygroundMode() reads a fresh
// location.search. history.replaceState keeps the same document/session.
function navigateTo(search: string): void {
    window.history.replaceState({}, "", `/dashboard${search}`);
}

describe("playgroundMode", () => {
    beforeEach(() => {
        navigateTo("");
        window.sessionStorage.clear();
        _resetPlaygroundModeForTests();
    });

    afterEach(() => {
        navigateTo("");
        window.sessionStorage.clear();
        _resetPlaygroundModeForTests();
    });

    describe("normal deployment", () => {
        it("is inactive with no query param and no stored flag", () => {
            expect(isPlaygroundMode()).toBe(false);
        });

        it("ignores unrelated query params", () => {
            navigateTo("?mode=editor&foo=bar");
            expect(isPlaygroundMode()).toBe(false);
        });

        it("does not write the session flag in normal mode", () => {
            isPlaygroundMode();
            expect(window.sessionStorage.getItem("stem.playgroundMode")).toBeNull();
        });

        it("does not set the html data attribute in normal mode", () => {
            applyPlaygroundModeAttribute();
            expect(document.documentElement.dataset.playgroundMode).toBeUndefined();
        });
    });

    describe("playground deployment", () => {
        it("activates from the ?mode=playground query param", () => {
            navigateTo("?mode=playground");
            expect(isPlaygroundMode()).toBe(true);
        });

        it("persists activation to sessionStorage", () => {
            navigateTo("?mode=playground");
            isPlaygroundMode();
            expect(window.sessionStorage.getItem("stem.playgroundMode")).toBe("1");
        });

        it("survives a reload: session flag re-derives without the URL param", () => {
            navigateTo("?mode=playground");
            expect(isPlaygroundMode()).toBe(true);
            expect(window.sessionStorage.getItem("stem.playgroundMode")).toBe("1");

            // Simulate a page reload: module cache is gone, URL no longer
            // carries the param, but the session flag persists.
            _resetPlaygroundModeForTests();
            navigateTo("/editor");
            window.sessionStorage.setItem("stem.playgroundMode", "1");
            expect(isPlaygroundMode()).toBe(true);
        });

        it("reactivates from a pre-existing session flag without the param", () => {
            window.sessionStorage.setItem("stem.playgroundMode", "1");
            expect(isPlaygroundMode()).toBe(true);
        });

        it("sets the html data attribute when active", () => {
            navigateTo("?mode=playground");
            applyPlaygroundModeAttribute();
            expect(document.documentElement.dataset.playgroundMode).toBe("true");
        });
    });

    describe("caching", () => {
        it("caches the first result for the session (one-way)", () => {
            navigateTo("?mode=playground");
            expect(isPlaygroundMode()).toBe(true);

            // URL and storage cleared, but the cached value must survive.
            navigateTo("");
            window.sessionStorage.clear();
            expect(isPlaygroundMode()).toBe(true);
        });

        it("re-evaluates after the test reset hook clears the cache", () => {
            navigateTo("?mode=playground");
            expect(isPlaygroundMode()).toBe(true);

            navigateTo("");
            _resetPlaygroundModeForTests();
            expect(isPlaygroundMode()).toBe(false);
        });
    });
});
