import styled, {css} from "styled-components";

import {flexCenter} from "../../../../assets/style";
import {MOBILE_DASHBOARD_BREAKPOINT} from "../CreateDashboard/DashboardLayout/DashboardHeader/DashboardHeader.style";

const activeRowStyles = css`
    background: var(--theme-font-main-selected-color);
    color: var(--theme-dialog-bg);

    .publishedIcon {
        filter: brightness(0);
    }
`;

export const ModalOverlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 99998;
    padding: 24px;
    background: rgb(0 0 0 / 70%);
    backdrop-filter: blur(1px);
    ${flexCenter};
    overscroll-behavior: contain;

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        padding: 0;
        align-items: stretch;
    }

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) and (orientation: landscape) {
        padding: 16px;
        align-items: center;
    }
`;

export const Popup = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    flex-direction: column;
    row-gap: 16px;
    box-sizing: border-box;
    overflow: hidden;

    width: 742px;
    height: min(740px, calc(100dvh - 48px));
    max-width: 100vw;
    max-height: 100vh;
    padding: 16px;

    border-radius: var(--theme-dialog-border-radius);
    border: none;
    background: var(--theme-dialog-bg);
    box-shadow: var(--theme-dialog-shadow);

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        width: 100dvw;
        max-width: 100dvw;
        min-height: 100dvh;
        height: 100dvh;
        max-height: 100dvh;
        padding: 16px 16px calc(16px + env(safe-area-inset-bottom, 0px));
        border-radius: 0;
    }

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) and (orientation: landscape) {
        width: min(900px, calc(100dvw - 32px));
        min-height: unset;
        height: calc(100dvh - 32px);
        max-height: calc(100dvh - 32px);
        border-radius: var(--theme-dialog-border-radius);
    }
`;

export const Header = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;

    font-size: var(--theme-font-size-2xl);
    font-weight: var(--theme-font-bold);
    color: var(--theme-font-main-selected-color);

    .closeBtn,
    .closeBtn img {
        width: 16px;
        height: 16px;
    }

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        position: sticky;
        top: 0;
        z-index: 1;
        padding-top: env(safe-area-inset-top, 0px);
        background: var(--theme-dialog-bg);
    }
`;

export const SecondaryHeader = styled.div`
    font-size: var(--theme-font-size-s);
    color: var(--theme-font-unselected-color);
`;

export const SceneData = styled.div`
    flex-grow: 1;
    display: flex;
    width: 100%;
    min-height: 0;
    overflow-y: auto;
    border-bottom: 2px solid var(--theme-font-main-selected-color);
`;

export const ModalFooter = styled.div`
    ${flexCenter};
    column-gap: 16px;
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-end;
    flex-shrink: 0;
    padding-top: 4px;

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        flex-direction: column-reverse;
        align-items: stretch;
        row-gap: 8px;
    }
`;

export const TableContainer = styled.div`
    flex: 1;
    width: 100%;
    overflow: visible;
    color: var(--theme-font-main-selected-color);
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    flex-direction: column;
    row-gap: 12px;
`;

export const TableHeader = styled.div`
    width: 100%;
    display: flex;
    padding: 12px 16px;
    font-weight: var(--theme-font-medium-plus);
    font-size: var(--theme-font-size-l);
    border-bottom: 2px solid var(--theme-font-main-selected-color);
    margin-bottom: 4px;

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        display: none;
    }
`;

export const TableRow = styled.div<{$active?: boolean}>`
    width: 100%;
    display: flex;
    align-items: center;
    padding: 8px 16px;
    cursor: pointer;
    font-size: var(--theme-font-size-l);
    ${({$active}) => $active && activeRowStyles};

    &:hover {
        ${activeRowStyles};
    }

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        padding: 14px 16px;
        border: 1px solid rgb(255 255 255 / 8%);
        border-radius: 12px;
        background: rgb(255 255 255 / 3%);
    }
`;

export const Cell = styled.div<{$flex: number}>`
    flex: ${({$flex}) => $flex || 1};
    display: flex;
    align-items: center;
    column-gap: 8px;

    .publishedIcon {
        margin-left: 8px;
    }
    .infoIcon-tooltip {
        filter: brightness(2);
    }

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        width: 100%;
        justify-content: space-between;
        flex: none;
        font-size: var(--theme-font-size-m);

        &::before {
            content: attr(data-label);
            color: var(--theme-font-unselected-color);
            font-size: var(--theme-font-size-s);
            font-weight: var(--theme-font-medium-plus);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
    }
`;

export const EmptyState = styled.div`
    ${flexCenter};
    flex-direction: column;
    row-gap: 12px;
    width: 100%;
    min-height: 280px;
    padding: 32px 16px;
    text-align: center;
    color: var(--theme-font-unselected-color);
    font-size: var(--theme-font-size-m);
`;

export const EmptyStateTitle = styled.div`
    color: var(--theme-font-main-selected-color);
    font-size: var(--theme-font-size-l);
    font-weight: var(--theme-font-medium-plus);
`;

export const EmptyStateBody = styled.div`
    max-width: 360px;
    line-height: 1.5;
`;
