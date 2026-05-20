import React, {useCallback, useEffect, useMemo, useState} from "react";

import defaultBg from "../editor/assets/v2/HUD/HUDEditView/images/hud-default-bg.png";
import defaultLogo from "../editor/assets/v2/HUD/HUDEditView/images/hud-default-logo.png";
import {
    FONT_FAMILIES,
    START_MENU_BUTTON_TYPES,
    IN_GAME_MENU_IDS,
    InGameMenuDataType,
} from "../editor/assets/v2/HUD/HUDEditView/types";
import global from "../global";

type HUDInGameMenuContextValue = {
    inGameMenuLayout: InGameMenuDataType | undefined;
    setInGameMenuLayout: React.Dispatch<React.SetStateAction<InGameMenuDataType | undefined>>;
    useInitialSetup: () => void;
};

export const HUDInGameMenuContext = React.createContext<HUDInGameMenuContextValue>(null!);

export interface HUDInGameMenuContextProviderProps {
    children: React.ReactNode;
}

export const DEFAULT_BUTTON_CSS = {
    buttonColor: "#8B8B8B",
    fontColor: "#ffffff",
    fontFamily: FONT_FAMILIES.INTER,
    fontSize: 16,
    radius: 8,
};

const placeholder: InGameMenuDataType = {
    [IN_GAME_MENU_IDS.GAME_BUTTON_LEFT_1]: {
        UIButtonType: START_MENU_BUTTON_TYPES.START_GAME,
        ...DEFAULT_BUTTON_CSS,
    },
    [IN_GAME_MENU_IDS.PANEL_BG]: "#393939",
    [IN_GAME_MENU_IDS.MENU_BG]: defaultBg,
    [IN_GAME_MENU_IDS.LOGO_LEFT]: defaultLogo,
};

const HUDInGameMenuContextProvider: React.FC<HUDInGameMenuContextProviderProps> = ({children}) => {
    const [inGameMenuLayout, setInGameMenuLayout] = useState<InGameMenuDataType>();
    const app = (global as any).app;
    const sceneId = app?.editor?.scene.uuid;

    const setUpUI = () => {
        const app = (global as any).app;
        const sceneId = app?.editor?.scene.uuid;
        if (app?.editor && sceneId) {
            const gameHUD = app?.editor.scene.userData?.gameUI?.inGameMenu;

            if (!gameHUD || Object.keys(gameHUD).length === 0) {
                // const logo = drawLogoFromSceneName();
                // const newLogo = logo || logoExample;
                setInGameMenuLayout({
                    ...placeholder,
                    // [IN_GAME_MENU_IDS.LOGO_LEFT]: newLogo,
                });
                if (app?.editor.scene.userData) {
                    app.editor.scene.userData.gameUI = {
                        ...app?.editor.scene.userData.gameUI,
                        inGameMenu: {
                            ...placeholder,
                            // [IN_GAME_MENU_IDS.LOGO_LEFT]: newLogo,
                        },
                    };
                    app.editor.scene.userData.isStartGameMenuDefaultBanner = true;
                }
            } else {
                setInGameMenuLayout(app?.editor.scene.userData?.gameUI?.inGameMenu);
            }
        }
        app.call("objectChanged", app.editor, app.scene);
    };

    useEffect(() => {
        setUpUI();

        app.on("sceneLoaded.HUDInGameMenuContextProvider", () => {
            setUpUI();
        });

        return () => {
            app?.on("sceneLoaded.HUDInGameMenuContextProvider", null);
        };
    }, [sceneId]);

    const useInitialSetup = useCallback(() => {
        if (app?.editor && sceneId) {
            setInGameMenuLayout(app?.editor.scene.userData?.gameUI?.inGameMenu);
        }
    }, [app?.editor, sceneId]);

    useEffect(() => {
        app.on("clear.HUDInGameMenuContext", () => {
            if (app?.editor?.scene.userData?.isStartGameMenuDefaultBanner) {
                setInGameMenuLayout({
                    ...app?.editor.scene.userData.gameUI.inGameMenu,
                });

                app.editor.scene.userData.gameUI = {
                    ...app?.editor.scene.userData.gameUI,
                    inGameMenu: {
                        ...app?.editor.scene.userData.gameUI.inGameMenu,
                    },
                };
                app.call("objectChanged", app.editor, app.scene);
            }
        });
    }, []);

    const contextValue = useMemo<HUDInGameMenuContextValue>(
        () => ({
            inGameMenuLayout,
            setInGameMenuLayout,
            useInitialSetup,
        }),
        [inGameMenuLayout, useInitialSetup],
    );

    return <HUDInGameMenuContext.Provider value={contextValue}>{children}</HUDInGameMenuContext.Provider>;
};

export default HUDInGameMenuContextProvider;
