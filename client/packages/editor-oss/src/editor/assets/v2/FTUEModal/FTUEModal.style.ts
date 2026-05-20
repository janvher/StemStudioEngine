import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../assets/style";

export const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100dvh;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 1000;
    ${flexCenter};
`;

export const Container = styled.div`
    width: 900px;
    max-width: 95vw;
    max-height: 95vh;
    background: #2a2d35;
    border-radius: 24px;
    box-shadow: 0px 4px 24px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;

    @media only screen and (max-width: 768px), (pointer: coarse) {
        width: 100dvw;
        max-width: 100dvw;
        max-height: 100dvh;
        height: 100dvh;
        border-radius: 0;
    }
`;

export const Header = styled.div`
    width: 100%;
    padding: 24px;
    text-align: center;
    position: relative;
    flex-shrink: 0;

    h1 {
        font-weight: bold;
        font-size: 22px;
        font-style: italic;
        margin: 0;
        color: #c8d0dc;
    }

    @media only screen and (max-width: 768px) {
        padding: 16px;

        h1 {
            font-size: 18px;
        }
    }
`;

export const Content = styled.div`
    padding: 0 24px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    flex: 1;
    overflow-y: auto;
    min-height: 0;

    @media only screen and (max-width: 768px) {
        grid-template-columns: 1fr;
        padding: 0 16px;
        gap: 16px;
    }
`;

export const StepCard = styled.div`
    background: #363940;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
`;

export const StepImageContainer = styled.div`
    width: 100%;
    height: 180px;
    overflow: hidden;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
`;

export const StepTitle = styled.h3`
    font-weight: bold;
    font-size: 18px;
    color: #ffffff;
    margin: 0;
    padding: 14px 16px 4px;
`;

export const StepDescription = styled.p`
    ${regularFont("s")};
    color: #9ba2ae;
    margin: 0;
    padding: 0 16px 14px;
    line-height: 1.4;
`;

export const Footer = styled.div`
    padding: 20px 24px 24px;
    display: flex;
    justify-content: center;
    flex-shrink: 0;

    @media only screen and (max-width: 768px) {
        padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
    }
`;

export const DottedLine = styled.div<{$rotation?: string; $top?: string; $left?: string; $width?: string}>`
    position: absolute;
    top: ${({$top}) => $top || "auto"};
    left: ${({$left}) => $left || "auto"};
    width: ${({$width}) => $width || "100px"};
    height: 2px;
    border-top: 2px dashed #ffd700;
    transform: rotate(${({$rotation}) => $rotation || "0deg"});
    pointer-events: none;
    opacity: 0.6;
    z-index: 1;
`;
