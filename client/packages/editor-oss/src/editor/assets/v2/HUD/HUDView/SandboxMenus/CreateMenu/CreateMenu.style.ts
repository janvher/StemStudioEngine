import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../../assets/style";

export const AIWrapper = styled.div`
    padding: 8px;
    min-width: 320px;
    max-width: 320px;
`;

export const Menu = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    column-gap: 26px;
    padding: 12px 16px;
    border-radius: inherit;

    ${regularFont("s")};
    color: #f8fafc;
    font-weight: var(--theme-font-medium-plus);

    cursor: pointer;
    transition: all 0.2s;
    &:hover {
        background: var(--theme-container-milky);
    }
`;

export const Header = styled.div`
    color: white;
    font-size: 12px;
    width: calc(100% + 16px);
    margin-bottom: 8px;
    margin-left: -8px;
    padding: 0 8px 8px 8px;
    border-bottom: 1px solid var(--theme-container-milky);
    position: relative;
    font-weight: var(--theme-font-medium-plus);
    cursor: grab;

    ${flexCenter};
    justify-content: space-between;
`;

export const MilkyButton = styled.div`
    width: 100%;
    height: 32px;
    background: var(--theme-container-milky);
    border-radius: 16px;
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    ${flexCenter};
    cursor: pointer;
`;

export const LoadingContainer = styled.div`
    width: 100%;
    height: 120px;
    ${flexCenter};
    flex-direction: column;
    row-gap: 8px;
    .loaderWrapper svg path {
        stroke-linecap: round !important;
    }
`;

export const LoadingText = styled.div`
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
`;

export const FlexWrapper = styled.div`
    ${flexCenter};
    column-gap: 8px;
    flex-wrap: nowrap;
    width: 100%;
`;

export const ResultContainer = styled.div`
    ${flexCenter};
    row-gap: 8px;
    flex-direction: column;
`;

export const Text = styled.div`
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    max-width: 304px
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 5;
    -webkit-box-orient: vertical;
`;

export const ResultPreview = styled.div`
    background: var(--theme-container-milky);
    width: 100%;
    height: 144px;
    border-radius: 16px;
    ${flexCenter};

    .thumbnail {
        border-radius: 16px;
        width: 120px;
        aspect-ratio: 1/1;
        overflow-clip-margin: content-box;
        overflow: clip;
    }
`;
