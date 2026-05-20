import I18n from "i18next";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { SceneName } from "./SceneName";
import { StemEditorTitle } from "./StemEditorTitle";
import {
    StyledNav,
    LeftSide,
    EditorButton,
    Middle,
    Right,
    WorkspaceHeaderGroup,
    WorkspaceMeta,
    WorkspaceProjectInput,
    WorkspaceSaved,
    WorkspaceVersionChip,
} from "./TopNav.style";
import { saveScene } from "@stem/network/api/scene";
import EngineRuntime, { ApplicationMode } from "@stem/editor-oss/EngineRuntime";
import {IS_OSS} from "@stem/editor-oss/mode/buildMode";
import {ROUTES} from "@web-shared/routes";
import { useAppGlobalContext, useAuthorizationContext } from "@stem/editor-oss/context";
import { isStemEditor } from "../../../../editor/stem-editor/isStemEditor";
import global from "@stem/editor-oss/global";
import { useFullscreen } from "@stem/editor-oss/hooks/useFullscreen";
import { useMobileZoomLock } from "@stem/editor-oss/hooks/useMobileZoomLock";
import { showToast } from "@stem/editor-oss/showToast";
import { editorHasUnsavedChanges } from "@stem/editor-oss/utils/editorUnsavedChanges";
import {useCopilotPreview} from "../CopilotWorkspace/CopilotPreviewContext";
import { AppMenu } from "../common/AppMenu/AppMenu";
import { Section } from "../common/Section";
import { FloatingNav } from "../HUD/HUDView/FloatingNav/FloatingNav";
import arrowLeftIcon from "../icons/arrow-left.svg";
import stemLogo from "../icons/stem-logo.svg";
import { MenuIcon } from "../LeftPanel/MenuIcon";
import { AppVersion } from "../RightPanel/common/TopMenu/AppVersion";
import { TopMenu } from "../RightPanel/common/TopMenu/TopMenu";

type Props = {
    playerStarted: boolean;
    workspaceMode?: boolean;
};

export const TopNav = ({ playerStarted, workspaceMode = false }: Props) => {
    // Fallback when the engine hasn't initialized yet (route mounted before
    // EngineRuntime is ready, common in OSS where the dashboard route
    // doesn't pre-instantiate the engine). Returns an empty object whose
    // `.editor` etc. are `undefined`, so `app.editor?.x` short-circuits
    // safely instead of throwing on `null.editor`.
    const app = (global.app ?? {}) as EngineRuntime;
    const navigatingAwayRef = useRef(false);
    const location = useLocation();
    const editorRouteRef = useRef(`${location.pathname}${location.search}${location.hash}`);
    const isPlayingRef = useRef(playerStarted);

    const { dbUser } = useAuthorizationContext();
    const { sceneRevisionModalSceneData } = useAppGlobalContext();
    const sceneRevisionModalOpenRef = useRef(!!sceneRevisionModalSceneData);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showAppVersion, setShowAppVersion] = useState(false);
    const userMenuButtonRef = useRef<SVGSVGElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(playerStarted);
    const stemEditorMode = global.app ? isStemEditor(app.editor?.scene) : false;
    const { enterFullscreen, exitFullscreen } = useFullscreen();
    const copilotPreview = useCopilotPreview();

    useMobileZoomLock(isPlaying);

    useEffect(() => {
        setIsPlaying(playerStarted);
    }, [playerStarted]);

    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    useEffect(() => {
        editorRouteRef.current = `${location.pathname}${location.search}${location.hash}`;
    }, [location.hash, location.pathname, location.search]);

    const dbUserRef = useRef(dbUser);

    useEffect(() => {
        dbUserRef.current = dbUser;
        app.userId = dbUser?.id || null;
    }, [dbUser]);

    const handleCloseMenu = () => {
        setIsMenuOpen(false);
    };

    const navigateToGamesLibrary = async () => {
        try {
            await app.editor?.checkForUnsavedChanges("All unsaved data will be lost. Are you sure?");
        } catch {
            return;
        }

        // Close all open code editors and popouts before navigating.
        try {
            app.editor?.component?.closeCodeEditor();
            app.editor?.component?.restoreAllPopouts();
        } catch {
            showToast({ type: "error", title: "This module is no longer available as the project has been closed." });
        }

        navigatingAwayRef.current = true;
        window.location.replace(ROUTES.DASHBOARD);
    };

    const handleOpenGamesLibrary = async () => {
        await navigateToGamesLibrary();
    };

    const getUnsavedChanges = () => {
        const editor = app.editor;
        if (!editor) return;
        return editorHasUnsavedChanges(editor.scene.userData);
    };

    const handlePlay = async (e: any) => {
        e.preventDefault();
        if (isPlaying || !e.clientX || !app || !app.editor) {
            return;
        }
        app.editor.controls?.saveCamera();

        if (!app.editor?.isSandbox && app.editor?.projectUserId === app.userId) {
            let shouldSaveScene = false;
            let shouldProceedWithoutSaving = false;
            let shouldAbortPlay = false;
            try {
                await app.editor?.checkForUnsavedChanges("You have unsaved changes in the editor. All unsaved data will be lost if you proceed. Are you sure?",
                    () => {
                        shouldSaveScene = true;
                    },
                    () => {
                        shouldProceedWithoutSaving = true;
                    },
                    "Save",
                    "Don't Save",
                    () => {
                        shouldAbortPlay = true;
                    },
                );
                if (shouldSaveScene) {
                    await saveScene();
                }
            } catch {
                // Don't Save should proceed to play; close actions should abort.
                if (shouldAbortPlay || !shouldProceedWithoutSaving) {
                    return;
                }
            }
        }

        enterFullscreen();

        void app.setMode(ApplicationMode.PLAY);
        setIsPlaying(true);
    };

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (navigatingAwayRef.current) return;

            const hasUnsavedChanges = getUnsavedChanges();

            if (hasUnsavedChanges && !app.editor?.isCollaborative) {
                const confirmationMessage = I18n.t("All unsaved data will be lost. Are you sure?");
                e.preventDefault();
                e.returnValue = confirmationMessage;
                return confirmationMessage;
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [app?.editor]);

    useEffect(() => {
        sceneRevisionModalOpenRef.current = !!sceneRevisionModalSceneData;
    }, [sceneRevisionModalSceneData]);

    useEffect(() => {
        const handlePopState = async () => {
            if (navigatingAwayRef.current) return;

            // When the version history modal is open, popstate is handled by
            // AppGlobalContext (which pushed the history entry). Skip here so
            // we don't show the unsaved-changes confirm dialog.
            if (sceneRevisionModalOpenRef.current) return;

            // In active non-sandbox play mode, browser Back exits to edit
            // mode and restores the current editor route. Sandbox scenes use
            // the same dashboard exit behavior as the visible back control.
            const isSandboxScene = !!app.editor?.isSandbox;
            const isActiveNonSandboxPlay =
                !isSandboxScene && (isPlayingRef.current || app.isPlaying || app.mode === ApplicationMode.PLAY);
            if (isActiveNonSandboxPlay) {
                window.history.pushState(null, "", editorRouteRef.current);
                exitFullscreen();
                await app.setMode(ApplicationMode.EDIT);
                setIsPlaying(false);
                return;
            }

            await navigateToGamesLibrary();
            if (!navigatingAwayRef.current) window.history.pushState(null, "", editorRouteRef.current);
        };

        window.addEventListener("popstate", handlePopState);

        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, []);

    if (isPlaying && !workspaceMode) return <FloatingNav setIsPlaying={setIsPlaying}
        isPlaying={isPlaying}
                          />;

    const logoButton = (
        <button
            onClick={() => setShowAppVersion(prev => !prev)}
            className="reset-css stem-logo-btn"
            style={{ height: "24px", cursor: "pointer" }}
        >
            <img
                src={stemLogo}
                style={{ height: "100%" }}
                alt="Stem Studio"
            />
        </button>
    );

    // OSS has no auth — every project on this device is the user's, so the
    // Edit affordance always applies. Remix is a cloud-only fork-to-clone
    // flow and never makes sense locally.
    const isSceneOwner = IS_OSS || (!!dbUser?.id && app.editor?.projectUserId === dbUser.id);

    const handleStopPlay = async () => {
        if (!isPlaying || !app) return;
        exitFullscreen();
        await app.setMode(ApplicationMode.EDIT);
        setIsPlaying(false);
    };

    const playRemixButtons = (
        <Middle>
            <EditorButton $isBlue={isPlaying}
                onClick={handlePlay}
                data-testid="topnav-play"
            >
                Play
            </EditorButton>
            {isSceneOwner ? (
                <EditorButton $isBlue={!isPlaying}
                    onClick={handleStopPlay}
                >
                    Edit
                </EditorButton>
            ) : (
                <EditorButton $isBlue={!isPlaying}>
                    Remix
                </EditorButton>
            )}
        </Middle>
    );

    if (stemEditorMode) {
        return (
            <StyledNav>
                <LeftSide>
                    <Section $gap="4px"
                        $direction="row"
                        $width="auto"
                        $align="center"
                    >
                        <StemEditorTitle />
                    </Section>
                </LeftSide>
                {playRemixButtons}
                <Right>
                    <TopMenu />
                </Right>
            </StyledNav>
        );
    }

    if (workspaceMode) {
        const versionLabel = copilotPreview.isPreviewActive
            ? copilotPreview.previewLabel
            : app.editor?.sceneRevisionId ? "Current Version" : "Unsaved Draft";
        const saveLabel = copilotPreview.isPreviewActive
            ? "Temporary Preview"
            : app.editor?.scene?.userData?.lastSaveTime ? "Saved" : "Draft";

        return (
            <StyledNav>
                {showAppVersion && <AppVersion close={() => setShowAppVersion(false)} />}
                <WorkspaceHeaderGroup>
                    <img
                        style={{ cursor: "pointer" }}
                        src={arrowLeftIcon}
                        alt="arrow left"
                        onClick={handleOpenGamesLibrary}
                        className="go-back-icon icon"
                        data-testid="topnav-back-to-dashboard"
                    />
                    {logoButton}
                    <WorkspaceProjectInput>
                        <SceneName />
                    </WorkspaceProjectInput>
                    <MenuIcon
                        isMenuOpen={isMenuOpen}
                        setIsMenuOpen={setIsMenuOpen}
                        userMenuButtonRef={userMenuButtonRef}
                    />
                </WorkspaceHeaderGroup>
                <WorkspaceMeta>
                    <WorkspaceVersionChip $preview={copilotPreview.isPreviewActive}>
                        {versionLabel}
                    </WorkspaceVersionChip>
                    <WorkspaceSaved>
                        <span>Status:</span>
                        <span>{saveLabel}</span>
                    </WorkspaceSaved>
                </WorkspaceMeta>
                <Right>
                    <TopMenu />
                </Right>
                {isMenuOpen && <AppMenu close={handleCloseMenu}
                    userMenuButtonRef={userMenuButtonRef}
                               />}
            </StyledNav>
        );
    }

    if (!global.app) return null;
    return (
        <StyledNav>
            {showAppVersion && <AppVersion close={() => setShowAppVersion(false)} />}
            <LeftSide>
                <Section $gap="4px"
                    $direction="row"
                    $width="auto"
                    $align="center"
                >
                    <img
                        style={{ cursor: "pointer" }}
                        src={arrowLeftIcon}
                        alt="arrow left"
                        onClick={handleOpenGamesLibrary}
                        className="go-back-icon icon"
                        data-testid="topnav-back-to-dashboard"
                    />
                    {logoButton}
                    <SceneName />
                    <MenuIcon
                        isMenuOpen={isMenuOpen}
                        setIsMenuOpen={setIsMenuOpen}
                        userMenuButtonRef={userMenuButtonRef}
                    />
                </Section>
            </LeftSide>
            {playRemixButtons}
            <Right>
                <TopMenu />
            </Right>
            {isMenuOpen && <AppMenu close={handleCloseMenu}
                userMenuButtonRef={userMenuButtonRef}
                           />}
        </StyledNav>
    );
};
