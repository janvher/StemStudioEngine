import React from "react";

import { BehaviorAttribute } from "../BehaviorAttributes";
import BaseAttributeWidget from "./BaseAttributeWidget";
import { Separator } from "../../assets/v2/RightPanel/common/Separator";

class SeparatorWidget extends BaseAttributeWidget {
    protected getContainerPrefix(): string {
        return "widget-separator";
    }

    protected createComponent(
        _id: string,
        _name: string,
        _attribute: BehaviorAttribute,
        _getCurrentValue: () => any,
        _updateBehaviorField: (value: any) => void,
    ): React.ReactElement {
        return <Separator />;
    }
}

export default SeparatorWidget;