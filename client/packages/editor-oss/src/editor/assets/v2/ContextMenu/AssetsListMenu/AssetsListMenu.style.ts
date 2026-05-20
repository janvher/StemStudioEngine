import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../assets/style";

export const Wrapper = styled.div<{$oldVersion?: boolean}>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 16px;
    height: 480px;
    width: 320px;
    padding: 8px;

    ${({$oldVersion}) =>
        $oldVersion &&
        `
        width: auto;
    height: 270px;
    `}
`;

export const Header = styled.div`
    ${flexCenter};
    flex-wrap: nowrap;
    column-gap: 8px;
    width: 100%;
`;

export const AssetsGrid = styled.div`
    display: grid;
    width: 100%;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: start;
    justify-content: start;
    grid-gap: 8px;
`;

export const SingleAsset = styled.div`
    background: var(--theme-container-milky);
    width: 100%;
    height: 100%;
    border-radius: 16px;
    // padding: 8px;
    cursor: pointer;
    aspect-ratio: 1/1;
    ${flexCenter};

    .thumbnail {
        border-radius: 16px;
        width: 100%;
        height: 100%;
        overflow-clip-margin: content-box;
        overflow: clip;
    }

    .primitive {
        width: 65%;
        height: 65%;
        filter: brightness(4);
    }
`;

export const Filters = styled.div`
    width: 100%;
    height: 32px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-wrap: nowrap;
    column-gap: 8px;
`;
export const FilterButton = styled.div<{$active: boolean}>`
    width: 96px;
    height: 32px;
    background: ${({$active}) => $active ? "#fafafa" : "var(--theme-container-milky)"};
    border-radius: 16px;
    ${regularFont("s")};
    color: ${({$active}) => !$active ? "var(--theme-font-main-selected-color)" : "#27272A"};
    font-weight: var(--theme-font-medium-plus);
    ${flexCenter};
    cursor: pointer;
`;
