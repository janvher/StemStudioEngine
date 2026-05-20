import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../../assets/style";

export const Container = styled.div`
    position: fixed;
    top: 50vh;
    left: 50vw;
    transform: translate(-50%, -50%);
    z-index: 1000;
    width: 264px;
    height: 618px;

    background: var(--theme-grey-bg-tertiary);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 16px;
    color: var(--theme-font-main-selected-color);

    ${flexCenter};
    flex-direction: column;
    justify-content: flex-start;
    row-gap: 0px;

    * {
        box-sizing: border-box;
    }
`;

export const CloseBtn = styled.button`
    position: absolute;
    right: 16px;
    top: 8px;
    font-size: 20px;
`;

export const Content = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
`;

export const ContentWrapper = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 8px;
    ${regularFont("s")};
    color: var(--theme-font-unselected-color);
`;

export const BottomBar = styled.div`
    margin-top: auto;
    padding: 0 20px 18px;
    ${flexCenter};
    ${regularFont("s")};
    color: var(--theme-font-input-color);
    text-align: center;
    flex-direction: column;
    gap: 12px;
    p {
        margin: 0;
    }
`;

export const Wrapper = styled.div`
    height: 264px;
    min-height: 264px;
    width: 100%;
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;

    canvas {
        border-top-left-radius: 16px;
        border-top-right-radius: 16px;
    }
`;

export const LoadingOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    ${flexCenter};
    flex-direction: column;
    gap: 12px;
    z-index: 10;
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
`;

export const LoadingText = styled.div`
    ${regularFont("s")};
    color: var(--theme-font-main-selected-color);
`;
