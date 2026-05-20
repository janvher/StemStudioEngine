import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../assets/style";

export const Container = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    gap: 8px;
    overflow: hidden;
`;

export const Span = styled.span`
    display: flex;
    width: 24px;
    height: 24px;
    min-width: 24px;
    min-height: 24px;
    justify-content: center;
    align-items: center;
`;

export const Tab = styled.div<{$active?: boolean}>`
    padding: 4px 16px 4px 8px;
    height: 40px;
    ${flexCenter};
    column-gap: 8px;

    background: ${({$active}) => $active ? "var(--ce-bg, #222)" : "var(--ce-sidebar-bg, #111)"};
    ${regularFont("s")};
    color: ${({$active}) => $active ? "var(--ce-fg, var(--theme-font-main-selected-color))" : "var(--theme-font-unselected-color)"};
    cursor: pointer;

    border-bottom: ${({$active}) => $active ? "2px solid var(--ce-tab-active-border, #0af)" : "none"};
    transition:
        background 0.2s,
        color 0.2s,
        border-bottom 0.2s;

    &:hover {
        background: var(--ce-bg-lighter, #333);
    }
`;

export const TabText = styled.div`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    max-width: 200px;
`;

export const FormatButton = styled.button`
    padding: 4px 10px;
    height: 28px;
    ${flexCenter};
    column-gap: 4px;
    background: transparent;
    border: 1px solid var(--ce-border, #555);
    border-radius: 4px;
    ${regularFont("s")};
    font-size: 13px;
    color: var(--ce-fg, #d4d4d8);
    cursor: pointer;
    white-space: nowrap;
    align-self: center;

    &:hover {
        background: var(--ce-bg-lighter, #333);
        color: var(--ce-fg, var(--theme-font-main-selected-color));
        border-color: #777;
    }
`;

export const ThemeSelect = styled.select`
    padding: 4px 6px;
    height: 28px;
    background: transparent;
    border: 1px solid var(--ce-border, #555);
    border-radius: 4px;
    ${regularFont("s")};
    font-size: 13px;
    color: var(--ce-fg, #d4d4d8);
    cursor: pointer;
    align-self: center;

    &:hover {
        background: var(--ce-bg-lighter, #333);
        color: var(--ce-fg, var(--theme-font-main-selected-color));
        border-color: #777;
    }

    &:focus {
        outline: none;
        border-color: var(--ce-tab-active-border, #0af);
    }

    option,
    optgroup {
        background: var(--ce-bg, #222);
        color: #ccc;
    }
`;

export const DebuggerBanner = styled.div`
    background-color: var(--ce-bg-lighter, #3a3a3a);
    color: var(--ce-fg, #fff);
    padding: 4px 8px;
    font-size: 12px;
    font-family: monospace;
    text-align: center;
    user-select: none;
`;

export const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--theme-font-unselected-color);
    font-size: 13px;
    width: 100%;
    height: 100%;
    background: black;
    opacity: 60%;
`;

export const LoadingIcon = styled.img`
    width: 32px;
    height: 32px;
    animation: spin 1s linear infinite;

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
`;

export const TreeWrapper = styled.div`
    width: 200px;
    border-right: 1px solid var(--ce-border, var(--theme-grey-bg));
    color: var(--ce-fg, var(--theme-font-main-selected-color));
    background-color: var(--ce-sidebar-bg, var(--theme-container-main-dark));
`;

export const Toolbar = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-bottom: 1px solid var(--ce-border, var(--theme-grey-bg));
    background: var(--ce-sidebar-bg, var(--theme-container-main-dark));
    flex-shrink: 0;
    min-width: 0;
`;

export const ToolbarScrollViewport = styled.div`
    display: flex;
    flex: 1;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
        display: none;
    }
`;

export const ToolbarScrollContent = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: max-content;
    margin-left: auto;
`;

export const ToolbarScrollButton = styled.button`
    width: 28px;
    height: 28px;
    min-width: 28px;
    ${flexCenter};
    background: transparent;
    border: 1px solid var(--ce-border, #555);
    border-radius: 4px;
    ${regularFont("s")};
    font-size: 13px;
    color: var(--ce-fg, #d4d4d8);
    cursor: pointer;

    &:hover:not(:disabled) {
        background: var(--ce-bg-lighter, #333);
        color: var(--ce-fg, var(--theme-font-main-selected-color));
        border-color: #777;
    }

    &:disabled {
        opacity: 0.4;
        cursor: default;
    }
`;

export const FontSelect = styled.select`
    padding: 4px 6px;
    height: 28px;
    background: transparent;
    border: 1px solid var(--ce-border, #555);
    border-radius: 4px;
    ${regularFont("s")};
    font-size: 13px;
    color: var(--ce-fg, #d4d4d8);
    cursor: pointer;
    align-self: center;

    &:hover {
        background: var(--ce-bg-lighter, #333);
        color: var(--ce-fg, var(--theme-font-main-selected-color));
        border-color: #777;
    }

    &:focus {
        outline: none;
        border-color: var(--ce-tab-active-border, #0af);
    }

    option {
        background: var(--ce-bg, #222);
        color: #ccc;
    }
`;

export const FormatBtn = styled.button`
    padding: 4px 10px;
    height: 28px;
    ${flexCenter};
    column-gap: 4px;
    background: transparent;
    border: 1px solid var(--ce-border, #555);
    border-radius: 4px;
    ${regularFont("s")};
    font-size: 13px;
    color: var(--ce-fg, #d4d4d8);
    cursor: pointer;
    white-space: nowrap;
    align-self: center;

    &:hover {
        background: var(--ce-bg-lighter, #333);
        color: var(--ce-fg, var(--theme-font-main-selected-color));
        border-color: #777;
    }
`;
