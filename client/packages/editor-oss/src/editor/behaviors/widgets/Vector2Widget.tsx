import React, {useState, useEffect} from "react";

import BaseAttributeWidget from "./BaseAttributeWidget";
import {InputSymbol} from "../../assets/v2/common/InputSymbol";
import {
    Box,
    BoxInputs,
    BoxLabels,
    InputWrapper,
    Wrapper,
} from "../../assets/v2/common/MovementSection/MovementSection.style";
import {NumericInput} from "../../assets/v2/common/NumericInput";
import {Vector2Attribute} from "../BehaviorAttributes";

type Vector2 = {x: number; y: number};

const Vector2WidgetComponent: React.FC<{
    label: string;
    getCurrentValue: () => Vector2;
    updateBehaviorField: (value: Vector2) => void;
    min?: {x: number; y: number};
    max?: {x: number; y: number};
}> = ({label, getCurrentValue, updateBehaviorField, min, max}) => {
    const [vector, setVector] = useState<Vector2>(getCurrentValue() || {x: 0, y: 0});

    const handleChange = (axis: keyof Vector2, newValue: number) => {
        // Apply limits if they exist
        let clampedValue = newValue;
        if (min && clampedValue < min[axis]) {
            clampedValue = min[axis];
        }
        if (max && clampedValue > max[axis]) {
            clampedValue = max[axis];
        }

        const updatedVector = {...vector, [axis]: clampedValue};
        setVector(updatedVector);
        updateBehaviorField(updatedVector);
    };

    useEffect(() => {
        setVector(getCurrentValue() || {x: 0, y: 0});
    }, [getCurrentValue]);

    return (
        <Wrapper>
            <Box>
                <BoxLabels style={{width: "calc(100% - 100px)"}}>
                    <div className="titleSecondary">{label}</div>
                </BoxLabels>
                <BoxInputs style={{width: "auto"}}>
                    {(["x", "y"] as Array<keyof Vector2>).map(axis => (
                        <InputWrapper key={axis}>
                            <InputSymbol
                                symbol={axis.toUpperCase()}
                                value={vector[axis]}
                                setValue={(value: number) => handleChange(axis, value)}
                                isLocked={false}
                            />
                            <NumericInput
                                value={vector[axis]}
                                setValue={() => null}
                                disabled={false}
                                onBlur={(value: number) => handleChange(axis, value)}
                                onDragValueChange={(value: number) => handleChange(axis, value)}
                                min={min?.[axis]}
                                max={max?.[axis]}
                                className="dark-input"
                            />
                        </InputWrapper>
                    ))}
                </BoxInputs>
            </Box>
        </Wrapper>
    );
};

class Vector2Widget extends BaseAttributeWidget {
    protected getContainerPrefix(): string {
        return "widget-vector2";
    }

    protected createComponent(
        id: string,
        name: string,
        attribute: Vector2Attribute,
        getCurrentValue: () => Vector2,
        updateBehaviorField: (value: Vector2) => void,
    ): React.ReactElement {
        return (
            <Vector2WidgetComponent
                label={name}
                getCurrentValue={getCurrentValue}
                updateBehaviorField={updateBehaviorField}
                min={attribute.min}
                max={attribute.max}
            />
        );
    }
}

export default Vector2Widget;
