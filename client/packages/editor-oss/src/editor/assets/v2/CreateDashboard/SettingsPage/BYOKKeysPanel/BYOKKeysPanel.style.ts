import styled from "styled-components";

import {regularFont} from "../../../../../../assets/style";
import {AccountBox, Heading as BaseHeading} from "../SettingsPage.style";

export const Box = styled(AccountBox)`
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
`;

export const Heading = styled(BaseHeading)``;

export const Hint = styled.p`
    ${regularFont("s")};
    margin: 0;
    color: #9ba2ae;
    line-height: 1.5;
`;

export const Table = styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px 16px;
    align-items: center;
`;

export const Row = styled.div`
    display: contents;
`;

export const Label = styled.div`
    ${regularFont("s")};
    color: #c8d0dc;
    display: flex;
    align-items: center;
    gap: 8px;
`;

export const StatusBadge = styled.span<{$tone: "ready" | "missing"}>`
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${({$tone}) => ($tone === "ready" ? "#7fd28e" : "#ffd773")};
    background: ${({$tone}) => ($tone === "ready" ? "rgba(127, 210, 142, 0.12)" : "rgba(255, 215, 115, 0.12)")};
`;

export const SourceText = styled.span`
    ${regularFont("xs")};
    color: #6e7682;
`;

export const ActionsRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

export const KeyInput = styled.input`
    background: #2a2d35;
    border: 1px solid #3e424c;
    color: #ffffff;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 13px;
    width: 220px;

    &::placeholder {
        color: #6e7682;
    }

    &:focus {
        outline: none;
        border-color: #5b9dff;
    }
`;

export const SmallButton = styled.button<{$variant?: "primary" | "ghost"}>`
    background: ${({$variant}) => ($variant === "ghost" ? "transparent" : "#5b9dff")};
    color: ${({$variant}) => ($variant === "ghost" ? "#9ba2ae" : "#ffffff")};
    border: ${({$variant}) => ($variant === "ghost" ? "1px solid #3e424c" : "none")};
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;

    &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }
`;

export const PassphraseSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px solid #3e424c;
    border-radius: 8px;
    background: rgba(91, 157, 255, 0.04);
`;

export const PassphraseRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
`;
