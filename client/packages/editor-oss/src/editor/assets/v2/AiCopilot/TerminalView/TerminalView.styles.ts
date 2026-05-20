import styled from "styled-components";

export const TerminalContainer = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    font-family: "Menlo", "Monaco", "Courier New", monospace;
    font-size: 12px;
    line-height: 1.6;
`;

export const TerminalOutput = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 8px 4px;
    min-height: 0;
    user-select: text;
    cursor: text;

    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
    }
`;

export const TerminalEntry = styled.div`
    margin-bottom: 8px;
`;

export const CommandLine = styled.div`
    color: rgba(255, 255, 255, 0.9);
    white-space: pre-wrap;
    word-break: break-all;

    &::before {
        content: "> ";
        color: #4ade80;
    }
`;

export const ResultLine = styled.div<{$status: "success" | "error" | "info"}>`
    color: ${({$status}) =>
        $status === "success"
            ? "#4ade80"
            : $status === "error"
              ? "#f87171"
              : "#67e8f9"};
    white-space: pre-wrap;
    word-break: break-all;
    padding-left: 12px;
    margin-top: 2px;
`;

export const MarkdownResultLine = styled.div<{$status: "success" | "error" | "info"}>`
    color: ${({$status}) =>
        $status === "success"
            ? "#4ade80"
            : $status === "error"
              ? "#f87171"
              : "#67e8f9"};
    padding-left: 12px;
    margin-top: 2px;
    overflow-wrap: anywhere;

    h1, h2, h3, h4, h5, h6 {
        color: inherit;
        margin: 0 0 8px 0;
        font-size: 12px;
        font-weight: 700;
    }

    p {
        margin: 0 0 8px 0;

        &:last-child {
            margin-bottom: 0;
        }
    }

    ul, ol {
        margin: 0 0 8px 18px;
        padding: 0;
    }

    li {
        margin-bottom: 4px;
    }

    code {
        font-family: "Menlo", "Monaco", "Courier New", monospace;
        font-size: 12px;
        background: rgba(255, 255, 255, 0.12);
        color: #f8fafc;
        padding: 1px 4px;
        border-radius: 4px;
    }

    pre {
        margin: 8px 0;
        padding: 10px 12px;
        background: rgba(0, 0, 0, 0.28);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        overflow-x: auto;
    }

    pre code {
        background: transparent;
        color: inherit;
        padding: 0;
        border-radius: 0;
    }

    strong {
        color: #f8fafc;
    }
`;

export const TerminalInputWrapper = styled.div`
    display: flex;
    align-items: flex-start;
    padding: 8px 4px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    gap: 4px;
`;

export const TerminalPromptChar = styled.span`
    color: #4ade80;
    user-select: none;
    line-height: 1.6;
`;

export const TerminalInput = styled.input`
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: rgba(255, 255, 255, 0.9);
    font-family: "Menlo", "Monaco", "Courier New", monospace;
    font-size: 12px;
    line-height: 1.6;
    caret-color: #4ade80;

    &::placeholder {
        color: rgba(255, 255, 255, 0.25);
    }

    &:disabled {
        opacity: 0.5;
    }
`;

export const SuggestionsDropdown = styled.div`
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    max-height: 150px;
    overflow-y: auto;
    background: rgba(30, 30, 30, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    margin-bottom: 4px;
    z-index: 10;
`;

export const SuggestionItem = styled.div<{$isActive?: boolean}>`
    padding: 4px 8px;
    cursor: pointer;
    font-size: 12px;
    color: ${({$isActive}) => ($isActive ? "#fff" : "rgba(255, 255, 255, 0.7)")};
    background: ${({$isActive}) => ($isActive ? "rgba(255, 255, 255, 0.1)" : "transparent")};

    &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
    }
`;

export const SuggestionsHint = styled.div`
    padding: 6px 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 10px;
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 0.02em;
`;

export const WelcomeMessage = styled.div`
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 8px;
    font-size: 11px;
`;

export const ProgressLine = styled.div`
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
    padding-left: 12px;
`;

export const TerminalBadge = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    background: rgba(74, 222, 128, 0.15);
    border: 1px solid rgba(74, 222, 128, 0.3);
    border-radius: 4px;
    font-size: 10px;
    color: #4ade80;
    font-family: "Menlo", "Monaco", "Courier New", monospace;
    margin-left: 4px;
`;
