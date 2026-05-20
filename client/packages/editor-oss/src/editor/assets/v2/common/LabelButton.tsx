import styled from "styled-components";

import {StyledButton} from "./StyledButton";

export const LabelButton = styled(StyledButton)<{$regular?: boolean}>`
    width: 120px;
    height: 24px;
    font-size: var(--theme-font-size-extra-small);
    ${({$regular}) => $regular && `font-weight: 400;`};
    padding: 4px !important;
    margin-left: auto;

    img {
        width: 16px;
    }

    &:disabled {
        cursor: not-allowed !important;
        opacity: 1;
    }
`;
