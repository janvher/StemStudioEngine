import React from "react";
import ReactDOM from "react-dom/client";

import { BEHAVIOR_UI_CONTAINER_ID } from "@stem/editor-oss/types/editor";
import { BehaviorAttribute } from "../BehaviorAttributes";
import AttributeWidget from "./AttributeWidget";

abstract class BaseAttributeWidget implements AttributeWidget {
    // Each widget specifies its own prefix for container IDs.
    protected abstract getContainerPrefix(): string;

    // Function to create a React component.
    protected abstract createComponent(
        id: string,
        name: string,
        attribute: BehaviorAttribute,
        getCurrentValue: () => any,
        updateBehaviorField: (value: any) => void,
    ): React.ReactElement;

    build(
        id: string,
        name: string,
        attribute: BehaviorAttribute,
        getCurrentValue: () => any,
        updateBehaviorField: (value: any) => void,
        root: ReactDOM.Root | null,
    ): void {
        const component = this.createComponent(id, name, attribute, getCurrentValue, updateBehaviorField);

        if (root) {
            root.render(component);
        } else {
            const widgetContainerId = `${this.getContainerPrefix()}-${id}`;
            let container = document.getElementById(widgetContainerId);
            if (!container) {
                container = document.createElement("div");
                container.id = widgetContainerId;
                const uiContainer = document.getElementById(BEHAVIOR_UI_CONTAINER_ID);
                if (uiContainer) {
                    uiContainer.appendChild(container);
                } else {
                    console.error("UI container not found.");
                }
            }
            const widgetRoot = ReactDOM.createRoot(container);
            widgetRoot.render(component);
        }
    }

    clear(): void {
        const prefix = this.getContainerPrefix();
        const widgetContainers = document.querySelectorAll(`[id^="${prefix}-"]`);
        widgetContainers.forEach(container => container.remove());
    }
}

export default BaseAttributeWidget;