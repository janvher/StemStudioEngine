import React, {createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef} from "react";

import {
    clearActiveCopilotPreviewPersistence,
    setActiveCopilotPreviewPersistence,
} from "@stem/editor-oss/agent/copilotPreviewPersistence";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {
    CopilotChangedAssetRef,
    CopilotPreviewSession,
    CopilotPreviewState,
    CopilotPreviewStatus,
    CopilotValidationResult,
    StartPreviewSessionOptions,
    copilotPreviewReducer,
    createCopilotPreviewSnapshotFromSceneJson,
    createCopilotPreviewSession,
    getPreviewDisplayLabel,
    initialCopilotPreviewState,
    isPreviewActive as getIsPreviewActive,
    restoreCopilotPreviewSnapshot,
} from "./copilotPreviewSession";
import {cleanupSceneDependenciesForSnapshot} from "./copilotPreviewDependencyCleanup";
import {
    clearCopilotPreviewDraft,
    persistCopilotPreviewDraft,
    readCopilotPreviewDraft,
} from "./copilotPreviewDraftStorage";
import {
    clearCopilotPreviewRuntimeErrors,
    recordCopilotPreviewRuntimeError,
} from "./copilotPreviewRuntimeErrors";

type CopilotPreviewContextValue = {
    state: CopilotPreviewState;
    session: CopilotPreviewSession | null;
    isPreviewActive: boolean;
    previewLabel: string;
    startPreviewFromCurrentScene: (options?: StartPreviewSessionOptions) => CopilotPreviewSession;
    markPreviewStatus: (status: CopilotPreviewStatus) => void;
    updatePreviewSummary: (summary: string) => void;
    updateAffectedSystems: (affectedSystems: string[]) => void;
    updateValidationResults: (validationResults: CopilotValidationResult[]) => void;
    updateChangedAssetRefs: (changedAssetRefs: CopilotChangedAssetRef[]) => void;
    acceptPreviewAsConfirmed: () => void;
    rejectPreviewAndRestore: () => Promise<void>;
    clearPreviewStateOnly: (sceneState?: CopilotPreviewState["sceneState"]) => void;
};

const noopSession = () => {
    throw new Error("Copilot preview context is not mounted.");
};

const fallbackContext: CopilotPreviewContextValue = {
    state: initialCopilotPreviewState,
    session: null,
    isPreviewActive: false,
    previewLabel: "Current Version",
    startPreviewFromCurrentScene: noopSession,
    markPreviewStatus: () => undefined,
    updatePreviewSummary: () => undefined,
    updateAffectedSystems: () => undefined,
    updateValidationResults: () => undefined,
    updateChangedAssetRefs: () => undefined,
    acceptPreviewAsConfirmed: () => undefined,
    rejectPreviewAndRestore: async () => undefined,
    clearPreviewStateOnly: () => undefined,
};

const CopilotPreviewContext = createContext<CopilotPreviewContextValue>(fallbackContext);

type Props = {
    app: EngineRuntime;
    children: React.ReactNode;
};

export const CopilotPreviewProvider = ({app, children}: Props) => {
    const [state, dispatch] = useReducer(copilotPreviewReducer, initialCopilotPreviewState);
    const activeSession = state.session;
    const isPreviewActive = getIsPreviewActive(state);
    const activePreviewId = activeSession?.previewId;
    const restoringDraftRef = useRef(false);
    const clearedPreviewIdsRef = useRef(new Set<string>());

    const startPreviewFromCurrentScene = useCallback((options?: StartPreviewSessionOptions) => {
        const session = createCopilotPreviewSession(app, options);
        dispatch({type: "previewStarted", session});
        return session;
    }, [app]);

    const markPreviewStatus = useCallback((status: CopilotPreviewStatus) => {
        dispatch({type: "statusChanged", status});
    }, []);

    const updatePreviewSummary = useCallback((summary: string) => {
        dispatch({type: "summaryChanged", summary});
    }, []);

    const updateAffectedSystems = useCallback((affectedSystems: string[]) => {
        dispatch({type: "affectedSystemsChanged", affectedSystems});
    }, []);

    const updateValidationResults = useCallback((validationResults: CopilotValidationResult[]) => {
        dispatch({type: "validationResultsChanged", validationResults});
    }, []);

    const updateChangedAssetRefs = useCallback((changedAssetRefs: CopilotChangedAssetRef[]) => {
        dispatch({type: "changedAssetRefsChanged", changedAssetRefs});
    }, []);

    const acceptPreviewAsConfirmed = useCallback(() => {
        const session = state.session;
        if (session) {
            clearedPreviewIdsRef.current.add(session.previewId);
            void clearCopilotPreviewDraft(session.baseSceneId);
        }
        dispatch({type: "previewAccepted"});
    }, [state.session]);

    const rejectPreviewAndRestore = useCallback(async () => {
        const session = state.session;
        if (!session) return;

        try {
            await cleanupSceneDependenciesForSnapshot(app, session.snapshot);
            await restoreCopilotPreviewSnapshot(app, session.snapshot);
            clearedPreviewIdsRef.current.add(session.previewId);
            await clearCopilotPreviewDraft(session.baseSceneId);
            dispatch({type: "previewRejected"});
        } catch (error) {
            dispatch({type: "statusChanged", status: "failed"});
            throw error;
        }
    }, [app, state.session]);

    const clearPreviewStateOnly = useCallback((sceneState: CopilotPreviewState["sceneState"] = "confirmed") => {
        const session = state.session;
        if (session) {
            clearedPreviewIdsRef.current.add(session.previewId);
            void clearCopilotPreviewDraft(session.baseSceneId);
        }
        dispatch({type: "previewCleared", sceneState});
    }, [state.session]);

    const value = useMemo<CopilotPreviewContextValue>(() => ({
        state,
        session: state.session,
        isPreviewActive,
        previewLabel: getPreviewDisplayLabel(state.session),
        startPreviewFromCurrentScene,
        markPreviewStatus,
        updatePreviewSummary,
        updateAffectedSystems,
        updateValidationResults,
        updateChangedAssetRefs,
        acceptPreviewAsConfirmed,
        rejectPreviewAndRestore,
        clearPreviewStateOnly,
    }), [
        acceptPreviewAsConfirmed,
        clearPreviewStateOnly,
        isPreviewActive,
        markPreviewStatus,
        rejectPreviewAndRestore,
        startPreviewFromCurrentScene,
        state,
        updateAffectedSystems,
        updateChangedAssetRefs,
        updatePreviewSummary,
        updateValidationResults,
    ]);

    useEffect(() => {
        if (activeSession && isPreviewActive) {
            setActiveCopilotPreviewPersistence({
                previewId: activeSession.previewId,
                label: getPreviewDisplayLabel(activeSession),
            });
            return () => clearActiveCopilotPreviewPersistence(activeSession.previewId);
        }

        clearActiveCopilotPreviewPersistence();
        return undefined;
    }, [activeSession, isPreviewActive]);

    useEffect(() => {
        if (!activeSession || !isPreviewActive) return;

        void persistCopilotPreviewDraft(app, activeSession);
    }, [activeSession, app, isPreviewActive]);

    useEffect(() => {
        if (!activeSession || isPreviewActive || activeSession.status !== "failed") return;
        clearedPreviewIdsRef.current.add(activeSession.previewId);
        void clearCopilotPreviewDraft(activeSession.baseSceneId);
    }, [activeSession, isPreviewActive]);

    useEffect(() => {
        const restoreDraft = async () => {
            if (restoringDraftRef.current || state.session) return;

            const sceneId = app.editor?.sceneID;
            if (!sceneId) return;

            const draft = await readCopilotPreviewDraft(sceneId);
            if (!draft || clearedPreviewIdsRef.current.has(draft.previewId)) return;

            const currentRevisionId = app.editor?.sceneRevisionId ?? null;
            const storedBaseRevisionId = draft.baseRevisionId ?? null;
            if (storedBaseRevisionId && currentRevisionId && storedBaseRevisionId !== currentRevisionId) {
                await clearCopilotPreviewDraft(sceneId);
                return;
            }

            const session = {
                ...draft.session,
                status: "ready" as const,
                lastAppliedAt: draft.session.lastAppliedAt || draft.updatedAt,
            };
            const previewSnapshot = createCopilotPreviewSnapshotFromSceneJson(
                session,
                draft.previewSceneJson,
                draft.previewAssetResolutionContext,
            );

            restoringDraftRef.current = true;
            try {
                app.call("workspaceStatusRequested", app, {state: "applying-temporary-changes"});
                await restoreCopilotPreviewSnapshot(app, previewSnapshot);
                dispatch({type: "previewStarted", session});
                app.call("workspaceStatusRequested", app, {state: "preview-ready", autoHideMs: 1600});
            } catch (error) {
                console.warn("[CopilotPreview] Failed to restore persisted preview draft:", error);
                await clearCopilotPreviewDraft(sceneId);
            } finally {
                restoringDraftRef.current = false;
            }
        };

        app.on("sceneLoaded.CopilotPreviewProvider", () => {
            void restoreDraft();
        });
        void restoreDraft();

        return () => {
            app.on("sceneLoaded.CopilotPreviewProvider", null);
        };
    }, [app, state.session]);

    useEffect(() => {
        if (!activePreviewId || !isPreviewActive || typeof window === "undefined") return;

        clearCopilotPreviewRuntimeErrors(activePreviewId);

        const recordError = (message: string) => {
            recordCopilotPreviewRuntimeError(activePreviewId, message);
        };
        const handleError = (event: ErrorEvent) => {
            recordError(event.error?.message || event.message || "Runtime error during Copilot preview.");
        };
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            recordError(
                reason instanceof Error
                    ? reason.message
                    : typeof reason === "string"
                      ? reason
                      : "Unhandled promise rejection during Copilot preview.",
            );
        };

        window.addEventListener("error", handleError);
        window.addEventListener("unhandledrejection", handleUnhandledRejection);

        return () => {
            window.removeEventListener("error", handleError);
            window.removeEventListener("unhandledrejection", handleUnhandledRejection);
        };
    }, [activePreviewId, isPreviewActive]);

    return (
        <CopilotPreviewContext.Provider value={value}>
            {children}
        </CopilotPreviewContext.Provider>
    );
};

export const useCopilotPreview = () => useContext(CopilotPreviewContext);
