import styled from "styled-components";

import {flexCenter} from "../../../../../../assets/style";
import {PANEL_FULL_HEIGHT} from "@stem/editor-oss/types/editor";

export const ACTIVE_SEARCH_HEIGHT = "132px";
export const INACTIVE_SEARCH_HEIGHT = "56px";

export const Container = styled.div<{$maxHeight?: string}>`
    display: flex;
    flex-direction: column;
    padding: 0px;
    width: 100%;
    box-sizing: border-box;
    height: calc(${PANEL_FULL_HEIGHT} - 56px - 48px); // - library button - object/assets selection
    ${({$maxHeight}) => $maxHeight && `max-height: ${$maxHeight}`};

    button,
    div,
    span,
    input {
        box-sizing: border-box;
    }

    .assets-list {
        display: grid;
        grid-template-columns: 1fr 1fr;
        align-items: flex-start;
        justify-content: center;
        row-gap: 8px;
        column-gap: 8px;
        width: 100%;
        padding: 0 6px 8px;
    }

    .assets-list > div:nth-child(even) {
        margin-right: auto;
    }

    .assets-list > div:nth-child(odd) {
        margin-left: auto;
    }

    .assets-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: center;
        justify-content: center;
        width: fit-content;
        color: var(--theme-font-input-color);
        font-size: var(--theme-font-size-s);
        font-weight: var(--theme-font-regular);
        position: relative;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        &:hover {
            .assets-item-name {
                color: var(--theme-font-selected-color);
            }

            .icon-thumbnail {
                filter: brightness(2);
            }
            .revisionIcon {
                height: 15px;
            }
        }
    }

    .assets-item .thumbnail-placeholder {
        width: 108px;
        height: 108px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--theme-grey-bg);

        .image-thumbnail {
            border-radius: 8px;
            width: 108px;
            height: 108px;
        }
    }

    .assets-item .assets-item-name {
        display: inline-block;
        max-width: 108px;
        text-align: center;
        word-break: break-word;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2; /* number of lines to show */
        line-clamp: 2;
        -webkit-box-orient: vertical;
        color: var(--theme-font-unselected-color);
        font-size: var(--theme-font-size-extra-small);
    }

    .assets-list .assets-item .delete-button {
        width: 22px;
        height: 22px;
    }

    .assets-list .assets-item:hover {
        color: white;
    }

    .assets-item .sound-image-wrapper,
    .assets-item > img {
        border-radius: 8px;
        width: 108px;
        height: 108px;
    }

    .assets-item .select-border {
        border-radius: 8px;
        width: 81px;
        height: 81px;
        border: 3px solid var(--theme-border-selected);
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        display: none;
    }

    .assets-item .assets-item-menu {
        display: none;
        position: absolute;
        top: 82px;
        right: 6px;
        z-index: 10;
        background-color: #2a2e42;
        box-sizing: border-box;
        font-size: var(--theme-font-size-s);
        padding: 3px 6px;
        border-radius: 4px;
        height: 20px;
    }

    .assets-item:hover .assets-item-menu {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
    }

    .assets-item .assets-item-menu img {
        cursor: pointer;
    }
`;

export const StyledSoundImageWrapper = styled.div<{$isPlaying: boolean}>`
    background: var(--theme-editor-box-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease-in-out;

    &:hover svg path {
        fill: #fff;
    }
    svg path {
        ${props => props.$isPlaying && "fill: var(--theme-container-main-blue) !important"};
    }
`;

export const TabsContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 7px;
    padding: 12px 8px;
    border-bottom: 1px solid var(--theme-container-divider);
`;

export const TabIconWrapper = styled.div`
    position: relative;

    &.disabled {
        display: none;
    }

    &:hover .tab-tooltip {
        display: flex;
        align-items: center;
        justify-content: center;
    }
`;

export const TabIconButton = styled.div<{$isActive: boolean}>`
    width: 32px;
    height: 32px;
    ${flexCenter};
    border-top: 1px solid transparent;
    transition: all 0.2s;
    border-radius: 8px;
    cursor: pointer;
    background: var(--theme-container-divider);

    &:hover {
        background-color: var(--theme-container-main-blue);
        img {
            filter: brightness(2);
        }
    }

    ${({$isActive}) =>
        $isActive &&
        `
    background-color: var(--theme-container-main-blue);
    img {
      filter: brightness(2);
    }
  `}
`;

export const TopContainer = styled.div<{$searchActive: boolean}>`
    ${flexCenter};
    flex-direction: column;
    row-gap: 8px;
    width: 100%;
    padding: 12px 8px;
    border-bottom: 1px solid var(--theme-container-divider);
    height: ${({$searchActive}) => ($searchActive ? "132px" : "56px")};
`;

export const TitleContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px;
    font-weight: var(--theme-font-bold);
    font-size: var(--theme-font-size-s);
    color: white;
    height: 48px;
`;

export const TabTooltip = styled.div`
    display: none;
    position: absolute;
    text-align: center;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    min-width: 84px;
    padding: 0 6px;
    height: 17px;
    border-radius: 6px;
    box-shadow: 0px 4px 15px 0px #000;
    background-color: var(--theme-container-secondary-dark);
    box-sizing: border-box;
    font-size: var(--theme-font-size-s);
    z-index: 10;
`;

export const TabContent = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
`;

export const UploadAssetsButton = styled.img`
    position: absolute;
    top: 2px;
    right: 0;
    cursor: pointer;
`;

export const Wrapper = styled.div`
    ${flexCenter};
    gap: 8px;
`;

export const EmptyState = styled.div`
    padding: 0 12px 12px;
    color: rgba(255, 255, 255, 0.5);
    text-align: center;
    font-size: var(--theme-font-size-s);
`;
