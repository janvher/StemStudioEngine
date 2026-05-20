import styled from "styled-components";

import {IComponentInterface} from "./types";
import {flexCenter, regularFont} from "../../../../../assets/style";
import {floatingContainerStyle} from "../HUDView/FloatingNav/FloatingNav.style";

export const BarWrapper = styled.div<{
    height?: string;
    width?: string;
    $maxWidth?: string;
    $customStyle: IComponentInterface;
}>`
    font-family: ${({$customStyle}) => $customStyle.fontFamily};
    * {
        font-family: "${({$customStyle}) => $customStyle.fontFamily}";
    }
    font-size: ${({$customStyle}) => $customStyle.fontSize}px;
    color: ${({$customStyle}) => $customStyle.fontColor};
    width: ${({width}) => width || "460px"};
    height: ${({height}) => height || "50px"};
    max-width: ${({$maxWidth}) => $maxWidth ? $maxWidth : "100%"};
    border: 1px solid var(--theme-container-stroke-color);
    box-shadow: 0px 4px 15px 0px #000000;
    border-radius: ${({$customStyle}) => $customStyle.radius}px;
    box-sizing: border-box;
    display: flex;
    overflow: hidden;
    pointer-events: all;
    margin: 0 auto;
    position: relative;
    cursor: pointer;
`;

export const BarImageWrapper = styled.div<{$customStyle: IComponentInterface}>`
    width: 60px;
    height: 100%;
    background-color: ${({$customStyle}) => $customStyle.statBarColor};
    ${flexCenter}
    box-sizing: border-box;
    img {
        max-height: 80%;
    }
`;

export const ProgressBar = styled.div<{
    width: string;
    $customStyle: IComponentInterface;
}>`
    width: ${({width}) => width || "40%"};
    box-sizing: border-box;
    ${flexCenter}
    justify-content: flex-end;
    background-color: ${({$customStyle}) => $customStyle.statBarColor};
    font-family: ${({$customStyle}) => $customStyle.fontFamily};
    * {
        font-family: "${({$customStyle}) => $customStyle.fontFamily}";
    }
    border-top-right-radius: ${({$customStyle}) => $customStyle.radius}px;
    border-bottom-right-radius: ${({$customStyle}) => $customStyle.radius}px;
    height: 100%;
    padding-right: 10px;
`;

export const Bar = styled.div<{$customStyle: IComponentInterface}>`
    width: 100%;
    height: 100%;
    border-radius: ${({$customStyle}) =>
        $customStyle.iconSelected
            ? `0 ${$customStyle.radius}px ${$customStyle.radius}px 0 !important`
            : `${$customStyle.radius}px !important;`}
   
            ${({$customStyle}) =>
                $customStyle.uploadedButtonImg
                    ? `
    background-image: url('${$customStyle.uploadedButtonImg}') !important;
    background-repeat: no-repeat !important;
    background-size: cover !important;
    background-position: center !important;
  
 `
                    : `background-color: ${$customStyle.barColor}!important;`}
    ${flexCenter}
justify-content: flex-start;
    box-sizing: border-box;
`;

// For HUD Popup
export const Wrapper = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    row-gap: 16px;
`;

export const FieldWrapper = styled.div`
    width: 100%;
    .buttonImageLabel {
        width: 100%;
        display: block;
        ${regularFont("s")};
        margin-bottom: 10px;
        color: var(--theme-font-unselected-tertiary-color);
        text-align: left;
    }
`;
