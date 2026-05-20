 
 
import styled from "styled-components";

import {flexCenter} from "../../../../../assets/style";

export const StyledSceneList = styled.div`
    width: 100%;
    display: grid;
    /* Cap at 4 columns — 5 made the per-card width narrow enough that the
       three action buttons (Edit / Remix / Play) ellipsised their labels. */
    grid-template-columns: repeat(4, minmax(0, 1fr));
    align-items: start;
    gap: 8px;
    padding: 4px 0;

    @media only screen and (max-width: 1280px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
    }

    @media only screen and (max-width: 480px) {
        grid-template-columns: 1fr;
    }
`;

export const ListItem = styled.div<{$defaultCursor?: boolean}>`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 3px;
    align-items: stretch;
    color: #e9e9e9;
    font-family: "Lexend", sans-serif;
    cursor: pointer;
    transition: transform 0.2s ease, opacity 0.2s ease;

    &:not(:disabled):hover {
        transform: translateY(-1px);
    }

    /* Title row gets horizontal padding in Discover cards */
    > div:first-child {
        padding-left: 8px;
        padding-right: 8px;
    }

    ${({$defaultCursor}) => $defaultCursor && `
        opacity: 0.55;
        cursor: auto;
    `};
`;

export const Options = styled.button<{$active: boolean}>`
    width: 32px;
    height: 32px;
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
    border-radius: 8px;

    img {
        width: 16px;
        height: 16px;
    }

    &:hover {
        background: var(--theme-grey-bg-secondary);
    }
    ${({$active}) =>
        $active &&
        `
    background: var(--theme-grey-bg-secondary-button) !important;
    `}
`;

export const StyledSceneMenu = styled.div<{open: boolean; $left: boolean}>`
    display: none;
    position: absolute;
    bottom: -10px;
    ${({$left}) => ($left ? "left: 0; transform: translateX(-100%);" : "right: 0; transform: translateX(100%);")}
    z-index: 10000;
    text-align: left;
    width: 160px;
    padding: 4px;
    border-radius: 8px;
    box-shadow: 0px 4px 15px 0px #000;
    background: var(--theme-grey-bg);
    box-sizing: border-box;
    font-size: var(--theme-font-size-s);
    color: var(--theme-font-unselected-secondary-color);
    border: 1px solid var(--theme-grey-bg);

    .option {
        transition: 0.3s ease-in-out;
        width: 100%;
        height: 32px;
        line-height: 16px;
        padding: 8px;
        border-radius: 4px;
    }

    ${({open}) =>
        open &&
        `
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 10;
    .option:hover {background: var(--theme-grey-bg-secondary);}
`}
`;

export const SceneVisibilityBadge = styled.div`
    position: absolute;
    top: 10px;
    left: 10px;
    width: 34px;
    height: 34px;
    border-radius: 999px;
    background: rgba(8, 11, 21, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    backdrop-filter: blur(8px);

    img {
        width: 18px;
        height: 18px;
        border-radius: 0;
        aspect-ratio: 1;
    }
`;

export const EditedText = styled.div`
    font-size: 12px;
    font-weight: 400;
    color: #b2b2b9;
    line-height: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
`;
