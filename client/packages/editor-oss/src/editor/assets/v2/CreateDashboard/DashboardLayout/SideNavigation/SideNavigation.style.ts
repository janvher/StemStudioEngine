import styled, {css} from "styled-components";

import {flexCenter} from "../../../../../../assets/style";
import {MOBILE_DASHBOARD_BREAKPOINT} from "../DashboardHeader/DashboardHeader.style";

export const PADDING_BOTTOM = "40px";
export const SIDEBAR_WIDTH = "200px";

const activeItemCss = css`
    color: var(--theme-orange, #f97316);
    font-weight: 600;
    /* Deep purple chip — sits clearly on top of the navy page bg, matches
       the design reference (Screenshot 2026-04-27 at 4.37.27 PM). */
    background: linear-gradient(180deg, rgba(76, 45, 144, 0.55) 0%, rgba(45, 27, 78, 0.55) 100%);
    box-shadow: inset 0 0 0 1px rgba(139, 92, 246, 0.18);

    .icon-chip {
        background: rgba(249, 115, 22, 0.14);
    }

    .icon {
        color: var(--theme-orange, #f97316);
    }
`;

export const Nav = styled.nav<{$mobileOpen?: boolean}>`
    position: relative;
    width: ${SIDEBAR_WIDTH};
    min-height: 100vh;
    flex-shrink: 0;
    background: transparent;

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        position: fixed;
        top: 0;
        left: 0;
        width: 248px;
        height: 100dvh;
        min-height: 100dvh;
        z-index: 1002;
        background: #141728;
        transform: translateX(${({$mobileOpen}) => ($mobileOpen ? "0" : "-100%")});
        transition: transform 0.24s ease;
        box-shadow: 18px 0 48px rgba(0, 0, 0, 0.35);
    }
`;

export const NavLogo = styled.div`
    display: flex;
    align-items: center;
    padding: 20px 20px 12px;
    cursor: pointer;

    img {
        height: 44px;
        width: auto;
    }

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        padding-top: 24px;
    }
`;

export const ListWrapper = styled.div`
    width: 100%;
    min-height: calc(100vh - 90px);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    row-gap: 24px;
    padding: 8px 12px 16px;
    box-sizing: border-box;

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        min-height: 0;
        height: 100%;
        padding-top: 16px;
    }
`;

export const BottomGroup = styled.div`
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 16px;
    width: 100%;
`;

export const AdminPill = styled.button<{$active?: boolean}>`
    all: unset;
    box-sizing: border-box;
    width: 100%;
    min-height: 48px;
    padding: 6px 10px;
    display: inline-flex;
    align-items: center;
    column-gap: 10px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(248, 250, 252, 0.85);
    font-family: "Lexend", sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;

    &:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.14);
        color: #ffffff;
    }

    ${({$active}) =>
        $active &&
        `
        color: var(--theme-orange, #f97316);
        background: linear-gradient(180deg, rgba(76, 45, 144, 0.55) 0%, rgba(45, 27, 78, 0.55) 100%);
        border-color: rgba(139, 92, 246, 0.28);
    `};
`;

export const AdminPillLabel = styled.span`
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const Socials = styled.div`
    ${flexCenter};
    column-gap: 16px;
    padding: 0 4px 4px;
    justify-content: flex-start;
    flex-shrink: 0;
    width: 100%;
    box-sizing: border-box;

    a {
        opacity: 0.5;
        transition: opacity 0.2s ease;

        &:hover {
            opacity: 1;
        }
    }

    img {
        width: 18px;
        height: 16px;
        object-fit: contain;
    }
`;

export const List = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    row-gap: 8px;
    overflow-x: hidden;
    overflow-y: auto;
    scroll-behavior: smooth;
`;

export const IconChip = styled.span`
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.045);
    transition: background-color 0.2s ease;

    .icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        color: rgba(248, 250, 252, 0.85);
        transition: color 0.2s ease;
    }
`;

export const ListItem = styled.li<{$active: boolean; $bottomItem?: boolean; $disabled?: boolean}>`
    width: 100%;
    min-height: 40px;
    padding: 6px 12px;
    box-sizing: border-box;
    font-family: "Lexend", sans-serif;
    font-size: 15px;
    line-height: normal;
    white-space: nowrap;
    color: rgba(248, 250, 252, 0.78);
    background-color: transparent;
    ${flexCenter};
    justify-content: flex-start;
    column-gap: 12px;
    cursor: pointer;
    border-radius: 10px;
    transition: color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
    ${({$bottomItem}) => $bottomItem && "margin-top: auto;"};
    ${({$disabled}) => $disabled && "cursor: default;"};

    /* Active treatment: deep purple chip + orange icon/text. Defined
       before :hover so its declarations win the cascade for the resting
       state. */
    ${({$active}) => $active && activeItemCss};

    &:hover {
        ${({$active, $disabled}) =>
            $active
                ? ""
                : $disabled
                    ? ""
                    : `
                color: #f1f1f3;
                background: rgba(255, 255, 255, 0.04);

                .icon {
                    color: #ffffff;
                }
                .icon-chip {
                    background: rgba(255, 255, 255, 0.08);
                }
            `};
    }
`;
