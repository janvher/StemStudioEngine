import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../assets/style";

export const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1001;
    padding: 24px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    ${flexCenter};
    overscroll-behavior: contain;

    @media only screen and (max-width: 767px) {
        padding: 0;
    }
`;

export const Modal = styled.div`
    width: min(980px, 100%);
    max-height: min(760px, calc(100dvh - 48px));
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--theme-container-divider);
    border-radius: var(--theme-dialog-border-radius);
    background: var(--theme-dialog-bg);
    box-shadow: var(--theme-dialog-shadow);
    color: var(--theme-font-main-selected-color);

    @media only screen and (max-width: 767px) {
        width: 100dvw;
        max-height: 100dvh;
        min-height: 100dvh;
        border-radius: 0;
    }
`;

export const Header = styled.div`
    position: relative;
    padding: 32px 32px 24px;
    border-bottom: 1px solid var(--theme-container-divider);
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent),
        var(--theme-dialog-bg);

    h2 {
        margin: 8px 0 12px;
        font-size: 32px;
        line-height: 1.05;
        color: var(--theme-font-main-selected-color);
    }

    p {
        margin: 0;
        max-width: 720px;
        ${regularFont("s")};
        line-height: 1.6;
        color: var(--theme-font-unselected-secondary-color);
    }

    @media only screen and (max-width: 767px) {
        padding: 24px 20px 20px;

        h2 {
            font-size: 26px;
        }
    }
`;

export const Eyebrow = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 999px;
    background: #A855F7;
    border: 1px solid #C084FC;
    ${regularFont("s")};
    font-weight: var(--theme-font-medium);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #ffffff;
`;

export const SkipButton = styled.button`
    position: absolute;
    top: 28px;
    right: 32px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    ${regularFont("s")};
    color: var(--theme-font-unselected-color);

    &:hover {
        color: var(--theme-font-main-selected-color);
    }

    @media only screen and (max-width: 767px) {
        position: static;
        margin-top: 16px;
    }
`;

export const Body = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
`;

export const Panel = styled.div`
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
    padding: 24px 24px 0;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;

    @media only screen and (max-width: 767px) {
        padding: 20px 20px 0;
    }
`;

export const PanelHero = styled.div<{$accent: string; $artwork: string}>`
    position: relative;
    overflow: hidden;
    isolation: isolate;
    padding: 24px;
    border-radius: var(--theme-dialog-border-radius);
    border: 1px solid var(--theme-container-divider);

    &::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: -2;
        background-image:
            linear-gradient(90deg, rgba(24, 27, 46, 0.98) 0%, rgba(24, 27, 46, 0.94) 36%, rgba(24, 27, 46, 0.6) 68%, rgba(24, 27, 46, 0.22) 100%),
            url("${({$artwork}) => $artwork}");
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
    }

    &::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: -1;
        background:
            radial-gradient(circle at top right, ${({$accent}) => `${$accent}26`}, transparent 40%),
            linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
    }

    h3 {
        margin: 12px 0 10px;
        font-size: 28px;
        color: var(--theme-font-main-selected-color);
    }

    p {
        margin: 0;
        max-width: 620px;
        ${regularFont("s")};
        line-height: 1.7;
        color: var(--theme-font-unselected-secondary-color);
    }

    @media only screen and (max-width: 767px) {
        padding: 20px;

        h3 {
            font-size: 24px;
        }
    }
`;

export const HeroBadge = styled.div<{$accent: string}>`
    display: inline-flex;
    align-items: center;
    padding: 8px 12px;
    border-radius: 999px;
    background: var(--theme-dialog-button-primary);
    border: 1px solid var(--theme-dialog-button-primary);
    ${regularFont("s")};
    font-weight: var(--theme-font-medium);
    color: var(--theme-font-main-selected-color);
`;

export const ChecklistGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-top: 20px;

    @media only screen and (max-width: 767px) {
        grid-template-columns: 1fr;
    }
`;

export const ChecklistCard = styled.div`
    min-height: 0;
    padding: 18px;
    border-radius: var(--theme-dialog-border-radius);
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--theme-container-divider);

    h4 {
        margin: 0 0 10px;
        font-size: 15px;
        color: var(--theme-font-main-selected-color);
    }

    ul {
        margin: 0;
        padding-left: 18px;
        color: var(--theme-font-unselected-secondary-color);
    }

    li {
        ${regularFont("s")};
        line-height: 1.55;
    }

    li + li {
        margin-top: 8px;
    }
`;

export const Footer = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px 24px 24px;
    margin-top: auto;
    border-top: 1px solid var(--theme-container-divider);
    background: var(--theme-dialog-bg);

    @media only screen and (max-width: 767px) {
        flex-direction: column;
        align-items: stretch;
        padding: 20px;
        padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    }
`;

export const FooterActions = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;

    @media only screen and (max-width: 767px) {
        width: 100%;
        flex-wrap: wrap;
    }
`;
