import {css} from "styled-components";

export const buttonReset = css`
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    border: none;
    background: none;
    cursor: pointer;
`;

export const flexCenter = css`
    display: flex;
    justify-content: center;
    align-items: center;
`;

export const safeText = css`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
`;

export const safeTextByLines = (linesToAllow: number) => css`
    display: -webkit-box;
    -webkit-line-clamp: ${linesToAllow};
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    word-break: break-word;
    text-align: center;
`;

export const absoluteCenter = css`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
`;

export const regularFont = (size: "extra-small" | "xs" | "s" | "sm" | "m" | "base" | "l" | "xl" | "2xl" | "3xl" | "4xl") => css`
    font-size: var(--theme-font-size-${size});
    font-weight: var(--theme-font-regular);
    line-height: 120%;
    color: var(--theme-font-main-selected-color);
`;
