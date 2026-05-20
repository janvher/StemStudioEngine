import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../assets/style";

export const HUDContainer = styled.div<{$bgImg?: string; $isStartMenu?: boolean}>`
    position: fixed;
    z-index: 1000;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100vw;
    height: 100vh;
    background-color: #000000;
    padding: 24px;

    display: flex;
    flex-direction: column;
    row-gap: 13px;

    ${({$bgImg, $isStartMenu}) =>
        $bgImg &&
        `
        background-color: #1d1b1b;
        &::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: url('${$bgImg}');
            background-repeat: no-repeat;
            background-size: cover;
            background-position: center;
            // ${!$isStartMenu ? "opacity: 0.1;" : "opacity: 1;"}
            z-index: -1;
        }
    `}
`;

export const HUDContainerButtonsLayer = styled.div`
    width: 100%;
    flex-grow: 1;
    position: relative;
    max-height: calc(100% - 55px);
    max-width: 100vw;
    min-width: 1024px;
    margin: 0 auto;
    border-radius: 16px;

    display: flex;
    flex-wrap: nowrap;
    column-gap: 11px;
`;

export const Menu = styled.div`
    width: 100%;
    max-width: 100vw;
    margin: 0 auto;
    height: 52px;
    padding: 0 24px;
    background-color: #181818;
    border-radius: 8px;
    ${flexCenter};
    justify-content: space-between;
    flex-shrink: 0;

    .screen-selection-btn {
        ${regularFont("s")};
        color: #5c5c5c;
        font-weight: var(--theme-font-medium);
    }
    .btn-active {
        color: #fff;
    }

    .done-btn {
        ${regularFont("s")};
    }

    .margin-btn {
        margin-right: 12px;
    }

    .options {
        ${flexCenter};
        column-gap: 24px;
    }
`;
