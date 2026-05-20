import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../../assets/style";

export const Row = styled.div<{$stickyTop: number}>`
    ${flexCenter};
    justify-content: space-between;
    cursor: pointer;
    width: 100%;
    height: 40px;
    min-height: 40px;
    max-height: 40px;
    padding: 8px;
    position: sticky;
    overflow: hidden;
    top: ${({$stickyTop}) => $stickyTop}px;
    top: 0;
    z-index: 3;
    background: var(--theme-container-main-dark);

    .rightButtons {
        ${flexCenter};
    }
`;

export const RowTitle = styled.div`
    ${regularFont("s")};
    font-weight: var(--theme-font-medium);
`;

export const ExpandButton = styled.button<{$expanded: boolean}>`
    width: 24px;
    height: 24px;
    ${flexCenter};
    img {
        width: 16px;
        height: 16px;
        transition: 0.3s;
        ${({$expanded}) => $expanded && `transform: rotate(180deg)`};
    }
`;

export const ScrollContainer = styled.div<{$searchActive: boolean}>`
    position: relative;
    height: calc(100% - 56px);
`;
