/**
 * QuickOpenPalette — VS Code-style Cmd+P "Go to File" palette.
 *
 * Shows a text input at the top of the editor surface. As the user types,
 * entries are fuzzy-filtered and ranked. Arrow keys + Enter navigate/select.
 * Escape or clicking outside closes the palette.
 */
import React, {useState, useRef, useEffect, useCallback, useMemo} from "react";
import styled from "styled-components";

import {regularFont} from "../../../../../assets/style";
import type {AssetTreeEntry} from "./hooks/useAssetTree";
import type {AssetKind} from "./types";

// ---------------------------------------------------------------------------
// Fuzzy matching
// ---------------------------------------------------------------------------

/** Simple substring match that returns a score (lower = better). */
function fuzzyScore(query: string, target: string): number | null {
    const q = query.toLowerCase();
    const t = target.toLowerCase();
    if (!q) return 0;

    // Exact prefix match is best
    if (t.startsWith(q)) return 0;
    // Contains is good
    const idx = t.indexOf(q);
    if (idx >= 0) return idx + 1;

    // Character-by-character fuzzy
    let qi = 0;
    let score = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) {
            qi++;
        } else {
            score++;
        }
    }
    return qi === q.length ? score + 10 : null;
}

// ---------------------------------------------------------------------------
// Kind badges
// ---------------------------------------------------------------------------

const KIND_LABELS: Record<AssetKind, string> = {
    behavior: "B",
    script: "S",
    lambda: "L",
    file: "F",
};

const KIND_COLORS: Record<AssetKind, string> = {
    behavior: "#3b82f6",
    script: "#f59e0b",
    lambda: "#a855f7",
    file: "#6b7280",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface QuickOpenPaletteProps {
    entries: AssetTreeEntry[];
    onSelect: (entry: AssetTreeEntry) => void;
    onClose: () => void;
}

export const QuickOpenPalette: React.FC<QuickOpenPaletteProps> = ({
    entries,
    onSelect,
    onClose,
}) => {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Filtered + sorted results
    const results = useMemo(() => {
        if (!query.trim()) return entries.slice(0, 50);
        const scored: Array<{entry: AssetTreeEntry; score: number}> = [];
        for (const entry of entries) {
            const s = fuzzyScore(query, entry.name);
            if (s != null) scored.push({entry, score: s});
        }
        scored.sort((a, b) => a.score - b.score);
        return scored.slice(0, 50).map(s => s.entry);
    }, [entries, query]);

    // Clamp selected index when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [results.length]);

    // Scroll selected item into view
    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const item = list.children[selectedIndex] as HTMLElement | undefined;
        item?.scrollIntoView({block: "nearest"});
    }, [selectedIndex]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
                e.preventDefault();
                const entry = results[selectedIndex];
                if (entry) onSelect(entry);
            } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        },
        [results, selectedIndex, onSelect, onClose],
    );

    return (
        <Backdrop onClick={onClose}>
            <PaletteContainer onClick={e => e.stopPropagation()}>
                <SearchInput
                    ref={inputRef}
                    type="text"
                    placeholder="Go to file... (type to search)"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    spellCheck={false}
                />
                <ResultsList ref={listRef}>
                    {results.length === 0 && (
                        <EmptyMessage>No matching files</EmptyMessage>
                    )}
                    {results.map((entry, i) => (
                        <ResultItem
                            key={`${entry.kind}:${entry.id}`}
                            $active={i === selectedIndex}
                            onClick={() => onSelect(entry)}
                            onMouseEnter={() => setSelectedIndex(i)}
                        >
                            <KindBadge $color={KIND_COLORS[entry.kind]}>
                                {KIND_LABELS[entry.kind]}
                            </KindBadge>
                            <FileName>{entry.name}</FileName>
                        </ResultItem>
                    ))}
                </ResultsList>
            </PaletteContainer>
        </Backdrop>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const Backdrop = styled.div`
    position: absolute;
    inset: 0;
    z-index: 20;
    display: flex;
    justify-content: center;
    padding-top: 8px;
`;

const PaletteContainer = styled.div`
    width: min(480px, 90%);
    max-height: 340px;
    background: var(--theme-container-bg, #1e1e1e);
    border: 1px solid var(--theme-container-divider, #333);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 10px 14px;
    ${regularFont("s")};
    color: #fff;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--theme-container-divider, #333);
    outline: none;

    &::placeholder {
        color: #666;
    }
`;

const ResultsList = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
`;

const ResultItem = styled.div<{$active: boolean}>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    cursor: pointer;
    background: ${p => (p.$active ? "var(--theme-hover-bg, #2a2d2e)" : "transparent")};

    &:hover {
        background: var(--theme-hover-bg, #2a2d2e);
    }
`;

const KindBadge = styled.span<{$color: string}>`
    width: 20px;
    height: 20px;
    border-radius: 4px;
    background: ${p => p.$color}22;
    color: ${p => p.$color};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
`;

const FileName = styled.span`
    ${regularFont("s")};
    color: #ccc;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const EmptyMessage = styled.div`
    padding: 16px;
    text-align: center;
    ${regularFont("s")};
    color: #666;
`;
