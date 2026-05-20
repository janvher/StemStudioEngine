import styled from "styled-components";

import {flexCenter} from "../../../../assets/style";

export const NEW_EDITOR_LAYER_Z_INDEX = "9999";

export const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    z-index: ${NEW_EDITOR_LAYER_Z_INDEX};
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.05);
    backdrop-filter: blur(1px);
`;

export const Container = styled.div`
    width: 100%;
    height: 100%;
    position: absolute;
    top: 50%;
    left: 50%;
    box-sizing: border-box;
    transform: translate(-50%, -50%);
    display: flex;
    overflow: hidden;
`;

export const LoadingContainer = styled.div`
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 24px;
    box-sizing: border-box;
`;

// Shared with Material Editor MainPanel.tsx.
export const LeftWrapper = styled.div`
    position: fixed;
    z-index: 100;
    left: 12px;
    top: 12px;
    width: 243px;
    padding: 8px;
    background: var(--theme-dialog-bg);
    border: none;
    border-radius: var(--theme-dialog-border-radius);
    box-shadow: var(--theme-dialog-shadow);
    ${flexCenter};
    column-gap: 4px;
    color: var(--theme-font-main-selected-color);
    z-index: 100;
    overflow: hidden;
    transition: height 0.2s ease-in-out;

    button {
        color: white;
        font-weight: var(--theme-font-medium-plus);
        img {
            filter: brightness(1.5);
        }
    }
`;

export const GraphEditorWrapper = styled.div`
    width: 150%;
    min-width: 400px;
    background: var(--theme-grey-bg-tertiary);
    border: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
    z-index: 99;
    pointer-events: auto;
    transition:
        left 0.5s cubic-bezier(0.4, 0, 0.2, 1),
        opacity 0.3s;
`;
