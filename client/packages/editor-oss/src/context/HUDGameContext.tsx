import React, {useCallback, useEffect, useMemo, useState} from "react";

import {
    GAME_HUD_IDS,
    IBannerInterface,
    IComponentInterface,
    IItemButtonInterface,
    IMiniMapInterface,
} from "../editor/assets/v2/HUD/HUDEditView/types";
import global from "../global";

export type GameDataType = {
    [key in GAME_HUD_IDS]?:
        | IBannerInterface
        | IComponentInterface
        | IMiniMapInterface
        | IItemButtonInterface
        | null
        | string
        | number;
};

type HUDGameContextValue = {
    gameLayout: GameDataType | undefined;
    setGameLayout: React.Dispatch<React.SetStateAction<GameDataType | undefined>>;
    useInitialSetup: () => void;
};

export const HUDGameContext = React.createContext<HUDGameContextValue>(null!);

export interface HUDGameContextProviderProps {
    children: React.ReactNode;
}

const placeholder: GameDataType = {
    // "game-hud-banner": {
    //     UITag: "You Lose",
    //     extraUITags: ["Death"],
    //     fontFamily: FONT_FAMILIES.ROBOTO,
    //     fontSize: 52,
    //     fontColor: "#FFF",
    // },
    // [GAME_HUD_IDS.COMPONENT_RIGHT_1]: {
    //     UIType: UI_COMPONENT_TYPES.Health,
    //     variable: "health",
    //     fontFamily: FONT_FAMILIES.INTER,
    //     fontSize: 14,
    //     fontColor: "#232323",
    //     barColor: "#A29087",
    //     statBarColor: "#BCE8AD",
    //     iconSelected: ICONS.find(el => el.alt === "heart"),
    //     uploadedButtonImg: undefined,
    //     radius: 8,
    // } as IComponentInterface,
};

const HUDGameContextProvider: React.FC<HUDGameContextProviderProps> = ({children}) => {
    const [gameLayout, setGameLayout] = useState<GameDataType | undefined>({});
    const app = global.app;
    const sceneId = app?.editor?.scene.uuid;

    const setUpUI = () => {
        const app = (global as any).app;
        const sceneId = app?.editor?.scene.uuid;
        if (app?.editor && sceneId) {
            setGameLayout(app?.editor.scene.userData?.gameUI?.gameHUD);
            const gameHUD = app?.editor.scene.userData?.gameUI?.gameHUD;

            if (gameHUD === undefined) {
                // const logo = drawLogoFromSceneName();
                // const newLogo = logo || logoExample;
                setGameLayout({
                    ...placeholder,
                    // [START_MENU_IDS.LOGO_LEFT]: newLogo,
                });
                if (app?.editor.scene.userData) {
                    app.editor.scene.userData.gameUI = {
                        ...app?.editor.scene.userData.gameUI,
                        gameHUD: {
                            ...placeholder,
                            // [START_MENU_IDS.LOGO_LEFT]: newLogo,
                        },
                    };
                    app.editor.scene.userData.isStartGameMenuDefaultBanner = true;
                }
            } else {
                setGameLayout(app?.editor.scene.userData?.gameUI?.gameHUD);
            }
        }
        app.call("objectChanged", app.editor, app.scene);
    };

    useEffect(() => {
        setUpUI();

        app?.on("sceneLoaded.HUDGameContextProvider", () => {
            setUpUI();
        });

        return () => {
            app?.on("sceneLoaded.HUDGameContextProvider", null);
        };
    }, [sceneId]);

    const useInitialSetup = useCallback(() => {
        if (app?.editor && sceneId) {
            setGameLayout(app?.editor.scene.userData?.gameUI?.gameHUD);
        }
    }, [app?.editor, sceneId]);

    const contextValue = useMemo<HUDGameContextValue>(
        () => ({
            gameLayout,
            setGameLayout,
            useInitialSetup,
        }),
        [gameLayout, useInitialSetup],
    );

    return <HUDGameContext.Provider value={contextValue}>{children}</HUDGameContext.Provider>;
};

export default HUDGameContextProvider;
