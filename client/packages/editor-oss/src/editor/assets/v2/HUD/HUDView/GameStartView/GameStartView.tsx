import React, {useEffect, useState} from "react";
import styled, {keyframes} from "styled-components";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import EventBus from "../../../../../../behaviors/event/EventBus";
import global from "@stem/editor-oss/global";
import {DEVICE_TYPES} from "@stem/editor-oss/types/editor";
import {DetectDevice} from "@stem/editor-oss/utils/DetectDevice";
import {CustomGameButton} from "../../HUDEditView/CustomGameButton/CustomGameButton";
import {ButtonsColumn, Grid} from "../../HUDEditView/GameStartMenu/GameStartMenu.style";
import {
    HUD_TABS,
    IGameButtonInterface,
    START_MENU_IDS,
    StartGameMenuDataType,
} from "../../HUDEditView/types";
import {getSoundsFromUI} from "../getGameSounds";
import {Logo} from "../Logo";
import {checkIfQuitBtn, checkIfStartBtn, openFullScreen} from "../services";

interface Props {
    setView: React.Dispatch<React.SetStateAction<HUD_TABS | null>>;
    setBgImage: React.Dispatch<React.SetStateAction<string | undefined>>;
    emptyHUD: boolean;
}

const rotation = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const PreloaderContainer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 10;
`;

const Spinner = styled.div`
    width: 60px;
    height: 60px;
    border: 6px solid #f3f3f3;
    border-top: 6px solid #3498db;
    border-radius: 50%;
    animation: ${rotation} 1.5s infinite linear;
    margin-bottom: 20px;
`;

const PreloaderText = styled.div`
    color: white;
    font-size: 20px;
    font-family: "Inter", sans-serif;
`;

export const GameStartView = ({setView, setBgImage, emptyHUD}: Props) => {
    const app = (global as any).app as EngineRuntime;
    const [startUI, setStartUI] = useState<StartGameMenuDataType>();
    const [sounds, setSounds] = useState<any[]>();
    const [isLoading, setIsLoading] = useState(false);

    const scene = app.scene || app.editor?.scene;

    const logo = startUI?.["start-menu-game-logo-left"];

    useEffect(() => {
        if (scene?.userData?.gameUI?.gameStartMenu) {
            const data = scene.userData.gameUI.gameStartMenu as StartGameMenuDataType;
            setStartUI(data);
        } else {
            setStartUI(undefined);
        }
    }, [app]);

    useEffect(() => {
        if (startUI) {
            const loadSounds = async () => {
                const img = startUI[START_MENU_IDS.MENU_BG] as string;
                const soundsToLoad = await getSoundsFromUI(startUI, true);
                if (img) setBgImage(img);
                setSounds(soundsToLoad);
            };
            loadSounds();
        } else {
            setBgImage(undefined);
        }
    }, [startUI]);

    useEffect(() => {
        if (sounds) {
            EventBus.instance.send("game.loadSounds", sounds);
        }
    }, [sounds]);

    useEffect(() => {
        return () => {
            if (sounds) EventBus.instance.send("game.clear_sounds");
        };
    }, []);

    useEffect(() => {
        const onGameStarted = () => {
            setIsLoading(false);
            setView(null);
        };

        global?.app?.on("gameStarted", onGameStarted);

        return () => {
            global?.app?.on("gameStarted", null);
        };
    }, [setView]);

    const handleGameButtonClick = (customStyle: IGameButtonInterface) => {
        const clickSound = customStyle.clickSound;
        const btn = customStyle.UIButtonType;
        if (clickSound) EventBus.instance.send("game.playSound", clickSound.ID);

        if (checkIfStartBtn(btn)) {
            setIsLoading(true);
            EventBus.instance.send("game.start");
            EventBus.instance.send("game.clear_sounds");
        } else if (checkIfQuitBtn(btn)) {
            console.log("quit game");
        }

        const deviceType = DetectDevice.getDeviceType();
        if (deviceType === DEVICE_TYPES.MOBILE) {
            openFullScreen();
        }
    };

    const handleHover = (customStyle: IGameButtonInterface) => {
        const hoverSound = customStyle.hoverSound;
        if (hoverSound) EventBus.instance.send("game.playSound", hoverSound.ID);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        const isFTUE = params.get("ftue") === "true";
        if (isFTUE) {
            const asyncAction = async () => {
                await new Promise(resolve => setTimeout(resolve, 1000));
                setIsLoading(true);
                EventBus.instance.send("game.start");
                EventBus.instance.send("game.clear_sounds");
                app.editor?.component?.handleLoading(false);
            };
            asyncAction();
        }
    }, [app.editor?.component, window.location.search]);

    return startUI ? 
        <Grid>
            {!emptyHUD && 
                <>
                    <ButtonsColumn $panelBg={(startUI?.[START_MENU_IDS.PANEL_BG] as string) || undefined}>
                        {logo && 
                            <Logo
                                width="285px"
                                height="285px"
                                bgImage={(startUI[START_MENU_IDS.LOGO_LEFT] as string) || null}
                            />
                        }
                        {Array(5)
                            .fill(5)
                            .map((_, index) => {
                                const id = `start-menu-game-button-column-left-${index + 1}` as START_MENU_IDS;
                                const customStyleData = startUI[id] as IGameButtonInterface;

                                return (
                                    <CustomGameButton
                                        key={index}
                                        customStyle={customStyleData ? customStyleData : null}
                                        width="285px"
                                        height="32px"
                                        onClick={() => handleGameButtonClick(customStyleData)}
                                        onHover={() => handleHover(customStyleData)}
                                        pointerEvent={!isLoading}
                                        textStyle={{textTransform: "uppercase"}}
                                        disabled={isLoading || checkIfQuitBtn(customStyleData?.UIButtonType)}
                                        id={
                                            customStyleData
                                                ? checkIfStartBtn(customStyleData.UIButtonType)
                                                    ? "startGameBtn"
                                                    : undefined
                                                : undefined
                                        }
                                    />
                                );
                            })}
                    </ButtonsColumn>

                    {isLoading && 
                        <PreloaderContainer>
                            <Spinner />
                            <PreloaderText>Loading...</PreloaderText>
                        </PreloaderContainer>
                    }
                </>
            }
        </Grid>
     : null;
};
