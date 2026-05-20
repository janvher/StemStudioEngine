import {setSceneSaveHandler} from "@stem/network/api/scene";

import {IS_OSS} from "../mode/buildMode";
import {IndexedDBProjectStore} from "./IndexedDBProjectStore";
import {ossSaveScene} from "./ossSceneSave";
import type {ProjectStore} from "./ProjectStore";

const STORAGE_MODE_KEY = "stemstudio.persistence.mode";

export type OSSPersistenceMode = "indexeddb" | "filesystem";

let singleton: ProjectStore | undefined;

/**
 * Returns the chosen persistence mode for OSS builds. Read from
 * `localStorage`; falls back to `indexeddb` (the safest, universally
 * supported option). The first-time bootstrap modal writes this value once
 * the user picks.
 */
export function getOSSPersistenceMode(): OSSPersistenceMode {
    if (typeof localStorage === "undefined") return "indexeddb";
    const stored = localStorage.getItem(STORAGE_MODE_KEY);
    return stored === "filesystem" ? "filesystem" : "indexeddb";
}

export function setOSSPersistenceMode(mode: OSSPersistenceMode): void {
    if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_MODE_KEY, mode);
    }
    // Clear singleton so the next access picks up the new mode.
    singleton = undefined;
}

/**
 * Returns the process-wide ProjectStore singleton.
 *
 * Resolution:
 *   - If a caller has previously registered a store via `setProjectStore`
 *     (e.g. integrated bootstrap installs a `RemoteProjectStore`, or the OSS
 *     bootstrap modal installs a `FileSystemProjectStore`), that's returned.
 *   - Otherwise the function falls back to an `IndexedDBProjectStore` in OSS
 *     builds and throws in integrated builds where forgetting to wire the
 *     remote adapter is a programmer error.
 */
export function getProjectStore(): ProjectStore {
    if (singleton) return singleton;
    if (!IS_OSS) {
        throw new Error(
            "getProjectStore() in integrated mode requires initIntegratedProjectStore() to register a backend first.",
        );
    }
    // OSS default — the bootstrap modal will replace this with a
    // FileSystemProjectStore if the user picked the folder mode.
    setProjectStore(new IndexedDBProjectStore());
    return singleton!;
}

/**
 * Inject a ProjectStore (test stubs or the FileSystemProjectStore once the
 * bootstrap modal has resolved a directory handle).
 *
 * Side effect: when the registered store is a local-only OSS backend
 * (`indexeddb` / `filesystem`), the `network/scene::saveScene` save handler
 * is installed to route every save through the store. Registering the
 * integrated `RemoteProjectStore` (kind `"remote"`) clears the handler so
 * `saveScene` falls back to the cloud Scene API flow.
 */
export function setProjectStore(store: ProjectStore | undefined): void {
    singleton = store;
    if (!store || store.kind === "remote") {
        setSceneSaveHandler(null);
    } else {
        setSceneSaveHandler(ossSaveScene);
    }
}
