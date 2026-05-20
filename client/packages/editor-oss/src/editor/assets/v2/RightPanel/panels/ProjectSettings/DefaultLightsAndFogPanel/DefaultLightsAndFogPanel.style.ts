import styled from "styled-components";

export const GradientPreview = styled.div<{$gradient: string; $width?: number}>`
    width: ${({$width}) => ($width ? `${$width}px` : "100%")};
    height: 24px;
    border-radius: 4px;
    background: ${({$gradient}) => $gradient};
    cursor: pointer;
    transition: border-color 0.2s ease;

    &:hover {
        border: 1px solid #fff;
    }
`;

export const StyledGradientPicker = styled.div`
    position: fixed;
    z-index: 1001;
    right: 264px;
    top: 50%;
    transform: translateY(-50%);
    padding: 12px;
    background: #2a2a2a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);

    .gradient-picker {
        background: transparent !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 8px !important;
    }

    .stop {
        border: 2px solid rgba(255, 255, 255, 0.1) !important;
    }

    .stop.active {
        border-color: var(--theme-font-main-selected-color, #fff) !important;
    }
`;

export const SectionHeaderWrapper = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
`;

export const ResetButton = styled.button<{$visible: boolean}>`
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: ${({$visible}) => ($visible ? 1 : 0)};
    pointer-events: ${({$visible}) => ($visible ? "auto" : "none")};
    transition: opacity 0.2s ease;
    position: relative;

    &:hover {
        opacity: 0.8;
    }

    svg {
        width: 14px;
        height: 14px;
        fill: #888;
    }

    &:hover svg {
        fill: #fff;
    }

    &:hover::after {
        content: "Revert";
        position: absolute;
        right: 100%;
        top: 50%;
        transform: translateY(-50%);
        margin-right: 6px;
        padding: 4px 8px;
        background: #333;
        color: #fff;
        font-size: 11px;
        border-radius: 4px;
        white-space: nowrap;
        z-index: 10;
    }
`;
