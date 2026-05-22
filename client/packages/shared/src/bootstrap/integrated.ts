/**
 * Single entry point for all integrated-mode bootstraps. Importing this
 * module runs every `initIntegrated*()` call at module load time, so any
 * shell that loads it (`AppContainer.tsx`, `PublicAppContainerLite.tsx`,
 * future entry points) gets the Firebase auth / Firestore / Firebase
 * Analytics / cloud ProjectStore / proprietary copilot bridge wired in
 * before any consumer queries the factories.
 *
 * Each `initIntegrated*()` is already idempotent — importing this module
 * from multiple shells is safe.
 *
 * In OSS builds the editor still imports this module, but each
 * `initIntegrated*()` is a no-op (the factories already default to their
 * `Null*` impl, and the OSS-mode build aliases Firebase to stubs anyway).
 * Today the OSS package boundary forbids `firebase/*` imports inside
 * `editor-oss/src/`, so this file lives in `shared/` — the same boundary
 * that already lets `AppContainer.tsx` import these.
 */

import {IS_OSS} from "../buildMode";
import global from "../global";

if (!IS_OSS) {
    // Firebase App must be initialized before any integrated impl that calls
    // `getAuth()` / `getFirestore()` / `getAnalytics()`. `shared/firebase/index.ts`
    // runs `initializeApp(firebaseConfig)` as a module side effect. Importing
    // it here — before `@stem/auth-firebase` and the other integrated bootstraps
    // — guarantees the default app exists by the time their side-effects fire.
    await import("../firebase");

    // `@stem/auth-firebase`'s index.ts has a side effect: it installs
    // FirebaseAuthProvider into the editor-oss auth factory at import time.
    await import("@stem/auth-firebase");

    const [
        {initIntegratedAIBackend},
        {initIntegratedAnalytics},
        {initIntegratedCopilotProvider},
        {initIntegratedProjectStore},
        {initIntegratedRemoteDocStore},
    ] = await Promise.all([
        import("./integratedAIBackend"),
        import("./integratedAnalytics"),
        import("./integratedCopilot"),
        import("./integratedProjectStore"),
        import("./integratedRemoteDocStore"),
    ]);

    // Firebase Analytics recorder.
    initIntegratedAnalytics();

    // Firestore-backed remote doc store.
    initIntegratedRemoteDocStore();

    // Cloud Scene-API-backed ProjectStore.
    initIntegratedProjectStore();

    // AIBackend singleton URL resolver — routes /api/AI/* requests through
    // backendUrlFromPath so the configured production server / Discord proxy
    // is honoured.
    initIntegratedAIBackend();

    // Lazy copilot bridge — the proprietary StudioACPClient is only built
    // when the editor first asks for it, so this call is cheap.
    initIntegratedCopilotProvider(() => global.app ?? undefined);
} else {
    // OSS playground: there is no hosted agent. Register the browser-direct
    // copilot, which streams straight from the visitor's BYOK provider key.
    // `registerPlaygroundCopilot()` is a no-op outside the playground iframe.
    const {registerPlaygroundCopilot} = await import("@stem/editor-oss/copilot");
    registerPlaygroundCopilot();
}
