import styled from "styled-components";

import {regularFont} from "../../../../assets/style";

export const SummaryCard = styled.div`
    background: var(--theme-grey-bg, #2a2a2a);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
`;

export const SummaryRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;

    label {
        ${regularFont("s")};
        color: rgba(255, 255, 255, 0.5);
    }

    span {
        ${regularFont("s")};
        font-weight: var(--theme-font-bold);
        color: #fff;
    }
`;

export const ButtonRow = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

export const ActionButton = styled.button<{$variant?: "primary" | "secondary" | "dark"}>`
    height: 32px;
    padding: 0 16px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    ${regularFont("s")};
    font-weight: var(--theme-font-medium);
    transition: opacity 0.2s;

    background: ${({$variant}) => {
        if ($variant === "primary") return "#34d399";
        if ($variant === "dark") return "rgba(255,255,255,0.08)";
        return "rgba(255,255,255,0.1)";
    }};
    color: ${({$variant}) => ($variant === "primary" ? "#000" : "#fff")};

    &:hover {
        opacity: 0.85;
    }
`;
