import {debounce} from "lodash";
import {useEffect, useState} from "react";

import {
    SearchContainer,
    SearchInput,
    SearchInputContainer,
    SearchResultItem,
    SearchResultsContainer,
} from "./SearchForFilestyle";
import {Directory, File, searchFilesByName, searchFilesContent} from "../utils/file-manager";

interface Props {
    rootDir: Directory;
    selectedFile: File | undefined;
    onSelect: (file: File, lineNumber?: number) => void;
}

interface ContentMatch {
    line: number;
    text: string;
    lineNumber: number;
}

interface SearchResult {
    file: File;
    matches: ContentMatch[];
}

export const SearchForFile = ({rootDir, selectedFile, onSelect}: Props) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedTerm, setDebouncedTerm] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);

    // Debounce input (300ms delay)
    useEffect(() => {
        const handler = debounce(() => setDebouncedTerm(searchTerm.trim()), 300);
        handler();
        return () => handler.cancel();
    }, [searchTerm]);

    // Perform combined search (names + content)
    useEffect(() => {
        if (!debouncedTerm) {
            setSearchResults(null);
            return;
        }

        const nameResults = searchFilesByName(rootDir, debouncedTerm);
        const contentResults = searchFilesContent(rootDir, debouncedTerm);

        // Combine and deduplicate by file.id
        const combined: SearchResult[] = [...nameResults.map(file => ({file, matches: []})), ...contentResults];

        const uniqueResults = combined.reduce((acc, curr) => {
            const existing = acc.find(r => r.file.id === curr.file.id);
            if (existing) {
                existing.matches.push(...curr.matches);
            } else {
                acc.push(curr);
            }
            return acc;
        }, [] as SearchResult[]);

        setSearchResults(uniqueResults);
    }, [rootDir, debouncedTerm]);

    const escapeRegExp = (string: string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    const highlightText = (text: string, term: string) => {
        if (!term) return text;
        const escapedTerm = escapeRegExp(term);
        const regex = new RegExp(`(${escapedTerm})`, "gi");
        return text.split(regex).map((part, i) =>
            regex.test(part) ? 
                <span key={i}
                    className="highlight"
                >
                    {part}
                </span>
             : 
                part
            ,
        );
    };

    const renderSearchResults = () => {
        if (!searchResults) return null;

        return (
            <SearchResultsContainer>
                {searchResults.map(({file, matches}) => 
                    <SearchResultItem
                        key={file.id}
                        $isSelected={selectedFile?.id === file.id}
                        onClick={() => onSelect(file, matches[0]?.lineNumber)}
                    >
                        <div>{highlightText(file.name, debouncedTerm)}</div>

                        {matches.length > 0 && 
                            <>
                                {matches.slice(0, 3).map((match: ContentMatch, i: number) => {
                                    return (
                                        <div
                                            key={i}
                                            className="match-preview"
                                            onClick={e => {
                                                e.stopPropagation();
                                                onSelect(file, match.lineNumber);
                                            }}
                                        >
                                            Line {match.lineNumber}: {highlightText(match.text, debouncedTerm)}
                                        </div>
                                    );
                                })}
                                {matches.length > 3 && 
                                    <div className="match-preview">...and {matches.length - 3} more matches</div>
                                }
                            </>
                        }
                    </SearchResultItem>,
                )}
            </SearchResultsContainer>
        );
    };

    return (
        <SearchContainer>
            <SearchInputContainer>
                <SearchInput
                    type="text"
                    placeholder="Search files or content..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </SearchInputContainer>
            {renderSearchResults()}
        </SearchContainer>
    );
};
