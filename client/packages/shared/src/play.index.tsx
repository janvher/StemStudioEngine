import "./polyfills";

import EngineRuntime from "./EngineRuntime";
import {AppEntrypoint, setAppEntrypoint} from "./entrypoint";
import {initializeLogger} from "./utils/Logger";

setAppEntrypoint(AppEntrypoint.PLAY);
initializeLogger();

const container = document.getElementById("container");

if (container) {
    const app = new EngineRuntime(container, {
        server: location.origin,
        enableCache: true,
        isPlayModeOnly: true,
    });

    void app.init();
}
