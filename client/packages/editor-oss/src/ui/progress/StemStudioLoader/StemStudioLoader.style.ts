import styled, {keyframes} from "styled-components";

import {regularFont} from "../../../assets/style";

const fadeOut = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`;

export const LoadMaskWrapper = styled.div<{$show: boolean}>`
    position: fixed;
    display: flex;
    z-index: 2000;
    bottom: 0;
    left: 0;
    width: 100%;
    height: calc(100% - 52px);

    align-items: flex-end;
    justify-content: center;
    margin-top: 52px;
    animation: ${props => !props.$show && fadeOut} 1s forwards;
`;

export const Background = styled.div`
    position: fixed;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;

    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    background-color: #050816;
    overflow: hidden;
`;

export const ContentWrapper = styled.div`
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
`;

export const LogoImage = styled.img`
    width: min(180px, 70vw);
    height: auto;
    max-width: 100%;
    animation: logoHover 3.2s ease-in-out infinite;
`;

export const ProgressText = styled.div`
    ${regularFont("s")};
    font-weight: var(--theme-font-medium);
    color: rgba(255, 255, 255, 0.72);
    letter-spacing: 0.04em;
    text-align: center;
`;

export const StatusMessage = styled.div`
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
    font-size: 13px;
    min-height: 18px;
`;

export const BottomRightBrandContainer = styled.div`
    position: fixed;
    right: 12px;
    bottom: 12px;
    margin-right: 20px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    pointer-events: none;
    z-index: 1;
`;

export const BottomRightBrandLogo = styled.img`
    width: min(128px, 19.2vw);
    height: auto;
    opacity: 0.9;
    user-select: none;
    pointer-events: none;
    -webkit-user-drag: none;

    @media (max-width: 768px) {
        width: 54px;
    }

    @media (max-width: 768px) and (orientation: portrait) {
        width: 40px;
    }

    @media (max-width: 430px) and (orientation: portrait) {
        width: 31px;
    }
`;
