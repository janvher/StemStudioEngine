import {IS_OSS} from "../mode/buildMode";

import type {IAuthProvider} from "./IAuthProvider";
import {NullAuthProvider} from "./NullAuthProvider";

let singleton: IAuthProvider | undefined;

/**
 * Returns the process-wide auth provider.
 *
 * Resolution is mode-aware so initialization mistakes are loud:
 *
 *   - **OSS builds** fall through to `NullAuthProvider` (the OSS dummy
 *     user that exposes `stemstudio-token` to the ai-server). This is the
 *     right default — there is no user identity to delegate to.
 *   - **Integrated builds** *throw* when no provider has been registered.
 *     This is a programmer error — importing `@stem/auth-firebase` is the
 *     side-effect that installs the real provider. The unified bootstrap
 *     module `shared/src/bootstrap/integrated.ts` does that import; both
 *     app shells (`AppContainer.tsx`, `PublicAppContainerLite.tsx`) import
 *     the bootstrap module at module load. Silently falling back to
 *     `NullAuthProvider` in integrated mode would forward the OSS dummy
 *     token to the cloud server, which rejects it as a malformed Firebase
 *     JWT and 401s every request — exactly the failure mode this guard
 *     exists to prevent.
 */
export function getAuthProvider(): IAuthProvider {
    if (singleton) return singleton;
    if (IS_OSS) {
        singleton = new NullAuthProvider();
        return singleton;
    }
    throw new Error(
        "getAuthProvider() in integrated mode requires `@stem/auth-firebase` to be imported (or setAuthProvider() to be called) before the first read. " +
            "The unified bootstrap `shared/src/bootstrap/integrated.ts` does this — import it from your app shell. " +
            "If this fires during a test, call setAuthProvider() with a stub before exercising auth-touching code.",
    );
}

/**
 * Replace the singleton. Integrated bootstrap calls this to inject the
 * Firebase impl; tests can use it to inject a stub. Production code
 * shouldn't call it directly.
 */
export function setAuthProvider(provider: IAuthProvider | undefined): void {
    singleton = provider;
}
