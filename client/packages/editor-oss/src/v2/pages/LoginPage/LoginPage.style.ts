import styled, {css} from "styled-components";

import {flexCenter} from "../../../assets/style";

export const loginButtonCommonCss = css`
    width: 100%;
    height: 48px;
    padding: 0 24px;
    ${flexCenter};
    column-gap: 16px;
    border-radius: 8px;
    font-size: 16px;
    letter-spacing: 0.48px;
    cursor: pointer;
    box-shadow: none;
`;

export const Wrapper = styled.div`
    width: 100vw;
    min-height: 100vh;
    min-height: -webkit-fill-available;
    height: 100dvh;
    background-color: #09090b;
    ${flexCenter};
    justify-content: safe center;
    flex-direction: column;
    row-gap: 16px;
    position: relative;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 32px 0;
    box-sizing: border-box;

    @media only screen and (orientation: landscape) and (max-height: 500px) {
        justify-content: flex-start;
        min-height: 100dvh;
        box-sizing: border-box;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
    }
`;
