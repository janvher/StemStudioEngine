/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-base-to-string */
import styled from "styled-components";

import {flexCenter, regularFont, safeText} from "../../../../../../assets/style";

export const StyledSceneList = styled.div`
    width: 100%;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    align-items: start;
    justify-content: start;
    grid-gap: 20px;
    padding: 20px;
    max-width: 100%;

    @media only screen and (max-width: 1279px) {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    @media only screen and (max-width: 1023px) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    @media only screen and (max-width: 767px) {
        grid-template-columns: repeat(1, minmax(0, 1fr));
    }
`;

export const ListItem = styled.div<{$defaultCursor?: boolean}>`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    justify-content: center;
    font-size: ${regularFont("s")};
    color: #fff;
    position: relative;
    cursor: pointer;
    margin: 0 auto;
    &:hover {
        color: white;
    }
    img,
    .selectedBorder {
        border-radius: 16px;
        width: 100%;
        aspect-ratio: 16 / 9;
    }

    ${({$defaultCursor}) => $defaultCursor && `cursor: auto;`};
`;

export const SceneDetailsWrapper = styled.div<{$flex?: boolean}>`
    width: 100%;
    position: relative;
    ${({$flex}) =>
        $flex &&
        `
    ${flexCenter};
    justify-content: flex-start;
    column-gap: 8px;
    `}

    .textContainer {
        flex-grow: 1;
        padding-right: 28px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
    }
`;

export const SceneName = styled.span`
    text-align: left !important;
    font-size: var(--theme-font-size-s);
    line-height: 16px;
    font-weight: var(--theme-font-medium);
    ${safeText};
`;

export const SecondaryText = styled.div`
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    color: var(--theme-font-unselected-color);
    line-height: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
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

export const SceneImage = styled.div<{$bgImage?: string}>`
    position: relative;
    border-radius: 16px;
    width: 100%;
    aspect-ratio: 16 / 9;
    background-color: var(--theme-grey-bg);
    ${flexCenter};
    .default-img {
        width: 40%;
        max-width: 104px;
    }

    ${({$bgImage}) =>
        $bgImage &&
        `
                background-image: url('${$bgImage}');
                background-repeat: no-repeat;
                background-size: cover;
                background-position: center;

              `}
`;
export const SceneNameContainer = styled.div<{$infoCardItem?: boolean}>`
    flex-grow: 1;
    max-width: 100%;

    ${({$infoCardItem}) =>
        !$infoCardItem
            ? `
            ${flexCenter};
            justify-content: space-between;
    `
            : `       
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `}

    .name {
        padding-right: 2px;
    }
`;
