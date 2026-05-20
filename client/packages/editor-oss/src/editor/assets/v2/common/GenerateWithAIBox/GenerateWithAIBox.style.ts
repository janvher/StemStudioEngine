import styled from "styled-components";

import {flexCenter} from "../../../../../assets/style";

export const Helper = styled.span`
    font-weight: 400;
    font-size: var(--theme-font-size-extra-small);
    line-height: 16px;
    text-align: center;
    color: var(--theme-font-main-selected-color);
`;

export const UploadButton = styled.div<{
    $disabled?: boolean;
    $grey?: boolean;
}>`
    width: 100%;
    height: 100px;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: linear-gradient(90deg, #8508fb 0%, #ca35a1 78.94%);

    ${flexCenter};
    flex-direction: column;
    row-gap: 8px;
    cursor: pointer;

    color: #fff;
    font-size: 32px;

    position: relative;
    pointer-events: all;
    z-index: 1;

    ${({$disabled}) =>
        $disabled &&
        `
pointer-events: none;
 cursor: not-allowed;
 `}

    button {
        background: #ffffff33;
        &:disabled {
            opacity: 1;
        }
        &:hover {
            background: #ffffff33;
        }
    }

    ${({$grey}) =>
        $grey &&
        `
    height: 108px;
    background: var(--theme-grey-bg);
    `}
`;
