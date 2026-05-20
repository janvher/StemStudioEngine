/**
 * OSS-mode stub for `@stem/auth-firebase`.
 *
 * Vite's `define` aliases `@stem/auth-firebase` to this file when
 * `BUILD_MODE=oss` (or `VITE_BUILD_MODE=oss`). The real package's
 * side-effect import installs `FirebaseAuthProvider` into the editor-oss
 * auth factory; this stub does nothing, so the factory falls through to
 * its OSS default (`NullAuthProvider`).
 *
 * Importing `FirebaseAuthProvider` or `installFirebaseAuthProvider` from
 * the real package is a programmer error in OSS code — the boundary lint
 * forbids it. The dummy exports below exist so accidental imports compile
 * but observably fail at runtime instead of silently registering Firebase.
 */

/* eslint-disable @typescript-eslint/no-empty-function */

class FirebaseAuthProviderStub {
    constructor() {
        throw new Error(
            "FirebaseAuthProvider is not available in OSS builds. Use the editor-oss NullAuthProvider default instead, " +
                "or register your own via setAuthProvider().",
        );
    }
}

export {FirebaseAuthProviderStub as FirebaseAuthProvider};

/**
 * No-op in OSS builds — the editor-oss factory's NullAuthProvider default
 * is what the editor uses. Calling this is harmless.
 */
export function installFirebaseAuthProvider(): void {
    // intentionally empty
}
