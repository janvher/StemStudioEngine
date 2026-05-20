import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../assets/style";

export const NavContainer = styled.div`
    ${flexCenter};
    justify-content: flex-start;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    width: 100%;
    max-width: 840px;
    margin: 0 auto;
    gap: 4px;
`;

export const SingleTab = styled.div<{$active: boolean}>`
    position: relative;
    padding: 14px 16px;
    cursor: ${({$active}) => $active ? "default" : "pointer"};

    font-size: var(--theme-font-size-base);
    font-weight: 500;
    line-height: 100%;
    color: ${({$active}) => $active ? "#fff" : "var(--theme-font-secondary)"};

    ${({$active}) =>
        $active &&
        `
    &:after {
        content: "";
        display: block;
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--theme-container-main-blue-border);
        height: 2px;
        width: 100%;
    }
    `}
`;
