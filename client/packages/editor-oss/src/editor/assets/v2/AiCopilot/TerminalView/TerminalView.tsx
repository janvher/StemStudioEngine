import {marked} from "marked";
import React, {useCallback, useEffect, useRef, useState} from "react";

import {
    CommandLine,
    MarkdownResultLine,
    ProgressLine,
    ResultLine,
    SuggestionItem,
    SuggestionsHint,
    SuggestionsDropdown,
    TerminalContainer,
    TerminalEntry,
    TerminalInput,
    TerminalInputWrapper,
    TerminalOutput,
    TerminalPromptChar,
    WelcomeMessage,
} from "./TerminalView.styles";
import {useTerminal} from "./useTerminal";
import {applyParameterSuggestion, getParameterSuggestions} from "@stem/editor-oss/agent/script-tool/autocomplete";
import {ScriptCommandParser} from "@stem/editor-oss/agent/script-tool/ScriptCommandParser";

interface TerminalViewProps {
    onExit: () => void;
    isAdmin?: boolean;
}

const DOUBLE_ESCAPE_MS = 300;

type SuggestionMode = "command" | "parameter";

interface SuggestionState {
    suggestions: string[];
    mode: SuggestionMode;
    replaceMode?: "append" | "replace-token";
}

interface TabCompletionSession {
    baseInput: string;
    appliedInput: string;
    suggestions: string[];
    mode: SuggestionMode;
    replaceMode?: "append" | "replace-token";
    index: number;
}

const MarkdownResult = ({
    content,
    status,
}: {
    content: string;
    status: "success" | "error" | "info";
}) => {
    const normalizedContent = content.replace(/\r\n/g, "\n").replace(/\\n/g, "\n");
    const html = marked.parse(normalizedContent, {gfm: true, breaks: true}) as string;

    return <MarkdownResultLine $status={status}
        dangerouslySetInnerHTML={{__html: html}}
    />;
};

export const TerminalView: React.FC<TerminalViewProps> = ({onExit, isAdmin}) => {
    const {history, isExecuting, executeInput, navigateHistory} = useTerminal(onExit, {isAdmin});
    const [input, setInput] = useState("");
    const [suggestionState, setSuggestionState] = useState<SuggestionState>({
        suggestions: [],
        mode: "command",
    });
    const [activeSuggestion, setActiveSuggestion] = useState(-1);
    const [tabCompletionSession, setTabCompletionSession] = useState<TabCompletionSession | null>(null);
    const outputRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const lastEscapeRef = useRef<number>(0);

    // Auto-scroll on new history entries
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [history]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const updateSuggestions = useCallback((value: string) => {
        if (value.trim().length === 0) {
            setSuggestionState({suggestions: [], mode: "command"});
            setActiveSuggestion(-1);
            return;
        }

        const parameterSuggestions = getParameterSuggestions(value);
        if (parameterSuggestions) {
            setSuggestionState({
                suggestions: parameterSuggestions.suggestions,
                mode: "parameter",
                replaceMode: parameterSuggestions.replaceMode,
            });
            setActiveSuggestion(-1);
            return;
        }

        const matches = ScriptCommandParser.getSuggestions(value);
        setSuggestionState({
            suggestions: matches.slice(0, 8),
            mode: "command",
        });
        setActiveSuggestion(-1);
    }, []);

    const applySuggestion = useCallback((
        suggestion: string,
        sourceInput: string,
        mode: SuggestionMode,
        replaceMode?: "append" | "replace-token",
    ) => {
        const nextInput = mode === "parameter"
            ? applyParameterSuggestion(sourceInput, suggestion, replaceMode || "append")
            : `${suggestion} `;

        setInput(nextInput);
        updateSuggestions(nextInput);
        setTabCompletionSession(null);
        inputRef.current?.focus();
    }, [updateSuggestions]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInput(value);
        setTabCompletionSession(null);
        updateSuggestions(value);
    };

    const handleSubmit = async () => {
        if (!input.trim() || isExecuting) return;
        const cmd = input;
        setInput("");
        setSuggestionState({suggestions: [], mode: "command"});
        setActiveSuggestion(-1);
        setTabCompletionSession(null);
        await executeInput(cmd);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const suggestions = suggestionState.suggestions;

        // Tab: auto-complete
        if (e.key === "Tab") {
            e.preventDefault();
            if (suggestions.length > 0) {
                if (tabCompletionSession && input === tabCompletionSession.appliedInput) {
                    const direction = e.shiftKey ? -1 : 1;
                    const nextIndex =
                        (tabCompletionSession.index + direction + tabCompletionSession.suggestions.length)
                        % tabCompletionSession.suggestions.length;
                    const selected = tabCompletionSession.suggestions[nextIndex];
                    if (selected) {
                        const nextInput = tabCompletionSession.mode === "parameter"
                            ? applyParameterSuggestion(
                                tabCompletionSession.baseInput,
                                selected,
                                tabCompletionSession.replaceMode || "append",
                            )
                            : `${selected} `;
                        setInput(nextInput);
                        setSuggestionState({
                            suggestions: tabCompletionSession.suggestions,
                            mode: tabCompletionSession.mode,
                            replaceMode: tabCompletionSession.replaceMode,
                        });
                        setActiveSuggestion(nextIndex);
                        setTabCompletionSession({
                            ...tabCompletionSession,
                            index: nextIndex,
                            appliedInput: nextInput,
                        });
                    }
                } else {
                    const idx = activeSuggestion >= 0
                        ? activeSuggestion
                        : (e.shiftKey ? suggestions.length - 1 : 0);
                    const selected = suggestions[idx];
                    if (selected) {
                        const nextInput = suggestionState.mode === "parameter"
                            ? applyParameterSuggestion(input, selected, suggestionState.replaceMode || "append")
                            : `${selected} `;
                        setInput(nextInput);
                        setSuggestionState({
                            suggestions,
                            mode: suggestionState.mode,
                            replaceMode: suggestionState.replaceMode,
                        });
                        setActiveSuggestion(idx);
                        setTabCompletionSession({
                            baseInput: input,
                            appliedInput: nextInput,
                            suggestions,
                            mode: suggestionState.mode,
                            replaceMode: suggestionState.replaceMode,
                            index: idx,
                        });
                    }
                }
            }
            return;
        }

        // Navigate suggestions with up/down when dropdown is open
        if (suggestions.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveSuggestion(prev => Math.min(prev + 1, suggestions.length - 1));
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveSuggestion(prev => Math.max(prev - 1, -1));
                return;
            }
        }

        // ArrowUp/Down for command history when no suggestions
        if (e.key === "ArrowUp" && suggestions.length === 0) {
            e.preventDefault();
            const val = navigateHistory("up");
            if (val !== null) {
                setInput(val);
                setTabCompletionSession(null);
                updateSuggestions(val);
            }
            return;
        }
        if (e.key === "ArrowDown" && suggestions.length === 0) {
            e.preventDefault();
            const val = navigateHistory("down");
            if (val !== null) {
                setInput(val);
                setTabCompletionSession(null);
                updateSuggestions(val);
            }
            return;
        }

        // Enter: submit
        if (e.key === "Enter") {
            e.preventDefault();
            if (suggestions.length > 0 && activeSuggestion >= 0) {
                const selected = suggestions[activeSuggestion];
                if (selected) {
                    applySuggestion(selected, input, suggestionState.mode, suggestionState.replaceMode);
                }
            } else {
                void handleSubmit();
            }
            return;
        }

        // Escape: close suggestions on first press, clear input on double-press
        if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            const now = Date.now();
            if (suggestions.length > 0) {
                setSuggestionState({suggestions: [], mode: "command"});
                setActiveSuggestion(-1);
                setTabCompletionSession(null);
            } else if (now - lastEscapeRef.current < DOUBLE_ESCAPE_MS) {
                setInput("");
                setSuggestionState({suggestions: [], mode: "command"});
                setTabCompletionSession(null);
            }
            lastEscapeRef.current = now;
            inputRef.current?.focus();
        }
    };

    return (
        <TerminalContainer onClick={() => {
            if (!window.getSelection()?.toString()) {
                inputRef.current?.focus();
            }
        }}>
            <TerminalOutput ref={outputRef}>
                <WelcomeMessage>
                    StemStudio Script Terminal. Type &quot;help&quot; for commands, &quot;exit&quot; to return to chat.
                </WelcomeMessage>

                {history.map((entry, i) => (
                    <TerminalEntry key={i}>
                        {entry.command !== "(script)" && <CommandLine>{entry.command}</CommandLine>}
                        {entry.result && (
                            entry.format === "markdown"
                                ? <MarkdownResult content={entry.result}
                                    status={entry.status}
                                />
                                : <ResultLine $status={entry.status}>{entry.result}</ResultLine>
                        )}
                    </TerminalEntry>
                ))}

                {isExecuting && <ProgressLine>Executing...</ProgressLine>}
            </TerminalOutput>

            <TerminalInputWrapper style={{position: "relative"}}>
                <TerminalPromptChar>&gt;</TerminalPromptChar>
                <TerminalInput
                    ref={inputRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={isExecuting}
                    placeholder="Type a command..."
                    autoComplete="off"
                    spellCheck={false}
                />
                {suggestionState.suggestions.length > 0 && (
                    <SuggestionsDropdown>
                        {suggestionState.suggestions.map((s, i) => (
                            <SuggestionItem
                                key={s}
                                $isActive={i === activeSuggestion}
                                onMouseDown={() => {
                                    applySuggestion(s, input, suggestionState.mode, suggestionState.replaceMode);
                                }}
                            >
                                {s}
                            </SuggestionItem>
                        ))}
                        <SuggestionsHint>Tab cycles, Shift+Tab goes back, Enter applies</SuggestionsHint>
                    </SuggestionsDropdown>
                )}
            </TerminalInputWrapper>
        </TerminalContainer>
    );
};
