/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {useCallback, useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {VscTools} from "react-icons/vsc";

import {
    ActionButton,
    Container,
    CollaborationIndicator,
    CollaborationDot,
    MenuPopover,
    MenuItem,
    MenuOverlay,
    DebugButtonWrapper,
    ErrorBadge,
} from "./ActionBar.style";
import {CADActionBarControls} from "./CADActionBarControls";
import {CameraOrientationPanel, CameraOrientation} from "./CameraOrientationPanel";
import askIcon from "./icons/askIcon.svg";
import cameraIcon from "./icons/camera.svg";
import gridSnapIcon from "./icons/gridSnap.svg";
import {SnapConfigPanel} from "./SnapConfigPanel";
import {useCollaborationStatus} from "./useCollaborationStatus";
import {useAuthorizationContext} from "@stem/editor-oss/context";
import {RIGHT_PANEL_VERSIONS} from "@stem/editor-oss/context/appStateTypes";
import {Tooltip} from "../common/Tooltip";
import bugIcon from "./icons/bug.svg";
import infoIcon from "./icons/infoIcon.svg";
import magicAI from "./icons/magic-ai.svg";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import {getLogger, LogLevel} from "@stem/editor-oss/utils/Logger";
import {EDITOR_KEYBINDINGS, KeybindingsPanel} from "../BehaviorEditor/KeybindingsPanel";
import {GameDebugPanel, GameLog} from "../GameDebugPanel/GameDebugPanel";
import {
    DEFAULT_SNAPPING_SETTINGS,
    DEFAULT_UNITS_SETTINGS,
    mergeSnappingSettings,
} from "../RightPanel/panels/ProjectSettings/constants";
import {SnappingSettings} from "../RightPanel/panels/ProjectSettings/SnappingSection";
import {UnitsSettings} from "../RightPanel/panels/ProjectSettings/UnitsSection";

const LONG_PRESS_DELAY = 500;

interface ActionBarProps {
    errorCount?: number;
    openGameDebugPanel?: () => void;
    closeGameDebugPanel?: () => void;
    showGameDebugPanel?: boolean;
    /** Width (%) of the pinned code editor; 0 when not pinned. */
    pinnedCodeEditorWidth?: number;
    /** True when the code editor is currently visible. */
    showCodeEditor?: boolean;
}

export const ActionBar = ({
    errorCount: propErrorCount,
    openGameDebugPanel = () => {},
    closeGameDebugPanel = () => {},
    showGameDebugPanel = false,
    pinnedCodeEditorWidth = 0,
    showCodeEditor = false,
}: ActionBarProps) => {
    const [showKeybindings, setShowKeybindings] = useState(false);
    const keybindingsBtnRef = useRef<HTMLButtonElement>(null);
    const gameDebugLogsRef = useRef<GameLog[]>([]);
    const [updateTrigger, setUpdateTrigger] = useState(0);
    const [maxLogs, setMaxLogs] = useState(500);
    const updateTimeoutRef = useRef<number | null>(null);
    const app = global.app as EngineRuntime;
    const collaborationStatus = useCollaborationStatus();

    // Camera orientation state
    const [showCameraPanel, setShowCameraPanel] = useState(false);
    const [cameraOrientation, setCameraOrientation] = useState<CameraOrientation>("custom");
    const cameraBtnRef = useRef<HTMLButtonElement>(null);
    const isSettingCameraRef = useRef(false);

    // Copilot long-press menu state
    const [showCopilotMenu, setShowCopilotMenu] = useState(false);
    const copilotBtnRef = useRef<HTMLButtonElement>(null);
    const longPressTimerRef = useRef<number | null>(null);
    const didLongPressRef = useRef(false);
    const authContext = useAuthorizationContext();
    const isAdmin = authContext?.isAdmin ?? false;

    // Snap config state
    const [showSnapPanel, setShowSnapPanel] = useState(false);
    const [snappingSettings, setSnappingSettings] = useState<SnappingSettings | null>(() =>
        mergeSnappingSettings((app.editor as any)?.scene?.userData?.snapping || DEFAULT_SNAPPING_SETTINGS),
    );
    const [unitsSettings, setUnitsSettings] = useState<UnitsSettings>(
        () => (app.editor as any)?.scene?.userData?.units || DEFAULT_UNITS_SETTINGS,
    );
    const snapBtnRef = useRef<HTMLButtonElement>(null);

    // Calculate error count from logs
    const errorCount = gameDebugLogsRef.current.filter(log => log.level === LogLevel.ERROR).length;
    const effectiveErrorCount = propErrorCount !== undefined ? propErrorCount : errorCount;

    const handleLog = (level: LogLevel, args: any[]) => {
        if (level === LogLevel.ERROR || level === LogLevel.WARN || level === LogLevel.INFO || level === LogLevel.LOG) {
            gameDebugLogsRef.current = [...gameDebugLogsRef.current, {level, args, timestamp: Date.now()}];

            if (gameDebugLogsRef.current.length > maxLogs) {
                gameDebugLogsRef.current = gameDebugLogsRef.current.slice(gameDebugLogsRef.current.length - maxLogs);
            }

            if (showGameDebugPanel) {
                if (updateTimeoutRef.current) {
                    window.clearTimeout(updateTimeoutRef.current);
                }
                updateTimeoutRef.current = window.setTimeout(() => {
                    setUpdateTrigger(prev => prev + 1);
                    updateTimeoutRef.current = null;
                }, 100);
            }
        }
    };

    const handleClearLogs = () => {
        gameDebugLogsRef.current = [];
        setUpdateTrigger(prev => prev + 1);
        app?.call("clearGameDebugLogs", app.editor?.component);
    };

    const handleSetMaxLogs = (newMaxLogs: number) => {
        setMaxLogs(newMaxLogs);
        localStorage.setItem("gameDebugPanel_maxLogs", newMaxLogs.toString());
    };

    useEffect(() => {
        const savedMaxLogs = localStorage.getItem("gameDebugPanel_maxLogs");
        if (savedMaxLogs) {
            setMaxLogs(parseInt(savedMaxLogs, 10));
        }
    }, []);

    useEffect(() => {
        getLogger()?.addListener(handleLog);

        return () => {
            getLogger()?.removeListener(handleLog);
            if (updateTimeoutRef.current) {
                window.clearTimeout(updateTimeoutRef.current);
            }
        };
    }, [maxLogs, showGameDebugPanel]);

    useEffect(() => {
        const handlePlayerInit = () => {
            gameDebugLogsRef.current = [];
            setUpdateTrigger(prev => prev + 1);
        };

        const handlePlayerStopped = () => {
            gameDebugLogsRef.current = [];
            setUpdateTrigger(prev => prev + 1);
        };

        app.on("playerInit.ActionBar", handlePlayerInit);
        app.on("playerStopped.ActionBar", handlePlayerStopped);

        return () => {
            app.on("playerInit.ActionBar", null);
            app.on("playerStopped.ActionBar", null);
        };
    }, [app]);

    // Camera controls change detection — reset to "custom" on manual orbit
    useEffect(() => {
        const controls = (app.editor as any)?.controls?.current?.controls;
        if (!controls) return;
        const onChange = () => {
            if (!isSettingCameraRef.current) {
                setCameraOrientation("custom");
            }
        };
        controls.addEventListener("change", onChange);
        return () => controls.removeEventListener("change", onChange);
    }, [app]);

    // Set camera to a preset orientation
    const handleCameraSelect = (orientation: CameraOrientation) => {
        const editor = app.editor as any;
        const camera = editor?.camera;
        const controls = editor?.controls?.current?.controls;
        if (!camera || !controls) return;

        const positions: Record<string, [number, number, number]> = {
            default: [0, 10, 25],
            top: [0, 50, 0.001],
            side: [0, 5, 50],
        };
        const pos = positions[orientation];
        if (!pos) return;

        isSettingCameraRef.current = true;
        camera.position.set(pos[0], pos[1], pos[2]);
        // OrbitControls uses `target`; the legacy EditorControlsImpl uses `center`.
        const focusPoint = controls.target ?? controls.center;
        focusPoint?.set(0, 0, 0);
        camera.lookAt(0, 0, 0);
        controls.update?.();
        controls.dispatchEvent({type: "change"});
        setCameraOrientation(orientation);
        requestAnimationFrame(() => {
            isSettingCameraRef.current = false;
        });
    };

    // Snapping settings listener
    useEffect(() => {
        app.on("snappingSettingsChanged.ActionBar", (settings: SnappingSettings) => {
            setSnappingSettings(mergeSnappingSettings(settings));
        });
        app.on("unitsSettingsChanged.ActionBar", (settings: UnitsSettings) => {
            setUnitsSettings(settings || DEFAULT_UNITS_SETTINGS);
        });
        return () => {
            app.on("snappingSettingsChanged.ActionBar", null);
            app.on("unitsSettingsChanged.ActionBar", null);
        };
    }, [app]);

    // Update snap increment from preset
    const handleSnapSelect = (value: number) => {
        const editor = app.editor as any;
        if (!editor?.scene) return;
        editor.scene.userData = editor.scene.userData || {};
        const currentSettings = mergeSnappingSettings(editor.scene.userData.snapping || DEFAULT_SNAPPING_SETTINGS);
        const updated: SnappingSettings = {
            ...currentSettings,
            grid: {...currentSettings.grid, enabled: true, increment: value},
        };
        editor.scene.userData.snapping = updated;
        app.call("objectChanged", editor, editor.scene);
        app.call("snappingSettingsChanged", editor, updated);
    };

    const handleOpenSnapSettings = () => {
        const setActiveRightPanel = app.editor?.component?.props?.setActiveRightPanel;
        setActiveRightPanel?.(RIGHT_PANEL_VERSIONS.GameSettings);
        app.call("focusProjectSettingsSection", app.editor, "snapping");
    };

    const gridSnapEnabled = snappingSettings?.grid?.enabled ?? false;
    const gridSnapIncrement = snappingSettings?.grid?.increment ?? 1;
    const showMetricSnapLabels =
        !unitsSettings?.enabled || ["meters", "centimeters", "millimeters"].includes(unitsSettings.currentUnit);

    // Copilot button long-press handlers
    const clearLongPress = () => {
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleCopilotPointerDown = () => {
        if (!isAdmin) return;
        didLongPressRef.current = false;
        longPressTimerRef.current = window.setTimeout(() => {
            didLongPressRef.current = true;
            setShowCopilotMenu(true);
        }, LONG_PRESS_DELAY);
    };

    const handleCopilotPointerUp = () => {
        clearLongPress();
        if (!didLongPressRef.current) {
            app.editor?.component?.toggleAiCopilot();
        }
    };

    const handleCopilotPointerLeave = () => {
        clearLongPress();
    };

    const getCopilotMenuPosition = useCallback(() => {
        const anchor = copilotBtnRef.current;
        if (!anchor) return {top: 100, left: 100};
        const rect = anchor.getBoundingClientRect();
        const estimatedHeight = 40;
        let top = rect.top - 6 - estimatedHeight;
        let left = rect.left + rect.width / 2 - 80;
        if (left < 8) left = 8;
        if (top < 8) top = rect.bottom + 6;
        return {top, left};
    }, []);

    return (
        <>
            <Container
                style={pinnedCodeEditorWidth > 0 ? {left: `calc(50% - ${pinnedCodeEditorWidth / 2}%)`} : undefined}
            >
                <CADActionBarControls />
                <Tooltip
                    text="Help"
                    height="auto"
                >
                    <ActionButton onClick={() => window.open(`https://docs.${window.location.hostname}`, "_blank")}>
                        <img
                            src={askIcon}
                            style={{width: 18, height: 18}}
                        />
                    </ActionButton>
                </Tooltip>
                <Tooltip
                    text="Keyboard Shortcuts"
                    height="auto"
                >
                    <ActionButton
                        ref={keybindingsBtnRef}
                        onClick={() => setShowKeybindings(v => !v)}
                    >
                        <img src={infoIcon} />
                    </ActionButton>
                </Tooltip>

                <Tooltip
                    text="Camera View"
                    height="auto"
                >
                    <ActionButton
                        ref={cameraBtnRef}
                        $isSelected={showCameraPanel}
                        onClick={() => setShowCameraPanel(v => !v)}
                    >
                        <img
                            src={cameraIcon}
                            alt=""
                        />
                    </ActionButton>
                </Tooltip>
                {gridSnapEnabled && (
                    <>
                        <Tooltip
                            text={`Grid Snap: ${gridSnapIncrement}`}
                            height="auto"
                        >
                            <ActionButton
                                ref={snapBtnRef}
                                $isSelected={showSnapPanel}
                                onClick={() => setShowSnapPanel(v => !v)}
                            >
                                <img
                                    src={gridSnapIcon}
                                    alt=""
                                />
                            </ActionButton>
                        </Tooltip>
                    </>
                )}

                <Tooltip
                    text="Debug Console"
                    height="auto"
                >
                    <DebugButtonWrapper>
                        <ActionButton
                            onClick={() => (showGameDebugPanel ? closeGameDebugPanel() : openGameDebugPanel())}
                        >
                            <img
                                src={bugIcon}
                                alt="debug"
                            />
                        </ActionButton>
                        {effectiveErrorCount > 0 && (
                            <ErrorBadge>{effectiveErrorCount > 99 ? "99+" : effectiveErrorCount}</ErrorBadge>
                        )}
                    </DebugButtonWrapper>
                </Tooltip>
                <Tooltip
                    text={isAdmin ? "AI Copilot (hold for menu)" : "AI Copilot"}
                    height="auto"
                >
                    <ActionButton
                        ref={copilotBtnRef}
                        data-testid="actionbar-copilot"
                        onPointerDown={handleCopilotPointerDown}
                        onPointerUp={handleCopilotPointerUp}
                        onPointerLeave={handleCopilotPointerLeave}
                        onContextMenu={e => e.preventDefault()}
                        $isActive={app.editor?.component?.state.showAiCopilot}
                    >
                        <img
                            src={magicAI}
                            alt="magic AI"
                        />
                    </ActionButton>
                </Tooltip>
                {collaborationStatus && (
                    <>
                        <Tooltip
                            text={
                                collaborationStatus === "connected"
                                    ? "Collaborative - Connected"
                                    : collaborationStatus === "connecting"
                                      ? "Collaborative - Connecting..."
                                      : "Collaborative - Disconnected"
                            }
                            height="auto"
                        >
                            <CollaborationIndicator $status={collaborationStatus}>
                                <CollaborationDot $status={collaborationStatus} />
                            </CollaborationIndicator>
                        </Tooltip>
                    </>
                )}
                {showKeybindings && (
                    <KeybindingsPanel
                        anchorRef={keybindingsBtnRef}
                        onClose={() => setShowKeybindings(false)}
                        bindings={EDITOR_KEYBINDINGS}
                        title="Editor Shortcuts"
                    />
                )}
                {showCameraPanel && (
                    <CameraOrientationPanel
                        anchorRef={cameraBtnRef}
                        onClose={() => setShowCameraPanel(false)}
                        onSelect={handleCameraSelect}
                        activeOrientation={cameraOrientation}
                    />
                )}
                {showSnapPanel && gridSnapEnabled && (
                    <SnapConfigPanel
                        anchorRef={snapBtnRef}
                        onClose={() => setShowSnapPanel(false)}
                        onSelect={handleSnapSelect}
                        activeValue={gridSnapIncrement}
                        showMetricLabels={showMetricSnapLabels}
                        onOpenSettings={handleOpenSnapSettings}
                    />
                )}
                {showCopilotMenu &&
                    createPortal(
                        <>
                            <MenuOverlay onClick={() => setShowCopilotMenu(false)} />
                            <MenuPopover style={getCopilotMenuPosition()}>
                                <MenuItem
                                    onClick={() => {
                                        setShowCopilotMenu(false);
                                        app.editor?.component?.openAiCopilotTerminal();
                                    }}
                                >
                                    <VscTools size={14} />
                                    Script Tool
                                </MenuItem>
                            </MenuPopover>
                        </>,
                        document.body,
                    )}
            </Container>

            {showGameDebugPanel && (
                <GameDebugPanel
                    logsRef={gameDebugLogsRef}
                    updateTrigger={updateTrigger}
                    onClose={closeGameDebugPanel}
                    onClear={handleClearLogs}
                    maxLogs={maxLogs}
                    setMaxLogs={handleSetMaxLogs}
                />
            )}
        </>
    );
};
