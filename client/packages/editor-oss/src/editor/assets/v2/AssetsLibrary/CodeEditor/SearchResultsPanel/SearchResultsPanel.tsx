import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {HiOutlineXMark} from "react-icons/hi2";

import type {GlobalSearchResult, UseGlobalSearchReturn} from "../hooks/useGlobalSearch";
import type {AssetKind} from "../types";

import {
    CloseButton,
    EmptyResults,
    FileGroup,
    FileGroupHeader,
    HighlightSpan,
    KindBadge,
    LineNumber,
    LoadingIndicator,
    MatchCount,
    MatchLine,
    MatchText,
    PanelContainer,
    PanelHeader,
    PanelSearchInput,
    PanelTitle,
    ResultsBody,
} from "./SearchResultsPanel.style";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchResultsPanelProps {
    globalSearch: UseGlobalSearchReturn;
    onNavigate: (kind: AssetKind, id: string, lineNumber: number) => void;
    onClose: () => void;
    /** If provided, the input will be auto-focused with this initial term. */
    initialTerm?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Renders text with the search term highlighted. */
function highlightText(text: string, term: string): React.ReactNode {
    if (!term) return text;
    const regex = new RegExp(`(${escapeRegExp(term)})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
        regex.test(part) ? <HighlightSpan key={i}>{part}</HighlightSpan> : part,
    );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SearchResultsPanel: React.FC<SearchResultsPanelProps> = ({
    globalSearch,
    onNavigate,
    onClose,
    initialTerm = "",
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [term, setTerm] = useState(initialTerm);
    const [debouncedTerm, setDebouncedTerm] = useState(initialTerm);

    // Auto-focus input on mount.
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Debounce the search term (300ms).
    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedTerm(term.trim()), 300);
        return () => clearTimeout(timeout);
    }, [term]);

    const results = useMemo<GlobalSearchResult[]>(
        () => globalSearch.search(debouncedTerm),
        [globalSearch, debouncedTerm],
    );

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setTerm(e.target.value);
    }, []);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                onClose();
            }
        },
        [onClose],
    );

    return (
        <PanelContainer>
            <PanelHeader>
                <PanelTitle>Search in Files</PanelTitle>
                <PanelSearchInput
                    ref={inputRef}
                    type="text"
                    placeholder="Search across all assets..."
                    value={term}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                />
                {globalSearch.isLoading && (
                    <LoadingIndicator>
                        {globalSearch.loadedCount}/{globalSearch.totalCount}
                    </LoadingIndicator>
                )}
                <CloseButton aria-label="Close search" onClick={onClose}>
                    <HiOutlineXMark size={16} />
                </CloseButton>
            </PanelHeader>

            <ResultsBody>
                {debouncedTerm && results.length === 0 && (
                    <EmptyResults>
                        {globalSearch.isLoading
                            ? "Still loading files..."
                            : `No results for "${debouncedTerm}"`}
                    </EmptyResults>
                )}

                {debouncedTerm && results.length > 0 && (
                    <>
                        {results.map(result => (
                            <FileGroup key={`${result.kind}:${result.id}`}>
                                <FileGroupHeader>
                                    <KindBadge $kind={result.kind}>
                                        {result.kind === "behavior" ? "B" : "L"}
                                    </KindBadge>
                                    {result.name}
                                    <MatchCount>
                                        {result.matches.length} match{result.matches.length !== 1 ? "es" : ""}
                                    </MatchCount>
                                </FileGroupHeader>

                                {result.matches.slice(0, 20).map((match, i) => (
                                    <MatchLine
                                        key={i}
                                        onClick={() => onNavigate(result.kind, result.id, match.lineNumber)}
                                    >
                                        <LineNumber>{match.lineNumber}</LineNumber>
                                        <MatchText>
                                            {highlightText(match.text, debouncedTerm)}
                                        </MatchText>
                                    </MatchLine>
                                ))}
                            </FileGroup>
                        ))}
                    </>
                )}

                {!debouncedTerm && (
                    <EmptyResults>Type to search across all behaviors and lambdas</EmptyResults>
                )}
            </ResultsBody>
        </PanelContainer>
    );
};
