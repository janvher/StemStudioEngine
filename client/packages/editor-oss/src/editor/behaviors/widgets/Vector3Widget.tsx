import React, {useState, useEffect} from "react";

import BaseAttributeWidget from "./BaseAttributeWidget";
import {NumericInput} from "../../assets/v2/common//NumericInput";
import {InputSymbol} from "../../assets/v2/common/InputSymbol";
import {AxisArray, AxisType} from "../../assets/v2/common/MovementSection/MovementSection";
import {
    Box,
    BoxInputs,
    BoxLabels,
    InputWrapper,
    Wrapper,
} from "../../assets/v2/common/MovementSection/MovementSection.style";
import {Vector3Attribute} from "../BehaviorAttributes";

type Vector3 = {x: number; y: number; z: number};

const Vector3WidgetComponent: React.FC<{
    label: string;
    getCurrentValue: () => Vector3;
    updateBehaviorField: (value: Vector3) => void;
    min?: {x: number; y: number; z: number};
    max?: {x: number; y: number; z: number};
}> = ({label, getCurrentValue, updateBehaviorField, min, max}) => {
    const [vector, setVector] = useState<Vector3>(getCurrentValue() || {x: 0, y: 0, z: 0});

    const handleChange = (axis: keyof Vector3, newValue: number) => {
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
        setVector(getCurrentValue() || {x: 0, y: 0, z: 0});
    }, [getCurrentValue]);

    return (
        <Wrapper>
            <Box>
                <BoxLabels style={{width: "calc(100% - 151px)"}}>
                    <div className="titleSecondary">{label}</div>
                </BoxLabels>
                <BoxInputs style={{width: "auto"}}>
                    {AxisArray.map((axis: AxisType) => (
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
                                min={min?.[axis] ?? Number.MIN_SAFE_INTEGER}
                                max={max?.[axis] ?? Number.MAX_SAFE_INTEGER}
                                className="dark-input"
                            />
                        </InputWrapper>
                    ))}
                </BoxInputs>
            </Box>
        </Wrapper>
    );
};

class Vector3Widget extends BaseAttributeWidget {
    protected getContainerPrefix(): string {
        return "widget-vector3";
    }

    protected createComponent(
        id: string,
        name: string,
        attribute: Vector3Attribute,
        getCurrentValue: () => Vector3,
        updateBehaviorField: (value: Vector3) => void,
    ): React.ReactElement {
        return (
            <Vector3WidgetComponent
                label={name}
                getCurrentValue={getCurrentValue}
                updateBehaviorField={updateBehaviorField}
                min={attribute.min}
                max={attribute.max}
            />
        );
    }
}

export default Vector3Widget;
