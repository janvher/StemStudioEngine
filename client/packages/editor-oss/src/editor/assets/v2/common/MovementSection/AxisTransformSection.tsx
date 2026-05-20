import React from "react";

import {InputSymbol} from "../InputSymbol";
import {NumericInput} from "../NumericInput";
import {AxisArray, AxisType} from "./MovementSection";
import {Box, BoxInputs, BoxLabels, InputWrapper, Wrapper} from "./MovementSection.style";

interface Props {
    isLocked: boolean;
    name: string;
    value: {x: number; y: number; z: number};
    setValue: React.Dispatch<React.SetStateAction<{x: number; y: number; z: number}>>;
}

export const AxisTransformSection = ({isLocked, setValue, value, name}: Props) => {
    return (
        <Wrapper>
            <Box>
                <BoxLabels>
                    <div className="titleSecondary">{name}</div>
                </BoxLabels>
                <BoxInputs>
                    {AxisArray.map((axis: AxisType) => {
                        return (
                            <InputWrapper key={axis}>
                                <InputSymbol
                                    symbol={axis.toUpperCase()}
                                    value={value[axis]}
                                    setValue={value => setValue(prev => ({...prev, [axis]: value}))}
                                    isLocked={isLocked}
                                />
                                <NumericInput
                                    value={value[axis]}
                                    setValue={() => {
                                        return null;
                                    }}
                                    className="dark-input"
                                    disabled={isLocked}
                                    onBlur={value => setValue(prev => ({...prev, [axis]: value}))}
                                    onDragValueChange={value => setValue(prev => ({...prev, [axis]: value}))}
                                />
                            </InputWrapper>
                        );
                    })}
                </BoxInputs>
            </Box>
        </Wrapper>
    );
};
