import styled from "styled-components";

import {flexCenter} from "../../../assets/style";
import {getZIndexWithinHUD, HUD_Z_INDEX} from "../../../editor/assets/v2/HUD/HUDView/services";

const mainFontSize = 18;

export const UILogin = styled.div`
    display: flex;
    justify-content: center;
    position: absolute;
    width: 90%;
    max-width: 600px;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: ${getZIndexWithinHUD(HUD_Z_INDEX.AlwaysOnTopBase, 99)};

    @media (max-width: 1024px) {
        max-width: 450px;
    }
`;

export const LoginContainer = styled.div`
    box-sizing: border-box;
    height: 100%;
    width: 100%;
    background: #291f1b;
    padding: 24px;

    ${flexCenter};
    flex-direction: column;

    border-radius: 20px;
    pointer-events: all;
    box-shadow: 0px 4px 0px 2px #1f171440;
    color: #f7f0e7;

    @media (max-width: 768px) {
        padding: 20px;
    }
`;

export const LoginForm = styled.section`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    row-gap: 18px;
    width: 100%;
    height: 100%;
    font-family: Balsamiq_Sans;
    font-size: clamp(${mainFontSize * 0.8}px, 2vw, ${mainFontSize * 1.5}px);
    font-weight: var(--theme-font-medium-plus);
    line-height: 100%;

    * {
        font-family: Balsamiq_Sans;
    }
`;

export const LoginHeader = styled.span`
    font-size: clamp(${mainFontSize * 0.8}px, 2vw, ${mainFontSize * 1.5}px);
    ${flexCenter};
    width: 100%;
    position: relative;

    img.warningIcon,
    img.xIcon {
        width: clamp(24px, 3vw, 40px);
        height: auto;
        margin-right: 6px;
    }

    .closeButton {
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
    }
`;

export const InputWrapper = styled.section`
    display: flex;
    flex-direction: column;
    row-gap: 5px;
    width: 100%;
    align-items: flex-start;
    justify-content: center;

    padding-top: 20px;
    border-top: 2px solid #5c524e;

    .label {
        font-weight: var(--theme-font-medium-plus);
        font-size: clamp(${mainFontSize * 0.8}px, 2vw, ${mainFontSize * 1.2}px);
    }

    @media (max-width: 768px) {
        padding-top: 12px;
    }
`;

export const ErrorMessage = styled.div`
    color: #ca5649;
    font-size: clamp(${mainFontSize - 6}px, 1.2vw, ${mainFontSize}px);
    font-weight: var(--theme-font-medium-plus);
    font-style: italic;
    margin-top: 5px;
    min-height: 20px;
`;

export const ReminderMessage = styled(ErrorMessage)`
    width: 100%;
    text-align: center;
    font-size: clamp(${mainFontSize}px, 1.3vw, ${mainFontSize * 1.5}px);
    font-style: normal;
    margin-top: -6px;
    margin-bottom: 4px;
    line-height: 120%;

    @media (max-width: 768px) {
        margin-top: 0;
        font-size: clamp(${mainFontSize - 2}px, 1.5vw, ${mainFontSize * 1.5}px);
    }
`;

export const SubmitBtn = styled.div<{$guest?: boolean}>`
    ${flexCenter};
    width: 100%;
    height: 52px;
    font-size: clamp(${mainFontSize * 0.8}px, 2vw, ${mainFontSize * 1.2}px);
    background: linear-gradient(0deg, #286535 0%, #358747 30%, #42a959 75%);
    border: 1px solid #358747;
    box-shadow:
        0px 6px 0px 0px #1f171440,
        0px -3px 0px 0px #286535 inset;
    border-radius: 12px;

    &.disabled-btn {
        cursor: auto;
        opacity: 50%;
    }

    &.no-highlight {
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
    }

    .btnLabel {
        -webkit-text-stroke: 4px #286535;
        paint-order: stroke fill;
        cursor: pointer;
        transform: translateY(2px);
    }

    ${({$guest}) =>
        $guest &&
        `
    background: linear-gradient(0deg, #1A7498 0%, #239ACB 30%, #2CC1FE 75%);
    border: 1px solid #239ACB;
    box-shadow:
        0px 6px 0px 0px #1f171440,
        0px -3px 0px 0px #1A7498 inset;
    .btnLabel {
           -webkit-text-stroke: 4px #1A7498;
    }
    `}

    @media (max-width: 768px) {
        height: 40px;
    }
`;

export const LoginButton = styled(SubmitBtn)<{$apple?: boolean}>`
    column-gap: 6px;
    border: none;
    font-family: Roboto;
    font-weight: var(--theme-font-medium-plus);
    box-shadow: none;
    .btnLabel {
        -webkit-text-stroke: unset;
        paint-order: unset;
    }

    background: #fff;
    color: #0000008a;

    ${({$apple}) =>
        $apple &&
        `
        color: #fff;
        background: #000;
        img {
        margin-top: -3px;
        }
    `}
`;

export const Or = styled.div`
    ${flexCenter};
    width: 100%;
    column-gap: 12px;
    font-size: clamp(${mainFontSize * 0.8}px, 2vw, ${mainFontSize * 1.2}px);
    .text {
        flex-shrink: 0;
    }
    .divider {
        flex-grow: 1;
        width: 100%;
        height: 2px;
        background: #5c524e;
    }
`;
