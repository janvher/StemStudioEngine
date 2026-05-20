import styled from "styled-components";

import {regularFont} from "../../../../../../assets/style";
import {modalContainerStyles} from "../../../common/styles";

export const Container = styled.div`
    width: 380px;
    max-height: 70vh;
    ${modalContainerStyles};
    border: none;
    border-radius: 16px;
    color: white;
    font-size: var(--theme-font-size-s);
`;

export const Title = styled.div`
    width: 100%;
    padding: 16px 16px 12px;
    ${regularFont("s")};
    font-size: 16px;
    font-weight: 600;
    flex-shrink: 0;
`;

export const TitleRow = styled.div`
    display: flex;
    align-items: center;
`;

export const CloseButton = styled.button`
    margin-left: auto;
    margin-right: 12px;

    img {
        width: 13px;
        height: auto;
    }
`;

export const Content = styled.div`
    padding: 0 16px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const RemixRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
        background: rgba(255, 255, 255, 0.06);
    }
`;

export const RemixThumbnail = styled.img`
    width: 64px;
    height: 48px;
    border-radius: 8px;
    object-fit: cover;
    background: var(--theme-grey-bg);
`;

export const RemixInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
`;

export const RemixName = styled.div`
    ${regularFont("s")};
    font-weight: var(--theme-font-medium);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const RemixDate = styled.div`
    ${regularFont("s")};
    font-size: 12px;
    color: var(--theme-font-unselected-color);
`;

export const Footer = styled.div`
    padding: 16px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    flex-shrink: 0;
`;
