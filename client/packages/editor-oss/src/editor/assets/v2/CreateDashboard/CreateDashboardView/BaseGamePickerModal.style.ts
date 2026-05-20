import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../assets/style";

export const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(8, 9, 10, 0.72);
    backdrop-filter: blur(2px);
    z-index: 10000;
    ${flexCenter};
`;

export const PickerContainer = styled.div`
    background: linear-gradient(180deg, #222323 0%, #1c1d1f 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    padding: 24px;
    max-width: 720px;
    width: 94vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    color: #fff;
`;

export const PickerHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    gap: 12px;
`;

export const PickerTitle = styled.h2`
    ${regularFont("s")};
    font-size: 18px;
    font-weight: 600;
    margin: 0;
    color: #fff;
`;

export const PromptPreview = styled.p`
    ${regularFont("s")};
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    margin: 4px 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 500px;
`;

export const CloseButton = styled.button`
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    padding: 4px;
    font-size: 20px;
    line-height: 1;
    flex-shrink: 0;

    &:hover {
        color: #fff;
    }
`;

export const SearchInput = styled.input`
    ${regularFont("s")};
    width: 100%;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    outline: none;
    margin-bottom: 16px;
    box-sizing: border-box;

    &::placeholder {
        color: rgba(255, 255, 255, 0.35);
    }

    &:focus {
        border-color: rgba(255, 255, 255, 0.25);
    }
`;

export const ScrollArea = styled.div`
    overflow-y: auto;
    flex: 1;
    min-height: 0;
`;

export const SectionLabel = styled.h3`
    ${regularFont("s")};
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 10px;
`;

export const GameGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 16px;

    @media (max-width: 600px) {
        grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: 400px) {
        grid-template-columns: 1fr;
    }
`;

export const GameCard = styled.button`
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 0;
    cursor: pointer;
    overflow: hidden;
    text-align: left;
    color: #fff;
    transition: border-color 0.15s, background 0.15s;

    &:hover {
        border-color: rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.08);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

export const GameCardThumbnail = styled.div<{$src: string}>`
    width: 100%;
    aspect-ratio: 16 / 9;
    background: url(${({$src}) => $src}) center / cover no-repeat;
    background-color: #1a1a1a;
`;

export const GameCardInfo = styled.div`
    padding: 8px 10px;
`;

export const GameCardTitle = styled.div`
    ${regularFont("s")};
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const GameCardStats = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 4px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
`;

export const PickerFooter = styled.div`
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 14px;
    margin-top: 8px;
    ${flexCenter};
`;

export const BlankProjectButton = styled.button`
    ${regularFont("s")};
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    color: #fff;
    padding: 10px 20px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
        background: rgba(255, 255, 255, 0.12);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

export const EmptyResults = styled.div`
    ${regularFont("s")};
    color: rgba(255, 255, 255, 0.35);
    text-align: center;
    padding: 24px 0;
    font-size: 13px;
`;

export const LoadingIndicator = styled.div`
    ${flexCenter};
    padding: 24px 0;
`;
