import React from "react";
import ReactDOM from "react-dom/client";

import { BehaviorAttribute } from "../BehaviorAttributes";
import BaseAttributeWidget from "./BaseAttributeWidget";
import { Separator } from "../../assets/v2/RightPanel/common/Separator";

class SeparatorWidget extends BaseAttributeWidget {
    protected getContainerPrefix(): string {
        return "widget-separator";
    }

    protected createComponent(
        id: string,
        name: string,
        attribute: BehaviorAttribute,
        getCurrentValue: () => any,
        updateBehaviorField: (value: any) => void,
    ): React.ReactElement {
        return <Separator />;
    }
}

export default SeparatorWidget;