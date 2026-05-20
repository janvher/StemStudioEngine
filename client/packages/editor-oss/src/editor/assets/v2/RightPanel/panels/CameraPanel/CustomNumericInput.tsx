import React from "react";

import { NumericInputRow } from "../../common/NumericInputRow";

interface Props {
    label: string;
    unit?: string;
    value?: number;
    setValue: (value: number) => void;
    min?: number;
    max?: number;
    dragStep?: number;
    labelTooltip?: React.ReactNode;
}

export const CustomNumericInput = ({ label, unit, value, setValue, min, max, dragStep, labelTooltip }: Props) => {
    return <NumericInputRow
        $margin="0 0 8px"
        width="80px"
        label={label}
        value={value || 0}
        setValue={setValue}
        unit={unit}
        min={min}
        max={max}
        dragStep={dragStep}
        labelTooltip={labelTooltip}
           />;
};
