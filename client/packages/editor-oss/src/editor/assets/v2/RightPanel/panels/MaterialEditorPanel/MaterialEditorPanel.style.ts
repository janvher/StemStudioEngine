import styled from "styled-components";

import {flexCenter} from "../../../../../../assets/style";

export const Header = styled.div<{$playMode?: boolean}>`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0;
    width: 100%;
    color: #fff;
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    margin-bottom: 12px;

    img {
        cursor: pointer;
    }

    &:before {
        content: "";
        position: absolute;
        bottom: -12px;
        left: -8px;
        right: -8px;
        height: 1px;
        width: calc(100% + 16px);
        background: var(--theme-grey-bg);
    }
`;

export const BackButton = styled.button`
    ${flexCenter};
    gap: 4px;
    cursor: pointer;
    color: #fff;
    span {
        font-weight: var(--theme-font-medium-plus);
    }
    .icon {
        width: 16px;
        height: 16px;
    }
`;
