// This is needed by old build system.
import "@web-shared/polyfills";

import {createElement} from "react";
import {createRoot} from "react-dom/client";

import {AppEntrypoint, setAppEntrypoint} from "@web-shared/entrypoint";
import global from "@web-shared/global";
import {PublicAppContainerLite} from "@web-shared/PublicAppContainerLite";
import {initializeLogger, LogLevel} from "@web-shared/utils/Logger";

setAppEntrypoint(AppEntrypoint.PUBLIC);
initializeLogger(undefined, LogLevel.LOG);

global.app = null;

const container = document.getElementById("container");
if (container) {
    const root = createRoot(container);
    root.render(createElement(PublicAppContainerLite));
}
