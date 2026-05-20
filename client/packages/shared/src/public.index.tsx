import {StrictMode} from "react";
import {createRoot} from "react-dom/client";

import "./polyfills";

import AppRuntime from "./AppRuntime";
import {PublicAppContainer} from "./PublicAppContainer";
import {initializeLogger} from "./utils/Logger";

initializeLogger();

const container = document.getElementById("container");

if (container) {
    new AppRuntime(container, {
        server: location.origin,
        enableCache: true,
        isPlayModeOnly: false,
    });

    const root = createRoot(container);
    root.render(
        <StrictMode>
            <PublicAppContainer />
        </StrictMode>,
    );
}
