import React, {useEffect, useMemo, useRef, useState} from "react";
import styled from "styled-components";
import * as THREE from "three";

import {buildHierarchyTree, collectFlatList} from "./PlaymodeHierarchy";

type Item = {uuid: string; name: string; type: string};

type Props = {
    sceneProvider: () => THREE.Scene | null;
    onClose: () => void;
    onPick: (uuid: string) => void;
};

// Simple fuzzy: every char of query must appear in order. Score = compactness
// (smaller window = higher score). Returns null if no match.
const fuzzyScore = (haystack: string, needle: string): {score: number; range: [number, number]} | null => {
    const h = haystack.toLowerCase();
    const n = needle.toLowerCase();
    if (n.length === 0) return {score: 0, range: [0, 0]};
    let hi = 0;
    let firstHit = -1;
    let lastHit = -1;
    for (let ni = 0; ni < n.length; ni++) {
        const ch = n[ni]!;
        const found = h.indexOf(ch, hi);
        if (found === -1) return null;
        if (firstHit === -1) firstHit = found;
        lastHit = found;
        hi = found + 1;
    }
    const span = lastHit - firstHit + 1;
    return {score: -(span - n.length) - firstHit * 0.1, range: [firstHit, lastHit + 1]};
};

const MAX_RESULTS = 50;

export const PlaymodeQuickOpen: React.FC<Props> = ({sceneProvider, onClose, onPick}) => {
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const items = useMemo<Item[]>(() => {
        const scene = sceneProvider();
        if (!scene) return [];
        return collectFlatList(buildHierarchyTree(scene));
    }, [sceneProvider]);

    // Prefix mode: typeprefix:name → filter by type substring then fuzzy on name
    const {results, prefixHint} = useMemo(() => {
        const q = query.trim();
        if (q.length === 0) {
            // Top N by name length so user gets some context
            return {
                results: items.slice(0, MAX_RESULTS).map(i => ({...i, score: 0, range: [0, 0] as [number, number]})),
                prefixHint: "",
            };
        }

        let typeFilter: string | null = null;
        let nameQuery = q;
        if (q.startsWith("type:")) {
            typeFilter = q.slice(5).trim().toLowerCase();
            nameQuery = "";
        } else if (q.startsWith("obj:")) {
            nameQuery = q.slice(4);
        }

        const filtered: Array<Item & {score: number; range: [number, number]}> = [];
        for (const item of items) {
            if (typeFilter && !item.type.toLowerCase().includes(typeFilter)) continue;
            const m = fuzzyScore(item.name, nameQuery);
            if (m === null) continue;
            filtered.push({...item, score: m.score, range: m.range});
        }
        filtered.sort((a, b) => b.score - a.score);
        return {results: filtered.slice(0, MAX_RESULTS), prefixHint: typeFilter ? `type:${typeFilter}` : ""};
    }, [query, items]);

    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    useEffect(() => {
        // Keep selected item visible when navigating with arrow keys.
        const node = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
        node?.scrollIntoView({block: "nearest"});
    }, [activeIndex]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
            e.preventDefault();
            onClose();
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const picked = results[activeIndex];
            if (picked) {
                onPick(picked.uuid);
                onClose();
            }
        }
    };

    return (
        <Backdrop onClick={onClose}>
            <Panel onClick={e => e.stopPropagation()}>
                <SearchInput
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Find object… (type: prefix narrows by type)"
                />
                <ResultList ref={listRef}>
                    {results.length === 0 && <EmptyMsg>No matches</EmptyMsg>}
                    {results.map((item, idx) => (
                        <ResultRow
                            key={item.uuid}
                            data-idx={idx}
                            $active={idx === activeIndex}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={() => {
                                onPick(item.uuid);
                                onClose();
                            }}
                        >
                            <Highlight name={item.name} range={item.range} />
                            <RowType>{item.type}</RowType>
                        </ResultRow>
                    ))}
                </ResultList>
                <Footer>
                    <Hint>↑↓ navigate · ⏎ select · Esc close{prefixHint && ` · filter: ${prefixHint}`}</Hint>
                    <Hint>{results.length}/{items.length}</Hint>
                </Footer>
            </Panel>
        </Backdrop>
    );
};

const Highlight: React.FC<{name: string; range: [number, number]}> = ({name, range}) => {
    if (range[1] === 0) return <span>{name}</span>;
    const [start, end] = range;
    return (
        <span>
            {name.slice(0, start)}
            <Mark>{name.slice(start, end)}</Mark>
            {name.slice(end)}
        </span>
    );
};

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 12vh;
    z-index: 15500;
`;

const Panel = styled.div`
    width: 480px;
    max-width: calc(100vw - 40px);
    max-height: 60vh;
    background: rgba(22, 22, 22, 0.98);
    border: 1px solid #444;
    border-radius: 8px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
    color: #ddd;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: "Roboto", sans-serif;
`;

const SearchInput = styled.input`
    background: transparent;
    border: none;
    border-bottom: 1px solid #333;
    color: #fff;
    font-size: 14px;
    padding: 12px 14px;
    outline: none;

    &::placeholder {
        color: #666;
    }
`;

const ResultList = styled.div`
    flex: 1;
    overflow-y: auto;
    min-height: 0;
`;

const ResultRow = styled.div<{$active: boolean}>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 12px;
    background: ${p => (p.$active ? "rgba(0, 153, 255, 0.20)" : "transparent")};
    border-left: 2px solid ${p => (p.$active ? "#0099ff" : "transparent")};

    & > span:first-child {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

const RowType = styled.span`
    font-size: 10px;
    color: #888;
    flex-shrink: 0;
`;

const Mark = styled.mark`
    background: rgba(255, 200, 60, 0.30);
    color: #ffd866;
    padding: 0;
    border-radius: 2px;
`;

const EmptyMsg = styled.div`
    padding: 16px;
    color: #888;
    font-size: 12px;
    text-align: center;
`;

const Footer = styled.div`
    display: flex;
    justify-content: space-between;
    padding: 6px 12px;
    border-top: 1px solid #2a2a2a;
    background: rgba(0, 0, 0, 0.3);
`;

const Hint = styled.div`
    font-size: 10px;
    color: #777;
`;
