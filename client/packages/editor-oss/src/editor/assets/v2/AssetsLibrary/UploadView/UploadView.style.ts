import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../assets/style";

export const StyledContainer = styled.div`
    position: relative;
    z-index: 102;
    background-color: var(--theme-container-main-dark);
    width: 492px;
    height: auto;
    border-radius: 16px;
    row-gap: 12px;
    pointer-events: all;

    .wrapper {
        padding: 0 12px 12px;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        row-gap: 12px;
    }
`;

export const Top = styled.div`
    height: 56px;
    width: 100%;
    padding: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--theme-grey-bg);

    .name {
        ${regularFont("s")};
        font-weight: var(--theme-font-medium);
    }

    .nameArrow {
        ${flexCenter};
        column-gap: 4px;
    }
`;

export const OptionContainer = styled.div`
    ${flexCenter};
    gap: 8px;
    padding: 12px;
    width: 100%;
    flex-wrap: wrap;

    .uploadButton {
        width: calc(50% - 4px); // - half of the gap
        min-height: 104px;
        height: auto;
        padding: 8px 0;
        &.single {
            width: 100%;
        }
    }

    .helper {
        font-size: var(--theme-font-size-extra-small);
    }
`;

export const OptionTitle = styled.div`
    font-weight: var(--theme-font-medium-plus);
    font-size: var(--theme-font-size-s);
    line-height: 16px;
    color: var(--theme-font-main-selected-color);
    width: 100%;
    text-align: center;
`;

export const StyledUploadButton = styled.div<{
    $disabled?: boolean;
}>`
    padding: 0 4px;
    background: var(--theme-grey-bg);
    border: none;
    ${flexCenter};
    flex-direction: column;
    row-gap: 8px;
    cursor: pointer;
    color: #fff;
    font-size: 32px;
    border-radius: 8px;
    position: relative;
    pointer-events: all;
    z-index: 1;
    width: 100%;
    height: 108px;
    cursor: pointer;

    ${({$disabled}) =>
        $disabled &&
        `
    pointer-events: none;
     cursor: not-allowed;
     `}
`;

export const Helper = styled.span`
    font-weight: 400;
    font-size: var(--theme-font-size-extra-small);
    line-height: 16px;
    text-align: center;
    color: #a1a1aa;
`;
