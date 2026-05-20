import React from "react";
import styled from "styled-components";

import {NumericInputRow} from "./NumericInputRow";
import {StyledRowWrapper} from "./StyledRowWrapper";

const Vector2Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const AxisRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const AxisLabel = styled.span`
    min-width: 12px;
    font-size: var(--theme-font-size-extra-small);
    color: var(--text-secondary);
    font-weight: var(--theme-font-regular);
`;

interface Vector2Value {
    x: number;
    y: number;
}

interface Vector2RowProps {
    label: string;
    value: Vector2Value;
    setValue: (value: Vector2Value) => void;
    disabled?: boolean;
    margin?: string;
    min?: Vector2Value;
    max?: Vector2Value;
}

export const Vector2Row: React.FC<Vector2RowProps> = ({label, value, setValue, disabled = false, margin, min, max}) => {
    const handleAxisChange = (axis: keyof Vector2Value, newValue: number) => {
        // Apply min/max constraints if provided
        let clampedValue = newValue;
        if (min && clampedValue < min[axis]) {
            clampedValue = min[axis];
        }
        if (max && clampedValue > max[axis]) {
            clampedValue = max[axis];
        }

        setValue({
            ...value,
            [axis]: clampedValue,
        });
    };

    return (
        <StyledRowWrapper $margin={margin}>
            <span className="text">{label}</span>
            <Vector2Container>
                <AxisRow>
                    <AxisLabel>X</AxisLabel>
                    <NumericInputRow
                        label=""
                        value={value.x}
                        setValue={newValue => handleAxisChange("x", newValue)}
                        disabled={disabled}
                        $margin="0"
                        min={min?.x}
                        max={max?.x}
                        width="60px"
                    />
                </AxisRow>
                <AxisRow>
                    <AxisLabel>Y</AxisLabel>
                    <NumericInputRow
                        label=""
                        value={value.y}
                        setValue={newValue => handleAxisChange("y", newValue)}
                        disabled={disabled}
                        $margin="0"
                        min={min?.y}
                        max={max?.y}
                        width="60px"
                    />
                </AxisRow>
            </Vector2Container>
        </StyledRowWrapper>
    );
};
