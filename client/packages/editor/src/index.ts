// This is needed by old build system.
import "@web-shared/polyfills";
// Side-effect import: installs the integrated providers (Firebase auth,
// Firestore, AIBackend, copilot, …) before EngineRuntime.init() mounts the
// editor React tree, whose AuthorizationContext queries `getAuthProvider()`
// during render. In OSS builds the vite alias makes this a no-op.
import "@web-shared/bootstrap/integrated";

import EngineRuntime from "@web-shared/EngineRuntime";
import {AppEntrypoint, setAppEntrypoint} from "@web-shared/entrypoint";
import {createBackendAdapter} from "@stem/network";
import {initializeLogger, LogLevel} from "@web-shared/utils/Logger";

setAppEntrypoint(AppEntrypoint.EDITOR);
initializeLogger(undefined, LogLevel.LOG); // Editor: show all logs by default

const container = document.getElementById("container");
const backendAdapter = createBackendAdapter("editor");
const app = new EngineRuntime(container!, {
    server: backendAdapter.server,
    enableCache: true,
    isPlayModeOnly: false,
});

void app.init();
