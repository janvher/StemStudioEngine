//This is needed by old build system
import "./polyfills";

// Initialize custom logger early in application startup
import EngineRuntime from "./EngineRuntime";
import {AppEntrypoint, setAppEntrypoint} from "./entrypoint";
import {initializeLogger, LogLevel} from "./utils/Logger";

setAppEntrypoint(AppEntrypoint.EDITOR);
initializeLogger(undefined, LogLevel.LOG); // Editor: show all logs by default

const container = document.getElementById("container");
const app = new EngineRuntime(container!, {
    server: location.origin,
    enableCache: true,
    isPlayModeOnly: false,
});

void app.init();
