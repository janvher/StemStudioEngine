import {marked} from "marked";
import React, {useCallback, useEffect, useRef, useState} from "react";
import * as THREE from "three";

import {
    AiMessages,
    AttachedObjectChip,
    AttachedObjectsList,
    AttachmentChip,
    CloseBtn,
    ConnectionAttemptText,
    ConnectionStatusContainer,
    ConnectionStatusIcon,
    ConnectionStatusMessage,
    ConnectionStatusTitle,
    Container,
    HeaderButtonsContainer,
    HeaderContainer,
    InputWrapper,
    InsufficientCreditsNotice,
    InsufficientCreditsSubtext,
    MessageAttachments,
    ObjectName,
    PermissionButton,
    PermissionButtons,
    PermissionContainer,
    PermissionMessage,
    ProjectTaskItem,
    ProjectTaskList,
    ProjectTaskMeta,
    ProjectTasksPanel,
    ProjectTasksTitle,
    ProcessingMainText,
    ProcessingStatusContainer,
    ProcessingSubText,
    Prompt,
    RemoveButton,
    ResetBt,
    RetryButton,
    SubmitButton,
    SuggestedObjectChip,
} from "./AiCopilot.styles";
import {ChatHistory} from "./chatHistory/ChatHistory";
import {buildCopilotEntryGreeting, buildCopilotEntryPromptContext} from "./copilotWorkspaceEntry";
import {
    clearDashboardCopilotBootstrap,
    readDashboardCopilotBootstrap,
    type DashboardCopilotBootstrap,
} from "./dashboardCopilotBootstrap";
import closeIcon from "./icons/close-icon.svg";
import stopIcon from "./icons/stop.svg";
import submitIcon from "./icons/submit.svg";
import {InteractiveResults} from "./InteractiveResults/InteractiveResults";
import {TerminalView} from "./TerminalView/TerminalView";
import {TerminalBadge} from "./TerminalView/TerminalView.styles";
import {useTerminal, type TerminalHistoryEntry} from "./TerminalView/useTerminal";
import {generateTitle, Message, resolveObjectsByUuids} from "./utils/history";
import * as InteractionHandlers from "./utils/interaction";
import * as PromptUtils from "./utils/prompt";
import {
    readWorkspaceChatSnapshot,
    saveWorkspaceChatSnapshot,
} from "./workspaceChatSnapshot";
import {
    CopilotActivityFeed,
    type CopilotActivityFeedItem,
    type CopilotActivityFeedRow,
} from "./workflow/CopilotActivityFeed";
import {CopilotConfirmationCard} from "./workflow/CopilotConfirmationCard";
import {CopilotVersionTimeline} from "./workflow/CopilotVersionTimeline";
import {getCopilotProvider, type ICopilotProvider} from "../../../../copilot";
import {IS_OSS} from "@stem/editor-oss/mode/buildMode";
import {runWithCopilotPreviewSceneSaveAllowed} from "@stem/editor-oss/agent/copilotPreviewPersistence";
import {ConnectionState, InteractiveResult, InteractiveSelectionEvent} from "@stem/editor-oss/agent/types/ACPTypes";
import {serializeObjectSummaryForPrompt} from "@stem/editor-oss/agent/utils/serialization";
import {
    addMessageExtra,
    createCopilotSession,
    getCopilotHistoryList,
    getSessionExtras,
    MessageExtra,
    updateCopilotHistoryCredits,
} from "@stem/network/api/copilotHistory";
import {listCopilotTasks, type CopilotTask} from "@stem/network/api/copilotTasks";
import {saveScene} from "@stem/network/api/scene";
import {upsertSceneRevisionCapture} from "@stem/network/api/scene/v2";
import {setSceneAiPromptMode} from "@stem/network/api/scene/thumbnail";
import {getAiCreditsConfig} from "@stem/network/api/user";
import {useAppGlobalContext, useAuthorizationContext} from "@stem/editor-oss/context";
import EngineRuntime, {ApplicationMode} from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {EDITOR_TOP_NAV_HALF_HEIGHT, PANEL_FULL_HEIGHT} from "@stem/editor-oss/types/editor";
import {ResizableWrapper} from "../common/ResizableWrapper/ResizableWrapper";
import {useCopilotPreview} from "../CopilotWorkspace/CopilotPreviewContext";
import {
    isCopilotPreviewMutationCommand,
} from "../CopilotWorkspace/copilotPreviewSession";
import {runCopilotPreviewValidation} from "../CopilotWorkspace/copilotPreviewValidation";
import {CreditsBar} from "../CreditsBar/CreditsBar";

enum AI_COPILOT_STATE {
    READY = "Ready",
    PROCESSING = "Processing",
}

const COPILOT_SUGGESTIONS_BLOCK_REGEX = /```(?:stemstudio-suggestions|stemstudio-next-actions)\s*([\s\S]*?)```/gi;

const stripCopilotSuggestionsBlocks = (content: string): string => {
    COPILOT_SUGGESTIONS_BLOCK_REGEX.lastIndex = 0;
    return content.replace(COPILOT_SUGGESTIONS_BLOCK_REGEX, "").trim();
};

const hasDashboardCopilotBootstrapIntent = (bootstrap: DashboardCopilotBootstrap | null): bootstrap is DashboardCopilotBootstrap =>
    Boolean(bootstrap?.prompt || bootstrap?.entryMode);

const getDetectedWorkspaceSystems = (app: EngineRuntime): string[] => {
    const scene = app.editor?.scene ?? app.scene;
    if (!scene) return [];

    let objectCount = 0;
    let cameraCount = 0;
    let lightCount = 0;
    let behaviorCount = 0;
    let physicsCount = 0;

    scene.traverse(object => {
        objectCount += 1;
        if ((object).type?.toLowerCase().includes("camera")) cameraCount += 1;
        if ((object).type?.toLowerCase().includes("light")) lightCount += 1;

        const userData = object.userData as Record<string, unknown> | undefined;
        const behaviors = userData?.behaviors;
        if (Array.isArray(behaviors)) {
            behaviorCount += behaviors.length;
        } else if (behaviors && typeof behaviors === "object") {
            behaviorCount += Object.keys(behaviors).length;
        }

        if (userData?.physics || userData?.rigidBody || userData?.collider) {
            physicsCount += 1;
        }
    });

    return [
        objectCount > 0 ? `${objectCount} scene objects` : null,
        cameraCount > 0 ? `${cameraCount} camera${cameraCount === 1 ? "" : "s"}` : null,
        lightCount > 0 ? `${lightCount} light${lightCount === 1 ? "" : "s"}` : null,
        behaviorCount > 0 ? `${behaviorCount} behavior component${behaviorCount === 1 ? "" : "s"}` : null,
        physicsCount > 0 ? `${physicsCount} physics-enabled object${physicsCount === 1 ? "" : "s"}` : null,
        app.editor?.isMultiplayer ? "multiplayer enabled" : null,
        scene.userData?.game?.enabled ? "game runtime enabled" : null,
    ].filter(Boolean) as string[];
};

type Props = {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    pinnedCodeEditorWidth?: number;
    /** Reports the copilot's rendered width so the RightPanel can shift left. */
    onResize?: (width: number) => void;
    /**
     * Optional — when provided, renders a "Code" button in the header that
     * opens the code editor with the editor's default layout. Only provided
     * in non-advanced mode where the code editor is hidden by default.
     */
    onOpenCodeEditor?: () => void;
};

type ProcessingStatus = {
    main: string;
    subTasks: string[];
};

type PromptHistoryItem = {
    prompt: string;
    attachedObjectUuids: string[];
};

const PROMPT_HISTORY_KEY = "ai_copilot_prompt_history";
const MAX_PROMPT_HISTORY = 10;
const MAX_INLINE_COMMAND_OUTPUT_CHARS = 4000;

type ModeCommandTarget = "advanced" | "default";

type ParsedModeCommand = {
    target?: ModeCommandTarget;
    error?: string;
};

type WorkspaceSlashCommand = {
    prompt?: string;
    error?: string;
};

const parseModeCommand = (value: string): ParsedModeCommand | null => {
    const match = value.trim().match(/^\/mode(?:\s+(.+))?$/i);
    if (!match) return null;

    const mode = match[1]?.trim().toLowerCase();
    if (!mode) {
        return {error: "Usage: `/mode advanced` or `/mode default`."};
    }

    if (mode === "advanced" || mode === "advance") {
        return {target: "advanced"};
    }

    if (mode === "default") {
        return {target: "default"};
    }

    return {error: "Unknown mode. Use `/mode advanced` or `/mode default`."};
};

const parseWorkspaceSlashCommand = (value: string): WorkspaceSlashCommand | null => {
    const match = value.trim().match(/^\/(add|change|balance|explain|debug|version|publish)(?:\s+([\s\S]+))?$/i);
    if (!match) return null;

    const command = match[1]?.toLowerCase();
    const detail = match[2]?.trim();

    switch (command) {
        case "add":
            return {
                prompt: detail
                    ? `Add ${detail}. Keep the result in a temporary preview.`
                    : "Add a concrete playable element that fits this game. Keep the result in a temporary preview.",
            };
        case "change":
            return {
                prompt: detail
                    ? `Change ${detail}. Keep the result in a temporary preview.`
                    : "Change the selected or most relevant game system. Ask a concise clarifying question if the target is ambiguous.",
            };
        case "balance":
            return {
                prompt: detail
                    ? `Rebalance ${detail}. Keep the result in a temporary preview.`
                    : "Review the current gameplay balance and propose one small playable rebalance in a temporary preview.",
            };
        case "explain":
            return {
                prompt: detail
                    ? `Explain ${detail}. Do not mutate the game unless I explicitly ask.`
                    : "Explain the selected object or current game systems. Do not mutate the game.",
            };
        case "debug":
            return {
                prompt: detail
                    ? `Debug ${detail}. Inspect the scene first, then apply any fix as a temporary preview.`
                    : "Debug the current game state. Inspect likely causes first, then apply any fix as a temporary preview.",
            };
        case "version":
            return {
                prompt: detail
                    ? `Version task: ${detail}. Explain what version or preview state is involved before acting.`
                    : "Explain the current version, preview state, and recent changes. Do not create a new version unless I accept a preview.",
            };
        case "publish":
            return {
                prompt: detail
                    ? `Prepare this game to publish: ${detail}. Validate readiness before asking me to publish.`
                    : "Check whether this game is ready to publish and list any blocking issues. Do not publish without explicit confirmation.",
            };
        default:
            return {error: "Unknown slash command."};
    }
};

const truncateInlineCommandOutput = (value: string): string => {
    if (value.length <= MAX_INLINE_COMMAND_OUTPUT_CHARS) return value;
    return `${value.slice(0, MAX_INLINE_COMMAND_OUTPUT_CHARS)}\n\n...output truncated`;
};

const formatTerminalEntriesForChat = (entries: TerminalHistoryEntry[]): string => {
    const visibleEntries = entries.filter(entry => entry.result.trim().length > 0);
    if (visibleEntries.length === 0) return "Command completed.";

    return visibleEntries.map(entry => {
        const label = entry.status === "error"
            ? "Error"
            : entry.status === "info"
              ? "Info"
              : "Done";
        const command = entry.command ? ` \`${entry.command}\`` : "";
        const result = truncateInlineCommandOutput(entry.result.trim());
        return `**${label}${command}:**\n\n${result}`;
    }).join("\n\n");
};

const isProjectTaskCommand = (command: unknown): boolean => {
    return typeof command === "string" && (
        command === "list_project_tasks" ||
        command === "create_project_task" ||
        command === "update_project_task" ||
        command === "delete_project_task"
    );
};

export const AiCopilot = ({isOpen, setIsOpen, pinnedCodeEditorWidth, onResize, onOpenCodeEditor}: Props) => {
    const [mode, setMode] = useState<"chat" | "terminal">("chat");
    const [prompt, setPrompt] = useState("");
    const [copilotState, setCopilotState] = useState<AI_COPILOT_STATE>(AI_COPILOT_STATE.READY);
    const [selectedObjects, setSelectedObjects] = useState<THREE.Object3D[]>([]);
    const [attachedObjects, setAttachedObjects] = useState<THREE.Object3D[]>([]);
    const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({main: "", subTasks: []});
    const [aiMessages, setAiMessages] = useState<Message[]>([]);
    const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
    const [connectionAttempt, setConnectionAttempt] = useState<{attempt: number; maxAttempts: number} | null>(null);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [permissionRequest, setPermissionRequest] = useState<any>(null);
    const [isLoadingSession, setIsLoadingSession] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [promptHistoryIndex, setPromptHistoryIndex] = useState<number>(-1);
    const [currentPromptDraft, setCurrentPromptDraft] = useState<string>("");
    const [sceneID, setSceneID] = useState<string | null>(null);
    const [hasContext, setHasContext] = useState(false);
    const [serializedObjectsCache, setSerializedObjectsCache] = useState<unknown[]>([]);
    const [projectTasks, setProjectTasks] = useState<CopilotTask[]>([]);
    const [insufficientCredits, setInsufficientCredits] = useState(false);
    const [acceptingPreview, setAcceptingPreview] = useState(false);
    const messagesRef = React.createRef<HTMLDivElement>();
    const promptRef = useRef<HTMLTextAreaElement>(null);
    const acpClientRef = useRef<ICopilotProvider | null>(null);
    const aiMessagesRef = useRef<Message[]>([]);
    const sceneIDRef = useRef<string | null>(null);
    const messageSceneIDRef = useRef<string | null>(null);
    const previousSceneIDRef = useRef<string | null>(null);
    const sceneLoadGeneration = useRef<number>(0);
    const attachedObjectsRef = useRef<THREE.Object3D[]>(attachedObjects);
    const processingEventRef = useRef<string | null>(null);
    const aiCreditsRef = useRef<number | null>(null);
    const creditsRefreshRateRef = useRef<number>(7 * 24 * 60 * 60);
    const creditsRefetchingRef = useRef<boolean>(false);
    const localMessageCounterRef = useRef<number>(0);
    const sessionSeqCounterRef = useRef<{sessionId: string | null; counter: number}>({
        sessionId: null,
        counter: 0,
    });
    const lastPreviewSaveBlockedToastRef = useRef(0);
    const isReplayingRef = useRef<boolean>(false);
    const pendingInteractivesRef = useRef<MessageExtra[]>([]);
    const attachedObjectsExtrasRef = useRef<Map<number, string[]>>(new Map());
    const sessionCreatedRef = useRef<boolean>(false);
    const pendingDashboardPromptRef = useRef<DashboardCopilotBootstrap | null>(null);
    const previewSessionStartedForPromptRef = useRef<boolean>(false);
    const dashboardPromptSubmittingRef = useRef<boolean>(false);
    const sceneSessionInitInFlightRef = useRef<boolean>(false);
    const app = global.app as EngineRuntime;
    const {aiCredits, refreshAiCredits, dbUser, isAdmin} = useAuthorizationContext();
    const {advancedMode, setAdvancedMode} = useAppGlobalContext();
    const isWorkspaceMode = !advancedMode;
    const workspaceModeRef = useRef(isWorkspaceMode);
    const copilotPreview = useCopilotPreview();
    const copilotPreviewRef = useRef(copilotPreview);
    const inlineTerminal = useTerminal(() => setMode("chat"), {isAdmin});

    useEffect(() => {
        aiMessagesRef.current = aiMessages;
    }, [aiMessages]);

    useEffect(() => {
        if (!isWorkspaceMode || !sceneID || aiMessages.length === 0) return;
        if (messageSceneIDRef.current !== sceneID) return;

        saveWorkspaceChatSnapshot({
            sceneID,
            sessionID: acpClientRef.current?.getSessionId() || sessionSeqCounterRef.current.sessionId,
            messages: aiMessages,
        });
    }, [isWorkspaceMode, sceneID, aiMessages]);

    useEffect(() => {
        const handlePreviewSaveBlocked = () => {
            const now = Date.now();
            if (now - lastPreviewSaveBlockedToastRef.current < 2500) return;
            lastPreviewSaveBlockedToastRef.current = now;
            showToast({
                type: "info",
                title: "Temporary preview is active",
                body: "Accept the preview to create a version, or reject/reset it before saving normally.",
            });
        };

        app.on("copilotPreviewSaveBlocked.AiCopilot", handlePreviewSaveBlocked);

        return () => {
            app.on("copilotPreviewSaveBlocked.AiCopilot", null);
        };
    }, [app]);

    useEffect(() => {
        workspaceModeRef.current = isWorkspaceMode;
    }, [isWorkspaceMode]);

    useEffect(() => {
        copilotPreviewRef.current = copilotPreview;
    }, [copilotPreview]);

    const markMessagesForCurrentScene = () => {
        messageSceneIDRef.current = sceneIDRef.current;
    };

    const restoreWorkspaceChatSnapshotForScene = useCallback((
        targetSceneID: string | null | undefined,
        sessionID?: string | null,
    ): boolean => {
        const snapshot = readWorkspaceChatSnapshot(targetSceneID, sessionID);
        if (!snapshot) return false;

        messageSceneIDRef.current = snapshot.sceneID;
        setAiMessages(snapshot.messages);
        setCopilotState(AI_COPILOT_STATE.READY);
        setProcessingStatus({main: "", subTasks: []});
        processingEventRef.current = null;
        return true;
    }, []);

    const refreshProjectTasks = useCallback(async () => {
        const activeSceneID = sceneIDRef.current;
        if (!activeSceneID) {
            setProjectTasks([]);
            return;
        }

        const activeSessionID = acpClientRef.current?.getSessionId() || sessionSeqCounterRef.current.sessionId || undefined;
        try {
            const tasks = await listCopilotTasks({
                sceneID: activeSceneID,
                sessionID: activeSessionID || undefined,
                limit: 100,
            });
            setProjectTasks(tasks);
        } catch (error) {
            console.warn("[AiCopilot] Failed to refresh project tasks:", error);
            setProjectTasks([]);
        }
    }, []);

    // In AI-focused layout (advancedMode === false), the copilot stays as a
    // right-anchored rail over the full scene and starts wider than the
    // advanced-mode panel. Separate storage keys so the user's preferred
    // widths in each mode don't stomp each other.
    const isAiFocusedLayout = isWorkspaceMode;
    const copilotInitialWidth = isAiFocusedLayout
        ? Math.floor(window.innerWidth * 0.25)
        : 258;
    const copilotMinWidth = 258;
    const copilotMaxWidthFn = isAiFocusedLayout
        ? () => window.innerWidth * 0.5
        : () => window.innerWidth * 0.3;
    const copilotStorageKey = isAiFocusedLayout ? "ai_copilot_width_ai" : "ai_copilot_width";

    // On mount, check for a "Create with AI" bootstrap payload. If one exists,
    // switch into AI-focused layout (panels hidden) and pop the copilot open
    // so the auto-submit effect downstream can pick up the prompt. The
    // bootstrap itself is still consumed by the existing `isOpen`-gated
    // effect below — this just opens the surface that enables it.
    useEffect(() => {
        const bootstrap = readDashboardCopilotBootstrap();
        if (!hasDashboardCopilotBootstrapIntent(bootstrap)) return;
        setAdvancedMode(false);
        setIsOpen(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Report the initial / current resolved width to the parent so the
    // RightPanel can shift left by the right amount. ResizableWrapper only
    // fires onResize during drag, so without this an initial load or a
    // mode-flip (which swaps storage keys and remounts the wrapper) would
    // leave the RightPanel offset stale.
    //
    // `onResize` is intentionally kept OUT of the dep array — parents pass
    // inline arrow functions (e.g. `width => this.setState(...)`) that get
    // a new identity every render. Including it here would re-fire the
    // effect → setState → re-render → new ref → re-fire, which is exactly
    // the "Maximum update depth exceeded" loop we hit. We only want to
    // re-report when the resolved width itself changes.
    const onResizeRef = useRef(onResize);
    useEffect(() => {
        onResizeRef.current = onResize;
    });
    useEffect(() => {
        const stored = Number(localStorage.getItem(copilotStorageKey));
        const resolved = Number.isFinite(stored) && stored >= copilotMinWidth ? stored : copilotInitialWidth;
        onResizeRef.current?.(resolved);
    }, [copilotStorageKey, copilotInitialWidth, copilotMinWidth]);

    // Memoized style for ResizableWrapper. The scene remains full-width behind
    // the fixed editor surfaces; when a pinned code editor is on the right,
    // the copilot tucks in to its left (right = codeEditorWidth% + 12px).
    const wrapperStyle = React.useMemo(() => {
        const right = pinnedCodeEditorWidth && pinnedCodeEditorWidth > 0
            ? `calc(${pinnedCodeEditorWidth}% + 12px)`
            : "12px";
        return {
            position: "fixed" as const,
            zIndex: 1000,
            right,
            top: "50%",
            transform: `translateY(calc(-50% + ${EDITOR_TOP_NAV_HALF_HEIGHT}))`,
            height: PANEL_FULL_HEIGHT,
            maxHeight: PANEL_FULL_HEIGHT,
        };
    }, [pinnedCodeEditorWidth]);

    const closedWrapperStyle = React.useMemo(
        () => ({
            display: "none" as const,
        }),
        [],
    );

    const getNextMessageId = (sessionId: string): string => {
        if (sessionSeqCounterRef.current.sessionId !== sessionId) {
            sessionSeqCounterRef.current = {sessionId, counter: 0};
        }
        const seqNum = sessionSeqCounterRef.current.counter++;
        return `${sessionId}-${seqNum}`;
    };

    const resolveAttachedObjects = (seqNum: number): THREE.Object3D[] | undefined => {
        const uuids = attachedObjectsExtrasRef.current.get(seqNum);
        if (!uuids || uuids.length === 0) return undefined;
        return resolveObjectsByUuids(uuids);
    };

    // Load prompt history from localStorage
    const loadPromptHistory = (): PromptHistoryItem[] => {
        try {
            const stored = localStorage.getItem(PROMPT_HISTORY_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error("Failed to load prompt history:", error);
            return [];
        }
    };

    // Save prompt history to localStorage
    const savePromptHistory = (history: PromptHistoryItem[]) => {
        try {
            localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(history));
        } catch (error) {
            console.error("Failed to save prompt history:", error);
        }
    };

    // Add new prompt to history
    const addToPromptHistory = (prompt: string, attachedObjectUuids: string[]) => {
        const history = loadPromptHistory();
        const newItem: PromptHistoryItem = {
            prompt,
            attachedObjectUuids,
        };

        // Add to beginning and limit to MAX_PROMPT_HISTORY
        const updatedHistory = [newItem, ...history].slice(0, MAX_PROMPT_HISTORY);
        savePromptHistory(updatedHistory);
    };

    // Navigate prompt history with arrow keys
    const navigatePromptHistory = (direction: "up" | "down") => {
        const history = loadPromptHistory();
        if (history.length === 0) return;

        let newIndex: number;

        if (direction === "up") {
            // Save current draft when starting navigation
            if (promptHistoryIndex === -1) {
                setCurrentPromptDraft(prompt);
            }
            newIndex = promptHistoryIndex + 1;
            if (newIndex >= history.length) {
                newIndex = history.length - 1;
            }
        } else {
            // down
            newIndex = promptHistoryIndex - 1;
        }

        if (newIndex < -1) {
            newIndex = -1;
        }

        setPromptHistoryIndex(newIndex);

        if (newIndex === -1) {
            // Restore draft
            setPrompt(currentPromptDraft);
            setAttachedObjects([]);
            setSerializedObjectsCache([]);
        } else {
            // Load history item
            const historyItem = history[newIndex];
            if (historyItem) {
                setPrompt(historyItem.prompt);

                // Restore attached objects by UUID
                const restoredObjects: THREE.Object3D[] = [];
                for (const uuid of historyItem.attachedObjectUuids) {
                    const obj = app.editor?.objectByUuid(uuid);
                    if (obj) {
                        restoredObjects.push(obj);
                    }
                }
                setAttachedObjects(restoredObjects);
                setSerializedObjectsCache(restoredObjects.map(obj => serializeObjectSummaryForPrompt(obj)));
            }
        }
    };

    const handleConnected = () => {
        setConnectionState(ConnectionState.CONNECTED);
        setConnectionAttempt(null);
        setConnectionError(null);
        setInsufficientCredits(false);
    };

    const handleDisconnected = () => {
        setConnectionState(ConnectionState.DISCONNECTED);
    };

    const handleError = (error: any) => {
        console.error("ACP Client error:", error);
        setConnectionState(ConnectionState.ERROR);
    };

    const handleConnectionAttempt = (event: any) => {
        setConnectionAttempt({
            attempt: event.data.attempt,
            maxAttempts: event.data.maxAttempts,
        });
        setConnectionError(null);
    };

    const getErrorMessage = (errorCode: string): string => {
        switch (errorCode) {
            case "UNAUTHORIZED":
                return "You must be logged in to use AI Copilot.";
            case "STALE_SESSION":
                return "Your session timed out due to inactivity.\n" +
                    "Reconnect to continue building with Copilot.";
            case "INSUFFICIENT_CREDITS":
                return "You have run out of AI credits. Your credits will refresh weekly.";
            case "AI_COPILOT_UNAVAILABLE":
                return "AI Copilot is not currently available. Please try again later.";
            case "CONNECTION_TIMEOUT":
                return "Connection timed out. Please check your network and try again.";
            case "SESSION_EXPIRED":
                return "Your session has expired. Please refresh and try again.";
            default:
                return "Unable to connect to AI Copilot. Please try again.";
        }
    };

    const handleConnectionFailed = (event: any) => {
        if (event.data.error === "INSUFFICIENT_CREDITS") {
            setInsufficientCredits(true);
            setConnectionAttempt(null);
            updateCreditsUsage();
            return;
        }
        setConnectionState(ConnectionState.ERROR);
        setConnectionAttempt(null);
        setConnectionError(getErrorMessage(event.data.error));
        // OSS users don't have a hosted copilot to retry against. Tear down
        // the transport so the provider stops scheduling reconnect timers
        // (StudioACPClient backoff loop, BasicCopilotPanel polling, etc.)
        // and drop the user into script mode where the inline terminal
        // still works for the offline workflows (exec, save, export).
        if (IS_OSS) {
            try {
                acpClientRef.current?.disconnect();
            } catch (err) {
                console.warn("[AiCopilot] OSS disconnect after failure threw", err);
            }
            setMode("terminal");
        }
    };

    const handleSessionLoadStarted = () => setIsLoadingSession(true);
    const handleSessionLoadCompleted = () => setIsLoadingSession(false);

    const updateCreditsUsage = () => {
        const prevCredits = aiCreditsRef.current;
        const sessionId = acpClientRef.current?.getSessionId() || null;
        if (creditsRefetchingRef.current) {
            return;
        }
        creditsRefetchingRef.current = true;
        setTimeout(async () => {
            const newCredits = await refreshAiCredits();
            creditsRefetchingRef.current = false;
            if (sessionId && sceneIDRef.current && prevCredits !== null && newCredits !== null) {
                const delta = prevCredits - newCredits;
                if (delta > 0) {
                    console.log(`Credits used: ${delta}. Updating server...`);
                    void updateCopilotHistoryCredits(sessionId, delta).catch(e =>
                        console.error("Failed to update session credits:", e),
                    );
                }
            }
        }, 1000);
    };

    const handleAgentMessage = (event: any) => {
        markMessagesForCurrentScene();
        if (!acpClientRef.current?.isSuppressingSessionUpdates) {
            setCopilotState(AI_COPILOT_STATE.PROCESSING);
        }
        setAiMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            // Aggregate chunks into the last agent message
            if (
                lastMsg &&
                lastMsg.type === "agent" &&
                processingEventRef.current === "agentMessage" &&
                !event.data.replayStartNewMessage
            ) {
                return [...prev.slice(0, -1), {...lastMsg, content: lastMsg.content + event.data.message}];
            }

            processingEventRef.current = "agentMessage";

            const sessionId = sessionSeqCounterRef.current.sessionId || acpClientRef.current?.getSessionId() || null;
            const msgId = sessionId ? getNextMessageId(sessionId) : Date.now().toString();

            return [
                ...prev,
                {
                    id: msgId,
                    type: "agent",
                    content: event.data.message,
                    timestamp: Date.now(),
                },
            ];
        });

        if (!acpClientRef.current?.isSuppressingSessionUpdates) {
            setProcessingStatus(prev => ({...prev, main: "Generating response..."}));
        }
    };

    const handleToolCall = (event: any) => {
        setCopilotState(AI_COPILOT_STATE.PROCESSING);
        setProcessingStatus(prev => ({
            ...prev,
            main: `Calling tool: ${event.data.toolCall.title}`,
        }));
        updateCreditsUsage();
        processingEventRef.current = "toolCall";
    };

    const handleAgentThinking = () => {
        setCopilotState(AI_COPILOT_STATE.PROCESSING);
        setProcessingStatus(prev => ({...prev, main: "Thinking..."}));
        processingEventRef.current = "agentThinking";
    };

    const handleAgentThinkingMessage = (event: any) => {
        const content = typeof event?.data?.message === "string" ? event.data.message : "";
        if (!content.trim()) {
            handleAgentThinking();
            return;
        }

        markMessagesForCurrentScene();
        setCopilotState(AI_COPILOT_STATE.PROCESSING);
        setProcessingStatus(prev => ({...prev, main: "Thinking..."}));
        setAiMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (
                lastMsg &&
                lastMsg.type === "thought" &&
                processingEventRef.current === "agentThinking" &&
                !event?.data?.replayStartNewMessage
            ) {
                return [...prev.slice(0, -1), {...lastMsg, content: lastMsg.content + content}];
            }

            processingEventRef.current = "agentThinking";
            const sessionId = sessionSeqCounterRef.current.sessionId || acpClientRef.current?.getSessionId() || null;
            const msgId = sessionId ? getNextMessageId(sessionId) : Date.now().toString();

            return [
                ...prev,
                {
                    id: msgId,
                    type: "thought",
                    content,
                    timestamp: Date.now(),
                },
            ];
        });
    };

    const handleToolCallUpdate = () => {
        setCopilotState(AI_COPILOT_STATE.PROCESSING);
        updateCreditsUsage();
        processingEventRef.current = "toolCallUpdate";
    };

    const handleToolCallError = (error: any) => {
        setCopilotState(AI_COPILOT_STATE.PROCESSING);
        setProcessingStatus(prev => ({
            ...prev,
            main: `Tool error: ${error.message}`,
        }));
        processingEventRef.current = "toolCallError";
    };

    const handlePromptStarted = useCallback(
        (event: any) => {
            // Clear replay mode — first live user message after a session load ends replay
            isReplayingRef.current = false;
            markMessagesForCurrentScene();
            previewSessionStartedForPromptRef.current = false;

            setCopilotState(AI_COPILOT_STATE.PROCESSING);
            const currentAttachedObjects = [...attachedObjectsRef.current];
            const sessionId = sessionSeqCounterRef.current.sessionId || acpClientRef.current?.getSessionId() || null;

            // Compute msgId and seqNum BEFORE setAiMessages so API calls can be made
            // outside the updater — React may invoke updaters more than once (StrictMode).
            const msgId = sessionId ? getNextMessageId(sessionId) : Date.now().toString();
            const seqNum = sessionSeqCounterRef.current.counter - 1;

            setAiMessages(prev => {
                const newMessages = [
                    ...prev,
                    {
                        id: msgId,
                        type: "user" as const,
                        content: event.data.prompt,
                        timestamp: Date.now(),
                        attachedObjects: currentAttachedObjects.length > 0 ? currentAttachedObjects : undefined,
                    },
                ];

                setProcessingStatus({main: "Processing request...", subTasks: []});
                setPrompt("");
                setAttachedObjects([]);
                setSerializedObjectsCache([]);
                updateCreditsUsage();
                processingEventRef.current = "promptStarted";

                return newMessages;
            });

            // Fire-and-forget API calls OUTSIDE setAiMessages to prevent double-invocation
            if (sessionId && sceneIDRef.current && !sessionCreatedRef.current) {
                sessionCreatedRef.current = true;
                const title = generateTitle(event.data.prompt);
                void createCopilotSession(sessionId, sceneIDRef.current, title).catch(e =>
                    console.error("[History] Failed to create copilot session:", e),
                );
            }

            if (sessionId && sceneIDRef.current && currentAttachedObjects.length > 0) {
                const uuids = currentAttachedObjects.map(obj => obj.uuid);
                void addMessageExtra(sessionId, seqNum, uuids, undefined).catch(e =>
                    console.error("[History] Failed to save attachedObjects extra:", e),
                );
            }
        },
        [aiMessages],
    );

    const handlePromptCompleted = useCallback(() => {
        setCopilotState(AI_COPILOT_STATE.READY);
        setProcessingStatus({main: "", subTasks: []});
        updateCreditsUsage();
        void refreshProjectTasks();
        processingEventRef.current = null;
        // NOTE: do NOT clear isReplayingRef here — promptCompleted does NOT fire during
        // loadSession replay. isReplayingRef is cleared in handlePromptStarted (the first
        // live user message after replay) to avoid it staying true permanently.
    }, [refreshProjectTasks]);

    const handleCommandWillExecute = (event: any) => {
        if (!workspaceModeRef.current) return;

        const command = event.data?.command;
        if (!isCopilotPreviewMutationCommand(command)) return;
        if (isReplayingRef.current) {
            return;
        }

        if (copilotPreviewRef.current.isPreviewActive) {
            app.call("workspaceStatusRequested", app, {state: "applying-temporary-changes"});
            copilotPreviewRef.current.markPreviewStatus("applying");
            copilotPreviewRef.current.updatePreviewSummary(
                `Copilot is revising the temporary preview with ${command}.`,
            );
            copilotPreviewRef.current.updateValidationResults([
                {
                    id: "revision-applying",
                    label: "Preview revision",
                    status: "pending",
                    detail: "Copilot is applying requested changes to the active preview.",
                },
            ]);
            processingEventRef.current = "commandWillExecute";
            return;
        }

        if (previewSessionStartedForPromptRef.current) {
            return;
        }

        previewSessionStartedForPromptRef.current = true;
        app.call("workspaceStatusRequested", app, {state: "preparing-preview"});
        copilotPreviewRef.current.startPreviewFromCurrentScene({
            summary: `Copilot is applying ${command} in a temporary preview.`,
            affectedSystems: [String(command)],
        });
        app.call("workspaceStatusRequested", app, {state: "applying-temporary-changes"});
        copilotPreviewRef.current.markPreviewStatus("applying");
        processingEventRef.current = "commandWillExecute";
    };

    const handleCommandExecuted = (event: any) => {
        setProcessingStatus(prev => ({
            ...prev,
            main: `Executed command: ${event.data.command}`,
        }));
        const isLastCommand = typeof event.data.total !== "number" || event.data.index >= event.data.total - 1;
        if (
            workspaceModeRef.current &&
            isLastCommand &&
            isCopilotPreviewMutationCommand(event.data.command) &&
            (copilotPreviewRef.current.isPreviewActive || previewSessionStartedForPromptRef.current)
        ) {
            copilotPreviewRef.current.updateValidationResults(
                runCopilotPreviewValidation(app, copilotPreviewRef.current.session),
            );
            copilotPreviewRef.current.markPreviewStatus("ready");
            app.call("workspaceStatusRequested", app, {state: "preview-ready", autoHideMs: 1800});
        }
        if (isProjectTaskCommand(event.data.command)) {
            void refreshProjectTasks();
        }
        updateCreditsUsage();
        processingEventRef.current = "commandExecuted";
    };

    const handleCommandExecutionFailed = (event: any) => {
        setProcessingStatus(prev => ({
            ...prev,
            main: `Command failed: ${event.data.command} - ${event.data.error}`,
        }));
        if (
            workspaceModeRef.current &&
            isCopilotPreviewMutationCommand(event.data.command) &&
            (copilotPreviewRef.current.isPreviewActive || previewSessionStartedForPromptRef.current)
        ) {
            copilotPreviewRef.current.markPreviewStatus("failed");
            app.call("workspaceStatusRequested", app, {state: "preview-failed", autoHideMs: 2200});
        }
        if (isProjectTaskCommand(event.data.command)) {
            void refreshProjectTasks();
        }
        processingEventRef.current = "commandExecutionFailed";
    };

    const handleToolOutput = (event: any) => {
        setCopilotState(AI_COPILOT_STATE.PROCESSING);
        updateCreditsUsage();
        const output = event.data.output;
        if (output && output.trim() !== "") {
            // Optional: don't show all output as it might be large
            // setProcessingStatus(prev => ({...prev, subTasks: [...prev.subTasks, `Tool output received`]}));
        }
        processingEventRef.current = "toolOutput";
    };

    const handlePermissionRequested = (event: any) => {
        setPermissionRequest(event.data);
    };

    const handleTaskCancelled = () => {
        setCopilotState(AI_COPILOT_STATE.READY);
        setProcessingStatus({main: "", subTasks: []});
        processingEventRef.current = null;
    };

    const handleInteractiveResult = (event: any) => {
        const interactiveResult = event.data as InteractiveResult;
        const sessionId = acpClientRef.current?.getSessionId() || null;

        markMessagesForCurrentScene();
        setCopilotState(AI_COPILOT_STATE.PROCESSING);
        setProcessingStatus({
            main: "Waiting for your selection...",
            subTasks: ["Pick an asset to continue the current task."],
        });
        processingEventRef.current = "interactiveResult";

        // Compute msgId and seqNum BEFORE setAiMessages so the API call can be made
        // outside the updater — React may invoke updaters more than once (StrictMode).
        const msgId = sessionId ? getNextMessageId(sessionId) : Date.now().toString();
        const seqNum = sessionSeqCounterRef.current.counter - 1;

        setAiMessages(prev => [
            ...prev,
            {
                id: msgId,
                type: "interactive" as const,
                content: interactiveResult.title,
                timestamp: Date.now(),
                interactiveResult: interactiveResult,
            },
        ]);

        // Save interactiveResult to MongoDB OUTSIDE setAiMessages to prevent double-invocation
        if (sessionId && sceneIDRef.current) {
            void addMessageExtra(sessionId, seqNum, undefined, interactiveResult).catch(e =>
                console.error("[History] Failed to save interactiveResult extra:", e),
            );
        }
    };

    const handleUserMessage = useCallback((event: any) => {
        if (!isReplayingRef.current) return; // no-op during live session
        markMessagesForCurrentScene();

        // Reset processingEventRef between replay turns. Without this, the next
        // agent_message_chunk would see processingEventRef === "agentMessage" and
        // append to the previous agent message instead of starting a new one.
        processingEventRef.current = null;

        const content = event.data.message;
        // Use sessionSeqCounterRef instead of getCurrentSessionId() because currentSessionId
        // is only updated AFTER loadSession() completes, but replay events fire during it.
        const sessionId = sessionSeqCounterRef.current.sessionId;
        if (!sessionId) return;

        setAiMessages(prev => {
            const newMessages = [...prev];
            const counter = sessionSeqCounterRef.current;

            // Inject any pending interactive results that belong before this user message
            while (
                pendingInteractivesRef.current.length > 0 &&
                pendingInteractivesRef.current[0]!.SeqNum === counter.counter
            ) {
                const extra = pendingInteractivesRef.current.shift()!;
                newMessages.push({
                    id: `${sessionId}-${extra.SeqNum}`,
                    type: "interactive",
                    content: extra.InteractiveResult!.title,
                    timestamp: 0,
                    interactiveResult: extra.InteractiveResult,
                });
                counter.counter++;
            }

            const seqNum = counter.counter++;

            newMessages.push({
                id: `${sessionId}-${seqNum}`,
                type: "user",
                content,
                timestamp: 0,
                attachedObjects: resolveAttachedObjects(seqNum),
            });

            return newMessages;
        });
    }, []);

    const handleInteractiveSelection = async (
        selection: InteractiveSelectionEvent,
        interactiveResult: InteractiveResult,
        handleLoad?: (isLoading: boolean, itemId: string) => void,
    ) => {
        setCopilotState(AI_COPILOT_STATE.PROCESSING);
        setProcessingStatus({
            main:
                selection.action === "confirm"
                    ? "Applying your selection..."
                    : "Continuing without a selection...",
            subTasks: [],
        });
        processingEventRef.current = "interactiveSelection";

        const result = await InteractionHandlers.handleInteractiveSelection(
            selection,
            interactiveResult,
            acpClientRef.current,
            handleLoad,
        );

        if (result.resumedPrompt) {
            setCopilotState(AI_COPILOT_STATE.PROCESSING);
            setProcessingStatus({
                main:
                    selection.action === "confirm"
                        ? "Continuing with your selection..."
                        : "Continuing without a selection...",
                subTasks: [],
            });
            processingEventRef.current = "interactiveSelectionContinuation";
            return;
        }

        setCopilotState(AI_COPILOT_STATE.READY);
        setProcessingStatus({main: "", subTasks: []});
        processingEventRef.current = null;
    };

    const handleInteractiveCancel = () => {
        InteractionHandlers.handleInteractiveCancel();
    };

    const handlePermissionResponse = (optionId: string) => {
        if (!permissionRequest) return;

        acpClientRef.current?.respondToPermissionRequest(permissionRequest.requestId, {
            outcome: {
                outcome: "selected",
                optionId: optionId,
            },
        });

        setPermissionRequest(null);
    };

    // Initialize ACP Client
    useEffect(() => {
        if (!isOpen) return;

        // Resolve the registered copilot provider (StudioACPClient in
        // integrated mode; null when no provider is wired, which hides
        // the panel rather than crashing).
        const acpClient = getCopilotProvider();
        if (!acpClient) return;

        // If already stored in ref, skip initialization
        if (acpClientRef.current === acpClient) return;

        acpClientRef.current = acpClient;

        acpClientRef.current?.on("connected", handleConnected);
        acpClientRef.current?.on("disconnected", handleDisconnected);
        acpClientRef.current?.on("error", handleError);
        acpClientRef.current?.on("connectionAttempt", handleConnectionAttempt);
        acpClientRef.current?.on("connectionFailed", handleConnectionFailed);
        acpClientRef.current?.on("agentMessage", handleAgentMessage);
        acpClientRef.current?.on("agentThinking", handleAgentThinkingMessage);
        acpClientRef.current?.on("toolCall", handleToolCall);
        acpClientRef.current?.on("toolCallUpdate", handleToolCallUpdate);
        acpClientRef.current?.on("toolCallError", handleToolCallError);
        acpClientRef.current?.on("commandWillExecute", handleCommandWillExecute);
        acpClientRef.current?.on("commandExecuted", handleCommandExecuted);
        acpClientRef.current?.on("commandExecutionFailed", handleCommandExecutionFailed);
        acpClientRef.current?.on("toolOutput", handleToolOutput);
        acpClientRef.current?.on("promptStarted", handlePromptStarted);
        acpClientRef.current?.on("promptCompleted", handlePromptCompleted);
        acpClientRef.current?.on("permissionRequested", handlePermissionRequested);
        acpClientRef.current?.on("taskCancelled", handleTaskCancelled);
        acpClientRef.current?.on("interactiveResult", handleInteractiveResult);
        acpClientRef.current?.on("userMessage", handleUserMessage);
        acpClientRef.current?.on("sessionLoadStarted", handleSessionLoadStarted);
        acpClientRef.current?.on("sessionLoadCompleted", handleSessionLoadCompleted);
        acpClientRef.current?.on("sessionRestoreFailed", () => {
            setAiMessages(prev => [
                ...prev,
                {
                    id: `system_${Date.now()}`,
                    type: "agent" as const,
                    content:
                        "Connection was restored, but the previous session could not be resumed. A new session has been created.",
                    timestamp: Date.now(),
                },
            ]);
        });

        // Connect to agent if not already connected
        if (!acpClient.isConnected() && !insufficientCredits) {
            void acpClient.connect().catch(error => {
                console.error("Failed to connect to ACP agent:", error);
                // Error state is handled by connectionFailed event
            });
        } else {
            // Already connected, just update state
            setConnectionState(acpClient.getConnectionState());
        }
    }, [isOpen, app, insufficientCredits]);

    // Listen for external request to switch to terminal mode
    useEffect(() => {
        const handler = () => setMode("terminal");
        app.on("copilotTerminal.AiCopilot", handler);
        return () => {
            app.on("copilotTerminal.AiCopilot", null);
        };
    }, [app]);

    useEffect(() => {
        if (!isOpen || pendingDashboardPromptRef.current) return;

        const bootstrap = readDashboardCopilotBootstrap();
        if (!hasDashboardCopilotBootstrapIntent(bootstrap)) return;

        pendingDashboardPromptRef.current = bootstrap;
        setMode("chat");
        if (bootstrap.prompt) {
            setPrompt(bootstrap.prompt);
        }
    }, [isOpen]);

    // Auto-connect to last session for scene (with race-condition guard)
    useEffect(() => {
        if (!sceneID) return;
        if (connectionState !== ConnectionState.CONNECTED && !insufficientCredits) return;
        if (previousSceneIDRef.current === sceneID) return;

        const generation = ++sceneLoadGeneration.current;
        previousSceneIDRef.current = sceneID;
        sceneSessionInitInFlightRef.current = true;
        setIsLoadingSession(true);

        const switchToScene = async () => {
            if (sceneLoadGeneration.current !== generation) return;
            const postPendingEntryGreeting = () => {
                const bootstrap = pendingDashboardPromptRef.current;
                if (!bootstrap?.entryMode || bootstrap.autoSubmit) return;

                const greeting = buildCopilotEntryGreeting(bootstrap, getDetectedWorkspaceSystems(app));
                if (greeting) {
                    markMessagesForCurrentScene();
                    processingEventRef.current = null;
                    localMessageCounterRef.current += 1;
                    setAiMessages(prev => [
                        ...prev,
                        {
                            id: `local-${Date.now()}-${localMessageCounterRef.current}`,
                            type: "agent",
                            content: greeting,
                            timestamp: Date.now(),
                        },
                    ]);
                }
                pendingDashboardPromptRef.current = null;
                clearDashboardCopilotBootstrap();
            };

            // Default workspace should not resume the last Claude session just
            // because the scene opened. Keep Copilot idle until a user prompt.
            const shouldStartIdleWorkspace =
                workspaceModeRef.current || Boolean(pendingDashboardPromptRef.current?.entryMode);
            if (shouldStartIdleWorkspace) {
                await handleResetThread();
                if (sceneLoadGeneration.current === generation) {
                    if (!pendingDashboardPromptRef.current?.autoSubmit) {
                        restoreWorkspaceChatSnapshotForScene(sceneID);
                    }
                    postPendingEntryGreeting();
                }
                return;
            }

            // Advanced mode keeps the historical auto-load behavior.
            try {
                const historyList = await getCopilotHistoryList(sceneID, 1, 1);
                if (sceneLoadGeneration.current !== generation) return;

                if (historyList.items.length > 0) {
                    const lastSession = historyList.items[0];
                    if (lastSession) {
                        await handleLoadHistory(lastSession.ID, lastSession.SessionID);
                    }
                } else {
                    await handleResetThread();
                }
            } catch (error) {
                if (sceneLoadGeneration.current !== generation) return;
                console.error("Failed to load last session:", error);
                await handleResetThread();
            } finally {
                if (sceneLoadGeneration.current === generation) {
                    sceneSessionInitInFlightRef.current = false;
                    setIsLoadingSession(false);
                }
            }

            if (sceneLoadGeneration.current === generation) {
                postPendingEntryGreeting();
            }
        };

        void switchToScene();
    }, [sceneID, connectionState]);

    const handleClose = () => {
        setIsOpen(false);
        setPrompt("");
        setCopilotState(AI_COPILOT_STATE.READY);
    };

    const handleRetryConnection = () => {
        setConnectionError(null);
        setConnectionState(ConnectionState.CONNECTING);
        void acpClientRef.current?.connect().catch(error => {
            console.error("Failed to connect to ACP agent:", error);
        });
    };

    const sendRequest = async (prompt: string, promptContext?: Record<string, any>) => {
        const acpClient = acpClientRef.current;

        if (!acpClient || !acpClient.isConnected()) {
            throw new Error("AI Copilot is not connected. Please wait for connection.");
        }

        try {
            // Build optimized context from already serialized objects
            const context: Record<string, any> = {
                ...PromptUtils.buildOptimizedContext(serializedObjectsCache),
                ...(promptContext || {}),
            };

            delete context.metadata; // Remove metadata from context to save tokens, we can log it instead
            const activePreview = copilotPreviewRef.current.session;
            if (workspaceModeRef.current && activePreview && copilotPreviewRef.current.isPreviewActive) {
                context.copilotPreview = {
                    previewId: activePreview.previewId,
                    status: activePreview.status,
                    baseVersionLabel: activePreview.baseVersionLabel,
                    summary: activePreview.summary,
                    affectedSystems: activePreview.affectedSystems,
                    instruction:
                        "Revise the existing temporary preview branch. Do not treat this as a new confirmed version and do not ask to save or publish.",
                };
            }

            // Send prompt to agent using new API
            await acpClient.prompt(prompt, context);
        } catch (error: any) {
            if (error.message?.includes("Not connected")) {
                throw new Error("AI Copilot is not connected. Please wait for connection.");
            }
            console.error(error);
            throw new Error("Something went wrong. Please try again.");
        }
    };

    const appendLocalChatMessage = (
        type: "user" | "agent",
        content: string,
        messageAttachedObjects?: THREE.Object3D[],
    ) => {
        markMessagesForCurrentScene();
        processingEventRef.current = null;
        localMessageCounterRef.current += 1;
        setAiMessages(prev => [
            ...prev,
            {
                id: `local-${Date.now()}-${localMessageCounterRef.current}`,
                type,
                content,
                timestamp: Date.now(),
                attachedObjects: messageAttachedObjects?.length ? messageAttachedObjects : undefined,
            },
        ]);
    };

    const handleSubmit = async (
        prompt: string,
        options?: {bootstrap?: DashboardCopilotBootstrap | null},
    ) => {
        const trimmedPrompt = prompt.trim();
        if (!trimmedPrompt) return;

        const modeCommand = parseModeCommand(trimmedPrompt);
        if (modeCommand) {
            appendLocalChatMessage("user", trimmedPrompt);
            if (modeCommand.error || !modeCommand.target) {
                appendLocalChatMessage("agent", modeCommand.error || "Usage: `/mode advanced` or `/mode default`.");
                setPrompt("");
                return;
            }

            const isAdvancedMode = modeCommand.target === "advanced";
            setAdvancedMode(isAdvancedMode);
            if (
                isAdvancedMode
                && app?.editor?.aiPromptMode
                && app.editor.sceneID
                && app.editor.sceneName
            ) {
                setSceneAiPromptMode(app.editor.sceneID, app.editor.sceneName, false).catch(err => {
                    console.warn("[AiCopilot] Failed to clear AiPromptMode", err);
                });
                app.editor.aiPromptMode = false;
            }
            setMode("chat");
            setPrompt("");
            const title = isAdvancedMode ? "Advanced mode enabled" : "Default mode enabled";
            const body = isAdvancedMode
                ? "The outliner, scene tools, and right panel are available."
                : "Direct scene selection and transform controls are locked. Use Copilot or ? commands to make changes.";
            showToast({type: "success", title, body});
            appendLocalChatMessage("agent", `${title}. ${body}`);
            return;
        }

        if (trimmedPrompt.startsWith("?")) {
            const command = trimmedPrompt.slice(1).trim();
            appendLocalChatMessage("user", trimmedPrompt);

            if (!command) {
                appendLocalChatMessage("agent", "Usage: `? add box`.");
                setPrompt("");
                return;
            }

            if (inlineTerminal.isExecuting) {
                showToast({
                    type: "warning",
                    title: "A script command is already running.",
                });
                return;
            }

            setCopilotState(AI_COPILOT_STATE.PROCESSING);
            setProcessingStatus({main: `Running script command: ${command}`, subTasks: []});

            try {
                const entries = await inlineTerminal.executeInput(command);
                appendLocalChatMessage("agent", formatTerminalEntriesForChat(entries));
            } catch (error: any) {
                const message = error?.message || "Command failed.";
                appendLocalChatMessage("agent", `Command failed: ${message}`);
                showToast({
                    type: "error",
                    title: message,
                });
            } finally {
                setCopilotState(AI_COPILOT_STATE.READY);
                setProcessingStatus({main: "", subTasks: []});
                setPrompt("");
            }
            return;
        }

        // Detect /script command to enter terminal mode
        if (trimmedPrompt.toLowerCase() === "/script") {
            if (isAdmin) {
                setMode("terminal");
                setPrompt("");
            } else {
                showToast({
                    type: "warning",
                    title: "Terminal mode is only available for admin users.",
                });
                setPrompt("");
            }
            return;
        }

        const slashCommand = parseWorkspaceSlashCommand(trimmedPrompt);
        const promptToSend = slashCommand?.prompt ?? trimmedPrompt;
        if (slashCommand?.error || (slashCommand && !slashCommand.prompt)) {
            appendLocalChatMessage("user", trimmedPrompt);
            appendLocalChatMessage("agent", slashCommand.error || "Unknown slash command.");
            setPrompt("");
            return;
        }

        // Block submission if there's a pending interactive result
        if (acpClientRef.current?.hasPendingInteractiveResults()) {
            showToast({
                type: "warning",
                title: "Please respond to the current search results first",
            });
            return;
        }

        try {
            // Save to prompt history before submitting
            const attachedObjectUuids = attachedObjects.map(obj => obj.uuid);
            addToPromptHistory(trimmedPrompt, attachedObjectUuids);

            // Reset history navigation
            setPromptHistoryIndex(-1);
            setCurrentPromptDraft("");

            setCopilotState(AI_COPILOT_STATE.PROCESSING);

            await sendRequest(promptToSend, buildCopilotEntryPromptContext(options?.bootstrap));
        } catch (error: any) {
            console.error("handleSubmit error:", error);
            showToast({
                type: "error",
                title: error.message || "Something went wrong. Please try again.",
            });
        } finally {
            setCopilotState(AI_COPILOT_STATE.READY);
            setPrompt("");
        }
    };

    useEffect(() => {
        const pendingPrompt = pendingDashboardPromptRef.current;
        if (!pendingPrompt?.prompt || !pendingPrompt.autoSubmit) return;
        const blockers: string[] = [];
        if (dashboardPromptSubmittingRef.current) blockers.push("alreadySubmitting");
        if (sceneSessionInitInFlightRef.current) blockers.push("sceneSessionInitInFlight");
        if (!isOpen) blockers.push("notOpen");
        if (isLoadingSession) blockers.push("loadingSession");
        if (!hasContext) blockers.push("noContext");
        if (connectionState !== ConnectionState.CONNECTED) blockers.push(`connection=${connectionState}`);
        if (copilotState !== AI_COPILOT_STATE.READY) blockers.push(`copilotState=${copilotState}`);
        if (permissionRequest) blockers.push("permissionRequest");
        if (blockers.length > 0) {
            console.debug("[AiCopilot] auto-submit waiting:", blockers.join(", "));
            return;
        }

        console.debug("[AiCopilot] auto-submitting dashboard prompt");
        dashboardPromptSubmittingRef.current = true;
        void handleSubmit(pendingPrompt.prompt, {bootstrap: pendingPrompt}).finally(() => {
            if (pendingDashboardPromptRef.current === pendingPrompt) {
                pendingDashboardPromptRef.current = null;
                clearDashboardCopilotBootstrap();
            }
            dashboardPromptSubmittingRef.current = false;
        });
    }, [isOpen, isLoadingSession, hasContext, connectionState, copilotState, permissionRequest]);

    const handleResetThread = async () => {
        try {
            if (!acpClientRef.current) return;

            if (!acpClientRef.current.isConnected()) {
                await acpClientRef.current.connect();
            }

            // No flush needed — MongoDB is written incrementally per message

            await acpClientRef.current.createSession();

            // Reset the sequence counter for the new session
            sessionSeqCounterRef.current = {sessionId: null, counter: 0};
            sessionCreatedRef.current = false;
            pendingInteractivesRef.current = [];
            attachedObjectsExtrasRef.current = new Map();

            setAiMessages([]);
            setProjectTasks([]);
            setCopilotState(AI_COPILOT_STATE.READY);
        } catch (error) {
            console.error("Failed to reset copilot thread:", error);
        }
    };

    const handleLoadHistory = async (historyId: string, sessionId: string) => {
        try {
            // 1. Load MessageExtras from MongoDB
            let messageExtras: MessageExtra[] = [];
            try {
                const historyData = await getSessionExtras(historyId);
                messageExtras = historyData.MessageExtras || [];
            } catch (extrasError) {
                console.warn("[AiCopilot] Failed to load message extras, continuing without:", extrasError);
            }

            // 2. Build lookup structures for deferred injection during replay
            pendingInteractivesRef.current = messageExtras
                .filter(e => e.InteractiveResult !== null && e.InteractiveResult !== undefined)
                .sort((a, b) => a.SeqNum - b.SeqNum);

            attachedObjectsExtrasRef.current = new Map(
                messageExtras
                    .filter(e => e.AttachedObjects && e.AttachedObjects.length > 0)
                    .map(e => [e.SeqNum, e.AttachedObjects!]),
            );

            // 3. Reset sequence counter for this session
            sessionSeqCounterRef.current = {sessionId, counter: 0};
            sessionCreatedRef.current = false;

            // 4. Clear current messages and mark as replaying
            setAiMessages([]);
            isReplayingRef.current = true;

            // 5. Load ACP session → replay starts (emits user_message_chunk + agent_message_chunk)
            if (acpClientRef.current) {
                const currentSessionId = acpClientRef.current.getCurrentSessionId();
                const shouldCancelCurrentTask =
                    Boolean(currentSessionId) && Boolean(sessionId) && currentSessionId !== sessionId;

                if (shouldCancelCurrentTask) {
                    try {
                        await acpClientRef.current.cancelCurrentTask();
                    } catch (error: any) {
                        console.warn("Failed to cancel current task before loading history", error);
                    }
                }

                try {
                    await acpClientRef.current.loadSession(sessionId);
                    // Clear replay mode — if the session had no messages, no events fired and
                    // isReplayingRef would stay true forever without this.
                    isReplayingRef.current = false;
                    void refreshProjectTasks();
                } catch (loadError: any) {
                    // Session expired on Claude backend — create fresh session
                    console.warn("[AiCopilot] loadSession failed, creating fresh session:", loadError);
                    isReplayingRef.current = false;
                    try {
                        await acpClientRef.current.createSession();
                        void refreshProjectTasks();
                        setAiMessages(prev => [
                            ...prev,
                            {
                                id: `system_${Date.now()}`,
                                type: "agent" as const,
                                content:
                                    "Previous session expired. A new session has been created. " +
                                    "Your conversation history is shown above for reference, but the AI does not have memory of it.",
                                timestamp: Date.now(),
                            },
                        ]);
                    } catch (createError) {
                        console.error("Failed to create fallback session:", createError);
                        showToast({type: "error", title: "Failed to restore or create session"});
                    }
                }
            }
        } catch (error: any) {
            isReplayingRef.current = false;
            console.error("Failed to load chat history:", error);
            showToast({type: "error", title: "Failed to load chat history"});
        }
    };

    const handleSelectHistory = async (historyId: string, sessionId: string) => {
        if (workspaceModeRef.current) {
            const restored = restoreWorkspaceChatSnapshotForScene(sceneIDRef.current, sessionId);
            if (restored) {
                showToast({type: "success", title: "Restored local Copilot transcript"});
                return;
            }

            appendLocalChatMessage(
                "agent",
                "This history item does not have a local transcript snapshot. I kept Copilot idle so old work does not resume automatically. Switch to advanced mode if you need to replay the original ACP session.",
            );
            showToast({type: "info", title: "No local transcript snapshot"});
            return;
        }

        await handleLoadHistory(historyId, sessionId);
    };

    const handleAbort = async () => {
        try {
            if (acpClientRef.current) {
                await acpClientRef.current.cancelCurrentTask();
                showToast({type: "info", title: "Task cancelled"});
            }
        } catch (error: any) {
            console.error("Failed to cancel task:", error);
            showToast({type: "error", title: "Couldn't cancel the request. Please try again."});
        }
        setCopilotState(AI_COPILOT_STATE.READY);
        setPrompt("");
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        const objectUuid = event.dataTransfer.getData("object-uuid");
        if (objectUuid && app?.editor) {
            const object = app.editor.objectByUuid(objectUuid);
            if (object && !attachedObjects.find(obj => obj.uuid === objectUuid)) {
                // Serialize and check size
                const serialized = serializeObjectSummaryForPrompt(object);
                if (!serialized) {
                    showToast({type: "error", title: "Failed to serialize object"});
                    return;
                }

                // Check if adding this object would exceed limit
                if (!PromptUtils.canAddObject(serializedObjectsCache, serialized)) {
                    showToast({
                        type: "warning",
                        title: `Cannot add object - prompt size limit reached`,
                    });
                    return;
                }

                setAttachedObjects(prev => [...prev, object]);
                setSerializedObjectsCache(prev => [...prev, serialized]);
                showToast({type: "success", title: `Added ${object.name || object.type} to context`});
            }
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const handleRemoveAttachedObject = (e: React.MouseEvent<HTMLButtonElement>, uuid: string) => {
        e.stopPropagation();
        const index = attachedObjects.findIndex(obj => obj.uuid === uuid);
        if (index !== -1) {
            setAttachedObjects(prev => prev.filter(obj => obj.uuid !== uuid));
            setSerializedObjectsCache(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleSelectAttachedObject = (object: THREE.Object3D) => {
        app.editor?.select(object);
    };

    const handleAddSelectedObject = (object: THREE.Object3D) => {
        if (object && !attachedObjects.find(obj => obj.uuid === object.uuid)) {
            // Serialize and check size
            const serialized = serializeObjectSummaryForPrompt(object);
            if (!serialized) {
                showToast({type: "error", title: "Failed to serialize object"});
                return;
            }

            // Check if adding this object would exceed limit
            if (!PromptUtils.canAddObject(serializedObjectsCache, serialized)) {
                showToast({
                    type: "warning",
                    title: `Cannot add object - prompt size limit reached`,
                });
                return;
            }

            setAttachedObjects(prev => [...prev, object]);
            setSerializedObjectsCache(prev => [...prev, serialized]);
        }
    };

    // Auto-resize textarea
    const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
        textarea.style.height = "40px"; // Reset to min height
        const scrollHeight = textarea.scrollHeight;
        const newHeight = Math.min(Math.max(scrollHeight, 40), 180);
        textarea.style.height = `${newHeight}px`;
    };

    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPrompt(e.target.value);
        adjustTextareaHeight(e.target);
        // Reset history navigation when user types
        if (promptHistoryIndex !== -1) {
            setPromptHistoryIndex(-1);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const textarea = e.currentTarget;
        const cursorPosition = textarea.selectionStart;

        // Handle arrow key navigation
        if (e.key === "ArrowUp") {
            // Only navigate history if cursor is at the beginning
            if (cursorPosition === 0) {
                e.preventDefault();
                navigatePromptHistory("up");
            }
        } else if (e.key === "ArrowDown") {
            // Only navigate history if cursor is at the end
            if (cursorPosition === textarea.value.length) {
                e.preventDefault();
                navigatePromptHistory("down");
            }
        } else if (e.key === "Enter" && !e.shiftKey) {
            // Handle Enter to submit
            e.preventDefault();
            if (
                prompt.trim() &&
                copilotState !== AI_COPILOT_STATE.PROCESSING &&
                !acpClientRef.current?.hasPendingInteractiveResults()
            ) {
                void handleSubmit(prompt);
            }
        }
    };

    useEffect(() => {
        const handleObjectSelected = () => {
            const object = app.editor?.selected || null;

            if (Array.isArray(object)) {
                setSelectedObjects(object);
            } else {
                setSelectedObjects(object ? [object] : []);
            }
        };

        const syncEditorContext = () => {
            const nextSceneID = app.editor?.sceneID || null;
            if (sceneIDRef.current !== nextSceneID) {
                setProjectTasks([]);
            }
            setSceneID(nextSceneID);
            sceneIDRef.current = nextSceneID;
            setHasContext(Boolean(nextSceneID) || app.editor?.assetSource?.kind === "stem");
        };

        app.on("objectSelected.AiCopilot", handleObjectSelected);
        app.on("objectArraySelected.AiCopilot", handleObjectSelected);
        app.on("sceneLoaded.AiCopilot", syncEditorContext);

        syncEditorContext();

        return () => {
            app.on("objectSelected.AiCopilot", null);
            app.on("objectArraySelected.AiCopilot", null);
            app.on("sceneLoaded.AiCopilot", null);
        };
    }, [app]);

    useEffect(() => {
        if (!isOpen || connectionState !== ConnectionState.CONNECTED) return;
        void refreshProjectTasks();
    }, [isOpen, sceneID, connectionState, refreshProjectTasks]);

    useEffect(() => {
        messagesRef.current?.scrollTo({
            top: messagesRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [aiMessages, permissionRequest, copilotPreview.session?.status]);

    useEffect(() => {
        attachedObjectsRef.current = attachedObjects;
    }, [attachedObjects]);

    useEffect(() => {
        aiCreditsRef.current = aiCredits;
        setInsufficientCredits(aiCredits !== null && aiCredits <= 0);
    }, [aiCredits]);

    // Fetch AI credits config to get the server-side refresh rate
    useEffect(() => {
        getAiCreditsConfig()
            .then(config => {
                creditsRefreshRateRef.current = config.CreditsRefreshRate;
            })
            .catch(() => {
                // Keep fallback value
            });
    }, []);

    // Adjust textarea height when prompt changes (e.g., from history navigation)
    useEffect(() => {
        if (promptRef.current) {
            adjustTextareaHeight(promptRef.current);
        }
    }, [prompt]);

    const selectedObjectsToDisplay = selectedObjects.filter(obj => !attachedObjects.find(o => o.uuid === obj.uuid));
    const previewStatus = copilotPreview.session?.status;
    const formattedPreviewStatus = previewStatus?.replace("-", " ");
    const previewWorking = previewStatus === "capturing-base" ||
        previewStatus === "previewing" ||
        previewStatus === "applying";
    const previewActivityLabel = copilotPreview.isPreviewActive
        ? `${copilotPreview.previewLabel}: ${formattedPreviewStatus ?? "active"}`
        : previewStatus === "failed"
          ? "Preview branch failed"
          : previewStatus === "rejected"
            ? "Preview branch rejected"
            : previewStatus === "accepted"
              ? "Preview accepted"
              : "Preview branch not active";
    const previewActivityState: CopilotActivityFeedItem["state"] = previewStatus === "failed"
        ? "error"
        : previewStatus === "ready" || previewStatus === "accepted"
          ? "done"
          : previewWorking
            ? "active"
            : "idle";
    const validationResults = copilotPreview.session?.validationResults ?? [];
    const connectionActivityLabel = connectionState === ConnectionState.CONNECTED
        ? "Copilot connected"
        : connectionState === ConnectionState.ERROR
          ? "Copilot connection failed"
          : "Connecting Copilot";
    const connectionActivityState: CopilotActivityFeedItem["state"] = connectionState === ConnectionState.CONNECTED
        ? "done"
        : connectionState === ConnectionState.ERROR
          ? "error"
          : "active";
    const promptActivityLabel = copilotState === AI_COPILOT_STATE.PROCESSING
        ? "Working on request"
        : "Waiting for prompt";
    const promptActivityState: CopilotActivityFeedItem["state"] = copilotState === AI_COPILOT_STATE.PROCESSING
        ? "active"
        : connectionState === ConnectionState.CONNECTED
          ? "done"
          : "idle";
    const projectTaskActivityLabel = projectTasks.length > 0
        ? `${projectTasks.length} project task${projectTasks.length === 1 ? "" : "s"}`
        : "No active project tasks";
    const projectTaskActivityState: CopilotActivityFeedItem["state"] = projectTasks.length > 0 ? "active" : "idle";
    const validationFailed = validationResults.some(result => result.status === "fail");
    const validationPending = validationResults.some(result => result.status === "pending");
    const validationWarned = validationResults.some(result => result.status === "warn");
    const validationActivityLabel = copilotPreview.isPreviewActive
        ? validationFailed
            ? "Validation failed"
            : validationPending
              ? "Validation pending"
              : validationWarned
                ? "Validation warnings"
                : validationResults.length > 0
                  ? "Validation passed"
                  : "Validation not run"
        : "Validation idle";
    const validationActivityState: CopilotActivityFeedItem["state"] = validationFailed
        ? "error"
        : validationPending
          ? "active"
          : copilotPreview.isPreviewActive && validationResults.length > 0
            ? "done"
            : "idle";
    const affectedSystemsForActivity = copilotPreview.session?.affectedSystems.length
        ? copilotPreview.session.affectedSystems.join(", ")
        : "No affected systems classified yet";
    const activityDetail = copilotState === AI_COPILOT_STATE.PROCESSING
        ? processingStatus.main || "Understanding request"
        : copilotPreview.session?.status === "ready"
          ? `Waiting for confirmation. Affected: ${affectedSystemsForActivity}.`
          : copilotPreview.session?.status === "failed"
            ? "Preview failed. Reject changes or revise the request."
            : copilotPreview.isPreviewActive
              ? `Current step: ${formattedPreviewStatus ?? "previewing"}. Affected: ${affectedSystemsForActivity}.`
              : "No temporary preview is active.";
    const activityRows = [
        {
            title: copilotPreview.session?.summary || "Copilot task",
            detail: activityDetail,
            items: [
                {label: connectionActivityLabel, state: connectionActivityState},
                {label: promptActivityLabel, state: promptActivityState},
                {label: previewActivityLabel, state: previewActivityState},
                {label: validationActivityLabel, state: validationActivityState},
                {label: projectTaskActivityLabel, state: projectTaskActivityState},
            ],
        },
    ] as CopilotActivityFeedRow[];
    const showPreviewConfirmation = copilotPreview.session?.status === "ready";
    const previewSummary = copilotPreview.session?.summary || "Copilot applied temporary scene changes.";
    const previewAffectedSystems = copilotPreview.session?.affectedSystems.length
        ? copilotPreview.session.affectedSystems.join(", ")
        : "Pending classification";
    const enableDefaultWorkspaceGameMode = () => {
        const scene = app.editor?.scene ?? app.scene;
        if (!scene) return;
        scene.userData.game = {
            ...(scene.userData.game || {}),
            enabled: true,
        };
    };
    const handleKeepTestingPreview = () => {
        showToast({type: "info", title: "Keep testing this temporary preview."});
    };
    const handleRevisePreview = () => {
        const session = copilotPreview.session;
        const revisePrompt = [
            "Revise the current temporary preview branch. Keep the changes in preview and do not create or accept a new version yet.",
            session?.summary ? `Current preview summary: ${session.summary}` : null,
            session?.affectedSystems.length ? `Affected systems so far: ${session.affectedSystems.join(", ")}` : null,
            "Requested adjustment: ",
        ].filter(Boolean).join("\n");

        setPrompt(revisePrompt);
        requestAnimationFrame(() => {
            promptRef.current?.focus();
            promptRef.current?.setSelectionRange(revisePrompt.length, revisePrompt.length);
        });
    };
    const handleAcceptPreview = async () => {
        const session = copilotPreview.session;
        if (!session || acceptingPreview) return;

        if (app.editor?.isReadOnly) {
            showToast({type: "warning", title: "Read-only scenes cannot create versions."});
            return;
        }

        const fatalValidation = session.validationResults.find(result => result.status === "fail");
        if (fatalValidation) {
            showToast({
                type: "error",
                title: "Resolve validation failures before accepting.",
                body: fatalValidation.label,
            });
            return;
        }

        const shouldRestartPlaytest = app.isPlaying || app.isPaused;

        setAcceptingPreview(true);
        setCopilotState(AI_COPILOT_STATE.PROCESSING);
        setProcessingStatus({
            main: "Creating version from temporary preview...",
            subTasks: ["Saving the preview through the existing scene revision path.", "Reloading the accepted version."],
        });
        app.call("workspaceStatusRequested", app, {state: "new-version-created-restarting"});

        try {
            if (shouldRestartPlaytest) {
                await app.setMode(ApplicationMode.EDIT);
            }

            await runWithCopilotPreviewSceneSaveAllowed(() => saveScene(false, false));

            const sceneId = app.editor?.sceneID;
            const revisionId = app.editor?.sceneRevisionId;
            if (sceneId && revisionId) {
                try {
                    await upsertSceneRevisionCapture(sceneId, revisionId, {
                        name: session.summary?.trim()
                            ? session.summary.trim().slice(0, 80)
                            : "Copilot version",
                        summary: session.summary || "Accepted Copilot preview.",
                        source: "copilot",
                        baseRevisionId: session.baseRevisionId ?? undefined,
                        previewId: session.previewId,
                        affectedSystems: session.affectedSystems,
                        changedAssets: session.changedAssetRefs.map(ref => ({
                            assetId: ref.assetId,
                            revisionId: ref.revisionId ?? undefined,
                            kind: ref.kind,
                        })),
                        validation: session.validationResults.map(result => ({
                            id: result.id,
                            label: result.label,
                            status: result.status,
                            detail: result.detail,
                        })),
                    });
                } catch (captureError) {
                    console.warn("[AiCopilot] Failed to capture version metadata", captureError);
                    showToast({
                        type: "warning",
                        title: "Version created, but capture metadata was not saved.",
                    });
                }
            }
            if (sceneId) {
                await app.setUpScene(sceneId, revisionId ? {revisionId} : undefined);
            }

            enableDefaultWorkspaceGameMode();
            copilotPreview.acceptPreviewAsConfirmed();

            if (shouldRestartPlaytest) {
                await app.setMode(ApplicationMode.PLAY);
            }

            appendLocalChatMessage(
                "agent",
                "New version created. The game has been reset using your accepted changes.",
            );
            showToast({type: "success", title: "Version created"});
        } catch (error: any) {
            console.error("[AiCopilot] Failed to accept preview", error);
            showToast({type: "error", title: error?.message || "Failed to create version"});
        } finally {
            setAcceptingPreview(false);
            setProcessingStatus({main: "", subTasks: []});
            setCopilotState(AI_COPILOT_STATE.READY);
        }
    };
    const handleRejectPreview = async () => {
        if (!copilotPreview.session) return;

        const shouldRestartPlaytest = app.isPlaying || app.isPaused;
        setCopilotState(AI_COPILOT_STATE.PROCESSING);
        setProcessingStatus({
            main: "Rejecting temporary preview...",
            subTasks: ["Restoring the base scene snapshot without saving."],
        });

        try {
            if (shouldRestartPlaytest) {
                await app.setMode(ApplicationMode.EDIT);
            }

            await copilotPreview.rejectPreviewAndRestore();

            if (shouldRestartPlaytest) {
                enableDefaultWorkspaceGameMode();
                await app.setMode(ApplicationMode.PLAY);
            }

            appendLocalChatMessage(
                "agent",
                shouldRestartPlaytest
                    ? "Preview rejected. The base scene has been restored and playtest restarted from that state."
                    : "Preview rejected. The base scene has been restored.",
            );
            showToast({type: "success", title: "Preview rejected"});
        } catch (error: any) {
            console.error("[AiCopilot] Failed to reject preview", error);
            showToast({type: "error", title: error?.message || "Failed to reject preview"});
        } finally {
            setProcessingStatus({main: "", subTasks: []});
            setCopilotState(AI_COPILOT_STATE.READY);
        }
    };
    const showContent = (connectionState === ConnectionState.CONNECTED && !isLoadingSession) || insufficientCredits;
    return (
        <ResizableWrapper
            key={copilotStorageKey}
            initialWidth={copilotInitialWidth}
            minWidth={copilotMinWidth}
            maxWidth={copilotMaxWidthFn}
            storageKey={copilotStorageKey}
            onResize={onResize}
            style={isOpen ? {userSelect: "text", ...wrapperStyle} : {...wrapperStyle, ...closedWrapperStyle}}
        >
            <Container
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                <HeaderContainer>
                    <HeaderButtonsContainer>
                        {mode === "terminal" ? (
                            <>
                                <ResetBt onClick={() => setMode("chat")}>Back to Chat</ResetBt>
                                <TerminalBadge>TERMINAL</TerminalBadge>
                            </>
                        ) : (
                            <>
                                <ResetBt onClick={handleResetThread}>New Chat</ResetBt>
                                {onOpenCodeEditor && (
                                    <ResetBt
                                        onClick={onOpenCodeEditor}
                                        style={{marginLeft: "4px"}}
                                    >
                                        Code
                                    </ResetBt>
                                )}
                                {sceneID && (
                                    <ResetBt
                                        onClick={() => setIsHistoryOpen(prev => !prev)}
                                        style={{marginLeft: "4px"}}
                                    >
                                        History
                                    </ResetBt>
                                )}
                                <CreditsBar />
                            </>
                        )}
                    </HeaderButtonsContainer>

                    <CloseBtn
                        src={closeIcon}
                        alt="back"
                        onClick={handleClose}
                    />
                </HeaderContainer>

                {mode === "terminal" ? (
                    <TerminalView onExit={() => setMode("chat")} isAdmin={isAdmin} />
                ) : (
                <>
                <ChatHistory
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                    onSelectHistory={handleSelectHistory}
                    sceneID={sceneID || ""}
                />

                {/* Session Loading Overlay */}
                {isLoadingSession && (
                    <ConnectionStatusContainer>
                        <ConnectionStatusIcon
                            $isConnecting
                            $isError={false}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                                <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                                <circle
                                    cx="12"
                                    cy="20"
                                    r="1"
                                />
                            </svg>
                        </ConnectionStatusIcon>
                        <ConnectionStatusTitle $isError={false}>Loading session</ConnectionStatusTitle>
                        <ConnectionStatusMessage>Restoring your previous conversation...</ConnectionStatusMessage>
                    </ConnectionStatusContainer>
                )}

                {/* Connection Status Overlay */}
                {!insufficientCredits && connectionState !== ConnectionState.CONNECTED && (
                    <ConnectionStatusContainer>
                        <ConnectionStatusIcon
                            $isConnecting={connectionState === ConnectionState.CONNECTING}
                            $isError={connectionState === ConnectionState.ERROR}
                        >
                            {connectionState === ConnectionState.ERROR ? (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="10"
                                    />
                                    <line
                                        x1="12"
                                        y1="8"
                                        x2="12"
                                        y2="12"
                                    />
                                    <line
                                        x1="12"
                                        y1="16"
                                        x2="12.01"
                                        y2="16"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                                    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                                    <circle
                                        cx="12"
                                        cy="20"
                                        r="1"
                                    />
                                </svg>
                            )}
                        </ConnectionStatusIcon>

                        <ConnectionStatusTitle $isError={connectionState === ConnectionState.ERROR}>
                            {connectionState === ConnectionState.ERROR ? "Couldn't Connect" : "Connecting"}
                        </ConnectionStatusTitle>

                        <ConnectionStatusMessage>
                            {connectionState === ConnectionState.ERROR
                                ? connectionError || "Unable to connect to AI Copilot. Please try again."
                                : "Setting up your AI assistant..."}
                        </ConnectionStatusMessage>

                        {connectionAttempt && connectionState !== ConnectionState.ERROR && (
                            <ConnectionAttemptText>
                                Attempt {connectionAttempt.attempt} of {connectionAttempt.maxAttempts}
                            </ConnectionAttemptText>
                        )}

                        {connectionState === ConnectionState.ERROR && (
                            <>
                                <RetryButton onClick={handleRetryConnection}>Try Again</RetryButton>
                                {isAdmin && (
                                    <RetryButton
                                        onClick={() => setMode("terminal")}
                                        style={{background: "rgba(74, 222, 128, 0.1)", borderColor: "rgba(74, 222, 128, 0.3)", color: "#4ade80"}}
                                    >
                                        Launch Script Terminal
                                    </RetryButton>
                                )}
                            </>
                        )}
                    </ConnectionStatusContainer>
                )}

                {showContent && projectTasks.length > 0 && (
                    <ProjectTasksPanel>
                        <ProjectTasksTitle>Project Tasks</ProjectTasksTitle>
                        <ProjectTaskList>
                            {projectTasks.slice(0, 6).map(task => (
                                <ProjectTaskItem
                                    key={task.ID}
                                    $status={task.Status}
                                    title={task.Description || task.Title}
                                >
                                    <span>{task.Title}</span>
                                    <ProjectTaskMeta>{task.Status.replace("_", " ")}</ProjectTaskMeta>
                                </ProjectTaskItem>
                            ))}
                        </ProjectTaskList>
                    </ProjectTasksPanel>
                )}

                {showContent && isWorkspaceMode && (
                    <>
                        <CopilotActivityFeed rows={activityRows} />

                        <CopilotVersionTimeline
                            app={app}
                            previewSession={copilotPreview.session}
                            isPreviewActive={copilotPreview.isPreviewActive}
                            currentUserId={dbUser?.id ?? null}
                        />

                    </>
                )}

                {showContent && (
                    <AiMessages ref={messagesRef}>
                        {aiMessages?.map(message => {
                            // Check if this interactive result is currently pending
                            const isPending =
                                message.type === "interactive" &&
                                message.interactiveResult &&
                                acpClientRef.current?.checkPendingInteractiveResult(message.interactiveResult.id);

                            return (
                                <div
                                    id={message.id}
                                    key={message.id}
                                    className={`message message-${message.type}`}
                                >
                                    {message.type === "interactive" && message.interactiveResult ? (
                                        <InteractiveResults
                                            result={message.interactiveResult}
                                            onSelect={(selection, handleLoad) =>
                                                handleInteractiveSelection(
                                                    selection,
                                                    message.interactiveResult!,
                                                    handleLoad,
                                                )
                                            }
                                            onCancel={handleInteractiveCancel}
                                            isPending={isPending}
                                            selectedObjects={selectedObjects}
                                        />
                                    ) : (
                                        <>
                                            <MarkdownRenderer
                                                content={message.content}
                                                stripSuggestions={isWorkspaceMode}
                                            />
                                            {message.attachedObjects && message.attachedObjects.length > 0 && (
                                                <MessageAttachments>
                                                    {message.attachedObjects.map(obj => (
                                                        <AttachmentChip
                                                            key={obj.uuid}
                                                            onClick={() => app.editor?.select(obj)}
                                                            title="Select in scene"
                                                        >
                                                            {obj.name || obj.type}
                                                        </AttachmentChip>
                                                    ))}
                                                </MessageAttachments>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}

                        {isWorkspaceMode && showPreviewConfirmation && (
                            <CopilotConfirmationCard
                                summary={previewSummary}
                                affectedSystems={previewAffectedSystems}
                                validationResults={validationResults}
                                onAccept={() => void handleAcceptPreview()}
                                onKeepTesting={handleKeepTestingPreview}
                                onRevise={handleRevisePreview}
                                onReject={() => void handleRejectPreview()}
                                acceptDisabled={acceptingPreview || validationFailed}
                                acceptTitle={
                                    validationFailed
                                        ? "Resolve validation failures before creating a version."
                                        : acceptingPreview
                                          ? "Creating version..."
                                          : "Create a new version from this temporary preview."
                                }
                            />
                        )}

                        {permissionRequest && (
                            <PermissionContainer>
                                <PermissionMessage>
                                    The AI agent is requesting permission to:{" "}
                                    {permissionRequest.params.toolCall?.title || "execute an action"}
                                </PermissionMessage>
                                <PermissionButtons>
                                    {permissionRequest.params.options?.map((option: any) => (
                                        <PermissionButton
                                            key={option.optionId}
                                            variant={option.kind === "allow_once" ? "primary" : "secondary"}
                                            onClick={() => handlePermissionResponse(option.optionId)}
                                        >
                                            <span>{option.label || option.kind}</span>
                                        </PermissionButton>
                                    ))}
                                </PermissionButtons>
                            </PermissionContainer>
                        )}
                    </AiMessages>
                )}

                {insufficientCredits && (
                    <InsufficientCreditsNotice>
                        <InsufficientCreditsSubtext>
                            You have run out of AI credits.
                            {dbUser?.lastCreditsRefresh
                                ? ` Your credits will refresh on ${new Date((dbUser.lastCreditsRefresh + creditsRefreshRateRef.current) * 1000).toLocaleDateString(undefined, {day: "numeric", month: "long", year: "numeric"})}.`
                                : " Your credits refresh periodically."}
                        </InsufficientCreditsSubtext>
                    </InsufficientCreditsNotice>
                )}

                {connectionState === ConnectionState.CONNECTED &&
                    !insufficientCredits &&
                    copilotState === AI_COPILOT_STATE.PROCESSING && (
                        <ProcessingStatusContainer>
                            {processingStatus.main && <ProcessingMainText>{processingStatus.main}</ProcessingMainText>}
                            {processingStatus.subTasks.map((task, index) => (
                                <ProcessingSubText key={index}>{task}</ProcessingSubText>
                            ))}
                        </ProcessingStatusContainer>
                    )}

                {showContent && (
                    <InputWrapper>
                        {(attachedObjects.length > 0 || selectedObjectsToDisplay.length > 0) && (
                            <AttachedObjectsList>
                                {attachedObjects.map(obj => (
                                    <AttachedObjectChip
                                        key={obj.uuid}
                                        onClick={() => handleSelectAttachedObject(obj)}
                                        title="Select in scene"
                                    >
                                        <ObjectName>{obj.name || obj.type}</ObjectName>
                                        <RemoveButton
                                            onClick={e => handleRemoveAttachedObject(e, obj.uuid)}
                                            title="Remove from context"
                                        >
                                            ×
                                        </RemoveButton>
                                    </AttachedObjectChip>
                                ))}
                                {selectedObjectsToDisplay.map(obj => (
                                    <SuggestedObjectChip
                                        key={obj.uuid}
                                        onClick={() => handleAddSelectedObject(obj)}
                                        title="Add to context"
                                    >
                                        <span style={{fontSize: "12px", marginRight: "4px"}}>+</span>
                                        <ObjectName>{obj.name || obj.type}</ObjectName>
                                    </SuggestedObjectChip>
                                ))}
                            </AttachedObjectsList>
                        )}

                        <Prompt
                            ref={promptRef}
                            data-testid="copilot-prompt"
                            placeholder={
                                insufficientCredits
                                    ? "No AI credits remaining"
                                    : attachedObjects.length > 0
                                      ? "Make these objects bounce pads"
                                      : "Make gravity lower and jumps floatier"
                            }
                            value={prompt}
                            onChange={handlePromptChange}
                            onKeyDown={handleKeyDown}
                            disabled={
                                insufficientCredits ||
                                copilotState === AI_COPILOT_STATE.PROCESSING ||
                                acpClientRef.current?.hasPendingInteractiveResults()
                            }
                        />

                        {copilotState === AI_COPILOT_STATE.PROCESSING ? (
                            <SubmitButton
                                onClick={handleAbort}
                                title="Abort"
                            >
                                <img
                                    src={stopIcon}
                                    alt="stop"
                                    width={16}
                                    height={16}
                                />
                            </SubmitButton>
                        ) : (
                            <SubmitButton
                                onClick={() => handleSubmit(prompt)}
                                disabled={
                                    insufficientCredits ||
                                    !prompt.trim() ||
                                    acpClientRef.current?.hasPendingInteractiveResults() ||
                                    false
                                }
                                title="Generate"
                            >
                                <img
                                    src={submitIcon}
                                    alt="submit"
                                    width={16}
                                    height={16}
                                />
                            </SubmitButton>
                        )}
                    </InputWrapper>
                )}
                </>
                )}
            </Container>
        </ResizableWrapper>
    );
};

const MarkdownRenderer = ({content, stripSuggestions = false}: {content: string; stripSuggestions?: boolean}) => {
    const [html, setHtml] = useState(content);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const parse = async () => {
            try {
                const displayContent = stripSuggestions ? stripCopilotSuggestionsBlocks(content) : content;
                const normalizedContent = displayContent
                    .replace(/\r\n/g, "\n")
                    .replace(/\\n/g, "\n");
                const renderer = new marked.Renderer();
                renderer.code = ({text, lang}: {text: string; lang?: string}) => {
                    const langClass = lang ? `language-${lang}` : "";
                    return `
                    <div class="code-block-wrapper">
                        <div class="code-block-toolbar">
                             <button class="copy-code-btn" aria-label="Copy code" title="Copy">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                             </button>
                        </div>
                        <pre><code class="${langClass}">${text}</code></pre>
                    </div>`;
                };

                const parsed = await marked.parse(normalizedContent, {gfm: true, breaks: true, renderer});
                setHtml(parsed);
            } catch (e) {
                console.error("Failed to parse markdown", e);
                setHtml(content);
            }
        };
        void parse();
    }, [content, stripSuggestions]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleCopy = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const btn = target.closest(".copy-code-btn");
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                const wrapper = btn.closest(".code-block-wrapper");
                const code = wrapper?.querySelector("code");
                if (code) {
                    void navigator.clipboard.writeText(code.textContent || "");
                }
            }
        };

        container.addEventListener("click", handleCopy);
        return () => container.removeEventListener("click", handleCopy);
    }, []);

    return (
        <div
            ref={containerRef}
            dangerouslySetInnerHTML={{__html: html}}
        />
    );
};
