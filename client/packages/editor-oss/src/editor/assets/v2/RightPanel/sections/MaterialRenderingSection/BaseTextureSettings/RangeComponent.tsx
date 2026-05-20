import styled from "styled-components";

import {SettingsLabel} from "./BaseTextureSettings.style";
import {NumericInput} from "../../../../common/NumericInput";
import {StyledRange} from "../../../../common/StyledRange";
import {Tooltip} from "../../../../common/Tooltip";

interface Props {
    min: number;
    max: number;
    step: number;
    value: number;
    handleChange: (value: number) => void;
    label: string;
    tooltip?: string;
}

export const RangeComponent = ({min, max, step, value, handleChange, label, tooltip}: Props) => {
    return (
        <FlexContainer>
            {tooltip ?
                <Tooltip content={tooltip}
                    maxWidth="240px"
                    triggerFullWidth={false}
                >
                    <SettingsLabel>{label}</SettingsLabel>
                </Tooltip>
             :
                <SettingsLabel>{label}</SettingsLabel>
            }
            <StyledRange value={value}
                setValue={handleChange}
                min={min}
                max={max}
                step={step}
            />
            <NumericInput value={value}
                setValue={handleChange}
                width="49px"
                height="24px"
            />
        </FlexContainer>
    );
};

const FlexContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    column-gap: 4px;
    flex-wrap: no-wrap;
    width: 100%;
    .rangeWrapper {
        width: 109px;
    }
`;
