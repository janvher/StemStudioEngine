import styled from "styled-components";

export const DebuggerContainer = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: #09090b;
    color: #e4e4e7;
    font-family: "Inter", sans-serif;
`;

export const TopBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: #1e293b;
    border-bottom: 1px solid #334155;
    font-size: 13px;
    color: #94a3b8;
    gap: 12px;
`;

export const TopBarTitle = styled.span`
    font-weight: 600;
    color: #e2e8f0;
`;

export const TopBarInfo = styled.span`
    font-size: 12px;
    color: #64748b;
`;

export const StopButton = styled.button`
    padding: 4px 12px;
    border: 1px solid #ef4444;
    border-radius: 4px;
    background: transparent;
    color: #ef4444;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
        background: rgba(239, 68, 68, 0.15);
    }
`;

export const MainArea = styled.div`
    display: flex;
    flex: 1;
    overflow: hidden;
`;

export const SidePanel = styled.div`
    width: 220px;
    min-width: 180px;
    border-right: 1px solid #27272a;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

export const SearchInput = styled.input`
    padding: 6px 10px;
    margin: 8px;
    border: 1px solid #3f3f46;
    border-radius: 4px;
    background: #18181b;
    color: #e4e4e7;
    font-size: 12px;
    outline: none;

    &:focus {
        border-color: #6366f1;
    }

    &::placeholder {
        color: #52525b;
    }
`;

export const ScriptListContainer = styled.div`
    flex: 1;
    overflow-y: auto;
    padding-bottom: 8px;
`;

export const SectionHeader = styled.div`
    padding: 6px 12px 4px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #71717a;
`;

export const ScriptItem = styled.div<{$active: boolean}>`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background: ${p => (p.$active ? "#27272a" : "transparent")};
    color: ${p => (p.$active ? "#f4f4f5" : "#a1a1aa")};

    &:hover {
        background: ${p => (p.$active ? "#27272a" : "#18181b")};
    }
`;

export const BreakpointDot = styled.span`
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ef4444;
    flex-shrink: 0;
`;

export const ScriptName = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const SearchResultItem = styled.div<{$active: boolean}>`
    padding: 4px 12px;
    font-size: 12px;
    cursor: pointer;
    background: ${p => (p.$active ? "#27272a" : "transparent")};
    color: ${p => (p.$active ? "#f4f4f5" : "#a1a1aa")};

    &:hover {
        background: ${p => (p.$active ? "#27272a" : "#18181b")};
    }
`;

export const MatchPreview = styled.div`
    font-size: 11px;
    color: #52525b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
`;

export const MatchHighlight = styled.span`
    color: #facc15;
`;

export const EditorArea = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

export const MonacoWrapper = styled.div`
    flex: 1;
    overflow: hidden;
`;

export const ConsolePanel = styled.div`
    height: 200px;
    min-height: 100px;
    border-top: 1px solid #27272a;
    overflow-y: auto;
    padding: 8px;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 12px;
    line-height: 1.6;
`;

const consoleColors: Record<string, string> = {
    log: "#d4d4d8",
    info: "#38bdf8",
    warn: "#facc15",
    error: "#f87171",
};

export const ConsoleLine = styled.div<{$type: string}>`
    color: ${p => consoleColors[p.$type] || "#d4d4d8"};
    white-space: pre-wrap;
    word-break: break-all;
`;

export const ConsoleTimestamp = styled.span`
    color: #52525b;
    margin-right: 8px;
    font-size: 10px;
`;

export const DebuggerBar = styled.div`
    position: fixed;
    bottom: 18px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    border-radius: 10px;
    border: 1px solid #ef444466;
    background: #1e1b2e;
    color: #e4e4e7;
    font-size: 13px;
    cursor: pointer;
    z-index: 9999;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
    pointer-events: all;

    &:hover {
        background: #2a2640;
        border-color: #ef4444aa;
    }
`;

export const DebuggerBarDot = styled.span`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ef4444;
    animation: pulse-dot 2s infinite;

    @keyframes pulse-dot {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
    }
`;
