import React, {useState} from "react";
import styled from "styled-components";

import {regularFont} from "../../../../../../../../assets/style";
import StyledColorPicker from "../../../../../common/StyledColorPicker/StyledColorPicker";

interface Props {
    label: string;
    color: string;
    setColor: React.Dispatch<React.SetStateAction<string>>;
    hideAlpha?: boolean;
    disabled?: boolean;
}

export const ColorPickerSection = ({color, setColor, label, hideAlpha, disabled}: Props) => {
    const [pickerVisible, setPickerVisible] = useState(false);
    return (
        <Wrapper disabled={!!disabled}>
            <label>{label}</label>
            <ColorBox disabled={!!disabled}
                style={{backgroundColor: color}}
                onClick={() => setPickerVisible(true)}
            />
            {pickerVisible && 
                <StyledColorPicker
                    hideAlpha={hideAlpha}
                    color={color}
                    setColor={setColor}
                    hide={() => setPickerVisible(false)}
                />
            }
        </Wrapper>
    );
};

const Wrapper = styled.div<{disabled: boolean}>`
    width: 100%;
    position: relative;
    ${({disabled}) => disabled && `opacity: 0.5;`}
    label {
        display: block;
        ${regularFont("s")};
        margin-left: 14px;
        margin-bottom: 5px;
    }
    .colorPickerWrapper {
        position: absolute;
        top: 102%;
        left: 0;
        transform: none;
    }
    .ColorPicker {
        width: 300px !important;
    }
`;

const ColorBox = styled.div<{disabled: boolean}>`
    width: 51px;
    height: 28px;
    border-radius: 8px;
    cursor: ${({disabled}) => disabled ? "default" : "pointer"};
    border: 1px solid #fff;
`;
