import styled, {css, keyframes} from "styled-components";

export const Container = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 12px;
    gap: 8px;
    background: var(--theme-container-main-dark);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    pointer-events: all;
    transition: height 0.3s ease;
`;

export const HeaderContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 4px;
`;

export const HeaderButtonsContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

export const InsufficientCreditsNotice = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    margin: 8px 4px 0;
    border-radius: 8px;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.35);
`;

export const InsufficientCreditsSubtext = styled.div`
    font-size: 11px;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.5;
`;

export const InputWrapper = styled.div<{$isActive?: boolean}>`
    display: flex;
    flex-direction: column;
    padding: 12px;
    border-radius: 8px;
    background-color: var(--theme-input-background-color);
    transition: all 0.2s ease;
    position: relative;
    gap: 8px;
    min-height: 80px;
    margin-top: auto;
`;

export const Prompt = styled.textarea`
    width: 100%;
    min-height: 40px;
    max-height: 180px;
    height: 40px;
    background: transparent;
    border: none;
    outline: none;
    color: var(--theme-font-unselected-color);
    font-family: "Source Code Pro", monospace;
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    resize: none;
    padding: 0;
    padding-right: 40px; /* Space for the button */
    line-height: 1.5;
    overflow-y: auto;

    &::placeholder {
        color: rgba(255, 255, 255, 0.4);
    }
`;

export const SubmitButton = styled.button`
    position: absolute;
    bottom: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #f4f4f5;
    border: none;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }
`;

const spin = keyframes`
    from {transform:rotate(0deg);}
    to {transform:rotate(360deg);}
`;

const shine = keyframes`
   0% { background-position: 200% center; }
   100% { background-position: -200% center; }
`;

export const ProcessingStatusContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0 4px;
    margin-top: 8px;
`;

export const ProcessingMainText = styled.div`
    font-size: 13px;
    font-weight: 500;

    background: linear-gradient(90deg, rgba(255, 255, 255, 0.4) 0%, #fff 20%, rgba(255, 255, 255, 0.4) 40%);
    background-size: 200% auto;
    color: transparent;
    -webkit-background-clip: text;
    background-clip: text;

    animation: ${shine} 2s linear infinite;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const ProcessingSubText = styled.div`
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    padding-left: 12px;
    position: relative;

    /* Dot indicator */
    &::before {
        content: "";
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
    }

    background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.3) 0%,
        rgba(255, 255, 255, 0.8) 20%,
        rgba(255, 255, 255, 0.3) 40%
    );
    background-size: 200% auto;
    color: transparent;
    -webkit-background-clip: text;
    background-clip: text;

    animation: ${shine} 2s linear infinite;
    animation-delay: 0.5s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const ProjectTasksPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.045);
    border: 1px solid rgba(255, 255, 255, 0.08);
    min-height: 0;
    max-height: 132px;
    overflow-y: auto;
`;

export const PanelEyebrow = styled.div`
    color: rgba(255, 255, 255, 0.62);
    font-family: "Source Code Pro", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
`;

export const ActivityFeedPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid rgba(255, 255, 255, 0.08);
`;

export const ActivityRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 7px;
`;

export const ActivityHeader = styled.div`
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
`;

export const ActivityTitle = styled.div`
    color: rgba(255, 255, 255, 0.84);
    font-size: 12px;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const ActivityDetail = styled.div`
    color: rgba(255, 255, 255, 0.58);
    font-size: 11px;
    line-height: 1.4;
`;

export const ActivityChipList = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
`;

export const ActivityActionButton = styled.button`
    min-height: 24px;
    padding: 0 8px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.055);
    color: rgba(255, 255, 255, 0.82);
    font-size: 10px;
    cursor: pointer;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.48;
    }
`;

export const ActivityStatusChip = styled.span<{$state?: "done" | "active" | "idle" | "error"}>`
    min-height: 24px;
    max-width: 100%;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 0 8px;
    border-radius: 999px;
    border: 1px solid ${({$state}) => {
        if ($state === "done") return "rgba(74, 222, 128, 0.36)";
        if ($state === "active") return "rgba(14, 165, 233, 0.38)";
        if ($state === "error") return "rgba(248, 113, 113, 0.42)";
        return "rgba(255, 255, 255, 0.12)";
    }};
    background: ${({$state}) => {
        if ($state === "done") return "rgba(34, 197, 94, 0.12)";
        if ($state === "active") return "rgba(14, 165, 233, 0.14)";
        if ($state === "error") return "rgba(248, 113, 113, 0.12)";
        return "rgba(255, 255, 255, 0.045)";
    }};
    color: ${({$state}) => {
        if ($state === "done") return "rgba(187, 247, 208, 0.92)";
        if ($state === "active") return "rgba(255, 255, 255, 0.9)";
        if ($state === "error") return "rgba(254, 202, 202, 0.94)";
        return "rgba(255, 255, 255, 0.58)";
    }};
    font-family: "Source Code Pro", monospace;
    font-size: 11px;
    line-height: 1.3;
    white-space: nowrap;

    &::before {
        content: "";
        flex: 0 0 auto;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        border: 1px solid ${({$state}) => {
            if ($state === "done") return "rgba(74, 222, 128, 0.8)";
            if ($state === "active") return "rgba(14, 165, 233, 0.9)";
            if ($state === "error") return "rgba(248, 113, 113, 0.86)";
            return "rgba(255, 255, 255, 0.32)";
        }};
        background: ${({$state}) => {
            if ($state === "done") return "rgba(74, 222, 128, 0.28)";
            if ($state === "active") return "rgba(14, 165, 233, 0.3)";
            if ($state === "error") return "rgba(248, 113, 113, 0.28)";
            return "transparent";
        }};
    }
`;

export const VersionTimelinePanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid rgba(255, 255, 255, 0.08);
`;

export const VersionTimelineHeader = styled.div`
    min-height: 22px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 24px;
    align-items: center;
    gap: 8px;
`;

export const VersionTimelineToggle = styled.button<{$expanded?: boolean}>`
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.72);
    cursor: pointer;

    svg {
        width: 14px;
        height: 14px;
        transition: transform 120ms ease;
        transform: rotate(${({$expanded}) => $expanded ? "90deg" : "0deg"});
    }

    &:hover {
        border-color: rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.9);
    }
`;

export const VersionTimelineList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 190px;
    overflow-y: auto;
`;

export const VersionTimelineItem = styled.div`
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
`;

export const VersionTimelineTitle = styled.div`
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: rgba(255, 255, 255, 0.88);
    font-family: "Source Code Pro", monospace;
    font-size: 11px;
    font-weight: 700;

    > span:first-child {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

export const VersionTimelineText = styled.div`
    color: rgba(255, 255, 255, 0.72);
    font-size: 11px;
    line-height: 1.35;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const VersionTimelineMeta = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: rgba(255, 255, 255, 0.5);
    font-family: "Source Code Pro", monospace;
    font-size: 10px;
`;

export const VersionTimelineActions = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 2px;
`;

export const VersionTimelineActionButton = styled.button`
    min-height: 23px;
    padding: 0 7px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.045);
    color: rgba(255, 255, 255, 0.74);
    font-size: 10px;
    cursor: pointer;

    &:hover {
        background: rgba(255, 255, 255, 0.09);
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.42;
    }
`;

export const VersionTimelineBadgeList = styled.div`
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: 58%;
    overflow: hidden;
`;

export const VersionTimelineBadge = styled.span<{$kind?: "current" | "preview" | "published" | "head" | "release"}>`
    min-height: 18px;
    display: inline-flex;
    align-items: center;
    padding: 0 6px;
    border-radius: 999px;
    border: 1px solid ${({$kind}) => {
        if ($kind === "current") return "rgba(74, 222, 128, 0.34)";
        if ($kind === "preview") return "rgba(14, 165, 233, 0.38)";
        if ($kind === "published") return "rgba(250, 204, 21, 0.38)";
        if ($kind === "release") return "rgba(168, 85, 247, 0.35)";
        return "rgba(255, 255, 255, 0.12)";
    }};
    background: ${({$kind}) => {
        if ($kind === "current") return "rgba(34, 197, 94, 0.12)";
        if ($kind === "preview") return "rgba(14, 165, 233, 0.14)";
        if ($kind === "published") return "rgba(250, 204, 21, 0.12)";
        if ($kind === "release") return "rgba(168, 85, 247, 0.12)";
        return "rgba(255, 255, 255, 0.045)";
    }};
    color: rgba(255, 255, 255, 0.82);
    font-family: "Source Code Pro", monospace;
    font-size: 9px;
    font-weight: 700;
    white-space: nowrap;
`;

export const VersionTimelineEmpty = styled.div`
    min-height: 34px;
    display: flex;
    align-items: center;
    color: rgba(255, 255, 255, 0.56);
    font-size: 11px;
    line-height: 1.4;
`;

export const ConfirmationCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    border: 1px solid rgba(14, 165, 233, 0.28);
    border-radius: 8px;
    background: rgba(14, 165, 233, 0.075);
`;

export const ConfirmationTitle = styled.div`
    color: rgba(255, 255, 255, 0.92);
    font-size: 13px;
    font-weight: 700;
`;

export const ConfirmationInlineMeta = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
`;

export const ConfirmationMetaLabel = styled.span`
    color: rgba(255, 255, 255, 0.58);
    font-family: "Source Code Pro", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
`;

export const ConfirmationSystemTag = styled.span`
    min-height: 24px;
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid rgba(14, 165, 233, 0.28);
    background: rgba(14, 165, 233, 0.1);
    color: rgba(191, 219, 254, 0.92);
    font-family: "Source Code Pro", monospace;
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const ConfirmationText = styled.div`
    color: rgba(255, 255, 255, 0.78);
    font-size: 12px;
    line-height: 1.45;
`;

export const ValidationList = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
`;

export const ValidationCapsule = styled.span<{$status: "pass" | "warn" | "fail"}>`
    min-height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid ${({$status}) => {
        if ($status === "pass") return "rgba(74, 222, 128, 0.34)";
        if ($status === "warn") return "rgba(250, 204, 21, 0.38)";
        return "rgba(248, 113, 113, 0.42)";
    }};
    background: ${({$status}) => {
        if ($status === "pass") return "rgba(34, 197, 94, 0.12)";
        if ($status === "warn") return "rgba(250, 204, 21, 0.12)";
        return "rgba(248, 113, 113, 0.12)";
    }};
    color: ${({$status}) => {
        if ($status === "pass") return "rgba(187, 247, 208, 0.92)";
        if ($status === "warn") return "rgba(254, 240, 138, 0.92)";
        return "rgba(254, 202, 202, 0.94)";
    }};
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const ConfirmationActions = styled.div`
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
`;

export const ConfirmationButton = styled.button<{$variant?: "primary" | "neutral" | "danger"}>`
    min-height: 32px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid ${({$variant}) => {
        if ($variant === "primary") return "rgba(14, 165, 233, 0.55)";
        if ($variant === "danger") return "rgba(248, 113, 113, 0.45)";
        return "rgba(255, 255, 255, 0.14)";
    }};
    background: ${({$variant}) => {
        if ($variant === "primary") return "rgba(14, 165, 233, 0.24)";
        if ($variant === "danger") return "rgba(248, 113, 113, 0.1)";
        return "rgba(255, 255, 255, 0.055)";
    }};
    color: rgba(255, 255, 255, 0.86);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;

    &:disabled {
        cursor: not-allowed;
        opacity: 0.48;
    }
`;

export const ProjectTasksTitle = styled.div`
    color: rgba(255, 255, 255, 0.72);
    font-size: 11px;
    font-weight: 600;
`;

export const ProjectTaskList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

export const ProjectTaskItem = styled.div<{$status: string}>`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    min-height: 24px;
    padding-left: 10px;
    color: rgba(255, 255, 255, 0.82);
    font-size: 11px;
    position: relative;

    span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &::before {
        content: "";
        position: absolute;
        left: 0;
        top: 50%;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        transform: translateY(-50%);
        background: ${({$status}) => {
            switch ($status) {
                case "done":
                    return "#4ade80";
                case "in_progress":
                    return "#60a5fa";
                case "blocked":
                    return "#f97316";
                case "cancelled":
                    return "#a1a1aa";
                default:
                    return "#facc15";
            }
        }};
    }
`;

export const ProjectTaskMeta = styled.div`
    color: rgba(255, 255, 255, 0.45);
    font-size: 10px;
    text-transform: capitalize;
    white-space: nowrap;
`;

export const LoadingWrapper = styled.div`
    width: 100%;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    font-size: 12px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.8);

    img {
        width: 20px;
        height: 20px;
        animation: ${spin} 1s linear infinite;
        opacity: 0.8;
    }
`;

export const CloseBtn = styled.img`
    cursor: pointer;
    width: 26px;
    height: 26px;
    opacity: 0.6;
    transition: opacity 0.2s;

    &:hover {
        opacity: 1;
    }
`;

export const ResetBt = styled.span`
    font-size: 11px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.2s;
    background: rgba(255, 255, 255, 0.05);

    &:hover {
        color: white;
        background: rgba(255, 255, 255, 0.1);
    }
`;

export const AiMessages = styled.div`
    flex: 1;
    overflow-y: auto;
    padding-right: 4px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: #fff;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.5;
    min-height: 0;
    user-select: text;

    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
    }

    .message {
        word-wrap: break-word;
        max-width: 100%;

        /* Markdown Styles */
        p {
            margin: 0 0 8px 0;
            line-height: 1.5;
            &:last-child {
                margin-bottom: 0;
            }
        }

        pre {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 12px;
            overflow-x: auto;
            margin: 8px 0;
        }

        .code-block-wrapper {
            position: relative;

            &:hover .code-block-toolbar {
                opacity: 1;
                pointer-events: all;
            }
        }

        .code-block-toolbar {
            position: absolute;
            top: 6px;
            right: 6px;
            display: flex;
            gap: 4px;
            padding: 4px;
            background: rgba(40, 40, 40, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s;
            z-index: 10;
        }

        .copy-code-btn {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;

            &:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }

            svg {
                width: 14px;
                height: 14px;
            }
        }

        code {
            font-family: "Menlo", "Monaco", "Courier New", monospace;
            font-size: 12px;
            background: rgba(255, 255, 255, 0.1);
            padding: 2px 4px;
            border-radius: 4px;
        }

        pre code {
            background: transparent;
            padding: 0;
            border-radius: 0;
            color: #d4d4d4;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
            table-layout: fixed;
        }

        th,
        td {
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 6px 8px;
            text-align: left;
            vertical-align: top;
            word-break: break-word;
        }

        th {
            font-weight: 600;
            background: rgba(255, 255, 255, 0.06);
        }
    }

    .message-user {
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        color: #fff;
        align-self: stretch;
        text-align: left;
    }

    .message-agent {
        padding: 0 4px;
        background: transparent;
        border: none;
        color: #ddd;
        align-self: flex-start;
        text-align: left;
    }

    .message-thought {
        padding: 8px 10px;
        background: rgba(255, 255, 255, 0.035);
        border-left: 2px solid rgba(255, 255, 255, 0.22);
        border-radius: 6px;
        color: rgba(255, 255, 255, 0.62);
        font-size: 12px;
        align-self: stretch;
        text-align: left;
    }

    .message-thought::before {
        content: "Thinking";
        display: block;
        margin-bottom: 4px;
        color: rgba(255, 255, 255, 0.42);
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
    }
`;

export const Header = styled.div`
    color: rgba(255, 255, 255, 0.9);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.5px;
    flex: 1;
    text-align: center;
    text-transform: uppercase;
    opacity: 0.8;
`;

export const AttachedObjectsContainer = styled.div`
    /* Deprecated or merged into input wrapper logic */
    display: none;
`;

export const AttachedObjectsList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 4px;
`;

export const AttachedObjectChip = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 6px 2px 8px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.8);
    transition: all 0.2s ease;
    cursor: default;

    &:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.2);
    }
`;

export const ObjectName = styled.span`
    font-weight: 500;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const RemoveButton = styled.button`
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    transition: all 0.2s ease;
    font-size: 14px;
    line-height: 1;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.9);
    }
`;
export const MessageAttachments = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

export const AttachmentChip = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
    }
`;

export const SuggestedObjectChip = styled(AttachedObjectChip)`
    background: rgba(255, 255, 255, 0.05);
    border: 1px dashed rgba(255, 255, 255, 0.3);
    cursor: pointer;
    color: rgba(255, 255, 255, 0.6);

    &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-1px);
        color: rgba(255, 255, 255, 0.9);
    }
`;

export const ProcessingText = styled.span<{$state?: "loading" | "failed" | "success"}>`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 320px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 11px;

    ${({$state}) =>
        $state === "failed" &&
        `
        color: #ff6b6b;
    `}

    ${({$state}) =>
        $state === "success" &&
        `
        color: #4ade80;
    `}
`;

export const PermissionContainer = styled.div`
    margin-top: 12px;
    margin-bottom: 8px;
    background: rgba(30, 30, 30, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-self: flex-start;
    width: 100%;
    box-sizing: border-box;
`;

export const PermissionMessage = styled.div`
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.4;
`;

export const PermissionButtons = styled.div`
    display: flex;
    gap: 4px;
    margin-top: 4px;
`;

export const PermissionButton = styled.button<{variant?: "primary" | "secondary" | "danger"}>`
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: ${props => (props.variant === "primary" ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.05)")};
    color: ${props => (props.variant === "primary" ? "#38bdf8" : "#e4e4e7")};
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;

    &:hover {
        background: ${props => (props.variant === "primary" ? "rgba(56, 189, 248, 0.25)" : "rgba(255, 255, 255, 0.1)")};
        border-color: ${props =>
            props.variant === "primary" ? "rgba(56, 189, 248, 0.4)" : "rgba(255, 255, 255, 0.2)"};
    }
`;

const pulse = keyframes`
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
`;

const rotate = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

export const ConnectionStatusContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 16px;
    padding: 24px;
    text-align: center;
`;

export const ConnectionStatusIcon = styled.div<{$isConnecting?: boolean; $isError?: boolean}>`
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${props => (props.$isError ? "rgba(239, 68, 68, 0.15)" : "rgba(56, 189, 248, 0.15)")};
    border: 2px solid ${props => (props.$isError ? "rgba(239, 68, 68, 0.3)" : "rgba(56, 189, 248, 0.3)")};
    position: relative;

    ${props =>
        props.$isConnecting &&
        css`
            border-color: transparent;

            &::before {
                content: "";
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                border-radius: 50%;
                border: 2px solid rgba(56, 189, 248, 0.2);
            }

            &::after {
                content: "";
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                border-radius: 50%;
                border: 2px solid transparent;
                border-top-color: #38bdf8;
                animation: ${rotate} 1s linear infinite;
            }
        `}

    svg {
        width: 24px;
        height: 24px;
        color: ${props => (props.$isError ? "#ef4444" : "#38bdf8")};
    }
`;

export const ConnectionStatusTitle = styled.div<{$isError?: boolean}>`
    font-size: 15px;
    font-weight: 600;
    color: ${props => (props.$isError ? "#ef4444" : "rgba(255, 255, 255, 0.9)")};

    ${props =>
        !props.$isError &&
        css`
            background: linear-gradient(90deg, rgba(255, 255, 255, 0.6) 0%, #fff 50%, rgba(255, 255, 255, 0.6) 100%);
            background-size: 200% auto;
            color: transparent;
            -webkit-background-clip: text;
            background-clip: text;
            animation: ${shine} 2s linear infinite;
        `}
`;

export const ConnectionStatusMessage = styled.div`
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.5;
    max-width: 280px;
`;

export const ConnectionAttemptText = styled.div`
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
    animation: ${pulse} 1.5s ease-in-out infinite;
`;

export const RetryButton = styled.button`
    padding: 10px 24px;
    border-radius: 8px;
    border: 1px solid rgba(56, 189, 248, 0.3);
    background: rgba(56, 189, 248, 0.1);
    color: #38bdf8;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 8px;

    &:hover {
        background: rgba(56, 189, 248, 0.2);
        border-color: rgba(56, 189, 248, 0.5);
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(0);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }
`;
