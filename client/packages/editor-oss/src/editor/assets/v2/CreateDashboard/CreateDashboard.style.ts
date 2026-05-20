import styled, {keyframes} from "styled-components";

import {MOBILE_DASHBOARD_BREAKPOINT} from "./DashboardLayout/DashboardHeader/DashboardHeader.style";
import {regularFont} from "../../../../assets/style";

export const Title = styled.div`
    ${regularFont("s")}
    font-weight: var(--theme-font-bold);
`;

export const WidthWrapper = styled.div`
    width: 100%;
    max-width: 1662px;
    margin: 0 auto;
    position: relative;
    padding: 24px 24px 40px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    row-gap: 24px;
    @media only screen and (max-width: 1440px) {
        padding: 24px 24px 40px;
    }
    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        padding: 16px 16px 32px;
    }
    @media only screen and (max-width: 767px) {
        padding: 20px 16px 32px;
    }
`;

export const BrowseSearchSection = styled.div`
    width: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
`;

export const BrowseSearchInputWrap = styled.div`
    position: relative;
    flex: 1 1 480px;
    width: min(100%, 720px);
    max-width: 720px;

    .searchIcon-inputArea {
        left: 16px;
        width: 18px !important;
        height: 18px;

        img {
            width: 18px;
            height: 18px;
        }
    }

    .searchInput {
        width: 100% !important;
        height: 48px;
        padding: 0 132px 0 48px;
        border-radius: 999px;
        background: #1a1d33;
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #f8fafc;
        font-family: "Lexend", sans-serif;
        font-size: 15px;
        line-height: 1;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
    }

    .searchInput::placeholder {
        color: #8f98ad;
    }

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        width: 100%;
        max-width: none;

        .searchInput {
            height: 44px;
            padding-left: 44px;
            padding-right: 124px;
            font-size: 14px;
        }
    }
`;

export const BrowseSearchTargetControls = styled.div`
    position: absolute;
    top: 50%;
    right: 10px;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    gap: 6px;
`;

export const BrowseSearchTargetButton = styled.button<{$selected?: boolean; $locked?: boolean}>`
    width: 30px;
    height: 30px;
    padding: 0;
    border: 1px solid ${({$selected}) => ($selected ? "rgba(200, 209, 68, 0.56)" : "rgba(255, 255, 255, 0.08)")};
    border-radius: 999px;
    background: ${({$selected}) => ($selected ? "rgba(200, 209, 68, 0.16)" : "rgba(255, 255, 255, 0.04)")};
    color: ${({$selected}) => ($selected ? "#f8ff9a" : "#9aa3b8")};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: ${({$locked}) => ($locked ? "default" : "pointer")};
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;

    &:hover {
        ${({$locked}) =>
            !$locked &&
            `
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.18);
            color: #ffffff;
        `}
    }

    svg {
        width: 16px;
        height: 16px;
    }

    img {
        width: 16px;
        height: 16px;
        object-fit: contain;
    }
`;

const sizzlePulse = keyframes`
    0% {
        transform: translateY(0) scale(1) rotate(0deg);
        filter: drop-shadow(0 0 0 rgba(255, 187, 92, 0.0));
    }
    35% {
        transform: translateY(-3px) scale(1.02) rotate(-0.5deg);
        filter: drop-shadow(0 10px 26px rgba(255, 187, 92, 0.28));
    }
    70% {
        transform: translateY(2px) scale(0.995) rotate(0.45deg);
        filter: drop-shadow(0 6px 18px rgba(255, 154, 77, 0.22));
    }
    100% {
        transform: translateY(0) scale(1) rotate(0deg);
        filter: drop-shadow(0 0 0 rgba(255, 187, 92, 0.0));
    }
`;

export const DiscoverEmptyState = styled.div`
    width: 100%;
    max-width: 980px;
    min-height: calc(100vh - 220px);
    margin: 0 auto;
    padding: 16px 24px 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    row-gap: 14px;
    flex-direction: column;

    @media only screen and (max-width: 767px) {
        margin-top: 0;
        min-height: calc(100vh - 200px);
        padding: 16px;
    }
`;

export const DiscoverEmptyMedia = styled.div`
    width: min(560px, 84vw);
    position: relative;
    animation: ${sizzlePulse} 2.8s ease-in-out infinite;

    @media only screen and (max-width: 767px) {
        width: min(360px, 88vw);
    }
`;

export const DiscoverEmptyPlaceholder = styled.img`
    width: 100%;
    height: auto;
    object-fit: contain;
    opacity: 0.66;
`;

export const DiscoverEmptyTitle = styled.h3`
    margin: 0;
    color: var(--theme-font-primary);
    font-size: var(--theme-font-size-3xl);
    font-weight: var(--theme-font-bold);
`;

export const DiscoverEmptyText = styled.p`
    margin: 0;
    color: var(--theme-font-secondary);
    font-size: var(--theme-font-size-xl);
    line-height: 1.5;
    max-width: 560px;
`;
