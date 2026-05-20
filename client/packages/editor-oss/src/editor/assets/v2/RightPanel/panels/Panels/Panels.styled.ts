import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../assets/style";

export const Wrapper = styled.div<{$expanded: boolean}>`
    width: 100%;
    height: ${({$expanded}) => ($expanded ? "auto" : "40px")};
    min-height: 40px;
`;

export const Row = styled.div`
    ${flexCenter};
    justify-content: space-between;
    cursor: pointer;
    width: 100%;
    height: 40px;
`;

export const RowTitle = styled.div`
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    ${flexCenter};
    column-gap: 4px;
    img {
        height: 20px;
    }
`;

export const ResetBtn = styled.div`
    font-size: 10px;
    font-weight: var(--theme-font-medium-plus);
    ${flexCenter};
    margin: 0 0 0 auto;
    padding: 2px 4px;
    cursor: pointer;

    border-radius: 4px;
    background-color: var(--theme-dialog-button-primary);

    &:hover {
        background-color: var(--theme-dialog-button-primary-hover);
    }
    &:active {
        background-color: var(--theme-dialog-button-primary-active);
    }
`;

export const ExpandButton = styled.button<{$expanded: boolean}>`
    width: 16px;
    height: 16px;
    img {
        width: 8px;
        height: 5px;
        transition: 0.3s;
        ${({$expanded}) => $expanded && `transform: rotate(180deg)`};
    }
`;
