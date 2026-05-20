import styled from "styled-components";

import {regularFont} from "../../../../../../assets/style";

// --- Container ---------------------------------------------------------------

export const TreeContainer = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--ce-sidebar-bg, var(--theme-container-main-dark));
    color: var(--ce-fg, var(--theme-font-main-selected-color));
    font-size: 12px;
`;

// --- Search ------------------------------------------------------------------

export const SearchWrapper = styled.div`
    position: relative;
    padding: 8px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--ce-border, var(--theme-container-divider));
`;

export const SearchInput = styled.input`
    width: 100%;
    height: 28px;
    padding: 0 28px 0 8px;
    border: 1px solid var(--ce-border, var(--theme-grey-bg));
    border-radius: 4px;
    background: var(--ce-bg, var(--theme-container-bg));
    color: var(--ce-fg, var(--theme-font-main-selected-color));
    ${regularFont("s")};
    outline: none;

    &:focus {
        border-color: var(--ce-tab-active-border, var(--theme-container-active-blue));
    }

    &::placeholder {
        color: #666;
    }
`;

export const SearchClearButton = styled.button`
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: #666;
    cursor: pointer;
    padding: 0;

    &:hover {
        background: #ffffff14;
        color: #a1a1aa;
    }
`;

// --- Scrollable body ---------------------------------------------------------

export const TreeBody = styled.div`
    flex: 1;
    overflow-y: auto;
    padding-bottom: 60px;
`;

// --- Folder header -----------------------------------------------------------

export const FolderHeader = styled.div<{$isOpen: boolean}>`
    display: flex;
    align-items: center;
    height: 32px;
    padding: 0 8px;
    cursor: pointer;
    user-select: none;
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);

    &:hover {
        background-color: var(--ce-bg-lighter, #262626);
    }
`;

export const FolderChevron = styled.span<{$isOpen: boolean}>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    margin-right: 4px;
    transition: transform 0.15s;
    transform: rotate(${p => (p.$isOpen ? "90deg" : "0deg")});
    color: #a1a1aa;
    font-size: 10px;
`;

export const FolderLabel = styled.span`
    flex: 1;
`;

export const FolderCount = styled.span`
    color: #666;
    margin-left: 4px;
    ${regularFont("xs")};
`;

export const FolderAddButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    margin-left: 4px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #a1a1aa;
    cursor: pointer;
    font-size: 21px;
    line-height: 1;
    flex-shrink: 0;

    &:hover {
        background: #ffffff14;
        color: var(--ce-fg, var(--theme-font-main-selected-color));
    }
`;

// --- Leaf item ---------------------------------------------------------------

export const LeafItem = styled.div<{
    $isSelected: boolean;
    $isDirty?: boolean;
    $isReadOnly?: boolean;
}>`
    display: flex;
    align-items: center;
    height: 28px;
    padding-left: 28px;
    padding-right: 8px;
    cursor: pointer;
    background-color: ${p => (p.$isSelected ? "var(--ce-bg-lighter, #262626)" : "transparent")};

    &:hover {
        background-color: var(--ce-bg-lighter, #262626);
    }

    .leaf-name {
        ${regularFont("s")};
        color: ${p => (p.$isDirty ? "#f0c674" : "inherit")};
        font-style: ${p => (p.$isReadOnly ? "italic" : "normal")};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

// --- Sort button & popover ---------------------------------------------------

export const SortButton = styled.button<{$active?: boolean}>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    margin-left: 2px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: ${p => (p.$active ? "var(--ce-tab-active-border, var(--theme-container-active-blue))" : "#a1a1aa")};
    cursor: pointer;
    flex-shrink: 0;
    position: relative;

    &:hover {
        background: #ffffff14;
        color: var(--ce-fg, var(--theme-font-main-selected-color));
    }
`;

export const SortPopover = styled.div`
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 50;
    min-width: 160px;
    margin-top: 4px;
    padding: 4px 0;
    background: var(--ce-bg, var(--theme-container-bg, #1e1e1e));
    border: 1px solid var(--ce-border, var(--theme-container-divider, #333));
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
`;

export const SortPopoverItem = styled.button<{$isActive?: boolean}>`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 12px;
    border: none;
    background: ${p => (p.$isActive ? "#ffffff0a" : "transparent")};
    color: ${p => (p.$isActive ? "var(--ce-tab-active-border, var(--theme-container-active-blue))" : "var(--ce-fg, var(--theme-font-main-selected-color))")};
    cursor: pointer;
    ${regularFont("s")};
    text-align: left;

    &:hover {
        background: #ffffff14;
    }

    .check {
        width: 14px;
        text-align: center;
        flex-shrink: 0;
    }
`;

export const FolderEmptyHint = styled.div`
    padding: 8px 28px;
    color: #555;
    ${regularFont("xs")};
    font-style: italic;
`;

// --- Empty state -------------------------------------------------------------

export const EmptyState = styled.div`
    padding: 24px 16px;
    text-align: center;
    color: #666;
    ${regularFont("s")};
`;
