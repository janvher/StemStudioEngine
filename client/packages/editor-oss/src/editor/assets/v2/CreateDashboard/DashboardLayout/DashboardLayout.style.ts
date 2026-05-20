import styled from "styled-components";

import {DASHBOARD_HEADER, MOBILE_DASHBOARD_BREAKPOINT} from "./DashboardHeader/DashboardHeader.style";
import bgImage from "../../../../../v2/pages/LoginPage/images/main-background-image.png";

export const Container = styled.div<{$homepage: boolean}>`
    width: 100vw;
    min-height: 100vh;
    min-height: -webkit-fill-available;
    height: 100vh;
    height: 100dvh;
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background: var(--theme-dashboard-bg);

    ${({$homepage}) =>
        $homepage &&
        `
    background-image: url("${bgImage}");
    background-repeat: no-repeat;
    background-size: cover;
    background-position: center;

    &::after {
        content: "";
        position: absolute;
        inset: 0;
        background: var(--theme-overlay-black-20);
        pointer-events: none;
        z-index: 0;
    }

    & > * {
        position: relative;
        z-index: 1;
    }
    `}

    z-index: 999;
`;

export const FlexContainer = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    flex-wrap: nowrap;
    position: relative;
`;

export const MainColumn = styled.div`
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
`;
export const HomepageContainer = styled.div`
    width: 100%;
    height: calc(100% - ${DASHBOARD_HEADER});
    min-height: 0;
    display: flex;
    justify-content: flex-start;
    flex-direction: column;
    padding-bottom: 0;
    box-sizing: border-box;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;

    @media only screen and (max-width: 480px) {
        height: calc(100% - 64px);
    }

    @media only screen and (orientation: landscape) and (max-height: 500px) {
        padding-bottom: 0;
    }
`;

export const RightSideContainer = styled.div`
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    transition: all 0.4s;
    overflow-y: auto;

    > #footer {
        flex-shrink: 0;
        margin-top: auto;
        align-self: stretch;
    }
`;

export const MobileNavBackdrop = styled.button`
    display: none;

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        display: block;
        position: fixed;
        inset: 0;
        border: none;
        background: rgba(4, 8, 18, 0.58);
        z-index: 1000;
        cursor: pointer;
    }
`;

export const NoData = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: var(--theme-font-regular);
    font-size: var(--theme-font-size-s);
    color: white;
    height: calc(100% - 64px - 64px);
`;
