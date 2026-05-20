import React, {useState, useEffect} from "react";

import {TextInputRow} from "../../assets/v2/RightPanel/common/TextInputRow";
import {StringAttribute} from "../BehaviorAttributes";
import BaseAttributeWidget from "./BaseAttributeWidget";

const StringWidgetComponent: React.FC<{
    label: string;
    getCurrentValue: () => string;
    updateBehaviorField: (value: string) => void;
    attribute: StringAttribute; // Add attribute here to use isColumnMultiline
}> = ({label, getCurrentValue, updateBehaviorField, attribute}) => {
    const [value, setValue] = useState(getCurrentValue() ?? "");

    const handleChange = (newValue: string) => {
        if (attribute.readOnly) return;
        updateBehaviorField(newValue);
        setValue(newValue);
    };

    useEffect(() => {
        setValue(getCurrentValue() ?? "");
    }, [getCurrentValue]);

    // Conditional rendering based on isColumnMultiline
    if (attribute.isColumnMultiline) {
        return (
            <TextInputRow
                label={label}
                value={value}
                setValue={handleChange}
                isColumn
                margin="0"
                type="textarea" // Ensure this explicitly sets the textarea
                height="75px" // Ensure correct height
            />
        );
    }

    return (
        <TextInputRow
            label={label}
            value={value}
            setValue={handleChange}
            margin="0"
        />
    );
};

class StringWidget extends BaseAttributeWidget {
    protected getContainerPrefix(): string {
        return "widget-string";
    }

    protected createComponent(
        id: string,
        name: string,
        attribute: StringAttribute,
        getCurrentValue: () => string,
        updateBehaviorField: (value: string) => void,
    ): React.ReactElement {
        // console.log(attribute);
        return (
            <StringWidgetComponent
                label={name}
                getCurrentValue={getCurrentValue}
                updateBehaviorField={updateBehaviorField}
                attribute={attribute} // Pass attribute here
            />
        );
    }
}

export default StringWidget;
