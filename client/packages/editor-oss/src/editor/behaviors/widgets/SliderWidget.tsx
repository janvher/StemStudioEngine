import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";

import { StyledRange } from "../../../editor/assets/v2/common/StyledRange";
import { SliderAttribute } from "../BehaviorAttributes";
import BaseAttributeWidget from "./BaseAttributeWidget";

const SliderWidgetComponent: React.FC<{
    label: string;
    getCurrentValue: () => number;
    updateBehaviorField: (value: number) => void;
    min: number;
    max: number;
    step?: number;
}> = ({ label, getCurrentValue, updateBehaviorField, min, max, step = 0.01 }) => {
    const [value, setValue] = useState(getCurrentValue() ?? 0);

    const handleChange = (newValue: number) => {
        // Update local state for label display during drag
        setValue(newValue);
    };

    const handleChangeComplete = (newValue: number) => {
        // Call updateBehaviorField only when slider is released
        setValue(newValue);
        updateBehaviorField(newValue);
    };

    useEffect(() => {
        setValue(getCurrentValue() ?? 0);
    }, [getCurrentValue]);

    return (
        <div>
            <span className="common-text">{label} {Number(value).toFixed(2)}</span>
            <StyledRange
                value={value}
                setValue={handleChange}
                setValueComplete={handleChangeComplete}
                min={min}
                max={max}
                step={step}
            />
        </div>
    );
};

class SliderWidget extends BaseAttributeWidget {
    protected getContainerPrefix(): string {
        return "widget-slider";
    }

    protected createComponent(
        id: string,
        name: string,
        attribute: SliderAttribute,
        getCurrentValue: () => number,
        updateBehaviorField: (value: number) => void,
    ): React.ReactElement {
        return (
            <SliderWidgetComponent
                label={name}
                getCurrentValue={getCurrentValue}
                updateBehaviorField={updateBehaviorField}
                min={attribute.min ?? 0}
                max={attribute.max ?? 1}
                step={attribute.step ?? 0.01}
            />
        );
    }
}

export default SliderWidget;
