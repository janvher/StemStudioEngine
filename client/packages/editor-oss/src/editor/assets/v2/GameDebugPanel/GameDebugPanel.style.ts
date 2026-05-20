import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../assets/style";

export const Container = styled.div`
    width: 100%;
    position: fixed;
    left: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    border-top: 1px solid #ffffff1a;
    background: var(--theme-container-minor-dark);
    z-index: 1100;
    padding: 16px;
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.5);

    .close-button {
        font-size: 20px;
        cursor: pointer;
        color: #fff;
        opacity: 0.7;
        &:hover {
            opacity: 1;
        }
    }

    .clear-button {
        font-size: 14px;
        cursor: pointer;
        color: #fff;
        opacity: 0.7;
        border: 1px solid rgba(255, 255, 255, 0.3);
        padding: 2px 8px;
        border-radius: 4px;
        background: transparent;

        &:hover {
            opacity: 1;
            background: rgba(255, 255, 255, 0.1);
        }
    }
`;

export const HeaderControls = styled.div`
    position: absolute;
    right: 16px;
    top: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
`;

export const ResizeHandle = styled.div`
    position: absolute;
    top: -5px;
    left: 0;
    width: 100%;
    height: 10px;
    cursor: ns-resize;
    z-index: 1000;
    background: transparent;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
`;

export const Title = styled.div`
    ${regularFont("s")};
    color: #fff;
    margin-bottom: 12px;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 16px;
`;

export const FiltersContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 16px;
`;

export const MaxLogsInput = styled.input`
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    color: #fff;
    padding: 2px 4px;
    width: 60px;
    font-size: 12px;
    margin-left: auto;

    &:focus {
        outline: none;
        border-color: rgba(255, 255, 255, 0.4);
    }
`;

export const FilterButton = styled.button<{$isActive: boolean; $level: string}>`
    ${regularFont("s")};
    padding: 2px 8px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s ease;

    background: ${props =>
        props.$isActive
            ? props.$level === "ERROR"
                ? "rgba(239, 68, 68, 0.2)"
                : props.$level === "WARN"
                  ? "rgba(245, 158, 11, 0.2)"
                  : props.$level === "INFO"
                    ? "rgba(59, 130, 246, 0.2)"
                    : "rgba(255, 255, 255, 0.1)"
            : "transparent"};

    color: ${props =>
        props.$isActive
            ? props.$level === "ERROR"
                ? "#fca5a5"
                : props.$level === "WARN"
                  ? "#fcd34d"
                  : props.$level === "INFO"
                    ? "#93c5fd"
                    : "#e2e8f0"
            : "#64748b"};

    border-color: ${props =>
        props.$isActive
            ? props.$level === "ERROR"
                ? "#ef4444"
                : props.$level === "WARN"
                  ? "#f59e0b"
                  : props.$level === "INFO"
                    ? "#3b82f6"
                    : "rgba(255, 255, 255, 0.2)"
            : "rgba(255, 255, 255, 0.1)"};

    &:hover {
        background: ${props =>
            props.$isActive
                ? props.$level === "ERROR"
                    ? "rgba(239, 68, 68, 0.3)"
                    : props.$level === "WARN"
                      ? "rgba(245, 158, 11, 0.3)"
                      : props.$level === "INFO"
                        ? "rgba(59, 130, 246, 0.3)"
                        : "rgba(255, 255, 255, 0.2)"
                : "rgba(255, 255, 255, 0.05)"};
    }
`;

export const LogsContainer = styled.div`
    flex: 1;
    overflow-y: auto;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const LogItem = styled.div<{$level: string; $isExpanded?: boolean}>`
    ${regularFont("s")};
    font-family: monospace;
    padding: 2px 6px;
    border-radius: 4px;
    flex-shrink: 0;
    background: ${({$level}) => {
        switch ($level) {
            case "ERROR":
                return "rgba(239, 68, 68, 0.2)";
            case "WARN":
                return "rgba(245, 158, 11, 0.2)";
            case "INFO":
                return "rgba(59, 130, 246, 0.2)";
            default:
                return "rgba(255, 255, 255, 0.05)";
        }
    }};
    color: ${({$level}) => {
        switch ($level) {
            case "ERROR":
                return "#fca5a5";
            case "WARN":
                return "#fcd34d";
            case "INFO":
                return "#93c5fd";
            default:
                return "#e2e8f0";
        }
    }};
    border-left: 3px solid
        ${({$level}) => {
            switch ($level) {
                case "ERROR":
                    return "#ef4444";
                case "WARN":
                    return "#f59e0b";
                case "INFO":
                    return "#3b82f6";
                default:
                    return "#94a3b8";
            }
        }};

    white-space: normal;
    overflow: hidden;
    cursor: default;
    word-break: break-word;
    user-select: text;

    &:hover {
        background: ${({$level}) => {
            switch ($level) {
                case "ERROR":
                    return "rgba(239, 68, 68, 0.3)";
                case "WARN":
                    return "rgba(245, 158, 11, 0.3)";
                case "INFO":
                    return "rgba(59, 130, 246, 0.3)";
                default:
                    return "rgba(255, 255, 255, 0.1)";
            }
        }};
    }
`;

export const EmptyState = styled.div`
    ${flexCenter};
    flex: 1;
    color: #94a3b8;
    ${regularFont("s")};
`;

export const SearchContainer = styled.div<{$isOpen: boolean}>`
    display: flex;
    align-items: center;
    background: ${props => props.$isOpen ? "rgba(255, 255, 255, 0.1)" : "transparent"};
    border: ${props => props.$isOpen ? "1px solid rgba(255, 255, 255, 0.3)" : "none"};
    border-radius: 4px;
    padding: 2px 4px;
    transition: all 0.2s ease;
    height: 24px;
`;

export const SearchInput = styled.input<{$width: string}>`
    background: transparent;
    border: none;
    color: #fff;
    font-size: 12px;
    width: ${props => props.$width};
    padding: ${props => props.$width !== "0px" ? "0 4px" : "0"};
    transition: width 0.2s ease;
    outline: none;

    &::placeholder {
        color: rgba(255, 255, 255, 0.5);
    }
`;

export const SearchIconWrapper = styled.div`
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.7;
    width: 20px;
    height: 20px;

    &:hover {
        opacity: 1;
    }

    img {
        width: 14px;
        height: 14px;
    }
`;

export const ClearSearchButton = styled.div`
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.5;
    width: 16px;
    height: 16px;
    margin-left: 4px;

    &:hover {
        opacity: 1;
    }

    img {
        width: 10px;
        height: 10px;
    }
`;
