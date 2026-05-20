import {useMemo} from "react";
import {
    FaBug,
    FaCamera,
    FaEdit,
    FaEye,
    FaMousePointer,
    FaPause,
    FaPlay,
    FaRedo,
    FaSearch,
    FaUnlock,
} from "react-icons/fa";
import styled from "styled-components";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import {EDITOR_TOP_NAV_HEIGHT} from "@stem/editor-oss/types/editor";
import {useWorkspaceRuntimeController, type WorkspaceStatusTone} from "./useWorkspaceRuntimeController";

type Props = {
    aiCopilotWidth: number;
    pinnedCodeEditorWidth: number;
};

const WORKSPACE_SURFACE_TOP = `calc(${EDITOR_TOP_NAV_HEIGHT} + 12px)`;
const WORKSPACE_STATUS_TOP = `calc(${EDITOR_TOP_NAV_HEIGHT} + 132px)`;

export const CopilotWorkspaceControls = ({aiCopilotWidth, pinnedCodeEditorWidth}: Props) => {
    const app = global.app as EngineRuntime;
    const {
        actionPending,
        cameraMode,
        cameraProfile,
        debugOpen,
        enterInspectMode,
        interactionMode,
        metrics,
        returnToPlayInteractionMode,
        returnToEditMode,
        runtimeState,
        status,
        restartCurrentVersion,
        setDebugOpen,
        setNextCameraMode,
        startOrTogglePlaytest,
    } = useWorkspaceRuntimeController({app});

    const rightOffset = useMemo(() => {
        if (pinnedCodeEditorWidth > 0) {
            return `calc(${pinnedCodeEditorWidth}% + ${Math.round(aiCopilotWidth)}px + 24px)`;
        }
        return `${Math.round(aiCopilotWidth) + 24}px`;
    }, [aiCopilotWidth, pinnedCodeEditorWidth]);
    const playtestActive = runtimeState.playtestActive;
    const playing = runtimeState.playing;
    const paused = runtimeState.paused;
    const displayedInteractionMode = playtestActive ? interactionMode : "edit";
    const inspectActive = displayedInteractionMode === "inspect";
    const secondaryCameraActive = cameraProfile.secondaryAction === "free-camera"
        ? cameraMode === "free"
        : inspectActive;

    return (
        <>
            <Toolbar $rightOffset={rightOffset}>
                <ToolGroup>
                    <ToolButton
                        type="button"
                        onClick={startOrTogglePlaytest}
                        disabled={actionPending}
                        $active={playtestActive}
                        title={playing ? "Pause" : paused ? "Resume" : "Play"}
                    >
                        {playing ? <FaPause /> : <FaPlay />}
                        <span>{playing ? "Pause" : paused ? "Resume" : "Play"}</span>
                    </ToolButton>
                    {playtestActive && (
                        <>
                            <ToolButton
                                type="button"
                                onClick={inspectActive ? returnToPlayInteractionMode : enterInspectMode}
                                disabled={actionPending}
                                $active={inspectActive}
                                title={inspectActive ? "Return input to the running game" : "Inspect the running game"}
                            >
                                {inspectActive ? <FaMousePointer /> : <FaSearch />}
                                <span>{inspectActive ? "Play Input" : "Inspect"}</span>
                            </ToolButton>
                            <ToolButton
                                type="button"
                                onClick={restartCurrentVersion}
                                disabled={actionPending}
                                title="Restart current version"
                            >
                                <FaRedo />
                                <span>Restart</span>
                            </ToolButton>
                            <ToolButton
                                type="button"
                                onClick={returnToEditMode}
                                disabled={actionPending}
                                title="Return to edit mode"
                            >
                                <FaEdit />
                                <span>Edit</span>
                            </ToolButton>
                        </>
                    )}
                </ToolGroup>

                <ToolGroup>
                    <Segmented>
                        <Segment
                            type="button"
                            $active={cameraMode === "player"}
                            onClick={() => setNextCameraMode("player")}
                            title={`Use ${cameraProfile.cameraTypeLabel}`}
                        >
                            <FaCamera />
                            <span>Game Camera</span>
                        </Segment>
                        <Segment
                            type="button"
                            $active={secondaryCameraActive}
                            onClick={() => setNextCameraMode("free")}
                            disabled={!playtestActive}
                            title={cameraProfile.secondaryTitle}
                        >
                            {cameraProfile.secondaryAction === "release-input" ? <FaUnlock /> : <FaEye />}
                            <span>{cameraProfile.secondaryLabel}</span>
                        </Segment>
                    </Segmented>
                </ToolGroup>

                <InteractionGroup>
                    <Segmented aria-label="Interaction mode state">
                        <Segment
                            type="button"
                            $active={displayedInteractionMode === "play"}
                            $readOnly
                            aria-disabled="true"
                            tabIndex={-1}
                            title="Current interaction state: Play"
                        >
                            <FaMousePointer />
                            <span>Play</span>
                        </Segment>
                        <Segment
                            type="button"
                            $active={displayedInteractionMode === "inspect"}
                            $readOnly
                            aria-disabled="true"
                            tabIndex={-1}
                            title="Current interaction state: Inspect"
                        >
                            <FaSearch />
                            <span>Inspect</span>
                        </Segment>
                        <Segment
                            type="button"
                            $active={displayedInteractionMode === "edit"}
                            $readOnly
                            aria-disabled="true"
                            tabIndex={-1}
                            title="Current interaction state: Edit"
                        >
                            <FaEdit />
                            <span>Edit</span>
                        </Segment>
                    </Segmented>
                </InteractionGroup>

                {playtestActive && (
                    <ToolGroup>
                        <ToolButton
                            type="button"
                            onClick={() => setDebugOpen(!debugOpen)}
                            $active={debugOpen}
                            title="Toggle debug overlay"
                        >
                            <FaBug />
                            <span>Debug</span>
                        </ToolButton>
                    </ToolGroup>
                )}
            </Toolbar>

            {playtestActive && debugOpen && (
                <DebugOverlay $rightOffset={rightOffset}>
                    <DebugValue>
                        <span>FPS</span>
                        <strong>{metrics.fps}</strong>
                    </DebugValue>
                    <DebugValue>
                        <span>Entities</span>
                        <strong>{metrics.entityCount}</strong>
                    </DebugValue>
                    <DebugValue>
                        <span>Multiplayer</span>
                        <strong>{metrics.multiplayerState}</strong>
                    </DebugValue>
                    <DebugValue>
                        <span>Physics</span>
                        <strong>{metrics.physicsState}</strong>
                    </DebugValue>
                </DebugOverlay>
            )}

            {status && (
                <StatusOverlay $rightOffset={rightOffset}>
                    <StatusPill $tone={status.tone}>
                        {status.tone === "busy" && <StatusSpinner />}
                        <StatusText>
                            <strong>{status.title}</strong>
                            <span>{status.detail}</span>
                        </StatusText>
                    </StatusPill>
                </StatusOverlay>
            )}

        </>
    );
};

const Toolbar = styled.div<{$rightOffset: string}>`
    position: fixed;
    z-index: 99;
    top: ${WORKSPACE_SURFACE_TOP};
    left: 8px;
    right: ${({$rightOffset}) => $rightOffset};
    min-height: 52px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    background: rgba(18, 20, 34, 0.84);
    backdrop-filter: blur(16px);
    color: #f8fafc;
    overflow-x: auto;
    pointer-events: all;

    @media (max-width: 900px) {
        right: 8px;
    }
`;

const ToolGroup = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
`;

const InteractionGroup = styled(ToolGroup)`
    margin-left: auto;
`;

const ToolButton = styled.button<{$active?: boolean}>`
    height: 34px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border: 1px solid ${({$active}) => $active ? "rgba(14, 165, 233, 0.72)" : "rgba(255, 255, 255, 0.12)"};
    border-radius: 8px;
    background: ${({$active}) => $active ? "rgba(14, 165, 233, 0.22)" : "rgba(255, 255, 255, 0.05)"};
    color: #f8fafc;
    font-family: "Source Code Pro", monospace;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;

    svg {
        width: 13px;
        height: 13px;
    }

    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    &:disabled {
        cursor: progress;
        opacity: 0.56;
    }
`;

const Segmented = styled.div`
    height: 34px;
    display: inline-flex;
    align-items: center;
    padding: 2px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
`;

const Segment = styled.button<{$active?: boolean; $readOnly?: boolean}>`
    height: 28px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    border: 0;
    border-radius: 4px;
    background: ${({$active}) => $active ? "rgba(255, 255, 255, 0.16)" : "transparent"};
    color: ${({$active}) => $active ? "#ffffff" : "rgba(248, 250, 252, 0.72)"};
    font-family: "Source Code Pro", monospace;
    font-size: 11px;
    cursor: ${({$readOnly}) => $readOnly ? "default" : "pointer"};
    pointer-events: ${({$readOnly}) => $readOnly ? "none" : "auto"};
    white-space: nowrap;

    svg {
        width: 12px;
        height: 12px;
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.44;
    }
`;

const StatusOverlay = styled.div<{$rightOffset: string}>`
    position: fixed;
    z-index: 100;
    top: ${WORKSPACE_STATUS_TOP};
    left: 8px;
    right: ${({$rightOffset}) => $rightOffset};
    display: flex;
    justify-content: center;
    pointer-events: none;

    @media (max-width: 900px) {
        right: 8px;
    }
`;

const DebugOverlay = styled.div<{$rightOffset: string}>`
    position: fixed;
    z-index: 99;
    top: calc(${EDITOR_TOP_NAV_HEIGHT} + 76px);
    left: 8px;
    right: ${({$rightOffset}) => $rightOffset};
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    pointer-events: none;

    @media (max-width: 900px) {
        right: 8px;
    }
`;

const DebugValue = styled.div`
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 0 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    background: rgba(8, 12, 24, 0.82);
    color: #f8fafc;
    font-family: "Source Code Pro", monospace;
    backdrop-filter: blur(16px);

    span {
        color: rgba(248, 250, 252, 0.56);
        font-size: 10px;
        text-transform: uppercase;
    }

    strong {
        font-size: 12px;
        font-weight: 700;
        text-transform: lowercase;
    }
`;

const statusToneStyles: Record<WorkspaceStatusTone, string> = {
    busy: "border-color: rgba(14, 165, 233, 0.48); background: rgba(8, 17, 30, 0.84);",
    ready: "border-color: rgba(34, 197, 94, 0.48); background: rgba(8, 24, 18, 0.84);",
    info: "border-color: rgba(148, 163, 184, 0.42); background: rgba(15, 18, 30, 0.84);",
};

const StatusPill = styled.div<{$tone: WorkspaceStatusTone}>`
    max-width: min(460px, 80%);
    min-height: 54px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    color: #f8fafc;
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.24);
    backdrop-filter: blur(16px);
    ${({$tone}) => statusToneStyles[$tone]}
`;

const StatusText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-family: "Source Code Pro", monospace;
    line-height: 1.35;

    strong {
        font-size: 12px;
        font-weight: 700;
    }

    span {
        color: rgba(248, 250, 252, 0.68);
        font-size: 10px;
    }
`;

const StatusSpinner = styled.span`
    width: 14px;
    height: 14px;
    flex: 0 0 auto;
    border: 2px solid rgba(14, 165, 233, 0.22);
    border-top-color: rgba(56, 189, 248, 0.95);
    border-radius: 50%;
    animation: workspace-status-spin 0.8s linear infinite;

    @keyframes workspace-status-spin {
        to {
            transform: rotate(360deg);
        }
    }
`;
