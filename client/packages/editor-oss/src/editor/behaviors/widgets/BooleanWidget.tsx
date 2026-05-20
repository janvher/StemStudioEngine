import React, {useState, useEffect} from "react";
import ReactDOM from "react-dom/client";

import {PanelCheckbox} from "../../assets/v2/RightPanel/common/PanelCheckbox";
import {BooleanAttribute} from "../BehaviorAttributes";
import BaseAttributeWidget from "./BaseAttributeWidget";

const BooleanWidgetComponent: React.FC<{
    label: string;
    getCurrentValue: () => boolean;
    updateBehaviorField: (value: boolean) => void;
}> = ({label, getCurrentValue, updateBehaviorField}) => {
    const [value, setValue] = useState(getCurrentValue());

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | undefined>) => {
        const newValue = !!e.target?.checked;
        updateBehaviorField(newValue);
        setValue(newValue);
    };

    useEffect(() => {
        setValue(getCurrentValue());
    }, [getCurrentValue]);

    return (
        <div>
            <PanelCheckbox
                text={label}
                checked={value}
                onChange={handleChange}
                isLocked={false}
                v2
                isGray
                regular
            />
        </div>
    );
};

class BooleanWidget extends BaseAttributeWidget {
    protected getContainerPrefix(): string {
        return "widget-boolean";
    }

    protected createComponent(
        id: string,
        name: string,
        attribute: BooleanAttribute,
        getCurrentValue: () => boolean,
        updateBehaviorField: (value: boolean) => void,
    ): React.ReactElement {
        return (
            <BooleanWidgetComponent
                label={name}
                getCurrentValue={getCurrentValue}
                updateBehaviorField={updateBehaviorField}
            />
        );
    }
}

export default BooleanWidget;
