import styled from "styled-components";

import sendIcon from "./icons/send.svg";
import {flexCenter} from "../../../../../../assets/style";

export const ChatContainer = styled.div`
    pointer-events: all;
    position: absolute;
    bottom: 24px;
    left: 24px;
    width: 480px;
    height: 240px;
    border-radius: 16px;
    background: #00000066;
    backdrop-filter: blur(16px);
    overflow: hidden;
    pointer-events: all;

    * {
        box-sizing: border-box;
    }
`;
export const Messages = styled.div`
    width: calc(100% - 16px - 16px);
    height: calc(192px - 18px - 16px);
    margin: 16px;

    .messagesWrapper {
        ${flexCenter};
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-end;
        min-height: 100%;
    }

    .message {
        margin-top: 12px;
    }

    .author,
    .text {
        width: 100%;
        font-size: var(--theme-font-size-s);
        font-weight: var(--theme-font-medium-plus);
        line-height: 16.94px;
        text-align: left;
        color: #fff;
    }

    .text {
        font-weight: 400;
    }

    .text {
        display: block;

        p {
            margin: 0 0 8px;
        }

        ul, ol {
            margin: 0 0 8px;
            padding-left: 16px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
        }

        th, td {
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 4px 6px;
            text-align: left;
            vertical-align: top;
            font-size: 12px;
        }

        th {
            background: rgba(255, 255, 255, 0.08);
            font-weight: var(--theme-font-semibold);
        }
    }
`;

export const InputContainer = styled.div`
    position: relative;
    width: 100%;

    &:after {
        content: "";
        position: absolute;
        right: 16px;
        top: 12px;
        width: 24px;
        height: 24px;
        background: url("${sendIcon}") no-repeat center center;
        background-size: contain;
        pointer-events: none;
    }
`;

export const ChatInput = styled.input`
    width: 100%;
    height: 48px;
    padding: 12px calc(16px + 24px + 4px) 12px 16px;
    border: none;
    border-top: 1px solid #ffffff99;
    background: transparent;
    color: #fff;
    position: relative;
    &::placeholder {
        color: #ffffff99;
        font-size: var(--theme-font-size-s);
        font-weight: 400;
        line-height: 16px;
        text-align: left;
    }
`;

export const NoMessages = styled.div`
    font-size: 16px;
    font-weight: 400;
    line-height: 120%;
    text-align: left;
    color: #fff;
`;
