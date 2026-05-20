import {useEffect, useState} from "react";

import {useAssetsTabContext, useHUDContext, useHUDInGameMenuContext} from "@stem/editor-oss/context";
import {AssetType as AssetTypeContext} from "@stem/editor-oss/context/AssetsTabContext";
import {ColorSelectionRow} from "../../../RightPanel/common/ColorSelectionRow";
import {SelectRow} from "../../../RightPanel/common/SelectRow";
import {FileData} from "../../../types/file";
import {ButtonsColumn, Grid, PanelColorWrapper} from "../GameStartMenu/GameStartMenu.style";
import {LayoutButton} from "../LayoutButton/LayoutButton";
import {HUD_TABS, IN_GAME_MENU_IDS, LAYOUT_BUTTON_TYPE} from "../types";

export const InGameMenu = () => {
    const {soundOptions, soundAssets} = useHUDContext();
    const {inGameMenuLayout, useInitialSetup, setInGameMenuLayout} = useHUDInGameMenuContext();
    const [panelBg, setPanelBg] = useState((inGameMenuLayout?.[IN_GAME_MENU_IDS.PANEL_BG] as string) || "transparent");
    const {fetchAssets: fetchData} = useAssetsTabContext();
    const [menuMusic, setMenuMusic] = useState<FileData | undefined>(
        (inGameMenuLayout?.["in-game-menu-menu_music"] as FileData) || undefined,
    );

    useEffect(() => {
        // `useInitialSetup` is a context-provided callback, not a React hook.
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useInitialSetup();
        document.getElementById(IN_GAME_MENU_IDS.LOGO_LEFT)?.click();
    }, []);

    useEffect(() => {
        setInGameMenuLayout({
            ...inGameMenuLayout,
            [IN_GAME_MENU_IDS.PANEL_BG]: panelBg,
        });
    }, [panelBg]);

    useEffect(() => {
        setInGameMenuLayout({
            ...inGameMenuLayout,
            ["in-game-menu-menu_music"]: menuMusic,
        });
    }, [menuMusic]);

    useEffect(() => {
        fetchData(AssetTypeContext.SOUNDS);
    }, []);

    return (
        <Grid className="hidden-scroll"
            $bgImg={inGameMenuLayout?.[IN_GAME_MENU_IDS.MENU_BG] as string}
            $isStartMenu
        >
            <ButtonsColumn $panelBg={panelBg}
                style={{borderRight: "1px solid #27272A"}}
            >
                <LayoutButton
                    tab={HUD_TABS.IN_GAME_MENU}
                    // Styling should always be the same as in HUDView/GameStartView
                    width="285px"
                    height="285px"
                    type={LAYOUT_BUTTON_TYPE.ADD_GAME_LOGO}
                    id={IN_GAME_MENU_IDS.LOGO_LEFT}
                />
                {Array(5)
                    .fill(5)
                    .map((_, index) => 
                        <LayoutButton
                            tab={HUD_TABS.IN_GAME_MENU}
                            key={index}
                            // Styling should always be the same as in HUDView/GameStartView
                            width="285px"
                            height="32px"
                            type={LAYOUT_BUTTON_TYPE.ADD_GAME_BUTTON}
                            id={`in-game-menu-game-button-column-left-${index + 1}` as IN_GAME_MENU_IDS}
                        />,
                    )}
                <PanelColorWrapper>
                    <ColorSelectionRow $margin="0"
                        value={panelBg}
                        setValue={setPanelBg}
                        label="Panel Color"
                        border
                    />
                </PanelColorWrapper>
                <PanelColorWrapper>
                    <SelectRow
                        showListOnTop
                        $margin="0"
                        label="Menu Music"
                        data={soundOptions}
                        value={soundOptions.find(item => item.value === menuMusic?.Name) || soundOptions[0]}
                        onChange={item => setMenuMusic(soundAssets?.find(el => el.Name === item.value))}
                    />
                </PanelColorWrapper>
            </ButtonsColumn>
            <ButtonsColumn $menuBgColumn>
                <LayoutButton
                    tab={HUD_TABS.IN_GAME_MENU}
                    width="50%"
                    maxWidth="309px"
                    height="174px"
                    type={LAYOUT_BUTTON_TYPE.ADD_MENU_BG}
                    id={IN_GAME_MENU_IDS.MENU_BG}
                    helperText="Main Menu Background"
                    plusNewLine
                    plusIconBig
                />
            </ButtonsColumn>
        </Grid>
    );
};
