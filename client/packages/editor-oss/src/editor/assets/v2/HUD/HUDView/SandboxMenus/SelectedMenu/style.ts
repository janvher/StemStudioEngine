import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../../assets/style";

export const ObjectContainer = styled.div`
    ${flexCenter};
    flex-direction: column;
    row-gap: 8px;
    padding: 8px;
    width: 160px;
    margin: 0 auto;

    form {
        height: 27px;
        ${flexCenter};
        justify-content: flex-start;
    }
`;

export const Preview = styled.div`
    background: var(--theme-container-milky);
    width: 100%;
    border-radius: 16px;
    aspect-ratio: 1/1;
    ${flexCenter};

    .thumbnail {
        border-radius: 16px;
        width: 100%;
        height: 100%;
        overflow-clip-margin: content-box;
        overflow: clip;
    }

    .primitive {
        width: 65%;
        height: 65%;
        filter: brightness(4);
    }
`;

export const ObjectNameWrapper = styled.div`
    ${flexCenter};
    justify-content: space-between;
    column-gap: 4px;
    width: 100%;
    height: 27px;
`;

export const ObjectName = styled.div`
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    display: inline-block;
    max-width: 120px;

    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
`;

export const RenameInput = styled.input`
    ${flexCenter};
    justify-content: space-between;
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    border: none;
    background: transparent;
    outline: none;
    width: 100%;
`;
