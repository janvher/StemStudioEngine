import React, {useState, useEffect} from "react";

import BaseAttributeWidget from "./BaseAttributeWidget";
import {SelectRow} from "../../assets/v2/RightPanel/common/SelectRow";
import {EnumAttribute} from "../BehaviorAttributes";

interface EnumOption {
    label: string;
    value: any;
}

const EnumWidgetComponent: React.FC<{
    label: string;
    options: EnumOption[];
    width?: string;
    getCurrentValue: () => any;
    updateBehaviorField: (value: any) => void;
}> = ({label, options, width, getCurrentValue, updateBehaviorField}) => {
    const [current, setCurrent] = useState(getCurrentValue());

    useEffect(() => {
        setCurrent(getCurrentValue());
    }, [getCurrentValue]);

    const items = options.map(option => ({
        key: option.value.toString(),
        // SelectRow uses value to show the selected item
        value: option.label,
        realValue: option.value,
    }));

    const selectedItem = items.find(item => item.realValue === current);

    const handleChange = (item: any) => {
        setCurrent(item.realValue);
        updateBehaviorField(item.realValue);
    };

    return (
        <SelectRow
            label={label}
            value={selectedItem}
            data={items}
            onChange={handleChange}
            $margin="0"
            width={width || "120px"}
        />
    );
};

class EnumWidget extends BaseAttributeWidget {
    protected getContainerPrefix(): string {
        return "widget-enum";
    }

    protected createComponent(
        id: string,
        name: string,
        attribute: EnumAttribute,
        getCurrentValue: () => any,
        updateBehaviorField: (value: any) => void,
    ): React.ReactElement {
        return (
            <EnumWidgetComponent
                label={name}
                width={attribute.width}
                options={attribute.options || []}
                getCurrentValue={getCurrentValue}
                updateBehaviorField={updateBehaviorField}
            />
        );
    }
}

export default EnumWidget;
