/**
 * Tests for the auth provider factory's mode-aware resolution. The factory
 * is the single seam that decides whether OSS dummy auth or integrated
 * Firebase auth is active. Getting this wrong leaks the OSS dummy token
 * `stemstudio-token` to the cloud server, which rejects every request
 * with 401 / "incorrect number of segments" (Firebase admin SDK can't
 * parse the dummy as a JWT). These tests pin the contract in both modes.
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import type {IAuthProvider, IAuthUser} from "./IAuthProvider";

const importFresh = async (isOSS: boolean) => {
    vi.resetModules();
    vi.doMock("../mode/buildMode", () => ({
        IS_OSS: isOSS,
        IS_INTEGRATED: !isOSS,
        BUILD_MODE: isOSS ? "oss" : "integrated",
    }));
    return import("./authProviderFactory");
};

const stubProvider = (overrides: Partial<IAuthProvider> = {}): IAuthProvider => ({
    getCurrentUser: () => null,
    onAuthStateChanged: () => () => undefined,
    signInAnonymously: vi.fn(),
    signInWithCustomToken: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInWithOAuth: vi.fn(),
    sendEmailVerification: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    linkAnonymousToEmailPassword: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
});

beforeEach(() => {
    vi.resetModules();
});

afterEach(() => {
    vi.doUnmock("../mode/buildMode");
});

describe("getAuthProvider — OSS mode", () => {
    it("falls back to NullAuthProvider when no provider is registered", async () => {
        const {getAuthProvider, setAuthProvider} = await importFresh(true);
        setAuthProvider(undefined);
        const provider = getAuthProvider();
        // Behavioral check (instanceof would fail because vi.resetModules
        // gives the factory its own copy of NullAuthProvider).
        const user = provider.getCurrentUser();
        expect(user).not.toBeNull();
        expect(user!.uid).toBe("stemstudio-local-user");
    });

    it("returns the OSS dummy user with stemstudio-token", async () => {
        const {getAuthProvider, setAuthProvider} = await importFresh(true);
        setAuthProvider(undefined);
        const user = getAuthProvider().getCurrentUser();
        expect(user).not.toBeNull();
        const token = await user!.getIdToken();
        expect(token).toBe("stemstudio-token");
    });

    it("honors an explicitly registered provider over the default", async () => {
        const {getAuthProvider, setAuthProvider} = await importFresh(true);
        const customUser: IAuthUser = {
            uid: "custom",
            email: "x@x",
            displayName: null,
            photoURL: null,
            isAnonymous: false,
            emailVerified: true,
            getIdToken: async () => "real-token",
        };
        setAuthProvider(stubProvider({getCurrentUser: () => customUser}));
        const token = await getAuthProvider().getCurrentUser()!.getIdToken();
        expect(token).toBe("real-token");
    });
});

describe("getAuthProvider — integrated mode", () => {
    it("throws when no provider has been registered", async () => {
        const {getAuthProvider, setAuthProvider} = await importFresh(false);
        setAuthProvider(undefined);
        expect(() => getAuthProvider()).toThrow(/@stem\/auth-firebase/);
    });

    it("does NOT silently fall back to NullAuthProvider", async () => {
        // The whole point of the guard: forwarding the OSS dummy token to
        // a Firebase-backed integrated server triggers
        // "incorrect number of segments" 401 on every request. Pin that
        // the factory will not let this happen.
        const {getAuthProvider, setAuthProvider} = await importFresh(false);
        setAuthProvider(undefined);
        expect(() => getAuthProvider()).toThrow();
        // Verify the error mentions the bootstrap so the dev knows
        // which call is missing.
        try {
            getAuthProvider();
        } catch (err) {
            expect((err as Error).message).toContain("@stem/auth-firebase");
        }
    });

    it("returns the registered provider after bootstrap", async () => {
        const {getAuthProvider, setAuthProvider} = await importFresh(false);
        const firebaseUser: IAuthUser = {
            uid: "firebase-uid",
            email: "user@example.com",
            displayName: "User",
            photoURL: null,
            isAnonymous: false,
            emailVerified: true,
            getIdToken: async () => "eyJhbGc.fakeJWT.payload",
        };
        setAuthProvider(stubProvider({getCurrentUser: () => firebaseUser}));
        const token = await getAuthProvider().getCurrentUser()!.getIdToken();
        expect(token).toMatch(/^eyJ/);
        expect(token).not.toBe("stemstudio-token");
    });

    it("setAuthProvider(undefined) re-arms the throw — next get() fails again", async () => {
        const {getAuthProvider, setAuthProvider} = await importFresh(false);
        setAuthProvider(stubProvider());
        expect(() => getAuthProvider()).not.toThrow();
        setAuthProvider(undefined);
        expect(() => getAuthProvider()).toThrow();
    });
});

describe("integration with NullAuthProvider", () => {
    it("OSS dummy user satisfies the IAuthUser shape", async () => {
        const {getAuthProvider, setAuthProvider} = await importFresh(true);
        setAuthProvider(undefined);
        const user = getAuthProvider().getCurrentUser()!;
        expect(user.uid).toBe("stemstudio-local-user");
        expect(user.isAnonymous).toBe(false);
        expect(user.emailVerified).toBe(true);
        expect(typeof user.getIdToken).toBe("function");
    });

    it("OSS signInAnonymously is a no-op that returns the same dummy user", async () => {
        const {getAuthProvider, setAuthProvider} = await importFresh(true);
        setAuthProvider(undefined);
        const provider = getAuthProvider();
        const current = provider.getCurrentUser();
        const signed = await provider.signInAnonymously();
        expect(signed.uid).toBe(current!.uid);
    });
});
