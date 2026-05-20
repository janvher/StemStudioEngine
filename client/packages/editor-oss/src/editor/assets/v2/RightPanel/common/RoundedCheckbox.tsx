import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../assets/style";

interface Props {
    checked: boolean;
    onChange: () => void;
    label: string;
    customId: string;
}

export const RoundedCheckbox = ({checked, onChange, label, customId}: Props) => {
    const id = `common-checkbox-${customId}`;
    return (
        <Wrapper>
            <CheckboxWrapper>
                <HiddenCheckbox id={id}
                    checked={checked}
                    onChange={onChange}
                />
            </CheckboxWrapper>
            <span>{label}</span>
        </Wrapper>
    );
};

const Wrapper = styled.div`
    width: 109px;
    height: 24px;
    padding: 4px;
    ${flexCenter};
    column-gap: 6px;
    justify-content: flex-start;
    border-radius: 8px;
    background: var(--theme-grey-bg);
    ${regularFont("s")};
    margin-bottom: 12px;
`;

const CheckboxWrapper = styled.div`
    position: relative;
    cursor: pointer;
`;

const HiddenCheckbox = styled.input.attrs({type: "checkbox"})`
    box-sizing: border-box;
    cursor: pointer;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    position: relative;
    appearance: none;
    border: 1px solid transparent !important;
    padding: 0;
    margin: 2px 0 0 0;

    &:after {
        box-sizing: border-box;
        transition: 0.2s ease-in-out;
        content: "";
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border: 1px solid transparent;
        width: 10px;
        height: 10px;
        border-radius: 50%;
    }

    &:checked:after {
        transform: translate(-50%, -50%) scale(1);
        background-color: var(--theme-icon-properties-selected-color);
        border: 1px solid #fff;
    }

    &:checked {
        background: none;
        border: 1px solid #f8fafccc;
    }

    &:not(:checked)::after {
        background: none;
        border: 1px solid #f8fafccc;
    }

    &:disabled {
        cursor: not-allowed;
    }
`;
