import {useState} from "react";
import styled from "styled-components";

import {StyledRowWrapper} from "./StyledRowWrapper";
import StyledColorPicker from "../../common/StyledColorPicker/StyledColorPicker";

interface Props {
    label: string;
    value: string;
    setValue: (value: string) => void;
    disabled?: boolean;
    $margin?: string;
    border?: boolean;
}

export const ColorSelectionRow = ({label, value, setValue, disabled, $margin, border}: Props) => {
    const [pickerVisible, setPickerVisible] = useState(false);

    return (
        <StyledRowWrapper $margin={$margin}>
            <span className="text">{label}</span>
            <ColorBox $background={value}
                onClick={() => setPickerVisible(true)}
                $border={border}
            />
            {pickerVisible && 
                <StyledColorPicker hideAlpha
                    color={value}
                    setColor={setValue}
                    hide={() => setPickerVisible(false)}
                />
            }
        </StyledRowWrapper>
    );
};

const ColorBox = styled.div<{$background: string; $border?: boolean}>`
    width: 49px;
    height: 24px;
    border-radius: 8px;
    background-color: ${({$background}) => $background};
    ${({$border}) => $border && `border: 1px solid #fff;`};
    cursor: pointer;
`;
