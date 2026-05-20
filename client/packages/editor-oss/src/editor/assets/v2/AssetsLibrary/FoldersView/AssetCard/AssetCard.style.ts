import styled from "styled-components";

import {flexCenter, safeTextByLines} from "../../../../../../assets/style";

export const StyledCard = styled.div<{$selected: boolean; $isHidden?: boolean}>`
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: minmax(68px, 1fr) auto auto;
    width: 100%;
    aspect-ratio: 108 / 128;
    background: var(--theme-grey-bg);
    border-radius: 8px;
    border: ${({$selected, $isHidden}) =>
        $selected
            ? "2px solid var(--theme-container-active-blue-secondary)"
            : $isHidden
              ? "2px solid #b33"
              : "2px solid transparent"};
    padding: 0 8px;

    .thumbnail {
        height: 80%;
        aspect-ratio: 1/1;
        margin: 0 auto;
        border-radius: 4px;
    }
    .assetIcon {
        height: 88%;
        max-width: 40%;
        margin: 0 auto;
    }
`;
export const AssetName = styled.div`
    width: 100%;
    height: 24px;
    flex-shrink: 0;
    ${flexCenter};
    color: var(--theme-font-unselected-tertiary-color);
    font-size: var(--theme-font-size-s);
    text-align: left;
    .text {
        ${safeTextByLines(2)};
        max-width: 92px;
    }
`;

export const Bottom = styled.div`
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 32px;
    flex-shrink: 0;
    gap: 4px;
`;

export const DefaultImageWrapper = styled.div`
    position: relative;
    width: 100%;
    flex-shrink: 0;
    flex-grow: 0;
    ${flexCenter};

    svg {
        width: 100%;
        aspect-ratio: 1/1;
        margin: 0 auto;
    }
`;

export const SelectBox = styled.div<{$selected: boolean}>`
    position: absolute;
    top: 6px;
    left: 0;
    width: 14px;
    height: 14px;

    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: ${({$selected}) =>
        $selected ? "var(--theme-container-active-blue-secondary)" : "var(--theme-font-unselected-tertiary-color)"};
`;
