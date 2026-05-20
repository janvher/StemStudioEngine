import React from "react";
import {createRoot} from "react-dom/client";

import {GameQueueView} from "./GameQueueView";
import PlayerComponent from "./PlayerComponent";

class PlayerQueueView extends PlayerComponent {
    constructor(app) {
        super(app);
        this.container = null;
    }

    show() {
        if (!this.container) {
            // Create a container element for the queue mask
            this.container = document.createElement("div");
            Object.assign(this.container.style, {
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 1000,
            });

            // Render the React component inside the container
            const root = createRoot(this.container);
            root.render(React.createElement(GameQueueView));

            // Attach container to the app's main container
            this.app.container.appendChild(this.container);
        }
        // Show the container
        this.container.style.display = "flex";
    }

    hide() {
        if (this.container) {
            this.container.style.display = "none";
        }
    }

    dispose() {
        if (this.container) {
            this.app.container.removeChild(this.container);
            this.container = null;
        }
    }
}

export default PlayerQueueView;
