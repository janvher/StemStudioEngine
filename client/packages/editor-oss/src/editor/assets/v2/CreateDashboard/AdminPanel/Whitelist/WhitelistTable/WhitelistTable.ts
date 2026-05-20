import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../../assets/style";

export const Table = styled.table`
    width: 100%;
    border-collapse: collapse;

    * {
        color: white;
    }

    tbody {
        background-color: var(--theme-grey-bg);
    }
`;

export const Th = styled.th<{$radiusLeft?: boolean}>`
    background-color: var(--theme-grey-bg-secondary);
    ${({$radiusLeft}) => $radiusLeft ? " border-top-left-radius: 8px;" : "border-top-right-radius: 8px;"};
    padding: 10px;
    text-align: left;
    border-bottom: 2px solid #ddd;
`;

export const Td = styled.td`
    padding: 10px;
    border-bottom: 1px solid #a1a1aa;
    user-select: text;
`;

export const ActionsCell = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

export const ActionButton = styled.button<{$variant?: "primary" | "secondary" | "danger"}>`
    border: none;
    border-radius: 6px;
    padding: 6px 10px;
    cursor: pointer;
    font-size: 12px;
    line-height: 1;
    background: ${({$variant}) =>
        $variant === "primary"
            ? "var(--theme-dialog-button-primary)"
            : $variant === "danger"
              ? "rgba(239, 68, 68, 0.18)"
              : "rgba(255, 255, 255, 0.08)"};
    color: white;
    transition: background 0.2s ease;

    &:hover:not(:disabled) {
        background: ${({$variant}) =>
        $variant === "primary"
            ? "var(--theme-dialog-button-primary-hover)"
            : $variant === "danger"
              ? "rgba(239, 68, 68, 0.28)"
              : "rgba(255, 255, 255, 0.14)"};
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }
`;

export const TrashButton = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;

    &:disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }
`;

export const FlexWrapper = styled.div`
    ${flexCenter};
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    column-gap: 8px;
`;

export const SearchSection = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
    box-sizing: border-box;
`;
