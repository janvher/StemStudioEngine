import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../assets/style";

export const StyledFrazeButton = styled.button`
    border: none;
    cursor: pointer;
    background: var(--theme-homepage-grey-bg-primary);
    border-radius: 8px;
    ${flexCenter}
    column-gap: 4px;
    padding: 8px 12px 8px 8px;
    .text {
        ${regularFont("s")};
        font-weight: var(--theme-font-medium);
    }
`;
