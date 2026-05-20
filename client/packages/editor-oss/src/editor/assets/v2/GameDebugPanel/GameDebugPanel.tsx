import React, {useState, useEffect, useCallback, useRef, useLayoutEffect} from "react";
import styled from "styled-components";

import {
    Container,
    LogsContainer,
    LogItem,
    EmptyState,
    ResizeHandle,
    SearchContainer,
    SearchInput,
    SearchIconWrapper,
    ClearSearchButton,
    FiltersContainer,
    FilterButton,
    MaxLogsInput,
    HeaderControls,
} from "./GameDebugPanel.style";
import {regularFont} from "../../../../assets/style";
import {ToastClickableItem} from "@stem/editor-oss/showToast";
import {LogLevel} from "@stem/editor-oss/utils/Logger";
import closeIcon from "../icons/close-icon.svg";
import searchIcon from "../icons/search.svg";

export interface GameLog {
    level: LogLevel;
    args: any[];
    timestamp: number;
}

const ClickableItemsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 8px;
    padding-left: 8px;
`;

const ClickableItem = styled.button`
    ${regularFont("s")};
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
    width: fit-content;
    min-width: 0;
    color: #e2e8f0;

    &:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    &:active {
        background: rgba(255, 255, 255, 0.25);
    }
`;

const ItemIcon = styled.span`
    font-size: 14px;
    flex-shrink: 0;
`;

const ItemText = styled.span`
    flex: 1;
    word-break: break-word;
`;

const LogHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
`;

const LogMessage = styled.pre<{$isExpanded?: boolean}>`
    margin: 0;
    flex: 1;
    min-width: 0;
    font: inherit;
    color: inherit;
    user-select: text;
    white-space: ${({$isExpanded}) => ($isExpanded ? "pre-wrap" : "nowrap")};
    overflow: hidden;
    text-overflow: ellipsis;
`;

const LogActions = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
`;

const LogActionButton = styled.button`
    ${regularFont("s")};
    color: #e2e8f0;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    padding: 2px 8px;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
        background: rgba(255, 255, 255, 0.16);
    }
`;

interface Props {
    logsRef: React.MutableRefObject<GameLog[]>;
    updateTrigger: number;
    onClose: () => void;
    onClear: () => void;
    maxLogs: number;
    setMaxLogs: (max: number) => void;
}

export const GameDebugPanel = ({logsRef, updateTrigger, onClose, onClear, maxLogs, setMaxLogs}: Props) => {
    // Get logs from ref
    const logs = logsRef.current;
    const [height, setHeight] = useState(300);
    const [isResizing, setIsResizing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [activeFilters, setActiveFilters] = useState<Set<LogLevel>>(
        new Set([LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.LOG]),
    );
    const [startIndex, setStartIndex] = useState(0);
    const logsContainerRef = useRef<HTMLDivElement>(null);
    const prevScrollHeightRef = useRef(0);
    const [autoScroll, setAutoScroll] = useState(true);

    const toggleFilter = (level: LogLevel) => {
        const newFilters = new Set(activeFilters);
        if (newFilters.has(level)) {
            newFilters.delete(level);
        } else {
            newFilters.add(level);
        }
        setActiveFilters(newFilters);
    };

    const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
        mouseDownEvent.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizing) {
                const newHeight = window.innerHeight - mouseMoveEvent.clientY;
                if (newHeight > 100 && newHeight < window.innerHeight - 50) {
                    setHeight(newHeight);
                }
            }
        },
        [isResizing],
    );

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchOpen]);

    const stringifyLogArg = (arg: any): string => {
        if (arg instanceof Error) {
            const header = `${arg.name}: ${arg.message}`;
            return arg.stack ? `${header}\n${arg.stack}` : header;
        }

        if (typeof arg === "string") {
            return arg;
        }

        if (arg === null || arg === undefined) {
            return String(arg);
        }

        if (typeof arg === "object") {
            if ("componentStack" in arg && typeof arg.componentStack === "string") {
                const details = {...arg};
                return JSON.stringify(details, null, 2);
            }

            try {
                return JSON.stringify(arg, null, 2);
            } catch (e) {
                return String(arg);
            }
        }

        return String(arg);
    };

    const formatLog = (args: any[]) => {
        // Check if this is a structured log from showToast
        if (args.length === 1 && args[0] && typeof args[0] === "object" && args[0].title && args[0].body) {
            return `${args[0].title}: ${args[0].body}`;
        }

        return args.map(arg => stringifyLogArg(arg)).join(" ");
    };

    const filteredLogs = logs.filter(log => {
        if (!activeFilters.has(log.level)) return false;
        if (!searchQuery) return true;
        const logString = formatLog(log.args).toLowerCase();
        return logString.includes(searchQuery.toLowerCase());
    });

    // Reset start index when filters change
    useEffect(() => {
        setStartIndex(Math.max(0, filteredLogs.length - 50));
        setAutoScroll(true);
    }, [activeFilters, searchQuery, updateTrigger]);

    const displayedLogs = filteredLogs.slice(startIndex);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const {scrollTop, scrollHeight, clientHeight} = e.currentTarget;

        // Auto-scroll logic
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
        setAutoScroll(isAtBottom);

        // Lazy load up
        if (scrollTop === 0 && startIndex > 0) {
            prevScrollHeightRef.current = scrollHeight;
            setStartIndex(Math.max(0, startIndex - 50));
        }
    };

    useLayoutEffect(() => {
        if (logsContainerRef.current) {
            if (autoScroll) {
                logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
            } else if (prevScrollHeightRef.current > 0) {
                const newScrollHeight = logsContainerRef.current.scrollHeight;
                logsContainerRef.current.scrollTop = newScrollHeight - prevScrollHeightRef.current;
                prevScrollHeightRef.current = 0;
            }
        }
    }, [displayedLogs, autoScroll]);

    const getLevelString = (level: LogLevel) => {
        switch (level) {
            case LogLevel.ERROR:
                return "ERROR";
            case LogLevel.WARN:
                return "WARN";
            case LogLevel.INFO:
                return "INFO";
            case LogLevel.DEBUG:
                return "DEBUG";
            case LogLevel.LOG:
                return "LOG";
            default:
                return "UNKNOWN";
        }
    };

    return (
        <Container style={{height: height}}>
            <ResizeHandle onMouseDown={startResizing} />
            <HeaderControls>
                <SearchContainer $isOpen={isSearchOpen}>
                    <SearchIconWrapper onClick={() => setIsSearchOpen(!isSearchOpen)}>
                        <img src={searchIcon}
                            alt="search"
                        />
                    </SearchIconWrapper>
                    <SearchInput
                        $width={isSearchOpen ? "150px" : "0px"}
                        placeholder="Search logs..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        ref={inputRef}
                    />
                    {searchQuery && isSearchOpen && 
                        <ClearSearchButton onClick={() => setSearchQuery("")}>
                            <img src={closeIcon}
                                alt="clear"
                            />
                        </ClearSearchButton>
                    }
                </SearchContainer>

                <MaxLogsInput
                    type="number"
                    title="Max Logs"
                    value={maxLogs}
                    onChange={e => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val > 0) {
                            setMaxLogs(val);
                        }
                    }}
                />

                <button className="clear-button"
                    onClick={onClear}
                >
                    Clear
                </button>
                <div className="close-button"
                    onClick={onClose}
                >
                    ✕
                </div>
            </HeaderControls>

            <FiltersContainer>
                <FilterButton
                    $isActive={activeFilters.has(LogLevel.ERROR)}
                    $level="ERROR"
                    onClick={() => toggleFilter(LogLevel.ERROR)}
                >
                    Errors
                </FilterButton>
                <FilterButton
                    $isActive={activeFilters.has(LogLevel.WARN)}
                    $level="WARN"
                    onClick={() => toggleFilter(LogLevel.WARN)}
                >
                    Warnings
                </FilterButton>
                <FilterButton
                    $isActive={activeFilters.has(LogLevel.INFO)}
                    $level="INFO"
                    onClick={() => toggleFilter(LogLevel.INFO)}
                >
                    Info
                </FilterButton>
                <FilterButton
                    $isActive={activeFilters.has(LogLevel.LOG)}
                    $level="LOG"
                    onClick={() => toggleFilter(LogLevel.LOG)}
                >
                    Logs
                </FilterButton>
            </FiltersContainer>

            <LogsContainer onScroll={handleScroll}
                ref={logsContainerRef}
            >
                {filteredLogs.length === 0 ? 
                    <EmptyState>
                        {searchQuery || activeFilters.size < 4
                            ? "No logs match your search or filters."
                            : "No errors or warnings recorded during game runtime."}
                    </EmptyState>
                 : 
                    displayedLogs.map((log, index) => 
                        <LogEntry key={index}
                            log={log}
                            levelString={getLevelString(log.level)}
                            formatLog={formatLog}
                        />,
                    )
                }
            </LogsContainer>
        </Container>
    );
};

const LogEntry = ({
    log,
    levelString,
    formatLog,
}: {
    log: GameLog;
    levelString: string;
    formatLog: (args: any[]) => string;
}) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [copyState, setCopyState] = React.useState<"idle" | "copied" | "failed">("idle");
    const formattedLog = `[${new Date(log.timestamp).toLocaleTimeString()}] ${formatLog(log.args)}`;

    // Extract clickable items if present
    const clickableItems =
        log.args.length === 1 && log.args[0] && typeof log.args[0] === "object" && log.args[0].clickableItems
            ? (log.args[0].clickableItems as ToastClickableItem[])
            : undefined;

    const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(formattedLog);
            } else {
                const textarea = document.createElement("textarea");
                textarea.value = formattedLog;
                textarea.setAttribute("readonly", "");
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);
            }
            setCopyState("copied");
        } catch {
            setCopyState("failed");
        }

        window.setTimeout(() => setCopyState("idle"), 1500);
    };

    return (
        <LogItem
            $level={levelString}
            $isExpanded={isExpanded}
            title="Debug log entry"
        >
            <LogHeader>
                <LogMessage $isExpanded={isExpanded}>{formattedLog}</LogMessage>
                <LogActions>
                    <LogActionButton onClick={handleCopy}>{copyState === "idle" ? "Copy" : copyState}</LogActionButton>
                    <LogActionButton onClick={() => setIsExpanded(!isExpanded)}>
                        {isExpanded ? "Collapse" : "Expand"}
                    </LogActionButton>
                </LogActions>
            </LogHeader>
            {isExpanded && clickableItems && clickableItems.length > 0 && 
                <ClickableItemsList onClick={e => e.stopPropagation()}>
                    {clickableItems.map((item, index) => 
                        <ClickableItem
                            key={index}
                            onClick={() => item.onClick()}
                            title={item.tooltip || `Click to ${item.text.toLowerCase()}`}
                        >
                            {item.icon && <ItemIcon>{item.icon}</ItemIcon>}
                            <ItemText>{item.text}</ItemText>
                        </ClickableItem>,
                    )}
                </ClickableItemsList>
            }
        </LogItem>
    );
};
