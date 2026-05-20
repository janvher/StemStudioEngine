import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../../../assets/style";

export const Wrapper = styled.div`
    width: 593px;
    ${flexCenter};
    column-gap: 55px;
    align-items: flex-start;

    .title {
        ${regularFont("s")};
        text-align: left;
    }
    .description {
        ${regularFont("s")};
        text-align: center;
    }
    .combobox {
        width: 269px;
        height: 36px;
        border-radius: 6px;
        .combobox-input {
            height: 36px;
            border-radius: 6px;
            background-color: var(--theme-container-secondary-dark);
            font-size: var(--theme-font-size-s);
            font-weight: var(--theme-font-regular);
            color: #fff;
        }
        .combobox-button {
            height: 36px;
        }
        .combobox-options-wrapper {
            top: 32px;
            border-bottom-left-radius: 6px;
            border-bottom-right-radius: 6px;
        }
    }
`;

export const Column = styled.div`
    width: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    row-gap: 16px;
`;

export const FieldWrapper = styled.div<{disabled: boolean}>`
    ${({disabled}) =>
        disabled &&
        `
    opacity: 0.5;
    `}
    label {
        display: block;
        ${regularFont("s")};
        margin-left: 14px;
        margin-bottom: 5px;
    }
`;
