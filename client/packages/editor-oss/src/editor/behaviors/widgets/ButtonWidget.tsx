import React from "react";

import {StyledButton} from "../../assets/v2/common/StyledButton";
import {ButtonAttribute} from "../BehaviorAttributes";
import BaseAttributeWidget from "./BaseAttributeWidget";

const ButtonWidgetComponent: React.FC<{
    name: string;
    attribute: ButtonAttribute;
    updateBehaviorField: (value: any) => void;
}> = ({name, attribute, updateBehaviorField}) => {
    const handleClick = () => {
        updateBehaviorField({action: attribute.action});
    };

    return (
        <div>
            <StyledButton
                isBlue
                onClick={handleClick}
            >
                {attribute.buttonText || name}
            </StyledButton>
        </div>
    );
};

class ButtonWidget extends BaseAttributeWidget {
    protected getContainerPrefix(): string {
        return "widget-button";
    }

    protected createComponent(
        id: string,
        name: string,
        attribute: ButtonAttribute,
        getCurrentValue: () => any,
        updateBehaviorField: (value: any) => void,
    ): React.ReactElement {
        return (
            <ButtonWidgetComponent
                name={name}
                attribute={attribute}
                updateBehaviorField={updateBehaviorField}
            />
        );
    }
}

export default ButtonWidget;
