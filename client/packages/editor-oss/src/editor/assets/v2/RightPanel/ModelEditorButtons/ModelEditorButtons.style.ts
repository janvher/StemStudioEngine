import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../assets/style";

export const ButtonsWrapper = styled.div`
    width: 100%;
    ${flexCenter};
    align-items: flex-start;
    flex-direction: column;
    row-gap: 16px;
`;

export const ButtonContainer = styled.div`
    width: 100%;
    ${flexCenter};
    align-items: flex-start;
    flex-direction: column;
    row-gap: 8px;
`;

export const EditorButton = styled.button`
    padding: 0;
    margin: 0;
    border: none;
    cursor: pointer;
    width: 100%;
    height: 43px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--theme-grey-bg);
    border-radius: 8px;
    overflow: hidden;
`;

export const ButtonContent = styled.div`
    display: flex;
    align-items: center;
    flex: 1;
    gap: 12px;
    min-width: 0;
    overflow: hidden;
`;

export const ImgWrapper = styled.div<{$active: boolean}>`
    border: 1px solid ${({$active}) => $active ? "white" : "transparent"};
    width: 43px;
    height: 43px;
    border-radius: 8px;
    overflow: hidden;
`;

export const MaterialLabel = styled.div`
    ${regularFont("s")};
    color: #aeaeae;
    flex: 1;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    margin-right: 8px;
`;

export const Label = styled.div`
    ${regularFont("s")};
    color: #aeaeae;
`;

export const MainIcon = styled.img`
    width: 43px;
    height: 100%;
    border-radius: 8px;
`;

export const EditIcon = styled.img`
    width: 13px;
    height: 13px;
    margin-right: 8px;
    flex-shrink: 0;
`;

export const VisibilityIcon = styled.img`
    width: 13px;
    height: 13px;
    margin-right: 8px;
    flex-shrink: 0;
`;
