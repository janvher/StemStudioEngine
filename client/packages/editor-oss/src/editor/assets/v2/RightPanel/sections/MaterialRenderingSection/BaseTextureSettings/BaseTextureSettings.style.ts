import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../../assets/style";

export const SettingsLabel = styled.div`
    ${regularFont("s")};
    color: var(--theme-font-unselected-color);
`;

export const FlexContainer = styled.div`
    ${flexCenter};
    flex-direction: column;
    row-gap: 12px;
`;
