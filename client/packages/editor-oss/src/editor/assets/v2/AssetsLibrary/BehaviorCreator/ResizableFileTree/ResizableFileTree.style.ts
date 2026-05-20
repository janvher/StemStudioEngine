import styled from "styled-components";

export const ResizeHandle = styled.div<{$isResizing: boolean}>`
    position: absolute;
    top: 0;
    right: 0;
    width: 4px;
    height: 100%;
    cursor: col-resize;
    background: transparent;
    transition: all 0.2s ease;
    z-index: 10;

    &:hover {
        background: var(--ce-tab-active-border, var(--theme-container-active-blue));
        opacity: 0.7;
    }

    ${({$isResizing}) =>
        $isResizing &&
        `
        background: var(--ce-tab-active-border, var(--theme-container-active-blue));
        opacity: 0.9;
    `}
`;

export const FileTreeContainer = styled.div`
    height: 100%;
    position: relative;
    border-right: 1px solid var(--ce-border, var(--theme-grey-bg));
    color: var(--ce-fg, var(--theme-font-main-selected-color));
    background-color: var(--ce-sidebar-bg, var(--theme-container-main-dark));
    overflow: hidden;
    flex-shrink: 0;
`;
