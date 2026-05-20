import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../assets/style";

export const Item = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px;
    width: 100%;
    height: 32px;
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    color: #fff;
    background: transparent;
    cursor: pointer;
    position: relative;
    border-radius: 8px;
    pointer-events: all;
    &:hover {
        background: #262626;
        .icon {
            display: inline-block;
        }
    }
`;

export const Name = styled.span`
    ${regularFont("s")};
    color: var(--theme-font-unselected-color)};
`;

export const IconsWrapper = styled.div`
    ${flexCenter};
    .icon {
        display: none;
        pointer-events: all;
    }
`;
