import styled, {css} from "styled-components";

import {flexCenter, safeTextByLines} from "../../../../../assets/style";

const dashboardCard = css`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

export const CreateDashboardWrapper = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 26px;
    font-family: "Lexend", sans-serif;
`;

export const WelcomeBlock = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-bottom: 4px;
`;

export const WelcomeTitle = styled.h1`
    margin: 0;
    color: #ffffff;
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
    font-family: "Innovator Grotesk VF", "Lexend", sans-serif;
    letter-spacing: -0.01em;

    .wave {
        display: inline-block;
        margin-left: 6px;
        transform-origin: 70% 70%;
    }
`;

export const WelcomeSubtitle = styled.p`
    margin: 0;
    color: #8b93a7;
    font-size: 14px;
    line-height: 1.4;
`;

export const StarterSubtitle = styled.p`
    margin: 0;
    color: #6b7080;
    font-size: 12px;
    line-height: 16px;
    font-weight: 400;
`;

export const Section = styled.section`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

export const SectionHeader = styled.div`
    width: 100%;
    min-height: 50px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
`;

export const SectionTitle = styled.h2`
    margin: 0;
    color: #e9e9e9;
    font-size: 20px;
    font-weight: 700;
    line-height: 1;
    font-family: "Innovator Grotesk VF", "Lexend", sans-serif;
`;

export const InlineTools = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    color: #e9e9e9;

    img {
        width: 20px;
        height: 20px;
        object-fit: contain;
    }
`;

export const SectionActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 50px;
    padding: 10px 0;
`;

export const CarouselIndicator = styled.div<{$active?: boolean}>`
    width: 22px;
    height: 4px;
    border-radius: 999px;
    background: ${({$active}) => ($active ? "#e9e9e9" : "#31354e")};
`;

export const CarouselButton = styled.button<{$direction?: "next" | "prev"}>`
    ${flexCenter};
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    opacity: ${({disabled}) => (disabled ? 0.35 : 1)};
    transition: opacity 0.2s ease, transform 0.2s ease;

    img {
        width: 22px;
        height: 22px;
        transform: ${({$direction}) => ($direction === "next" ? "rotate(180deg)" : "none")};
    }

    &:not(:disabled):hover {
        transform: translateY(-1px);
    }
`;

export const StartingProjectsLayout = styled.div`
    width: 100%;
    display: grid;
    /* Cap at 4 columns — 5 narrowed cards enough to ellipsis their button
       labels. See SceneList.style.ts for the matching Discover grid. */
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    align-items: start;

    @media only screen and (max-width: 1280px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
    }

    @media only screen and (max-width: 480px) {
        grid-template-columns: 1fr;
    }
`;

export const ProjectCardsGrid = styled.div<{$columns?: number}>`
    width: 100%;
    display: grid;
    column-gap: 8px;
    row-gap: 16px;
    /* $columns is clamped to ≤4 by the caller (see CreateDashboardView.tsx). */
    grid-template-columns: repeat(${({$columns = 4}) => $columns}, minmax(0, 1fr));

    @media only screen and (max-width: 1280px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        column-gap: 16px;
    }

    @media only screen and (max-width: 480px) {
        grid-template-columns: 1fr;
    }
`;

export const StarterCard = styled.div`
    ${dashboardCard};
`;

export const StarterCardHeader = styled.div`
    width: 100%;
    min-height: 31px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 8px 0;
`;

export const StarterTitle = styled.h3`
    margin: 0;
    color: #ffffff;
    font-size: 16px;
    font-weight: 600;
    line-height: 20px;
    ${safeTextByLines(1)};
`;

export const TemplateCard = styled.button`
    ${dashboardCard};
    align-items: stretch;
    padding: 0;
    border: none;
    background: transparent;
    text-align: left;
    color: inherit;
    cursor: pointer;
    transition: transform 0.2s ease, opacity 0.2s ease;

    &:disabled {
        opacity: 0.55;
        cursor: wait;
    }

    &:not(:disabled):hover {
        transform: translateY(-1px);
    }
`;

export const TemplateCardBody = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

export const TemplateTitleRow = styled.div`
    width: 100%;
    min-height: 31px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 10px;
    padding: 8px 0 8px 0;
`;

export const TemplateTitle = styled.h4`
    margin: 0;
    flex: 1;
    min-width: 0;
    color: #b2b2b9;
    font-size: 16px;
    font-weight: 600;
    line-height: 20px;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    span {
        display: inline-block;
        white-space: nowrap;
    }

    @keyframes marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(calc(-100% - 16px)); }
    }

    &.overflowing:hover span {
        animation: marquee 4s linear infinite;
    }
`;

export const VisibilityIcon = styled.img`
    width: 22px;
    height: 22px;
    object-fit: contain;
    flex-shrink: 0;
`;

export const CompactMedia = styled.div<{ $bgImage?: string; $prompt?: boolean }>`
    position: relative;
    width: 100%;
    aspect-ratio: 326 / 183;
    border-radius: 8px;
    overflow: hidden;
    background-color: ${({$prompt}) => ($prompt ? "#1e2238" : "#171d33")};
    background-image: ${({$bgImage}) => ($bgImage ? `url('${$bgImage}')` : "none")};
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
`;

export const PromptForm = styled.form`
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 16px;
    padding: 8px;
`;

export const PromptInput = styled.textarea`
    width: 100%;
    min-height: 90px;
    resize: none;
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 4px;
    background: rgba(49, 53, 78, 0.7);
    color: #e9e9e9;
    padding: 10px 8px;
    font-size: 14px;
    line-height: 1.35;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &::placeholder {
        color: rgba(178, 178, 185, 0.7);
    }

    &:focus {
        border-color: rgba(200, 209, 68, 0.9);
        box-shadow: 0 0 0 2px rgba(200, 209, 68, 0.14);
    }
`;

const ctaButton = css`
    height: 33px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 4px 8px;
    border-radius: 4px;
    border: none;
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    transition: transform 0.2s ease, opacity 0.2s ease;

    &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }

    &:not(:disabled):hover {
        transform: translateY(-1px);
    }
`;

export const PrimaryButton = styled.button`
    ${ctaButton};
    align-self: flex-end;
    height: 36px;
    padding: 0 14px;
    color: #ffffff;
    background: var(--theme-orange, #f97316);
    border-radius: 999px;
    font-family: "Lexend", sans-serif;

    &:not(:disabled):hover {
        background: var(--theme-dialog-button-primary-hover, #ea580c);
        transform: translateY(-1px);
    }
`;

export const SecondaryButton = styled.button`
    ${ctaButton};
    min-width: 172px;
    height: 36px;
    padding: 0 16px;
    color: #ffffff;
    background: rgba(20, 23, 41, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    backdrop-filter: blur(8px);

    &:not(:disabled):hover {
        background: rgba(20, 23, 41, 0.9);
        border-color: rgba(255, 255, 255, 0.22);
        transform: translateY(-1px);
    }
`;

export const CompactFooter = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 8px 0;
    color: #b2b2b9;
    font-size: 14px;
    font-family: "Lexend", sans-serif;
    line-height: 16px;
`;

export const CompactStat = styled.div<{$disabled?: boolean}>`
    ${flexCenter};
    justify-content: flex-start;
    gap: 4px;
    min-width: 0;
    color: #b2b2b9;
    cursor: pointer;
    transition: color 0.2s ease;

    img {
        width: 16px;
        height: 16px;
        object-fit: contain;
        transition: filter 0.2s ease;
    }

    .zero-count {
        width: 9px;
        height: 11px;
    }

    &:hover {
        color: white;

        img {
            filter: brightness(0) invert(1);
        }
    }

    ${({$disabled}) => $disabled && `
        opacity: 0.5;
        cursor: default;

        &:hover {
            color: #b2b2b9;

            img {
                filter: none;
            }
        }
    `}
`;

export const TemplateCarouselViewport = styled.div`
    overflow: hidden;
    /* Span all remaining columns after the 2 starter cards */
    grid-column: 3 / -1;
    /* Align thumbnails with starter cards whose StarterCardHeader occupies space above */
    padding-top: 38px;

    @media only screen and (max-width: 1280px) {
        grid-column: 1 / -1;
        padding-top: 0;
    }
`;

export const TemplateCarouselTrack = styled.div<{$offset: number; $visibleCount: number; $gap?: number}>`
    display: flex;
    gap: ${({$gap = 8}) => $gap}px;
    transition: transform 0.4s ease;
    transform: translateX(
        calc(${({$offset, $visibleCount, $gap = 8}) =>
            `${$offset} * (-100% / ${$visibleCount} - ${$gap}px / ${$visibleCount})`
        })
    );

    > * {
        flex: 0 0 calc((100% - ${({$visibleCount, $gap = 8}) => `${($visibleCount - 1) * $gap}px`}) / ${({$visibleCount}) => $visibleCount});
        min-width: 0;
    }
`;

export const TemplatesEmpty = styled.div`
    ${flexCenter};
    min-height: 252px;
    border-radius: 8px;
    border: 1px dashed rgba(255, 255, 255, 0.12);
    color: rgba(233, 233, 233, 0.7);
    font-size: 14px;
`;

export const EmptyProjects = styled.div`
    color: rgba(233, 233, 233, 0.72);
    font-size: 14px;
    padding-top: 4px;
`;

export const PlaceholderCard = styled.div`
    width: 100%;
    min-height: 184px;
    aspect-ratio: 326 / 183;
    border-radius: 8px;
    background: rgba(44, 46, 63, 0.3);
`;
