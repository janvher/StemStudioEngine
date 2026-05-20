import {useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore} from "react";
import {createPortal} from "react-dom";
import {StyleSheetManager} from "styled-components";

import {consoleInterceptor, ConsoleMessage} from "./ConsoleInterceptor";
import {
    DebuggerContainer,
    TopBar,
    TopBarTitle,
    TopBarInfo,
    StopButton,
    MainArea,
    SidePanel,
    SearchInput,
    ScriptListContainer,
    SectionHeader,
    ScriptItem,
    BreakpointDot,
    ScriptName,
    SearchResultItem,
    MatchPreview,
    MatchHighlight,
    EditorArea,
    MonacoWrapper,
    ConsolePanel,
    ConsoleLine,
    ConsoleTimestamp,
    DebuggerBar,
    DebuggerBarDot,
} from "./DebuggerPopup.style";
import {debugSessionManager, DebugSession, ScriptFile} from "./DebugSessionManager";
import {ApplicationMode} from "@stem/editor-oss/EngineRuntime";
import EventBus from "../../../../behaviors/event/EventBus";
import global from "@stem/editor-oss/global";
import {registerIntellijKeybindings} from "../BehaviorEditor/intellijKeybindings";
import {usePopoutWindow} from "../common/hooks/usePopoutWindow";

// ── Helpers ─────────────────────────────────────────

/**
 *
 * @param ts
 */
function formatTime(ts: number): string {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${d.getMilliseconds().toString().padStart(3, "0")}`;
}

/**
 *
 * @param args
 */
function formatArgs(args: any[]): string {
    return args
        .map(a => {
            if (typeof a === "string") return a;
            try { return JSON.stringify(a, null, 2); } catch { return String(a); }
        })
        .join(" ");
}

/**
 *
 */
function useDebugSession(): DebugSession | null {
    return useSyncExternalStore(
        cb => debugSessionManager.subscribe(cb),
        () => debugSessionManager.getSession(),
    );
}

// ── Search types ────────────────────────────────────

interface SearchMatch {
    script: ScriptFile;
    lineNumber: number;
    lineText: string;
}

/**
 *
 * @param scripts
 * @param query
 */
function searchScripts(scripts: ScriptFile[], query: string): SearchMatch[] {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    const results: SearchMatch[] = [];

    for (const script of scripts) {
        // Name match — add as entry with no line
        if (script.fileName.toLowerCase().includes(lower)) {
            results.push({script, lineNumber: 0, lineText: ""});
        }
        // Content matches
        const lines = script.sourceCode.split("\n");
        for (let i = 0; i < lines.length; i++) {
            if (lines[i]!.toLowerCase().includes(lower)) {
                results.push({script, lineNumber: i + 1, lineText: lines[i]!.trim()});
            }
        }
    }
    return results.slice(0, 100); // Cap results
}

// ── Source Viewer ────────────────────────────────────

/**
 *
 * @param root0
 * @param root0.file
 * @param root0.popoutWindow
 * @param root0.revealLine
 */
function SourceViewer({
    file,
    popoutWindow,
    revealLine,
}: {
    file: ScriptFile | null;
    popoutWindow: Window | null;
    revealLine?: number;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<any>(null);

    useEffect(() => {
        if (!containerRef.current || !file) return;

        let disposed = false;

        void (async () => {
            const modernMonaco = await import("modern-monaco");
            if (disposed) return;

            const monacoApi = (modernMonaco as any).monaco ?? (modernMonaco as any).default?.monaco;
            if (!monacoApi || !containerRef.current) return;

            // Dispose previous editor
            if (editorRef.current) {
                editorRef.current.dispose();
                editorRef.current = null;
            }

            const editor = monacoApi.editor.create(containerRef.current, {
                value: file.sourceCode,
                language: "javascript",
                theme: "vs-dark",
                readOnly: true,
                minimap: {enabled: false},
                glyphMargin: true,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontSize: 13,
            });

            // Breakpoint decorations
            if (file.breakpointLines.length > 0) {
                const decorations = file.breakpointLines.map(line => ({
                    range: new monacoApi.Range(line, 1, line, 1),
                    options: {
                        isWholeLine: true,
                        glyphMarginClassName: "debugger-breakpoint-glyph",
                        className: "debugger-breakpoint-line",
                    },
                }));
                editor.createDecorationsCollection(decorations);
            }

            // Inject breakpoint styles
            const targetDoc = popoutWindow?.document ?? document;
            if (!targetDoc.getElementById("debugger-breakpoint-styles")) {
                const style = targetDoc.createElement("style");
                style.id = "debugger-breakpoint-styles";
                style.textContent = `
                    .debugger-breakpoint-glyph {
                        background: #ef4444;
                        border-radius: 50%;
                        width: 10px !important;
                        height: 10px !important;
                        margin-top: 5px;
                        margin-left: 5px;
                    }
                    .debugger-breakpoint-line {
                        background: rgba(239, 68, 68, 0.15);
                    }
                `;
                targetDoc.head.appendChild(style);
            }

            // Register IntelliJ keybindings
            registerIntellijKeybindings(monacoApi, editor);

            // Scroll to requested line or first breakpoint
            const targetLine = revealLine || (file.breakpointLines.length > 0 ? file.breakpointLines[0]! : 0);
            if (targetLine > 0) {
                editor.revealLineInCenter(targetLine);
            }

            editorRef.current = editor;
        })();

        return () => {
            disposed = true;
            if (editorRef.current) {
                editorRef.current.dispose();
                editorRef.current = null;
            }
        };
    }, [file, popoutWindow, revealLine]);

    return <MonacoWrapper ref={containerRef} />;
}

// ── Console Output ──────────────────────────────────

/**
 *
 * @param root0
 * @param root0.messages
 */
function ConsoleOutput({messages}: {messages: ConsoleMessage[]}) {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (panelRef.current) {
            panelRef.current.scrollTop = panelRef.current.scrollHeight;
        }
    }, [messages.length]);

    return (
        <ConsolePanel ref={panelRef}>
            {messages.map((msg, i) => (
                <ConsoleLine key={i} $type={msg.type}>
                    <ConsoleTimestamp>{formatTime(msg.timestamp)}</ConsoleTimestamp>
                    {formatArgs(msg.args)}
                </ConsoleLine>
            ))}
            {messages.length === 0 && (
                <ConsoleLine $type="info">Console output will appear here...</ConsoleLine>
            )}
        </ConsolePanel>
    );
}

// ── Main Component ──────────────────────────────────

export const DebuggerPopup = () => {
    const session = useDebugSession();
    const {isOpen, popoutContainer, popoutWindow, open, close} = usePopoutWindow();
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    const [revealLine, setRevealLine] = useState<number | undefined>(undefined);
    const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Debounce search input (300ms)
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
    }, []);

    // Search results
    const searchResults = useMemo(
        () => (session ? searchScripts(session.scripts, debouncedSearch) : []),
        [session, debouncedSearch],
    );
    const isSearching = debouncedSearch.trim().length > 0;

    // Group scripts by type
    const behaviors = useMemo(
        () => (session?.scripts.filter(s => s.type === "behavior") ?? []),
        [session],
    );
    const lambdas = useMemo(
        () => (session?.scripts.filter(s => s.type === "lambda") ?? []),
        [session],
    );

    // Console interception lifecycle
    useEffect(() => {
        if (session) {
            consoleInterceptor.start((msg) => {
                debugSessionManager.addConsoleMessage(msg);
                setConsoleMessages(prev => {
                    const next = [...prev, msg];
                    return next.length > 1000 ? next.slice(-1000) : next;
                });
            });
        } else {
            consoleInterceptor.stop();
            setConsoleMessages([]);
        }
        return () => consoleInterceptor.stop();
    }, [session]);

    // Auto-close popup when session ends
    useEffect(() => {
        if (!session && isOpen) {
            close();
        }
    }, [session, isOpen, close]);

    // Open popup on user click (avoids browser popup blocker)
    const handleOpenDebugger = useCallback(() => {
        open("Debugger");
        if (session && session.scripts.length > 0 && !selectedFileId) {
            setSelectedFileId(session.scripts[0]!.fileId);
        }
    }, [open, session, selectedFileId]);

    // Stop handler
    const handleStop = useCallback(() => {
        const app = global.app;
        if (!app) return;
        void app.setMode(ApplicationMode.EDIT);
        EventBus.instance.send("game.stop");
    }, []);

    // Select a file from the list
    const handleSelectScript = useCallback((fileId: string, line?: number) => {
        setSelectedFileId(fileId);
        setRevealLine(line);
    }, []);

    // If session is active but popup isn't open, show the clickable bar
    if (session && !isOpen) {
        const bpCount = session.scripts.filter(s => s.hasBreakpoints).length;
        return (
            <DebuggerBar onClick={handleOpenDebugger}>
                <DebuggerBarDot />
                Debugger active — {session.scripts.length} script{session.scripts.length !== 1 ? "s" : ""}
                {bpCount > 0 && `, ${bpCount} with breakpoints`}
                {" — click to open"}
            </DebuggerBar>
        );
    }

    if (!session || !isOpen || !popoutContainer) return null;

    const selectedFile = session.scripts.find(f => f.fileId === selectedFileId) ?? null;

    const content = (
        <DebuggerContainer>
            <TopBar>
                <StopButton onClick={handleStop}>Stop</StopButton>
                <TopBarTitle>Debugger</TopBarTitle>
                <TopBarInfo>Open DevTools (F12) to pause at breakpoints</TopBarInfo>
            </TopBar>
            <MainArea>
                <SidePanel>
                    <SearchInput
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                    <ScriptListContainer>
                        {isSearching ? (
                            // Search results mode
                            searchResults.length > 0 ? (
                                searchResults.map((match, i) => (
                                    <SearchResultItem
                                        key={`${match.script.fileId}-${match.lineNumber}-${i}`}
                                        $active={match.script.fileId === selectedFileId}
                                        onClick={() => handleSelectScript(match.script.fileId, match.lineNumber || undefined)}
                                    >
                                        <ScriptName>{match.script.fileName}</ScriptName>
                                        {match.lineNumber > 0 && (
                                            <MatchPreview>
                                                L{match.lineNumber}: {renderHighlighted(match.lineText, debouncedSearch)}
                                            </MatchPreview>
                                        )}
                                    </SearchResultItem>
                                ))
                            ) : (
                                <SectionHeader>No results</SectionHeader>
                            )
                        ) : (
                            // Normal grouped list
                            <>
                                {behaviors.length > 0 && (
                                    <>
                                        <SectionHeader>Behaviors</SectionHeader>
                                        {behaviors.map(s => (
                                            <ScriptItem
                                                key={s.fileId}
                                                $active={s.fileId === selectedFileId}
                                                onClick={() => handleSelectScript(s.fileId)}
                                            >
                                                <ScriptName>{s.fileName}</ScriptName>
                                                {s.hasBreakpoints && <BreakpointDot />}
                                            </ScriptItem>
                                        ))}
                                    </>
                                )}
                                {lambdas.length > 0 && (
                                    <>
                                        <SectionHeader>Lambdas</SectionHeader>
                                        {lambdas.map(s => (
                                            <ScriptItem
                                                key={s.fileId}
                                                $active={s.fileId === selectedFileId}
                                                onClick={() => handleSelectScript(s.fileId)}
                                            >
                                                <ScriptName>{s.fileName}</ScriptName>
                                                {s.hasBreakpoints && <BreakpointDot />}
                                            </ScriptItem>
                                        ))}
                                    </>
                                )}
                                {behaviors.length === 0 && lambdas.length === 0 && (
                                    <SectionHeader>No scripts loaded</SectionHeader>
                                )}
                            </>
                        )}
                    </ScriptListContainer>
                </SidePanel>
                <EditorArea>
                    <SourceViewer file={selectedFile} popoutWindow={popoutWindow} revealLine={revealLine} />
                    <ConsoleOutput messages={consoleMessages} />
                </EditorArea>
            </MainArea>
        </DebuggerContainer>
    );

    const wrapped = popoutWindow ? (
        <StyleSheetManager target={popoutWindow.document.head}>{content}</StyleSheetManager>
    ) : content;

    return createPortal(wrapped, popoutContainer);
};

// ── Highlight helper ────────────────────────────────

/**
 *
 * @param text
 * @param query
 */
function renderHighlighted(text: string, query: string): React.ReactNode {
    if (!query) return text;
    const lower = text.toLowerCase();
    const qLower = query.toLowerCase();
    const idx = lower.indexOf(qLower);
    if (idx === -1) return text;

    return (
        <>
            {text.slice(0, idx)}
            <MatchHighlight>{text.slice(idx, idx + query.length)}</MatchHighlight>
            {text.slice(idx + query.length)}
        </>
    );
}
