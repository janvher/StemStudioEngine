import styled from "styled-components";

export const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 9999;
`;

export const Menu = styled.div<{$top: number; $left: number}>`
    position: fixed;
    top: ${({$top}) => `${$top}px`};
    left: ${({$left}) => `${$left}px`};
    z-index: 10000;
    min-width: 220px;
    background: var(--theme-container-secondary-dark);
    border-radius: 8px;
    box-shadow: 0px 4px 15px 0px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 4px;
`;

export const Item = styled.button`
    all: unset;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 14px;
    cursor: pointer;
    border-radius: 6px;
    color: white;
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);

    &:hover {
        background: var(--theme-container-divider);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .label {
        font-weight: var(--theme-font-medium-plus);
    }

    .hint {
        font-size: 11px;
        color: #a1a1aa;
    }
`;
