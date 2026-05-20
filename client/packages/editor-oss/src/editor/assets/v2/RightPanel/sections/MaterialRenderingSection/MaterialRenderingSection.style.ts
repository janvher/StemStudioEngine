import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../assets/style";

export const TexturesFlexContainer = styled.div`
    ${flexCenter};
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 8px 2px;
`;

export const TextureWrapper = styled.div`
    ${flexCenter};
    flex-direction: column;
    row-gap: 4px;
    width: 72px;
    position: relative;
    overflow: visible;
`;

export const Preview = styled.div<{$active?: boolean}>`
    position: relative;
    width: 67px;
    height: 67px;
    border-radius: 8px;
    background: var(--theme-grey-bg);
    ${flexCenter};
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    border-color: ${({$active}) => !$active ? "transparent" : "#fff"};
`;

export const TextureLabel = styled.div`
    ${regularFont("s")};
    color: var(--theme-font-unselected-tertiary-color);
    font-size: 10px;
    white-space: nowrap;
`;

export const UploadView = styled.div`
    ${flexCenter};
    flex-direction: column;
    row-gap: 4px;

    .text {
        ${regularFont("s")};
        color: #fff;
    }

    img {
        width: 14px;
    }
`;

export const DeleteButton = styled.button`
    padding: 0;
    margin: 0;
    border: none;
    cursor: pointer;

    width: 20px;
    height: 19px;
    ${flexCenter};
    background: #2a2e42;
    border-radius: 4px;

    img {
        width: 11px;
    }
`;

export const PreviewActions = styled.div`
    position: absolute;
    right: 6px;
    bottom: 6px;
    display: flex;
    gap: 4px;
`;

export const PreviewActionButton = styled.button`
    padding: 0;
    margin: 0;
    border: none;
    cursor: pointer;

    width: 20px;
    height: 19px;
    ${flexCenter};
    background: #2a2e42;
    border-radius: 4px;

    img {
        width: 11px;
        height: 11px;
        filter: brightness(0) invert(1);
    }
`;

export const TexturePickerPopup = styled.div`
    position: absolute;
    left: 0;
    top: 72px;
    width: min(350px, calc(100vw - 50px));
    max-height: 178px;
    padding: 8px;
    border-radius: 8px;
    background: #1a1d30;
    border: 1px solid #2a2e42;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
    z-index: 30;
    overflow-y: auto;
`;

export const TexturePickerGrid = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const TexturePickerFilters = styled.div`
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
`;

export const TexturePickerFilterButton = styled.button<{$active?: boolean}>`
    border: 1px solid ${({$active}) => $active ? "#ffffff" : "#353952"};
    background: ${({$active}) => $active ? "#2a2e42" : "#1e2235"};
    color: #fff;
    border-radius: 6px;
    height: 22px;
    padding: 0 8px;
    cursor: pointer;
    ${regularFont("s")};
    font-size: 10px;
    white-space: nowrap;
`;

export const TexturePickerItem = styled.button<{$selected?: boolean}>`
    border: ${({$selected}) => $selected ? "2px solid #fff" : "1px solid #353952"};
    border-radius: 6px;
    background: #1e2235;
    padding: 0;
    width: 100%;
    height: 50px;
    overflow: hidden;
    cursor: pointer;
    ${flexCenter};
`;

export const TexturePickerEmpty = styled.div`
    ${regularFont("s")};
    color: var(--theme-font-unselected-tertiary-color);
    font-size: 11px;
`;
