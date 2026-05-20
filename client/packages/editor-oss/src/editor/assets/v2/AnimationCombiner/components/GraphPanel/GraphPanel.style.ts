import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../assets/style";

export const GraphPanelContainer = styled.div`
    box-sizing: border-box;
    position: fixed;
    z-index: 100;
    right: 12px;
    top: 12px;
    width: 240px;
    height: calc(100svh - 24px);
    background: var(--theme-grey-bg-tertiary);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    color: var(--theme-font-main-selected-color);
    z-index: 100;
    overflow: hidden;
    transition: height 0.2s ease-in-out;
`;

export const Separator = styled.div`
    height: 1px;
    width: 100%;
    background: rgba(255, 255, 255, 0.1);
`;

export const Wrapper = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    height: 100%;
    overflow: hidden;
`;

export const AnimationButtonSection = styled.div`
    height: 48px;
    width: 100%;
    padding: 8px;
    background: var(--theme-grey-bg-tertiary);

    button {
        ${regularFont("s")};
        font-weight: var(--theme-font-medium-plus);
        width: 100%;
    }
`;

export const LabelButton = styled.div`
    background-color: var(--theme-grey-bg);
    border-top: none;
    width: 100%;
    height: 32px;
    padding: 8px;
    border-radius: 8px;
    ${flexCenter};
    column-gap: 4px;
    transition: all 0.2s;

    ${regularFont("s")};
    color: #f8fafc;
    font-weight: var(--theme-font-medium-plus);
`;
