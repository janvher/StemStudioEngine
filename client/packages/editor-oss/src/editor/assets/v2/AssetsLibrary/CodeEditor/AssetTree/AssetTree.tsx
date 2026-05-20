import React, {useCallback, useEffect, useRef, useState} from "react";
import {HiXMark} from "react-icons/hi2";
import {TbSortAscendingLetters, TbClock, TbPencil} from "react-icons/tb";

import {isScriptsEnabled} from "@stem/editor-oss/utils/featureFlags";
import type {AssetTreeEntry, AssetTreeFolders} from "../hooks/useAssetTree";
import type {AssetEditorEntry, AssetKind, SortMode} from "../types";
import {
    EmptyState,
    FolderAddButton,
    FolderChevron,
    FolderEmptyHint,
    FolderHeader,
    FolderLabel,
    LeafItem,
    SearchClearButton,
    SearchInput,
    SearchWrapper,
    SortButton,
    SortPopover,
    SortPopoverItem,
    TreeBody,
    TreeContainer,
} from "./AssetTree.style";

// ---------------------------------------------------------------------------
// Sort-mode metadata
// ---------------------------------------------------------------------------

const SORT_MODES: {mode: SortMode; label: string; Icon: React.ComponentType<{size?: number}>}[] = [
    {mode: "name", label: "Name", Icon: TbSortAscendingLetters},
    {mode: "modified", label: "Last Modified", Icon: TbClock},
    {mode: "changed", label: "Only Changed", Icon: TbPencil},
];

const SORT_MODE_CYCLE: SortMode[] = ["name", "modified", "changed"];

/**
 *
 * @param current
 */
function nextSortMode(current: SortMode): SortMode {
    const idx = SORT_MODE_CYCLE.indexOf(current);
    return SORT_MODE_CYCLE[(idx + 1) % SORT_MODE_CYCLE.length] ?? "name";
}

/**
 *
 * @param mode
 */
function sortModeIcon(mode: SortMode) {
    const entry = SORT_MODES.find(s => s.mode === mode);
    if (!entry) return null;
    const {Icon} = entry;
    return <Icon size={27} />;
}

/**
 *
 * @param mode
 */
function sortModeLabel(mode: SortMode): string {
    return SORT_MODES.find(s => s.mode === mode)?.label ?? mode;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AssetTreeProps {
    folders: AssetTreeFolders;
    activeEntry: AssetEditorEntry | null;
    onSelect: (entry: AssetTreeEntry) => void;
    /** Called on every keystroke so the parent can feed `search` to `useAssetTree`. */
    onSearchChange: (term: string) => void;
    /** Per-(kind,id) dirty check — drives the gold unsaved badge. */
    hasChanges: (kind: AssetKind, id: string) => boolean;
    isLoading?: boolean;
    totalCount: number;
    /** If provided, shows the "New" dropdown with a "New Behavior" option. */
    onCreateBehavior?: (anchor: DOMRect) => void;
    /** If provided, shows the "New" dropdown with a "New Lambda" option. */
    onCreateLambda?: (anchor: DOMRect) => void;
    /** If provided, shows the "New" button in the Imports folder header. The
     *  rect lets the caller anchor the imports add menu to the +-button. */
    onCreateScript?: (anchor: DOMRect) => void;
    /** If provided, shows a "+" button in the Files folder header. */
    onCreateFile?: (anchor: DOMRect) => void;
    /** Active sort/filter mode. */
    sortMode?: SortMode;
    /** Callback to change the sort/filter mode. */
    onSortModeChange?: (mode: SortMode) => void;
}

// ---------------------------------------------------------------------------
// Folder section (collapsible)
// ---------------------------------------------------------------------------

interface FolderSectionProps {
    label: string;
    entries: AssetTreeEntry[];
    activeEntry: AssetEditorEntry | null;
    onSelect: (entry: AssetTreeEntry) => void;
    hasChanges: (kind: AssetKind, id: string) => boolean;
    /** Default expanded state. */
    defaultOpen?: boolean;
    /** If provided, shows a "+" button in the folder header. The button's bounding rect
     *  is passed so callers can anchor a popover/menu to it. */
    onCreate?: (anchor: DOMRect) => void;
    /** Active sort mode — shown via icon button in folder header. */
    sortMode?: SortMode;
    /** Callback to change the sort mode. */
    onSortModeChange?: (mode: SortMode) => void;
    /** Whether this folder had entries before the sort/filter was applied. */
    hasUnfilteredEntries?: boolean;
}

const LONG_PRESS_MS = 400;

const FolderSection: React.FC<FolderSectionProps> = ({
    label,
    entries,
    activeEntry,
    onSelect,
    hasChanges,
    defaultOpen = true,
    onCreate,
    sortMode,
    onSortModeChange,
    hasUnfilteredEntries,
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [showPopover, setShowPopover] = useState(false);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const didLongPress = useRef(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Close popover on outside click.
    useEffect(() => {
        if (!showPopover) return;
        const handleClick = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setShowPopover(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [showPopover]);

    const handleSortPointerDown = useCallback(() => {
        didLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            didLongPress.current = true;
            setShowPopover(true);
        }, LONG_PRESS_MS);
    }, []);

    const handleSortPointerUp = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        if (!didLongPress.current && sortMode && onSortModeChange) {
            onSortModeChange(nextSortMode(sortMode));
        }
    }, [sortMode, onSortModeChange]);

    const handleSortPointerLeave = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    const handlePopoverSelect = useCallback(
        (mode: SortMode) => {
            onSortModeChange?.(mode);
            setShowPopover(false);
        },
        [onSortModeChange],
    );

    // Show folder if it has entries, has a create button, or had unfiltered entries (to show the empty hint).
    const shouldShow = entries.length > 0 || !!onCreate || (hasUnfilteredEntries && sortMode === "changed");
    if (!shouldShow) return null;

    return (
        <>
            <FolderHeader $isOpen={isOpen} onClick={() => setIsOpen(o => !o)}>
                <FolderChevron $isOpen={isOpen}>&#9654;</FolderChevron>
                <FolderLabel>{label}</FolderLabel>
                {sortMode && onSortModeChange && (
                    <SortButton
                        $active={sortMode !== "name"}
                        title={sortModeLabel(sortMode)}
                        onPointerDown={e => {
                            e.stopPropagation();
                            handleSortPointerDown();
                        }}
                        onPointerUp={e => {
                            e.stopPropagation();
                            handleSortPointerUp();
                        }}
                        onPointerLeave={handleSortPointerLeave}
                        onClick={e => e.stopPropagation()}
                    >
                        {sortModeIcon(sortMode)}
                        {showPopover && (
                            <SortPopover ref={popoverRef}>
                                {SORT_MODES.map(({mode, label: modeLabel, Icon}) => (
                                    <SortPopoverItem
                                        key={mode}
                                        $isActive={mode === sortMode}
                                        onClick={e => {
                                            e.stopPropagation();
                                            handlePopoverSelect(mode);
                                        }}
                                    >
                                        <span className="check">{mode === sortMode ? "✓" : ""}</span>
                                        <Icon size={27} />
                                        {modeLabel}
                                    </SortPopoverItem>
                                ))}
                            </SortPopover>
                        )}
                    </SortButton>
                )}
                {onCreate && (
                    <FolderAddButton
                        title={`New ${label.replace(/s$/, "")}`}
                        onClick={e => {
                            e.stopPropagation();
                            onCreate(e.currentTarget.getBoundingClientRect());
                        }}
                    >
                        +
                    </FolderAddButton>
                )}
            </FolderHeader>

            {isOpen && entries.length === 0 && sortMode === "changed" && hasUnfilteredEntries && (
                <FolderEmptyHint>No unsaved changes</FolderEmptyHint>
            )}

            {isOpen &&
                entries.map(entry => (
                    <LeafItem
                        key={entry.id}
                        data-file-id={entry.id}
                        $isSelected={
                            activeEntry?.kind === entry.kind && activeEntry?.id === entry.id
                        }
                        $isDirty={hasChanges(entry.kind, entry.id)}
                        $isReadOnly={entry.isReadOnly}
                        onClick={() => onSelect(entry)}
                    >
                        <span className="leaf-name">{entry.name}</span>
                    </LeafItem>
                ))}
        </>
    );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const AssetTree: React.FC<AssetTreeProps> = ({
    folders,
    activeEntry,
    onSelect,
    onSearchChange,
    hasChanges,
    isLoading,
    totalCount,
    onCreateBehavior,
    onCreateLambda,
    onCreateScript,
    onCreateFile,
    sortMode,
    onSortModeChange,
}) => {
    const [search, setSearch] = useState("");
    const bodyRef = useRef<HTMLDivElement>(null);

    const handleSearch = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            setSearch(val);
            onSearchChange(val);
        },
        [onSearchChange],
    );

    const handleClearSearch = useCallback(() => {
        setSearch("");
        onSearchChange("");
    }, [onSearchChange]);

    // Scroll selected item into view when activeEntry changes.
    useEffect(() => {
        if (!activeEntry || !bodyRef.current) return;
        const timeout = setTimeout(() => {
            const el = bodyRef.current?.querySelector(`[data-file-id="${activeEntry.id}"]`);
            if (el) {
                const container = bodyRef.current!;
                const cRect = container.getBoundingClientRect();
                const eRect = el.getBoundingClientRect();
                if (eRect.top < cRect.top || eRect.bottom > cRect.bottom) {
                    el.scrollIntoView({behavior: "smooth", block: "center"});
                }
            }
        }, 100);
        return () => clearTimeout(timeout);
    }, [activeEntry]);

    const isEmpty = totalCount === 0 && !isLoading;

    return (
        <TreeContainer>
            <SearchWrapper>
                <SearchInput
                    type="text"
                    placeholder="Search assets..."
                    value={search}
                    onChange={handleSearch}
                />
                {search && (
                    <SearchClearButton onClick={handleClearSearch} title="Clear search">
                        <HiXMark size={18} />
                    </SearchClearButton>
                )}
            </SearchWrapper>

            <TreeBody ref={bodyRef}>
                {isEmpty && sortMode !== "changed" && <EmptyState>No assets found</EmptyState>}
                {isEmpty && sortMode === "changed" && <EmptyState>No unsaved changes</EmptyState>}

                <FolderSection
                    label="Behaviors"
                    entries={folders.behaviors}
                    activeEntry={activeEntry}
                    onSelect={onSelect}
                    hasChanges={hasChanges}
                    onCreate={onCreateBehavior}
                    sortMode={sortMode}
                    onSortModeChange={onSortModeChange}
                    hasUnfilteredEntries
                />
                <FolderSection
                    label="Lambdas"
                    entries={folders.lambdas}
                    activeEntry={activeEntry}
                    onSelect={onSelect}
                    hasChanges={hasChanges}
                    onCreate={onCreateLambda}
                    sortMode={sortMode}
                    onSortModeChange={onSortModeChange}
                    hasUnfilteredEntries
                />
                {isScriptsEnabled() && (
                    <FolderSection
                        label="Scripts"
                        entries={folders.scripts}
                        activeEntry={activeEntry}
                        onSelect={onSelect}
                        hasChanges={hasChanges}
                        onCreate={onCreateScript}
                        sortMode={sortMode}
                        onSortModeChange={onSortModeChange}
                        hasUnfilteredEntries
                    />
                )}
                <FolderSection
                    label="Files"
                    entries={folders.files}
                    activeEntry={activeEntry}
                    onSelect={onSelect}
                    hasChanges={hasChanges}
                    defaultOpen
                    onCreate={onCreateFile}
                    sortMode={sortMode}
                    onSortModeChange={onSortModeChange}
                    hasUnfilteredEntries
                />
            </TreeBody>
        </TreeContainer>
    );
};
