import styled from "styled-components";

export const ResizeHandle = styled.div<{$isResizing: boolean}>`
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    cursor: col-resize;
    background: transparent;
    transition: all 0.2s ease;
    z-index: 10;

    &:hover {
        background: var(--theme-container-active-blue);
        opacity: 0.7;
    }

    ${({$isResizing}) =>
        $isResizing &&
        `
        background: var(--theme-container-active-blue);
        opacity: 0.9;
    `}
`;
