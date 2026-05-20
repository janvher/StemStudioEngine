import styled from "styled-components";

export const SearchContainer = styled.div`
    padding: 8px;
    border-bottom: 1px solid var(--theme-grey-bg);
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export const SearchInputContainer = styled.div`
    position: relative;
    display: flex;
    align-items: center;
`;

export const SearchInput = styled.input`
    width: 100%;
    height: 24px;
    padding: 4px 8px;
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--theme-grey-bg);
    border-radius: 2px;
    color: var(--theme-font-main-selected-color);
    font-size: var(--theme-font-size-extra-small);

    &:focus {
        outline: none;
        border-color: var(--theme-container-active-blue);
    }

    &::placeholder {
        color: #666;
    }
`;

export const SearchResultsContainer = styled.div`
    max-height: 200px;
    overflow-y: auto;
    border-top: 1px solid var(--theme-grey-bg);
    margin-top: 4px;
`;

export const SearchResultItem = styled.div<{$isSelected: boolean}>`
    padding: 4px 8px;
    cursor: pointer;
    font-size: var(--theme-font-size-extra-small);
    background-color: ${props => props.$isSelected ? "#262626" : "transparent"};

    &:hover {
        background-color: #262626;
    }

    .match-preview {
        color: #888;
        margin-top: 2px;
    }

    .highlight {
        background-color: #f0c674;
        color: #1e1e1e;
    }
`;
