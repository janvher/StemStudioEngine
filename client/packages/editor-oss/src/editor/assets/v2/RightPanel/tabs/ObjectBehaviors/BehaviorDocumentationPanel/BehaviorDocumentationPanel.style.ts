import styled from "styled-components";

import {regularFont} from "../../../../../../../assets/style";

export const Panel = styled.div`
    display: flex;
    flex-direction: column;
    width: 240px;
    height: 360px;
    min-width: 220px;
    min-height: 220px;
    max-width: 70vw;
    max-height: 80vh;
    padding: 12px;
    overflow: hidden;
    resize: both;
    color: #fff;

    background: var(--theme-container-minor-dark);
    border: 1px solid #ffffff1a;
    border-radius: 16px;
    z-index: 10000;
`;

export const PanelHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #ffffff1a;
`;

export const PanelTitle = styled.div`
    ${regularFont("s")};
    font-weight: var(--theme-font-semibold);
    color: #fff;
`;

export const CloseButton = styled.div`
    width: 16px;
    height: 16px;
    cursor: pointer;
    opacity: 0.7;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FAFAFA;
    &:hover {
        opacity: 1;
    }
`;

export const MarkdownContent = styled.div`
    ${regularFont("s")};
    color: #fff;
    line-height: 1.5;
    flex: 1;
    min-height: 0;
    overflow: auto;

    h2 {
        font-size: 13px;
        font-weight: var(--theme-font-semibold);
        margin: 8px 0 4px;
        &:first-child { margin-top: 0; }
    }
    h3 {
        font-size: 12px;
        font-weight: var(--theme-font-semibold);
        margin: 6px 0 2px;
    }
    p {
        margin: 4px 0;
        font-size: 11px;
    }
    ul {
        margin: 4px 0;
        padding-left: 16px;
    }
    li {
        font-size: 11px;
        margin: 2px 0;
    }
    strong {
        font-weight: var(--theme-font-semibold);
    }
    code {
        background: #ffffff1a;
        padding: 1px 4px;
        border-radius: 3px;
        font-size: 10px;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 6px 0;
    }
    th, td {
        border: 1px solid #ffffff1f;
        padding: 4px 6px;
        font-size: 10px;
        text-align: left;
        vertical-align: top;
    }
    th {
        font-weight: var(--theme-font-semibold);
        background: #ffffff0a;
    }
`;

export const DocTextarea = styled.textarea`
    ${regularFont("s")};
    width: 100%;
    min-height: 0;
    flex: 1;
    padding: 8px;
    border: 1px solid #ffffff1a;
    border-radius: 8px;
    background: var(--theme-grey-bg);
    color: var(--theme-font-input-color);
    box-sizing: border-box;
    resize: none;
    font-size: 11px;
    line-height: 1.4;

    &::placeholder {
        color: #a1a1aa;
    }

    &:focus {
        outline: none;
        border-color: var(--theme-container-active-blue);
    }
`;
