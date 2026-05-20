import styled from "styled-components";

import {regularFont} from "../../../../../../assets/style";

// --- Panel container ---------------------------------------------------------

export const PanelContainer = styled.div`
    width: 100%;
    height: 200px;
    min-height: 100px;
    max-height: 50%;
    border-top: 2px solid var(--theme-container-divider);
    background: var(--theme-container-main-dark);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
`;

// --- Header row --------------------------------------------------------------

export const PanelHeader = styled.div`
    display: flex;
    align-items: center;
    height: 32px;
    padding: 0 8px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--theme-container-divider);
    gap: 8px;
`;

export const PanelTitle = styled.span`
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    color: var(--theme-font-main-selected-color);
    white-space: nowrap;
`;

export const PanelSearchInput = styled.input`
    flex: 1;
    height: 24px;
    padding: 0 8px;
    border: 1px solid var(--theme-grey-bg);
    border-radius: 4px;
    background: var(--theme-container-bg);
    color: var(--theme-font-main-selected-color);
    ${regularFont("s")};
    outline: none;

    &:focus {
        border-color: var(--theme-container-active-blue);
    }

    &::placeholder {
        color: #666;
    }
`;

export const LoadingIndicator = styled.span`
    ${regularFont("xs")};
    color: #666;
    white-space: nowrap;
`;

export const CloseButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #a1a1aa;
    cursor: pointer;

    &:hover {
        background: #ffffff14;
        color: #fff;
    }
`;

// --- Results body ------------------------------------------------------------

export const ResultsBody = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
`;

// --- File group --------------------------------------------------------------

export const FileGroup = styled.div`
    &:not(:last-child) {
        margin-bottom: 2px;
    }
`;

export const FileGroupHeader = styled.div`
    display: flex;
    align-items: center;
    height: 24px;
    padding: 0 12px;
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    color: var(--theme-font-main-selected-color);
    cursor: pointer;
    user-select: none;

    &:hover {
        background: #262626;
    }
`;

export const KindBadge = styled.span<{$kind: string}>`
    ${regularFont("xs")};
    padding: 0 4px;
    border-radius: 3px;
    margin-right: 6px;
    background: ${p =>
        p.$kind === "behavior" ? "#2563eb33" :
        p.$kind === "lambda" ? "#7c3aed33" : "#52525b33"};
    color: ${p =>
        p.$kind === "behavior" ? "#60a5fa" :
        p.$kind === "lambda" ? "#a78bfa" : "#a1a1aa"};
`;

export const MatchCount = styled.span`
    ${regularFont("xs")};
    color: #666;
    margin-left: auto;
`;

// --- Match line --------------------------------------------------------------

export const MatchLine = styled.div`
    display: flex;
    align-items: center;
    height: 22px;
    padding: 0 12px 0 28px;
    cursor: pointer;
    ${regularFont("s")};
    color: #a1a1aa;

    &:hover {
        background: #262626;
        color: var(--theme-font-main-selected-color);
    }
`;

export const LineNumber = styled.span`
    width: 40px;
    text-align: right;
    margin-right: 8px;
    color: #666;
    flex-shrink: 0;
    ${regularFont("xs")};
`;

export const MatchText = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
`;

export const HighlightSpan = styled.span`
    background: #f0c67444;
    color: #f0c674;
    border-radius: 2px;
`;

// --- Empty / no-results ------------------------------------------------------

export const EmptyResults = styled.div`
    padding: 16px;
    text-align: center;
    color: #666;
    ${regularFont("s")};
`;
