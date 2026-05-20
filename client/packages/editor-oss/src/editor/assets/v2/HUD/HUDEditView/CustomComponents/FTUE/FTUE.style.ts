import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../../assets/style";
import {floatingContainerStyle} from "../../../HUDView/FloatingNav/FloatingNav.style";

export const FTUEContainer = styled.div<{
    $width: string;
    $height: string;
}>`
    display: flex;
    pointer-events: all;
    flex-direction: column;
    align-items: center;
    position: fixed;
    top: 62px;
    z-index: 1000;
    right: 12px;
    padding: 0px;
    width: ${({$width}) => $width};
    height: ${({$height}) => $height};
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(15px);
    border-radius: 24px;
`;

export const Header = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px;
    gap: 4px;
    width: 240px;
    height: 32px;
    flex: none;
    order: 0;
    align-self: stretch;
    flex-grow: 0;
`;

export const Title = styled.div`
    width: auto;
    height: 16px;
    font-style: normal;
    font-weight: var(--theme-font-medium-plus);
    font-size: 16px;
    line-height: 16px;
    display: flex;
    align-items: center;
    color: #f8fafc;
    flex: none;
    order: 0;
    flex-grow: 0;
`;

export const Content = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px;
    gap: 12px;
    width: 240px;
    height: 125px;
    flex: none;
    order: 1;
    align-self: stretch;
    flex-grow: 0;
`;

export const IconFrame = styled.div`
    width: 80px;
    height: 80px;
    flex: none;
    order: 0;
    flex-grow: 0;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
`;

export const Description = styled.div`
    width: 100%;
    height: auto;
    ${regularFont("s")}
    display: flex;
    align-items: center;
    gap: 4px;
    text-align: center;
    justify-content: center;
    color: var(--theme-font-main-selected-color);
    flex: none;
    order: 1;
    align-self: stretch;
    flex-grow: 0;
`;

export const Footer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 8px 8px 8px 12px;
    gap: 8px;
    width: 240px;
    height: 48px;
    flex: none;
    order: 2;
    align-self: stretch;
    flex-grow: 0;
`;

export const Pagination = styled.div`
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    padding: 4px;
    gap: 8px;
    margin: 0 auto;
    width: 80px;
    height: 16px;
    flex: none;
    order: 0;
    flex-grow: 0;
`;

export const Dot = styled.div<{$active?: boolean}>`
    width: ${({$active}) => $active ? "24px" : "8px"};
    height: 8px;
    background: ${({$active}) => $active ? "#FAFAFA" : "rgba(250, 250, 250, 0.4)"};
    border-radius: 6px;
    flex: none;
    flex-grow: 0;
    cursor: pointer;
`;

export const Help = styled.div`
    ${floatingContainerStyle};
    pointer-events: all;
    z-index: 1000;
    cursor: pointer;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    position: fixed;
    bottom: 12px;
    right: 12px;

    .info {
        width: 16px;
        height: 16px;
    }
`;

export const NextButton = styled.button`
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    padding: 8px 0px;
    gap: 4px;
    margin: 0 auto;
    width: 74px;
    height: 32px;
    background: #fafafa;
    border-radius: 16px;
    border: none;
    cursor: pointer;
    flex: none;
    order: 1;
    flex-grow: 0;
`;

export const ButtonText = styled.span`
    width: auto;
    height: 16px;
    font-style: normal;
    font-weight: var(--theme-font-medium-plus);
    font-size: 12px;
    line-height: 16px;
    color: #27272a;
    flex: none;
    order: 0;
    flex-grow: 0;
`;

export const MenuButton = styled.button`
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    border: none;
    background: none;
    cursor: pointer;

    width: 32px;
    height: 32px;
    flex-shrink: 0;
    flex-grow: 0;
    ${flexCenter};
`;
