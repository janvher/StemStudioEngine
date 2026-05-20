// This is needed by old build system.
import "./polyfills";

import {createElement} from "react";
import {createRoot} from "react-dom/client";

import {AppEntrypoint, setAppEntrypoint} from "./entrypoint";
import global from "./global";
import {PublicAppContainerLite} from "./PublicAppContainerLite";
import {initializeLogger, LogLevel} from "./utils/Logger";

setAppEntrypoint(AppEntrypoint.PUBLIC);
initializeLogger(undefined, LogLevel.LOG);

global.app = null;

const container = document.getElementById("container");
if (container) {
    const root = createRoot(container);
    root.render(createElement(PublicAppContainerLite));
}
