import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../../../assets/style";

export const Top = styled.div`
    padding: 8px;
    min-width: 160px;
    ${flexCenter};
    justify-content: flex-start;
    border-bottom: 1px solid var(--theme-container-milky);
    button {
        width: 24px;
        height: 24px;
    }
`;
export const Bottom = styled.div`
    padding: 8px;
    ${flexCenter};
    flex-direction: column;
    row-gap: 8px;
    width: 100%;
`;

export const Section = styled.div`
    ${flexCenter};
    align-items: flex-start;
    flex-direction: column;
    row-gap: 4px;
    width: 100%;

    .title {
        ${regularFont("s")};
        font-weight: var(--theme-font-medium-plus);
    }
`;

export const OptionButton = styled.button<{$selected: boolean}>`
    ${flexCenter};
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    width: 100%;
    height: 32px;
    border-radius: 16px;

    ${({$selected}) =>
        $selected
            ? `
            color: var(--theme-grey-bg);
            background-color: var(--theme-font-main-selected-color) !important;
            `
            : `
            color: var(--theme-font-main-selected-color);
            background-color: var(--theme-container-milky) !important;
            `}
`;
