import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../assets/style";

export const Wrapper = styled.div`
    ${flexCenter};
    justify-content: space-between;
    height: 39px;
    .recentSearchesLabel,
    .clearHistoryLabel {
        ${regularFont("s")};
        font-weight: var(--theme-font-medium);
    }

    .clearHistoryLabel {
        color: var(--theme-font-unselected-color);
        padding: 12px 8px;
        cursor: pointer;
    }
`;

export const Side = styled.div`
    ${flexCenter};
    column-gap: 12px;
`;
