import styled, {css} from "styled-components";

import {CheckboxIcon} from "./CheckboxIcon";

interface Props {
    disabled?: boolean;
    checked: boolean;
    onChange?: (e?: any) => void;
    customId: string;
    readOnly?: boolean;
    invisible?: boolean;
    refProp?: React.Ref<HTMLInputElement>;
    customBG?: string;
    customStyle?: React.CSSProperties;
}

const CheckboxWrapper = styled.div<{disabled?: boolean}>`
    position: relative;
    cursor: pointer;
    width: 16px;
    height: 16px;
    ${props =>
        props.disabled &&
        css`
            cursor: not-allowed;
        `}
`;

const HiddenCheckbox = styled.input.attrs({type: "checkbox"})<{
    $readonly?: boolean;
    $invisible?: boolean;
    $customBG?: string;
}>`
    box-sizing: border-box;
    cursor: pointer;
    width: 16px;
    height: 16px;
    border-radius: 4px;
    position: relative;
    appearance: none;
    border: 1px solid transparent !important;
    padding: 0;
    margin: 2px 0 0 0;
    ${({$readonly}) => $readonly && `pointer-events: none;`}

    &:after {
        box-sizing: border-box;
        transition: 0.2s ease-in-out;
        content: "";
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border: 1px solid transparent;
        width: 14px;
        height: 14px;
        border-radius: inherit;
    }

    &:checked:after {
        transform: translate(-50%, -50%) scale(1);
        background-color: ${({$invisible}) =>
            $invisible ? "transparent" : " var(--theme-icon-properties-selected-color)"};
        ${({$customBG}) => $customBG && `background: ${$customBG}`}
    }

    &:checked {
        background: none;
        border: ${({$invisible}) => $invisible ? "none" : "1px solid #f8fafccc"};
    }

    &:not(:checked)::after {
        background: none;
        border: ${({$invisible}) => $invisible ? "none" : "1px solid #f8fafccc"};
    }

    &:disabled {
        cursor: not-allowed;
    }
`;

const Label = styled.label`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    cursor: inherit;
    z-index: 1;
    margin: 2px 0 0 0;
`;

export const Checkbox = ({
    checked,
    onChange,
    disabled,
    customId,
    readOnly,
    refProp,
    invisible,
    customBG,
    customStyle,
}: Props) => {
    const id = `common-checkbox-${customId}`;

    return (
        <CheckboxWrapper disabled={disabled}
            className="checkbox"
        >
            <HiddenCheckbox
                style={customStyle}
                $customBG={customBG}
                $invisible={!!invisible}
                id={id}
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                readOnly={readOnly}
                ref={refProp}
                $readonly={readOnly}
            />
            {checked && 
                <Label htmlFor={id}>
                    <CheckboxIcon />
                </Label>
            }
        </CheckboxWrapper>
    );
};
