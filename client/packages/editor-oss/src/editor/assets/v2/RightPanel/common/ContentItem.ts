import styled from "styled-components";

import {flexCenter} from "../../../../../assets/style";

export const ContentItem = styled.div<{
    $flexDirection?: string;
    $justifyContent?: string;
    $alignItems?: string;
    $rowGap?: string;
    $columnGap?: string;
    $padding?: string;
}>`
    ${flexCenter};
    flex-direction: column;
    align-items: flex-start;
    ${({$flexDirection}) => $flexDirection && `flex-direction: ${$flexDirection};`};
    ${({$justifyContent}) => $justifyContent && `justify-content: ${$justifyContent};`};
    ${({$alignItems}) => $alignItems && `align-items: ${$alignItems};`};
    ${({$rowGap}) => $rowGap && `row-gap: ${$rowGap};`};
    ${({$columnGap}) => $columnGap && `column-gap: ${$columnGap};`};
    ${({$padding}) => $padding && `padding: ${$padding};`};
    width: 100%;
`;
