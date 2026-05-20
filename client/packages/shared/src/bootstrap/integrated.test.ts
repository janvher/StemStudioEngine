/**
 * Pins the single-import contract for the integrated-mode bootstrap.
 *
 * The integrated app has two shell components — `AppContainer` (full
 * editor) and `PublicAppContainerLite` (lite shells like CreateDashboard,
 * Player routes). Both must run the same set of `initIntegrated*()` calls
 * before any consumer (AuthorizationContext, Ajax, etc.) queries the
 * factories. If either shell skips a bootstrap, factory consumers in that
 * shell throw or silently 401.
 *
 * Importing `./bootstrap/integrated` is the load-bearing side effect.
 * This test verifies that importing it actually installs the auth
 * provider (the easiest one to observe — the others have their own
 * focused tests in this directory).
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

// The unified bootstrap module side-effect imports cross several heavy
// subsystems (AIBackend wires UrlUtils which pulls i18n, etc.). The
// individual init functions have their own focused tests. For this test
// we only care that the auth path is unblocked, so stub the other inits
// out at the bootstrap-module boundary.
vi.mock("../firebase", () => ({
    firebaseConfig: {},
    auth: null,
    db: null,
    analytics: null,
    default: null,
}));
vi.mock("./integratedAIBackend", () => ({initIntegratedAIBackend: vi.fn()}));
vi.mock("./integratedAnalytics", () => ({initIntegratedAnalytics: vi.fn()}));
vi.mock("./integratedCopilot", () => ({initIntegratedCopilotProvider: vi.fn()}));
vi.mock("./integratedProjectStore", () => ({initIntegratedProjectStore: vi.fn()}));
vi.mock("./integratedRemoteDocStore", () => ({initIntegratedRemoteDocStore: vi.fn()}));
vi.mock("../global", () => ({default: {app: undefined}}));

// `@stem/auth-firebase` is a side-effect module that calls
// setAuthProvider(new FirebaseAuthProvider()) at import time. Its own
// tests live in `client/packages/auth-firebase/src/index.test.ts`.
// Here we just need *some* side effect on import, so stub it with a
// minimal registration. The factory is the contract under test.
vi.mock("@stem/auth-firebase", async () => {
    const editorOssAuth = await import("@stem/editor-oss/auth");
    editorOssAuth.setAuthProvider({
        getCurrentUser: () => ({
            uid: "firebase-user",
            email: "user@example.com",
            displayName: "Firebase User",
            photoURL: null,
            isAnonymous: false,
            emailVerified: true,
            getIdToken: async () => "eyJ.fake.firebaseJWT",
        }),
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
    });
    return {};
});

const importFresh = async (isOSS: boolean) => {
    vi.resetModules();
    vi.doMock("@stem/editor-oss/mode/buildMode", () => ({
        IS_OSS: isOSS,
        IS_INTEGRATED: !isOSS,
        BUILD_MODE: isOSS ? "oss" : "integrated",
    }));
    const factory = await import("@stem/editor-oss/auth");
    factory.setAuthProvider(undefined);
    return {factory};
};

beforeEach(() => {
    vi.resetModules();
});

afterEach(() => {
    vi.doUnmock("@stem/editor-oss/mode/buildMode");
});

describe("./bootstrap/integrated side-effect import", () => {
    it("registers a non-throwing FirebaseAuthProvider when imported in integrated mode", async () => {
        const {factory} = await importFresh(false);
        // Sanity: no provider, no consumer access possible.
        expect(() => factory.getAuthProvider()).toThrow();

        // The load-bearing line.
        await import("./integrated");

        // Now the consumer access path is unblocked.
        const provider = factory.getAuthProvider();
        const user = provider.getCurrentUser();
        expect(user).not.toBeNull();
        expect(user!.uid).toBe("firebase-user");

        const token = await user!.getIdToken();
        expect(token).not.toBe("stemstudio-token");
        expect(token).toMatch(/^eyJ/);
    });

    it("does not import the Firebase provider in OSS mode", async () => {
        const {factory} = await importFresh(true);
        const providerBefore = factory.getAuthProvider();
        await expect(providerBefore.getCurrentUser()!.getIdToken()).resolves.toBe("stemstudio-token");

        await import("./integrated");

        const providerAfter = factory.getAuthProvider();
        await expect(providerAfter.getCurrentUser()!.getIdToken()).resolves.toBe("stemstudio-token");
    });

    // Idempotency of the auth registration is covered by
    // `client/packages/auth-firebase/src/index.test.ts`. The unified
    // bootstrap simply re-exports the side-effect; once it has happened,
    // ES module semantics guarantee the second import is a no-op.
});
