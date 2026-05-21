import styled from "styled-components";

import {flexCenter} from "../../../../../assets/style";

export const CreateHomepageHeroWrapper = styled.div`
    ${flexCenter};
    justify-content: flex-start;
    flex-direction: column;
    row-gap: 18px;
    width: 100%;
    max-width: 1200px;
    margin: 40px auto;
    padding: 0 20px;
    flex-grow: 1;

    @media only screen and (max-width: 767px) {
        margin: 20px 0;
        row-gap: 20px;
    }

    @media only screen and (max-width: 480px) {
        margin: 12px 0;
        row-gap: 14px;
        padding: 0 12px;
    }

    @media only screen and (max-height: 500px) {
        margin: 8px auto;
        row-gap: 10px;
    }

    @media only screen and (orientation: landscape) and (max-height: 500px) {
        margin: 8px auto 4px;
        row-gap: 8px;
        padding: 0 16px;
    }
`;

export const CreateHomepageHeroLogo = styled.img`
    height: 92px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.9)) drop-shadow(0 4px 16px rgba(0, 0, 0, 0.7));

    @media only screen and (max-width: 767px) {
        height: 46px;
    }

    @media only screen and (max-height: 500px) {
        height: 40px;
    }

    @media only screen and (orientation: landscape) and (max-height: 500px) {
        height: 28px;
    }
`;

export const Heading = styled.h1`
    width: 100%;
    max-width: 560px;
    font-size: 56px;
    font-weight: 700;
    text-align: center;
    color: #fff;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9), 0 4px 16px rgba(0, 0, 0, 0.7);
    margin: 0 auto;
    letter-spacing: 0;
    line-height: 1.1;

    @media only screen and (max-width: 767px) {
        font-size: 28px;
        max-width: 90%;
    }

    @media only screen and (max-width: 480px) {
        font-size: 22px;
    }

    @media only screen and (max-height: 500px) {
        font-size: 24px;
    }

    @media only screen and (orientation: landscape) and (max-height: 500px) {
        font-size: 18px;
        max-width: 520px;
    }
`;

export const StatsRow = styled.div`
    ${flexCenter};
    gap: 10px;
    color: rgba(255, 255, 255, 0.78);
    font-family: "Lexend", sans-serif;
    font-size: 15px;

    span:first-child,
    span:last-child {
        width: 86px;
        height: 1px;
        background: rgba(255, 255, 255, 0.28);
    }

    svg {
        width: 22px;
        height: 22px;
    }

    strong {
        color: #ffffff;
        font-weight: 600;
    }

    @media only screen and (max-width: 560px) {
        span:first-child,
        span:last-child {
            width: 40px;
        }
    }
`;

export const PromptCard = styled.form`
    width: min(760px, calc(100vw - 32px));
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(10, 14, 29, 0.86);
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.32);
    box-sizing: border-box;
`;

export const PromptHeader = styled.div`
    ${flexCenter};
    justify-content: flex-start;
    gap: 10px;
    color: #ffffff;
    font-family: "Lexend", sans-serif;
    font-size: 15px;
    font-weight: 600;

    svg {
        width: 20px;
        height: 20px;
        color: #d7de45;
    }
`;

export const KeyConfigRow = styled.div<{$configured?: boolean}>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid
        ${({$configured}) => ($configured ? "rgba(145, 215, 109, 0.4)" : "rgba(215, 222, 69, 0.4)")};
    background: ${({$configured}) =>
        $configured ? "rgba(145, 215, 109, 0.1)" : "rgba(215, 222, 69, 0.08)"};
    font-family: "Lexend", sans-serif;
    font-size: 13px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.82);

    svg {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        color: ${({$configured}) => ($configured ? "#91d76d" : "#d7de45")};
    }
`;

export const KeyConfigButton = styled.button`
    margin-left: auto;
    padding: 6px 14px;
    border-radius: 10px;
    border: 1px solid rgba(215, 222, 69, 0.5);
    background: rgba(215, 222, 69, 0.12);
    color: #eef2a0;
    font-family: "Lexend", sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
        background: rgba(215, 222, 69, 0.2);
    }
`;

export const PromptInputArea = styled.div`
    position: relative;
    width: 100%;
`;

export const PromptTextarea = styled.textarea<{$invalid?: boolean}>`
    display: block;
    width: 100%;
    height: 150px;
    min-height: 150px;
    resize: vertical;
    border-radius: 14px;
    border: 1px solid ${({$invalid}) => ($invalid ? "#ff6b6b" : "rgba(255, 255, 255, 0.14)")};
    background: rgba(255, 255, 255, 0.06);
    color: #ffffff;
    padding: 18px 20px 34px;
    font-family: "Lexend", sans-serif;
    font-size: 16px;
    line-height: 1.5;
    outline: none;
    box-sizing: border-box;
    overflow-y: auto;
    box-shadow: ${({$invalid}) => ($invalid ? "0 0 0 3px rgba(255, 107, 107, 0.16)" : "none")};

    &::placeholder {
        color: rgba(255, 255, 255, 0.42);
    }

    &:focus {
        border-color: ${({$invalid}) => ($invalid ? "#ff8a8a" : "rgba(215, 222, 69, 0.85)")};
        box-shadow: ${({$invalid}) =>
            $invalid ? "0 0 0 3px rgba(255, 107, 107, 0.2)" : "0 0 0 3px rgba(215, 222, 69, 0.12)"};
    }
`;

export const CharacterCount = styled.div`
    position: absolute;
    right: 34px;
    bottom: 14px;
    text-align: right;
    color: rgba(255, 255, 255, 0.48);
    font-family: "Lexend", sans-serif;
    font-size: 12px;
    pointer-events: none;
`;

export const PromptError = styled.div`
    color: #ffb3b3;
    font-family: "Lexend", sans-serif;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.35;
`;

export const ExampleRow = styled.div`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;

    @media only screen and (max-width: 760px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media only screen and (max-width: 420px) {
        grid-template-columns: 1fr;
    }
`;

export const ExampleButton = styled.button`
    ${flexCenter};
    gap: 8px;
    min-height: 44px;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.82);
    font-family: "Lexend", sans-serif;
    font-size: 13px;
    cursor: pointer;

    svg {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
    }

    &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
    }
`;

export const GenerateButton = styled.button`
    ${flexCenter};
    gap: 12px;
    width: 100%;
    min-height: 58px;
    border-radius: 14px;
    border: none;
    background: linear-gradient(135deg, #d7de45 0%, #91d76d 100%);
    color: #121522;
    font-family: "Lexend", sans-serif;
    font-size: 18px;
    font-weight: 800;
    text-transform: uppercase;
    cursor: pointer;

    svg {
        width: 24px;
        height: 24px;
    }

    &:hover {
        filter: brightness(1.04);
    }

    &:disabled {
        cursor: wait;
        opacity: 0.65;
        filter: none;
    }
`;

export const ScratchButton = styled.button`
    ${flexCenter};
    height: 40px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    font-family: "Lexend", sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;

    &:hover {
        color: #ffffff;
    }
`;

export const Row = styled.div`
    ${flexCenter};
    column-gap: 28px;
    margin-top: 12px;

    @media only screen and (max-width: 767px) {
        column-gap: 12px;
        margin-top: 0;
        flex-wrap: wrap;
        row-gap: 8px;
    }

    @media only screen and (max-width: 480px) {
        column-gap: 8px;
        row-gap: 6px;
    }

    @media only screen and (max-height: 500px) {
        margin-top: 0;
    }

    @media only screen and (orientation: landscape) and (max-height: 500px) {
        column-gap: 10px;
        row-gap: 6px;
        flex-wrap: wrap;
    }

    @media only screen and (max-height: 600px) {
        row-gap: 8px;
        margin-top: 0;
    }

    .text {
        ${flexCenter};
        column-gap: 8px;
        font-weight: 500;
        font-size: 17px;
        line-height: 1.2;
        color: #fff;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 3px 12px rgba(0, 0, 0, 0.7);

        @media only screen and (max-width: 767px) {
            font-size: 13px;
            column-gap: 4px;
        }

        @media only screen and (max-width: 480px) {
            font-size: 12px;
        }

        @media only screen and (orientation: landscape) and (max-height: 500px) {
            font-size: 12px;
            column-gap: 4px;
        }
    }

    img {
        width: 18px;
        height: 18px;

        @media only screen and (max-width: 767px) {
            width: 14px;
            height: 14px;
        }

        @media only screen and (max-width: 480px) {
            width: 12px;
            height: 12px;
        }

        @media only screen and (orientation: landscape) and (max-height: 500px) {
            width: 12px;
            height: 12px;
        }
    }
`;

export const ButtonsWrapper = styled.div`
    ${flexCenter};
    column-gap: 16px;
    margin-top: 20px;

    .earlyAccess {
        font-weight: 600;
        font-size: 16px;
        letter-spacing: 0.01em;
    }

    .DiscordButton {
        font-weight: 600 !important;
        font-size: 16px !important;
        padding: 0 28px !important;
        border-radius: 8px !important;
        box-shadow: none !important;

        &:hover, &:active {
            box-shadow: none !important;
        }
    }

    @media only screen and (max-width: 767px) {
        margin-top: 8px;
        column-gap: 10px;

        .earlyAccess {
            font-size: 14px !important;
            padding: 0 20px !important;
        }

        .DiscordButton {
            font-size: 14px !important;
            padding: 0 20px !important;
        }
    }

    @media only screen and (max-width: 480px) {
        flex-direction: column;
        row-gap: 8px;
        margin-top: 4px;

        .earlyAccess, .DiscordButton {
            width: 100% !important;
            max-width: 280px;
            font-size: 14px !important;
        }
    }

    @media only screen and (max-height: 500px) {
        margin-top: 4px;

        .earlyAccess, .DiscordButton {
            height: 40px !important;
        }
    }

    @media only screen and (orientation: landscape) and (max-height: 500px) {
        margin-top: 0;
        column-gap: 10px;
        row-gap: 8px;
        flex-wrap: wrap;

        .earlyAccess, .DiscordButton {
            height: 40px !important;
            font-size: 14px !important;
            padding: 0 18px !important;
        }
    }

    @media only screen and (max-height: 600px) {
        row-gap: 8px;
        margin-top: 0;
    }
`;
