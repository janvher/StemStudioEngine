import {useEffect, useState} from "react";

import {HUD_TABS, LAYOUT_BUTTON_TYPE, START_MENU_IDS} from "../types";
import {ButtonsColumn, Grid, PanelColorWrapper} from "./GameStartMenu.style";
import {useHUDContext, useHUDStartGameMenuContext} from "@stem/editor-oss/context";
import {ColorSelectionRow} from "../../../RightPanel/common/ColorSelectionRow";
import {SelectRow} from "../../../RightPanel/common/SelectRow";
import {FileData} from "../../../types/file";
import {LayoutButton} from "../LayoutButton/LayoutButton";

export const GameStartMenu = () => {
    const {soundOptions, soundAssets} = useHUDContext();
    const {startGameMenuLayout, useInitialSetup, setStartGameMenuLayout} = useHUDStartGameMenuContext();
    const [panelBg, setPanelBg] = useState((startGameMenuLayout?.[START_MENU_IDS.PANEL_BG] as string) || "transparent");
    const [menuMusic, setMenuMusic] = useState<FileData | undefined>(
        (startGameMenuLayout?.menu_music as FileData) || undefined,
    );

    useEffect(() => {
        // `useInitialSetup` is a context-provided callback, not a React hook.
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useInitialSetup();
        document.getElementById(START_MENU_IDS.LOGO_LEFT)?.click();
    }, []);

    useEffect(() => {
        setStartGameMenuLayout({
            ...startGameMenuLayout,
            [START_MENU_IDS.PANEL_BG]: panelBg,
        });
    }, [panelBg]);

    useEffect(() => {
        setStartGameMenuLayout({
            ...startGameMenuLayout,
            menu_music: menuMusic,
        });
    }, [menuMusic]);

    return (
        <Grid className="hidden-scroll"
            $bgImg={startGameMenuLayout?.[START_MENU_IDS.MENU_BG] as string}
            $isStartMenu
        >
            <ButtonsColumn $panelBg={panelBg}
                style={{borderRight: "1px solid #27272A"}}
            >
                <LayoutButton
                    tab={HUD_TABS.GAME_START_MENU}
                    // Styling should always be the same as in HUDView/GameStartView
                    width="285px"
                    height="285px"
                    type={LAYOUT_BUTTON_TYPE.ADD_GAME_LOGO}
                    id={START_MENU_IDS.LOGO_LEFT}
                />
                {Array(5)
                    .fill(5)
                    .map((_, index) => 
                        <LayoutButton
                            tab={HUD_TABS.GAME_START_MENU}
                            key={index}
                            // Styling should always be the same as in HUDView/GameStartView
                            width="285px"
                            height="32px"
                            type={LAYOUT_BUTTON_TYPE.ADD_GAME_BUTTON}
                            id={`start-menu-game-button-column-left-${index + 1}` as START_MENU_IDS}
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
                    tab={HUD_TABS.GAME_START_MENU}
                    width="50%"
                    maxWidth="309px"
                    height="174px"
                    type={LAYOUT_BUTTON_TYPE.ADD_MENU_BG}
                    id={START_MENU_IDS.MENU_BG}
                    helperText="Main Menu Background"
                    plusNewLine
                    plusIconBig
                />
            </ButtonsColumn>
        </Grid>
    );
};
