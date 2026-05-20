import {useEffect, useState} from "react";
import styled from "styled-components";

import {StyledRowWrapper} from "./StyledRowWrapper";
import {flexCenter} from "../../../../../assets/style";
import {isHexColor} from "../../../../../v2/pages/services";
import StyledColorPicker, {getDefaultHexColor} from "../../common/StyledColorPicker/StyledColorPicker";
import {TextInput} from "../../common/TextInput";

interface Props {
    color: string;
    handleColorChange: (color: string) => void;
    $margin?: string;
    width?: string;
    disabled?: boolean;
    customPresets?: string[];
}

export const ColorRow = ({color, handleColorChange, $margin, disabled, customPresets, width}: Props) => {
    const [pickerVisible, setPickerVisible] = useState(false);
    const [hexInput, setHexInput] = useState(getDefaultHexColor(color));

    useEffect(() => {
        setHexInput(color);
    }, [color]);

    return (
        <Wrapper
            $margin={$margin}
            $disabled={!!disabled}
        >
            <span className="text">Color</span>
            <div className="flexWrapper">
                <ColorPreview
                    aria-disabled={!!disabled}
                    $backgroundColor={color}
                    onClick={() => (disabled ? undefined : setPickerVisible(true))}
                />
                <TextInput
                    width={width || "64px"}
                    className="hexInput"
                    value={hexInput}
                    setValue={value => {
                        setHexInput(value);
                        if (isHexColor(value)) {
                            handleColorChange(value);
                        }
                    }}
                    disabled={!!disabled}
                />
            </div>
            {pickerVisible && (
                <StyledColorPicker
                    hideAlpha
                    color={color}
                    setColor={value => {
                        handleColorChange(value);
                        setHexInput(value);
                    }}
                    hide={() => setPickerVisible(false)}
                    customPresets={customPresets}
                />
            )}
        </Wrapper>
    );
};

const Wrapper = styled(StyledRowWrapper)<{$margin?: string; $disabled: boolean}>`
    ${({$margin}) => $margin && `margin: ${$margin}`};
    ${({$disabled}) => `* {cursor: ${$disabled ? "not-allowed" : "auto"}}`};

    .text {
        text-wrap: nowrap;
    }

    .flexWrapper {
        ${flexCenter};
        column-gap: 8px;
    }
`;

const ColorPreview = styled.div<{$backgroundColor: string}>`
    ${({$backgroundColor}) => `background: ${$backgroundColor}`};
    width: 24px;
    height: 24px;
    border-radius: 8px;
    border: 1px solid var(--theme-grey-bg);
`;
