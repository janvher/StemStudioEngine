import styled from "styled-components";

import {flexCenter} from "../../../../../assets/style";
import {StyledButton} from "../../common/StyledButton";
import {MOBILE_DASHBOARD_BREAKPOINT} from "../DashboardLayout/DashboardHeader/DashboardHeader.style";

/* ── Dark Card base ── */

export const DarkCard = styled.div`
    background: var(--theme-overview-card-bg);
    border-radius: var(--theme-dialog-border-radius);
    padding: 24px;
`;

/* ── Container ── */

export const OverviewContainer = styled.div`
    width: 100%;
    padding: 10px 24px 48px;
    display: flex;
    flex-direction: column;
    gap: 16px;

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        padding: 10px 16px 32px;
    }
`;

export const BackLink = styled.button`
    ${flexCenter};
    justify-content: flex-start;
    gap: 6px;
    color: var(--theme-overview-accent-yellow);
    font-size: var(--theme-font-size-l);
    font-weight: var(--theme-font-bold);
    cursor: pointer;
    background: none;
    border: none;
    font-family: "Innovator Grotesk VF", "Lexend", sans-serif;
    /* Keep the back button in view as the user scrolls the overview. The
       scroll container is an ancestor (HomepageContainer), so sticky pins
       this element to the top of that scroll context. Left/right negative
       margins + horizontal padding let the sticky background span the full
       OverviewContainer width (which has its own horizontal padding) so
       content underneath is fully covered when scrolled. */
    position: sticky;
    top: 0;
    z-index: 5;
    margin: 0 -24px;
    padding: 8px 24px;
    background: var(--theme-dashboard-bg);
    align-self: stretch;

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        margin: 0 -16px;
        padding: 8px 16px;
    }

    &:hover {
        opacity: 0.85;
    }
`;

/* ── Thumbnail (no card wrapper) ── */

export const ThumbnailWrapper = styled.div`
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: var(--theme-dialog-border-radius);
    overflow: hidden;
    position: relative;
    background: var(--theme-grey-bg);
`;

export const ThumbnailEditButton = styled.button`
    position: absolute;
    left: 12px;
    bottom: 12px;
    ${flexCenter};
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border-radius: 6px;
    border: none;
    background: var(--theme-overview-thumbnail-overlay);
    backdrop-filter: blur(8px);
    color: var(--theme-font-primary);
    font-size: var(--theme-font-size-sm);
    font-weight: var(--theme-font-bold);
    font-family: "Lexend", sans-serif;
    cursor: pointer;
    transition: background 0.2s ease;

    img {
        width: 14px;
        height: 14px;
    }

    &:hover {
        background: var(--theme-overview-thumbnail-overlay-hover);
    }
`;

/* ── Action Buttons Row (on page background, left-aligned) ── */

export const ActionBar = styled.div`
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;

    @media only screen and (orientation: landscape) and (max-height: 500px) {
        gap: 6px;
    }
`;

export const FixedActionBar = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    position: fixed;
    z-index: 1001;
    box-sizing: border-box;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--theme-overview-card-bg);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.4);

    @media only screen and (max-width: ${MOBILE_DASHBOARD_BREAKPOINT}) {
        padding: 8px 10px;
    }

    @media only screen and (orientation: landscape) and (max-height: 500px) {
        gap: 6px;
    }
`;

export const ActionButton = styled(StyledButton)<{$variant?: "primary" | "secondary" | "danger"}>`
    width: auto;
    min-height: 36px;
    height: auto;
    font-size: var(--theme-font-size-m);
    font-weight: var(--theme-font-bold);
    border-radius: 6px;
    padding: 0 14px;
    white-space: nowrap;

    ${({$variant}) => {
        switch ($variant) {
            case "primary":
                return `
                    background: var(--theme-overview-action-gradient);
                    color: #1C1C1C;
                    img.customIcon { filter: brightness(0); }
                    &:hover { background: var(--theme-overview-action-gradient); }
                `;
            case "secondary":
                return `
                    background: var(--theme-overview-action-button-bg);
                    color: #fff;
                    &:hover { background: var(--theme-overview-action-button-bg); }
                `;
            case "danger":
                return `
                    background: transparent;
                    border: 1px solid var(--theme-overview-danger-border);
                    color: var(--theme-red-button);
                    &:hover { background: transparent; }
                `;
            default:
                return `
                    background: var(--theme-overview-action-button-bg);
                    color: #fff;
                    &:hover { background: var(--theme-overview-action-button-bg); }
                `;
        }
    }}

    &:hover {
        font-weight: var(--theme-font-extra-bold, 800);
        cursor: pointer;
    }

    &.shareActionButton {
        position: relative;
    }

    &.shareActionButton::after {
        content: "Share";
        position: absolute;
        left: 50%;
        bottom: calc(100% + 6px);
        transform: translateX(-50%) translateY(2px);
        padding: 4px 8px;
        border-radius: 4px;
        background: var(--theme-overview-card-bg);
        color: #fff;
        font-size: var(--theme-font-size-s);
        font-weight: var(--theme-font-bold);
        line-height: 1;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.14s ease, transform 0.14s ease;
        white-space: nowrap;
        z-index: 2;
    }

    &.shareActionButton:hover::after,
    &.shareActionButton:focus-visible::after {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }

    @media only screen and (orientation: landscape) and (max-height: 500px) {
        min-height: 34px;
        font-size: calc(var(--theme-font-size-m) - 2px);
        padding: 0 12px;
    }
`;

export const ActionButtonRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

export const AdminBadge = styled.div`
    ${flexCenter};
    gap: 6px;
    color: var(--theme-overview-admin-color);
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-bold);
    margin-left: auto;

    img {
        width: 16px;
        height: 16px;
    }
`;

/* ── Game Info Section (on page background, no card) ── */

export const InfoSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const TitleRow = styled.div`
    ${flexCenter};
    justify-content: flex-start;
    gap: 8px;
`;

export const EditIcon = styled.img`
    width: 16px;
    height: 16px;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s ease;

    &:hover {
        opacity: 1;
    }
`;

export const GameTitle = styled.h1`
    margin: 0;
    color: var(--theme-overview-title-color);
    font-size: var(--theme-font-size-2xl);
    font-weight: var(--theme-font-bold);
    font-family: "Lexend", sans-serif;
    line-height: 1.2;
    word-break: break-word;
`;

export const EditableInput = styled.input`
    margin: 0;
    color: var(--theme-overview-title-color);
    font-size: var(--theme-font-size-2xl);
    font-weight: var(--theme-font-bold);
    font-family: "Lexend", sans-serif;
    line-height: 1.2;
    background: transparent;
    border: 1px solid var(--theme-font-unselected-color);
    border-radius: 6px;
    padding: 4px 8px;
    width: 100%;
    outline: none;

    &:focus {
        border-color: var(--theme-dialog-button-purple);
    }
`;

export const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px 16px;
    align-items: baseline;
`;

export const InfoLabel = styled.span`
    color: var(--theme-overview-label-color);
    font-size: var(--theme-font-size-m);
    line-height: 1.4;
    font-weight: 700;
    font-family: "Lexend", sans-serif;
    white-space: nowrap;
`;

export const InfoValue = styled.span`
    color: var(--theme-overview-value-color);
    font-size: var(--theme-font-size-m);
    font-family: "Lexend", sans-serif;
`;

export const TagsRow = styled.div`
    ${flexCenter};
    justify-content: flex-start;
    gap: 8px;
    flex-wrap: wrap;
`;

export const TagChip = styled.span`
    color: var(--theme-overview-tag-color);
    font-size: var(--theme-font-size-m);
    font-family: "Lexend", sans-serif;
    cursor: default;
`;

/* ── Description (dark card) ── */

export const DescriptionSection = styled(DarkCard)`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const SectionLabelRow = styled.div`
    ${flexCenter};
    justify-content: flex-start;
    gap: 8px;
`;

export const SectionLabel = styled.span`
    color: var(--theme-overview-title-color);
    font-size: var(--theme-font-size-2xl);
    font-weight: 700;
    font-family: "Lexend", sans-serif;
`;

export const DescriptionText = styled.p`
    margin: 0;
    color: var(--theme-font-secondary);
    font-size: var(--theme-font-size-l);
    line-height: 32px;
    white-space: pre-wrap;
    word-break: break-word;
`;

export const EditableTextarea = styled.textarea`
    margin: 0;
    color: var(--theme-font-secondary);
    font-size: var(--theme-font-size-l);
    line-height: 32px;
    background: transparent;
    border: 1px solid var(--theme-font-unselected-color);
    border-radius: 6px;
    padding: 8px;
    width: 100%;
    min-height: 100px;
    resize: vertical;
    outline: none;
    font-family: "Lexend", sans-serif;

    &:focus {
        border-color: var(--theme-dialog-button-purple);
    }
`;

/* ── Markdown Editor ── */

export const MarkdownEditorWrapper = styled.div`
    display: flex;
    flex-direction: column;
    border: 1px solid var(--theme-font-unselected-color);
    border-radius: 6px;
    overflow: hidden;

    &:focus-within {
        border-color: var(--theme-dialog-button-purple);
    }
`;

export const MarkdownToolbar = styled.div`
    ${flexCenter};
    justify-content: flex-start;
    gap: 2px;
    padding: 6px 8px;
    background: var(--theme-grey-bg);
    border-bottom: 1px solid var(--theme-font-unselected-color);
`;

export const ToolbarButton = styled.button<{$active?: boolean}>`
    ${flexCenter};
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 4px;
    background: ${({$active}) => ($active ? "var(--theme-overlay-white-15)" : "transparent")};
    color: var(--theme-font-primary);
    font-size: var(--theme-font-size-sm);
    font-weight: var(--theme-font-bold);
    font-family: "Lexend", sans-serif;
    cursor: pointer;
    opacity: 0.7;
    transition:
        opacity 0.15s ease,
        background 0.15s ease;

    &:hover {
        opacity: 1;
        background: var(--theme-overlay-white-8);
    }
`;

export const ToolbarDivider = styled.div`
    width: 1px;
    height: 18px;
    background: var(--theme-overlay-white-15);
    margin: 0 4px;
`;

export const MarkdownTextarea = styled.textarea`
    margin: 0;
    color: var(--theme-font-secondary);
    font-size: var(--theme-font-size-m);
    line-height: 24px;
    background: transparent;
    border: none;
    padding: 8px 12px;
    width: 100%;
    min-height: 150px;
    resize: vertical;
    outline: none;
    font-family: "Lexend", sans-serif;
`;

export const MarkdownPreview = styled.div`
    padding: 8px 12px;
    min-height: 150px;
    color: var(--theme-font-secondary);
    font-size: var(--theme-font-size-m);
    line-height: 24px;
    white-space: pre-wrap;
    word-break: break-word;

    h1,
    h2,
    h3 {
        color: var(--theme-font-primary);
        margin: 8px 0 4px;
    }
    h1 {
        font-size: var(--theme-font-size-xl);
    }
    h2 {
        font-size: var(--theme-font-size-l);
    }
    h3 {
        font-size: var(--theme-font-size-m);
    }
    p {
        margin: 4px 0;
    }
    a {
        color: var(--theme-homepage-link-color);
    }
    code {
        background: var(--theme-overlay-white-8);
        padding: 2px 4px;
        border-radius: 3px;
        font-size: var(--theme-font-size-s);
    }
    pre {
        background: var(--theme-grey-bg);
        padding: 8px;
        border-radius: 4px;
        overflow-x: auto;
    }
    pre code {
        background: none;
        padding: 0;
    }
    ul,
    ol {
        padding-left: 20px;
        margin: 4px 0;
    }
    blockquote {
        border-left: 3px solid var(--theme-overlay-white-15);
        margin: 4px 0;
        padding-left: 12px;
        color: var(--theme-font-tertiary);
    }
`;

/* ── More Games (dark card) ── */

export const MoreGamesSection = styled(DarkCard)`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

export const MoreGamesTitle = styled.h3`
    margin: 0;
    color: var(--theme-overview-title-color);
    font-size: var(--theme-font-size-2xl);
    font-weight: var(--theme-font-bold);
    font-family: "Lexend", sans-serif;
`;

export const MoreGamesGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;

    @media only screen and (max-width: 900px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
`;

export const ErrorState = styled.div`
    ${flexCenter};
    flex-direction: column;
    gap: 16px;
    min-height: 400px;
    color: var(--theme-font-primary);
    font-size: var(--theme-font-size-l);
`;

export const Divider = styled.hr`
    border: none;
    border-top: 1px solid var(--theme-overlay-white-8);
    margin: 0;
`;
