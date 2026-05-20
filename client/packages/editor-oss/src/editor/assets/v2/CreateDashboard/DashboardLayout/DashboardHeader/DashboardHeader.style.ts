import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../assets/style";

export const DASHBOARD_HEADER = "74px";
export const MOBILE_DASHBOARD_BREAKPOINT = "960px";

export const HeaderWrapper = styled.div<{$sticky?: boolean; $mobile?: boolean}>`
    display: flex;
    justify-content: center;
    flex-direction: ${({$mobile}) => ($mobile ? "column" : "row")};
    align-items: ${({$mobile}) => ($mobile ? "stretch" : "center")};
    padding: 10px 34px 0;
    min-height: 96px;
    width: 100%;
    gap: ${({$mobile}) => ($mobile ? "12px" : "16px")};
    box-sizing: border-box;

    ${({$sticky}) =>
        $sticky &&
        `
    position: sticky;
    top: 0;
    z-index: 1001;
    background: transparent;
    `}

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        padding: 16px;
        min-height: 86px;
    }

    @media only screen and (max-width: 480px) {
        padding: 12px 8px;
        gap: 10px;
    }
`;

export const HeaderTopRow = styled.div`
    width: 100%;
    max-width: 1480px;
    display: flex;
    align-items: center;
    gap: 24px;
    min-height: 80px;
    padding: 8px 14px 8px 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 999px;
    background: rgba(10, 14, 29, 0.88);
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.18);
    box-sizing: border-box;

    @media only screen and (max-width: 1200px) {
        gap: 12px;
        padding: 8px 12px;
    }

    @media only screen and (max-width: 860px) {
        border-radius: 24px;
        align-items: stretch;
        flex-wrap: wrap;
        gap: 12px;
    }

    @media only screen and (max-width: 720px) {
        min-height: 64px;
        align-items: center;
        flex-wrap: nowrap;
        gap: 8px;
        padding: 8px;
        border-radius: 22px;
    }
`;

export const RightSide = styled.div`
    margin-left: auto;
    ${flexCenter};
    align-items: center;
    column-gap: 10px;
    height: 56px;
    flex-shrink: 0;
    line-height: 0;

    > * {
        flex-shrink: 0;
    }

    .logout {
        color: var(--theme-font-main-selected-color);
    }

    .plus-icon {
        width: 16px;
        height: 16px;
    }

    .header-credits {
        height: auto;
        min-height: 28px;
        min-width: 74px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 5px 12px;
        margin: 0 2px;
        border-radius: 999px;
        box-sizing: border-box;
        font-size: 13px;
        line-height: 1;
        flex-shrink: 0;
    }

    .reset-css {
        width: 56px;
        height: 56px;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 16px;
        flex-shrink: 0;
    }

    @media only screen and (max-width: 720px) {
        height: 44px;
        column-gap: 0;
    }
`;

export const DesktopRightItems = styled.div`
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    column-gap: 10px;
    height: 56px;
    flex-shrink: 0;

    @media only screen and (max-width: 720px) {
        display: none;
    }
`;

export const PrimaryNav = styled.nav`
    ${flexCenter};
    justify-content: center;
    gap: 28px;
    min-width: 0;
    flex: 1 1 auto;

    @media only screen and (max-width: 860px) {
        order: 3;
        width: 100%;
        justify-content: space-between;
    }

    @media only screen and (max-width: 720px) {
        order: 0;
        width: auto;
        flex: 1 1 auto;
        justify-content: center;
        gap: 4px;
    }
`;

export const NavLink = styled.button<{$active?: boolean}>`
    ${flexCenter};
    justify-content: center;
    gap: 12px;
    min-width: 168px;
    height: 56px;
    padding: 0 22px;
    border: none;
    border-radius: 0;
    background: transparent;
    color: ${({$active}) => ($active ? "#ffffff" : "#b2b2b9")};
    font-family: "Lexend", sans-serif;
    font-size: 18px;
    font-weight: 600;
    text-align: center;
    white-space: nowrap;
    cursor: pointer;
    position: relative;
    transition: background 0.2s ease, color 0.2s ease;

    svg,
    img {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
        display: block;
    }

    &::after {
        content: "";
        position: absolute;
        left: 22px;
        right: 22px;
        bottom: -14px;
        height: 4px;
        border-radius: 999px;
        background: ${({$active}) => ($active ? "#d7de45" : "transparent")};
    }

    &:hover {
        color: #ffffff;
    }

    @media only screen and (min-width: 2200px) {
        min-width: 200px;
        font-size: 22px;
        gap: 14px;

        svg,
        img {
            width: 28px;
            height: 28px;
        }
    }

    @media only screen and (max-width: 1200px) {
        min-width: 0;
        gap: 8px;
        padding: 0 14px;
        font-size: 15px;

        svg,
        img {
            width: 20px;
            height: 20px;
        }

        &::after {
            left: 14px;
            right: 14px;
        }
    }

    @media only screen and (max-width: 860px) {
        flex: 1;
        padding: 0 10px;
        font-size: 14px;
        gap: 6px;
    }

    @media only screen and (max-width: 720px) {
        height: 42px;
        padding: 0 8px;
        gap: 0;
        font-size: 12px;

        svg,
        img {
            display: none;
        }

        &::after {
            left: 10px;
            right: 10px;
            bottom: -5px;
            height: 3px;
        }

        span {
            display: inline;
        }
    }
`;

export const MyProjectsButton = styled.button<{$active?: boolean}>`
    ${flexCenter};
    gap: 8px;
    height: 56px;
    padding: 0 20px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: ${({$active}) => ($active ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.04)")};
    color: #ffffff;
    font-family: "Lexend", sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    line-height: 1;
    flex-shrink: 0;

    svg {
        width: 20px;
        height: 20px;
        display: block;
        flex-shrink: 0;
    }

    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    @media only screen and (max-width: 1200px) {
        padding: 0 12px;
        height: 48px;

        span {
            display: none;
        }
    }
`;

export const MyProjectsSplit = styled.div`
    position: relative;
    flex-shrink: 0;
`;

export const MyProjectsSplitInner = styled.div<{$active?: boolean}>`
    display: flex;
    align-items: stretch;
    height: 56px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: ${({$active}) => ($active ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.04)")};
    overflow: hidden;

    @media only screen and (max-width: 1200px) {
        height: 48px;
    }
`;

export const MyProjectsMain = styled.button`
    ${flexCenter};
    gap: 8px;
    padding: 0 20px;
    border: none;
    background: transparent;
    color: #ffffff;
    font-family: "Lexend", sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    line-height: 1;

    svg {
        width: 20px;
        height: 20px;
        display: block;
        flex-shrink: 0;
    }

    &:hover {
        background: rgba(255, 255, 255, 0.06);
    }

    @media only screen and (max-width: 1200px) {
        padding: 0 12px;

        span {
            display: none;
        }
    }
`;

export const MyProjectsChevron = styled.button<{$open?: boolean}>`
    ${flexCenter};
    width: 40px;
    border: none;
    border-left: 1px solid rgba(255, 255, 255, 0.16);
    background: ${({$open}) => ($open ? "rgba(255, 255, 255, 0.1)" : "transparent")};
    color: #ffffff;
    cursor: pointer;
    transition: background 0.15s ease;

    svg {
        width: 16px;
        height: 16px;
        transition: transform 0.15s ease;
        transform: ${({$open}) => ($open ? "rotate(180deg)" : "rotate(0deg)")};
    }

    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
`;

export const MyProjectsMenu = styled.div`
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 220px;
    background: #1a1d2e;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    z-index: 1000;
`;

export const MyProjectsMenuItem = styled.button<{$selected?: boolean}>`
    ${flexCenter};
    justify-content: flex-start;
    gap: 10px;
    padding: 10px 12px;
    border: none;
    background: ${({$selected}) => ($selected ? "rgba(200, 209, 68, 0.12)" : "transparent")};
    color: ${({$selected}) => ($selected ? "#c8d144" : "#ffffff")};
    border-radius: 8px;
    font-family: "Lexend", sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    width: 100%;

    svg {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
    }

    &:hover {
        background: rgba(255, 255, 255, 0.08);
    }

    .check {
        margin-left: auto;
        opacity: ${({$selected}) => ($selected ? 1 : 0)};
    }
`;

export const NavDivider = styled.span`
    width: 1px;
    height: 32px;
    background: rgba(255, 255, 255, 0.14);
`;

export const PanelButton = styled.button<{width?: string}>`
    background-color: var(--theme-grey-bg-button) !important;
    height: 32px;
    width: ${({width}) => width || "120px"};
    color: #fff;
    ${flexCenter};
    column-gap: 4px;
    border-radius: 8px;
    ${regularFont("s")};
    font-weight: var(--theme-font-medium);
    transition: 0.3s;

    &:hover {
        background-color: var(--theme-grey-bg-button-hover) !important;
    }

    &:active {
        background-color: var(--theme-grey-bg-button-active) !important;
    }
`;

export const SearchSection = styled.div<{$mobile?: boolean}>`
    flex: ${({$mobile}) => ($mobile ? "unset" : "1")};
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
    box-sizing: border-box;
    width: ${({$mobile}) => ($mobile ? "100%" : "auto")};

    .searchIcon-inputArea {
        width: 16px !important;
        height: 16px;
        left: 12px;

        img {
            width: 16px;
            height: 16px;
        }
    }

    .searchInput {
        width: ${({$mobile}) => ($mobile ? "100% !important" : "508px !important")};
        height: 44px;
        padding: 0 64px 0 40px;
        font-size: 14px;
        font-family: "Lexend", sans-serif;
        border-radius: 999px;
        background: #1a1d33;
        border: 1px solid rgba(255, 255, 255, 0.06);
        color: #b2b2b9;
        line-height: 15px;
    }

    @media only screen and (max-width: 1206px) {
        ${({$mobile}) =>
            !$mobile &&
            `
        .searchInput {
            width: 300px !important;
            height: 40px;
        }
        `}
    }

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        width: 100%;

        .searchInput {
            width: 100% !important;
        }
    }

    @media only screen and (orientation: landscape) and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        .searchInput {
            width: calc(100% + 50px) !important;
        }
    }
`;

export const SearchInputWrap = styled.div<{$mobile?: boolean}>`
    position: relative;
    width: ${({$mobile}) => ($mobile ? "100%" : "508px")};
    max-width: 100%;

    @media only screen and (max-width: 1206px) {
        ${({$mobile}) => !$mobile && "width: 300px;"}
    }

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        width: 100%;
    }
`;

export const SearchHint = styled.span`
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #8b93a7;
    font-family: "Lexend", sans-serif;
    font-size: 12px;
    font-weight: 500;
    pointer-events: none;
    user-select: none;

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        display: none;
    }
`;

export const IconButton = styled.button<{$active?: boolean}>`
    width: 56px;
    height: 56px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 12px;
    background: ${({$active}) => ($active ? "rgba(255, 255, 255, 0.08)" : "transparent")};
    color: ${({$active}) => ($active ? "#ffffff" : "var(--theme-font-unselected-color)")};
    ${flexCenter};
    cursor: pointer;
    flex-shrink: 0;
    line-height: 0;
    transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;

    svg {
        width: 20px;
        height: 20px;
        display: block;
    }

    &:hover {
        border-color: rgba(255, 255, 255, 0.14);
        color: var(--theme-font-main-selected-color);
        background: rgba(255, 255, 255, 0.06);
    }
`;

export const MobileMenuButton = styled.button`
    ${flexCenter};
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    flex-shrink: 0;

    img {
        width: 24px;
        height: 24px;
        object-fit: contain;
    }
`;

export const MobileMenuTrigger = styled.button`
    ${flexCenter};
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.04);
    color: #ffffff;
    cursor: pointer;
    flex-shrink: 0;
    line-height: 0;
    display: none;

    svg {
        width: 22px;
        height: 22px;
        display: block;
    }

    @media only screen and (max-width: 720px) {
        display: inline-flex;
    }
`;

export const MobileDrawerBackdrop = styled.button<{$open?: boolean}>`
    position: fixed;
    inset: 0;
    z-index: 1200;
    border: none;
    background: rgba(4, 8, 18, 0.58);
    opacity: ${({$open}) => ($open ? 1 : 0)};
    pointer-events: ${({$open}) => ($open ? "auto" : "none")};
    transition: opacity 0.2s ease;
    display: none;

    @media only screen and (max-width: 720px) {
        display: block;
    }
`;

export const MobileDrawer = styled.aside<{$open?: boolean}>`
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    z-index: 1201;
    width: min(312px, 86vw);
    padding: 18px 14px;
    display: none;
    flex-direction: column;
    gap: 18px;
    background: rgba(10, 14, 29, 0.98);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: -24px 0 60px rgba(0, 0, 0, 0.36);
    transform: translateX(${({$open}) => ($open ? "0" : "100%")});
    transition: transform 0.24s ease;
    box-sizing: border-box;

    @media only screen and (max-width: 720px) {
        display: flex;
    }
`;

export const MobileDrawerHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 48px;

    img {
        height: 42px;
        width: auto;
    }

    button {
        ${flexCenter};
        justify-content: center;
        width: 42px;
        height: 42px;
        padding: 0;
        border: 1px solid transparent;
        border-radius: 12px;
        background: transparent;
        color: #ffffff;
        cursor: pointer;
        line-height: 0;

        &:hover {
            border-color: rgba(255, 255, 255, 0.14);
            background: rgba(255, 255, 255, 0.06);
        }
    }

    svg {
        width: 22px;
        height: 22px;
        display: block;
    }
`;

export const MobileDrawerNav = styled.nav`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
`;

export const MobileDrawerSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;

    .mobile-drawer-credits {
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding: 0 12px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.04);
        color: #ffffff;
    }
`;

export const MobileDrawerAction = styled.button<{$active?: boolean}>`
    min-height: 46px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 10px;
    border: 1px solid ${({$active}) => ($active ? "rgba(215, 222, 69, 0.44)" : "transparent")};
    border-radius: 12px;
    background: ${({$active}) => ($active ? "rgba(215, 222, 69, 0.12)" : "transparent")};
    color: ${({$active}) => ($active ? "#ffffff" : "#b2b2b9")};
    font-family: "Lexend", sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;

    svg,
    img {
        width: 20px;
        height: 20px;
        display: block;
        flex-shrink: 0;
    }

    &:hover {
        border-color: rgba(255, 255, 255, 0.14);
        background: rgba(255, 255, 255, 0.06);
        color: #ffffff;
    }
`;

export const MobileSearchRow = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
`;

export const Logo = styled.div`
    width: 131px;
    height: 40px;
    padding: 0;
    flex-shrink: 0;
    ${flexCenter};
    justify-content: flex-start;
    cursor: pointer;

    img {
        height: 40px;
        width: auto;
    }

    @media only screen and (max-width: 1200px) {
        width: 109px;
        height: 38px;

        img {
            height: 36px;
        }
    }

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        width: 109px;
        height: 38px;

        img {
            height: 36px;
        }
    }

    @media only screen and (max-width: 720px) {
        width: 73px;
        height: 38px;

        img {
            height: 29px;
        }
    }
`;

export const LoginButton = styled.button`
    height: 56px;
    min-width: 76px;
    padding: 0 12px;
    margin: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    ${regularFont("s")}
    font-size: var(--theme-font-size-base);
    font-weight: 600;
    color: #fff;
    border-radius: 0;
    transition: color 0.2s ease, font-weight 0.2s ease;

    &:hover {
        background: transparent;
        font-weight: 800 !important;
    }

    &:active {
        background: transparent;
    }
`;
