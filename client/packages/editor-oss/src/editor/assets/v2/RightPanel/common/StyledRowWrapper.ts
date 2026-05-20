import styled from "styled-components";

import {flexCenter} from "../../../../../assets/style";

export const StyledRowWrapper = styled.div<{$margin?: string; $isColumn?: boolean; $color?: string}>`
    ${flexCenter};
    justify-content: space-between;
    width: 100%;
    margin-bottom: 12px;
    column-gap: 12px;
    ${({$isColumn}) => $isColumn && `flex-direction: column; gap: 8px; align-items: flex-start;`};
    ${({$margin}) => $margin && `margin: ${$margin}`};
    .text {
        font-size: var(--theme-font-size-s);
        font-weight: var(--theme-font-regular);
        color: var(--theme-font-unselected-color);
        line-height: 120%;
        text-align: left;
    }
    ${({$color}) =>
        $color &&
        `input {
            color: ${$color};
        }
    `};
`;

export const FlexCenterWrapper = styled.div`
    ${flexCenter};
    column-gap: 4px;
`;
