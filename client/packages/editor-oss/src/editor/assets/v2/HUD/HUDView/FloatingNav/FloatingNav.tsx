import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {toast} from "toastywave";

import {AppVersion} from "./AppVersion/AppVersion";
import {StyledNav, LeftSide, EditorButton, Middle, Right, MenuButton} from "./FloatingNav.style";
import {createTrackedShareUrl} from "@stem/network/api/rewards";
import {forkScene} from "@stem/network/api/scene/v2";
import EventBus from "../../../../../../behaviors/event/EventBus";
import {useAppGlobalContext, useAuthorizationContext} from "@stem/editor-oss/context";
import EngineRuntime, {ApplicationMode} from "@stem/editor-oss/EngineRuntime";
import {IS_OSS} from "@stem/editor-oss/mode/buildMode";
import global from "@stem/editor-oss/global";
import {useFullscreen} from "@stem/editor-oss/hooks/useFullscreen";
import {ROUTES} from "@web-shared/routes";
import {IFRAME_MESSAGES} from "@stem/editor-oss/types/editor";
import {generateProjectLink, getGameUrl} from "../../../../../../v2/pages/links";
import {Section} from "../../../common/Section";
import {TopMenu} from "../../../RightPanel/common/TopMenu/TopMenu";
import {SceneName} from "../../../TopNav/SceneName";
import arrowLeftIcon from "../icons/arrow-left.svg";
import arrowUp from "../icons/arrow-up-tray.svg";

interface Props {
    setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
    isPlaying: boolean;
}

export const FloatingNav = ({setIsPlaying, isPlaying}: Props) => {
    const {t} = useTranslation();
    const app = global.app as EngineRuntime;
    const navigate = useNavigate();
    const {slug} = useAppGlobalContext();
    const {dbUser} = useAuthorizationContext();
    const {exitFullscreen} = useFullscreen();
    const [isForking, setIsForking] = useState(false);

    const isSandbox = !!app.editor?.isSandbox;
    const sceneId = app.editor?.sceneID || "";
    const viewerId = dbUser?.id || app.userId || "";
    // In OSS the local user owns every project on this device, so Edit
    // always applies and Remix (the cloud fork flow) never does.
    const isOwner = IS_OSS || (!!viewerId && app.editor?.projectUserId === viewerId);
    const canRemix = !IS_OSS && !isOwner && app.editor?.isCloneable === true;
    const secondaryDisabled = !isOwner && (!canRemix || isForking);

    const handleGameClose = () => {
        setIsPlaying(false);
    };

    const stopPlayingSession = async () => {
        if (!isPlaying) return;
        exitFullscreen();
        await app.setMode(ApplicationMode.EDIT);
        handleGameClose();
        EventBus.instance.send("game.stop");
    };

    const handleStop = (e?: any) => {
        e?.preventDefault();
        void stopPlayingSession();
    };

    const handleRemix = async (e?: any) => {
        e?.preventDefault();
        if (!sceneId || secondaryDisabled) return;

        setIsForking(true);
        try {
            const result = await forkScene(sceneId);
            toast.success(t("Starting a remix"));
            if (result?.newSceneId) {
                window.location.href = generateProjectLink(result.newSceneId);
            }
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : t("Remix failed."));
        } finally {
            setIsForking(false);
        }
    };

    const handleOpenGamesLibrary = async () => {
        if (isPlaying) {
            await stopPlayingSession();
        }

        try {
            await app.editor?.checkForUnsavedChanges(t("All unsaved data will be lost. Are you sure?"));
        } catch {
            return;
        }

        void navigate(ROUTES.DASHBOARD);
    };

    useEffect(() => {
        const handleMessage = (event: any) => {
            const message = event.data;
            if (message === IFRAME_MESSAGES.GAME_CLOSED) {
                handleGameClose();
            } else if (message === IFRAME_MESSAGES.GAME_STARTED || message === IFRAME_MESSAGES.GAME_RESUMED) {
                // Game started/resumed - playcoin granting removed
            } else if (message === IFRAME_MESSAGES.GAME_PAUSED || message === IFRAME_MESSAGES.GAME_ENDED) {
                // Game paused/ended - playcoin granting removed
            } else if (message === IFRAME_MESSAGES.GAME_PLAYER_ERROR) {
                handleGameClose();
                toast.error(t("Failed to find player object. Check your settings"));
            } else if (message === IFRAME_MESSAGES.GAME_MULTIPLAYER_ERROR) {
                handleGameClose();
                toast.error(t("Multiplayer server failed."));
            }
        };

        window.addEventListener("message", handleMessage);

        return () => {
            window.removeEventListener("message", handleMessage);
        };
    }, []);

    const copyURL = () => {
        if (!app.editor) return;
        let url;
        if (app.editor.isPublished && app.editor.sceneID) {
            url = getGameUrl(app.editor.sceneID, slug) || window.location.href;
        } else {
            url = window.location.href;
        }
        void createTrackedShareUrl(app.editor.sceneID || "", url, {
            creatorUserId: app.editor.projectUserId,
            channel: "floating_nav",
        })
            .then(trackedUrl => navigator.clipboard.writeText(trackedUrl))
            .then(() => toast.success(t("URL copied to clipboard!")))
            .catch(() => toast.error(t("Failed to copy link")));
    };

    return (
        <>
            <StyledNav>
                <LeftSide>
                    <Section $gap="4px"
                        $direction="row"
                        $width="100%"
                        $align="center"
                    >
                        <MenuButton>
                            <img
                                style={{cursor: "pointer"}}
                                src={arrowLeftIcon}
                                alt={t("Go back")}
                                onClick={isSandbox ? handleOpenGamesLibrary : handleStop}
                                className="go-back-icon icon"
                            />
                        </MenuButton>
                        <SceneName />
                        <MenuButton>
                            <img
                                style={{cursor: "pointer"}}
                                src={arrowUp}
                                alt={t("Copy scene URL")}
                                onClick={copyURL}
                                className="go-back-icon icon"
                            />
                        </MenuButton>
                    </Section>
                </LeftSide>
                {(!isSandbox || IS_OSS) &&
                    <Middle>
                        <EditorButton $isBlue={isPlaying}>{t("Play")}</EditorButton>
                        <EditorButton
                            $isBlue={!isPlaying}
                            $disabled={secondaryDisabled}
                            aria-disabled={secondaryDisabled}
                            title={
                                isOwner
                                    ? t("Edit this game")
                                    : canRemix
                                        ? t("Remix this game")
                                        : t("This game cannot be remixed")
                            }
                            onClick={isOwner ? handleStop : handleRemix}
                        >
                            {isOwner ? t("Edit") : isForking ? t("...") : t("Remix")}
                        </EditorButton>
                    </Middle>
                }
                <Right>
                    <TopMenu inGameUI />
                </Right>
            </StyledNav>
            <AppVersion />
        </>
    );
};
