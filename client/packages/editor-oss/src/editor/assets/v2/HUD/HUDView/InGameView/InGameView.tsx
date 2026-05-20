import React, {useEffect, useState} from "react";

import EventBus from "../../../../../../behaviors/event/EventBus";
import global from "@stem/editor-oss/global";
import {CustomGameButton} from "../../HUDEditView/CustomGameButton/CustomGameButton";
import {ButtonsColumn, Grid} from "../../HUDEditView/GameStartMenu/GameStartMenu.style";
import {
    HUD_TABS,
    IGameButtonInterface,
    IN_GAME_MENU_IDS,
    InGameMenuDataType,
    START_MENU_BUTTON_TYPES,
} from "../../HUDEditView/types";
import {getSoundsFromUI} from "../getGameSounds";
import {Logo} from "../Logo";
import {checkIfQuitBtn, checkIfStartBtn} from "../services";

interface Props {
    setView: React.Dispatch<React.SetStateAction<HUD_TABS | null>>;
    setBgImage: React.Dispatch<React.SetStateAction<string | undefined>>;
    emptyHUD: boolean;
}

export const InGameView = ({setView, setBgImage, emptyHUD}: Props) => {
    const app = (global as any).app;
    const [inGameUI, setInGameUI] = useState<InGameMenuDataType>();
    const [isReady, setIsReady] = useState(false);
    const [sounds, setSounds] = useState<any[]>();

    const scene = app.scene || app.editor?.scene;

    useEffect(() => {
        if (scene?.userData?.gameUI?.inGameMenu) {
            const data = scene.userData.gameUI.inGameMenu as InGameMenuDataType;
            setInGameUI(data);
        } else {
            setInGameUI(undefined);
        }
    }, [app]);

    // useEffect(() => {
    //     if (inGameUI) {
    //         const img = inGameUI[IN_GAME_MENU_IDS.MENU_BG] as string;
    //         const soundsToLoad = getSoundsFromUI(inGameUI, false);
    //         img && setBgImage(img);
    //         setSounds(soundsToLoad);
    //     } else {
    //         setBgImage(undefined);
    //     }
    // }, [inGameUI]);

    const handleGameButtonClick = (customStyle: IGameButtonInterface) => {
        const clickSound = customStyle.clickSound;
        const btn = customStyle.UIButtonType;
        clickSound && EventBus.instance.send("game.playSound", clickSound.ID);
        if (checkIfStartBtn(btn)) {
            EventBus.instance.send("game.resume");
            EventBus.instance.send("game.clear_sounds");
            // if (!app.isSpriteCharacter) {
            //     document.body.requestPointerLock();
            // }
            setView(null);
        } else if (checkIfQuitBtn(btn)) {
            console.log("quit game");
        }
    };

    useEffect(() => {
        if (inGameUI) {
            setTimeout(() => {
                setIsReady(true);
            }, 1000);
        }
    }, [inGameUI]);

    useEffect(() => {
        if (inGameUI) {
            const loadSounds = async () => {
                const img = inGameUI[IN_GAME_MENU_IDS.MENU_BG] as string;
                const soundsToLoad = await getSoundsFromUI(inGameUI, true, true);
                img && setBgImage(img);
                setSounds(soundsToLoad);
            };
            loadSounds();
        } else {
            setBgImage(undefined);
        }
    }, [inGameUI]);

    useEffect(() => {
        if (sounds) {
            EventBus.instance.send("game.loadSounds", sounds);
        }
    }, [sounds]);

    useEffect(() => {
        return () => {
            sounds && EventBus.instance.send("game.clear_sounds");
        };
    }, []);

    const handleHover = (customStyle: IGameButtonInterface) => {
        const hoverSound = customStyle.hoverSound;
        hoverSound && EventBus.instance.send("game.playSound", hoverSound.ID);
    };

    return inGameUI ? 
        <Grid>
            {!emptyHUD && 
                <>
                    <ButtonsColumn $panelBg={(inGameUI?.[IN_GAME_MENU_IDS.PANEL_BG] as string) || undefined}>
                        {inGameUI?.["in-game-menu-game-logo-left"] && 
                            <Logo
                                width="285px"
                                height="285px"
                                bgImage={(inGameUI[IN_GAME_MENU_IDS.LOGO_LEFT] as string) || null}
                            />
                        }
                        {isReady &&
                            Array(5)
                                .fill(5)
                                .map((_, index) => {
                                    const id = `in-game-menu-game-button-column-left-${index + 1}` as IN_GAME_MENU_IDS;
                                    const customStyleData = inGameUI[id] as IGameButtonInterface;

                                    return (
                                        <CustomGameButton
                                            key={index}
                                            customText={
                                                customStyleData?.UIButtonType === START_MENU_BUTTON_TYPES.START_GAME
                                                    ? "Resume Game"
                                                    : undefined
                                            }
                                            customStyle={customStyleData ? customStyleData : null}
                                            width="285px"
                                            height="32px"
                                            onClick={() => handleGameButtonClick(customStyleData)}
                                            onHover={() => handleHover(customStyleData)}
                                            pointerEvent
                                            textStyle={{textTransform: "uppercase"}}
                                            disabled={checkIfQuitBtn(customStyleData?.UIButtonType)}
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
                </>
            }
        </Grid>
     : null;
};
