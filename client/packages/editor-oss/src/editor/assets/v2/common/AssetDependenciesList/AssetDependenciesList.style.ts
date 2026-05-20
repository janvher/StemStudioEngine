import styled from "styled-components";

import {flexCenter} from "../../../../../assets/style";

export const DependencyCard = styled.div`
    width: 100%;
    padding: 4px;
    border-radius: 4px;
    background: var(--theme-grey-bg);
`;

export const FlexWrapper = styled.div`
    width: 100%;
    ${flexCenter};
    column-gap: 8px;
`;

export const ImageContainer = styled.div<{$defaultIcon: boolean}>`
    flex-shrink: 0;
    width: 64px;
    aspect-ratio: 1 / 1;
    background: #6c6c6c;
    ${flexCenter};

    img {
        width: ${({$defaultIcon}) => $defaultIcon ? "40%" : "100%"};
        ${({$defaultIcon}) => $defaultIcon && `filter: brightness(2);`};
    }
`;
