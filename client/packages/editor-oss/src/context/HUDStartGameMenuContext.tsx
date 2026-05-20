import React, {useCallback, useEffect, useMemo, useState} from "react";

import defaultBg from "../editor/assets/v2/HUD/HUDEditView/images/hud-default-bg.png";
import defaultLogo from "../editor/assets/v2/HUD/HUDEditView/images/hud-default-logo.png";
import {
    FONT_FAMILIES,
    START_MENU_BUTTON_TYPES,
    START_MENU_IDS,
    StartGameMenuDataType,
} from "../editor/assets/v2/HUD/HUDEditView/types";
import global from "../global";

type HUDStartGameMenuContextValue = {
    startGameMenuLayout: StartGameMenuDataType | undefined;
    setStartGameMenuLayout: React.Dispatch<React.SetStateAction<StartGameMenuDataType | undefined>>;
    useInitialSetup: () => void;
};

export const HUDStartGameMenuContext = React.createContext<HUDStartGameMenuContextValue>(null!);

export interface HUDStartGameMenuContextProviderProps {
    children: React.ReactNode;
}

export const DEFAULT_BUTTON_CSS = {
    buttonColor: "#8B8B8B",
    fontColor: "#ffffff",
    fontFamily: FONT_FAMILIES.INTER,
    fontSize: 16,
    radius: 8,
};

const placeholder: StartGameMenuDataType = {
    [START_MENU_IDS.GAME_BUTTON_LEFT_1]: {
        UIButtonType: START_MENU_BUTTON_TYPES.START_GAME,
        ...DEFAULT_BUTTON_CSS,
    },
    [START_MENU_IDS.PANEL_BG]: "#393939",
    [START_MENU_IDS.MENU_BG]: defaultBg,
    [START_MENU_IDS.LOGO_LEFT]: defaultLogo,
};

const HUDStartGameMenuContextProvider: React.FC<HUDStartGameMenuContextProviderProps> = ({children}) => {
    const [startGameMenuLayout, setStartGameMenuLayout] = useState<StartGameMenuDataType>();
    const app = (global as any).app;
    const sceneId = app?.editor?.scene.uuid;

    const setUpUI = () => {
        const app = (global as any).app;
        const sceneId = app?.editor?.scene.uuid;
        if (app?.editor && sceneId) {
            const gameHUD = app?.editor.scene.userData?.gameUI?.gameStartMenu;

            if (!gameHUD || Object.keys(gameHUD).length === 0) {
                // const logo = drawLogoFromSceneName();
                // const newLogo = logo || logoExample;
                setStartGameMenuLayout({
                    ...placeholder,
                    // [START_MENU_IDS.LOGO_LEFT]: newLogo,
                });
                if (app?.editor.scene.userData) {
                    app.editor.scene.userData.gameUI = {
                        ...app?.editor.scene.userData.gameUI,
                        gameStartMenu: {
                            ...placeholder,
                            // [START_MENU_IDS.LOGO_LEFT]: newLogo,
                        },
                    };
                    app.editor.scene.userData.isStartGameMenuDefaultBanner = true;
                }
            } else {
                setStartGameMenuLayout(app?.editor.scene.userData?.gameUI?.gameStartMenu);
            }
        }
        app.call("objectChanged", app.editor, app.scene);
    };

    useEffect(() => {
        setUpUI();

        app.on("sceneLoaded.HUDStartGameMenuContextProvider", () => {
            setUpUI();
        });

        return () => {
            app?.on("sceneLoaded.HUDStartGameMenuContextProvider", null);
        };
    }, [sceneId]);

    const useInitialSetup = useCallback(() => {
        if (app?.editor && sceneId) {
            setStartGameMenuLayout(app?.editor.scene.userData?.gameUI?.gameStartMenu);
        }
    }, [app?.editor, sceneId]);

    useEffect(() => {
        app.on("clear.HUDStartGameMenuContext", () => {
            if (app?.editor?.scene.userData?.isStartGameMenuDefaultBanner) {
                setStartGameMenuLayout({
                    ...app?.editor.scene.userData.gameUI.gameStartMenu,
                });

                app.editor.scene.userData.gameUI = {
                    ...app?.editor.scene.userData.gameUI,
                    gameStartMenu: {
                        ...app?.editor.scene.userData.gameUI.gameStartMenu,
                    },
                };
                app.call("objectChanged", app.editor, app.scene);
            }
        });
    }, []);

    const contextValue = useMemo<HUDStartGameMenuContextValue>(
        () => ({
            startGameMenuLayout,
            setStartGameMenuLayout,
            useInitialSetup,
        }),
        [startGameMenuLayout, useInitialSetup],
    );

    return <HUDStartGameMenuContext.Provider value={contextValue}>{children}</HUDStartGameMenuContext.Provider>;
};

export default HUDStartGameMenuContextProvider;
