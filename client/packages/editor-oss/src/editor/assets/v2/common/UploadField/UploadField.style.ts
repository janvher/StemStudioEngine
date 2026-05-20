import styled from "styled-components";

import {flexCenter} from "../../../../../assets/style";

export const CloseIconWrapper = styled.div`
    position: absolute;
    top: 6px;
    right: 6px;
    width: 14px;
    height: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
`;

export const StyledUploadButtonV2 = styled.div<{$disabled?: boolean}>`
    padding: 0 6px;
    background: var(--theme-grey-bg);
    width: 117px;
    height: 24px;
    border-radius: 8px;
    ${flexCenter};
    justify-content: space-between;
    cursor: pointer;
    .plus,
    .fileName {
        font-size: 12px;
        color: var(--theme-font-unselected-tertiary-color);
    }
`;

export const StyledUploadButton = styled.div<{
    $bgImage?: string;
    $disabled?: boolean;
    width: string;
    height: string;
}>`
    padding: 0;
    background: #232323;
    border: none;
    ${flexCenter};
    cursor: pointer;
    color: #fff;
    font-size: 32px;
    border-radius: 8px;
    position: relative;
    pointer-events: all;
    z-index: 1;
    width: ${({width}) => width};
    height: ${({height}) => height};
    cursor: pointer;

    ${({$bgImage}) =>
        $bgImage &&
        `
        background-image: url('${$bgImage}');
        background-repeat: no-repeat;
        background-size: cover;
        background-position: center;
    
    `}

    ${({$disabled}) =>
        $disabled &&
        `
    pointer-events: none;
     cursor: not-allowed;
     `}
`;
