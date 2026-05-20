import styled from "styled-components";

export const FloatingPanelOverlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 9999;
`;

export const FloatingPanelContainer = styled.div`
    position: fixed;
    z-index: 10000;
    background: var(--theme-dialog-bg);
    border: 1px solid var(--theme-container-divider);
    border-radius: var(--theme-dialog-border-radius);
    box-shadow: var(--theme-dialog-shadow);
    display: flex;
    flex-direction: column;
    color: var(--theme-font-main-selected-color);
`;

export const FloatingPanelHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--theme-container-divider);
`;

export const FloatingPanelTitle = styled.span`
    font-size: 12px;
    font-weight: var(--theme-font-medium-plus);
    color: var(--theme-font-main-selected-color);
    letter-spacing: 0.3px;
`;

export const FloatingPanelCloseButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 3px;
    color: var(--theme-font-unselected-color);
    cursor: pointer;

    &:hover {
        background: var(--theme-container-secondary-dark);
        color: var(--theme-font-main-selected-color);
    }
`;
