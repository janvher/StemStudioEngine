import {setRemoteDocStore} from "@stem/editor-oss/data";

import {FirestoreDocStore} from "../data/FirestoreDocStore";

let registered = false;

/**
 * Register the Firestore-backed remote doc store for the integrated
 * build. Lives in `shared/` because this is the seam where
 * firebase/firestore crosses into the engine. OSS builds never call
 * this; the factory falls through to `NullRemoteDocStore`.
 *
 * Idempotent.
 */
export function initIntegratedRemoteDocStore(): void {
    if (registered) return;
    setRemoteDocStore(new FirestoreDocStore());
    registered = true;
}
