import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../assets/style";

export const Container = styled.div`
    width: 90%;
    max-width: 1266px;
    height: 90%;
    max-height: 916px;
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    border-radius: var(--theme-dialog-border-radius);
    border: 1px solid #ffffff1a;
    transition: all 0.4s;
    background: var(--theme-dialog-bg);
    box-shadow: var(--theme-dialog-shadow);
    z-index: 999;

    .close-button {
        position: absolute;
        right: 24px;
        top: 9px;
        font-size: 20px;
        cursor: pointer;
    }

    @media only screen and (min-height: 900px) {
        height: 800px;
    }

    @media only screen and (max-width: 768px), (pointer: coarse) {
        width: 100%;
        height: 100dvh;
        max-height: 100dvh;
        border-radius: 0;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        inset: 0;
        transform: none;
    }
`;

export const HeaderWrapper = styled.div<{$sticky?: boolean}>`
    ${flexCenter};
    justify-content: space-between;
    padding: 12px 8px;
    border-bottom: 2px solid var(--theme-container-divider);

    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    background: inherit;
`;

export const Title = styled.div`
    ${regularFont("s")};
    color: #fff;
    font-size: 20px;
    font-weight: 700;
`;

export const BottomBar = styled.div`
    ${flexCenter};
    padding: 16px 8px;
    flex-shrink: 0;
    width: 100%;
    border-top: 1px solid var(--theme-container-divider);
    background: inherit;

    @media only screen and (max-width: 768px) {
        padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    }
`;

export const FlexIconContainer = styled.div`
    ${flexCenter};
    column-gap: 16px;
    margin-right: 16px;
`;

export const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9999;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.05);
    backdrop-filter: blur(1px);
`;

export const StyledTemplateList = styled.div`
    width: 100%;
    margin: 0 auto;
    display: inline-grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: stretch;
    justify-content: start;
    grid-gap: 16px;
    padding: 24px;
    max-width: 100%;

    @media only screen and (max-width: 1024px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media only screen and (max-width: 768px) {
        grid-template-columns: 1fr;
        grid-gap: 12px;
        padding: 16px;
    }
`;
