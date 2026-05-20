import {useEffect} from "react";

import {ButtonsColumn, ButtonsRow, Grid} from "./GameHUD.style";
import {useHUDGameContext} from "@stem/editor-oss/context";
import {LayoutButton} from "../LayoutButton/LayoutButton";
import {GAME_HUD_IDS, HUD_TABS, LAYOUT_BUTTON_TYPE} from "../types";

export const GameHUD = () => {
    const {useInitialSetup} = useHUDGameContext();

    useEffect(() => {
        // `useInitialSetup` is a context-provided side-effect callback, not
        // a React hook — the `use` prefix is misleading. ESLint's static
        // analysis can't tell, so disable here.
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useInitialSetup();
        document.getElementById(GAME_HUD_IDS.BANNER)?.click();
    }, []);

    return (
        <Grid>
            {Array(3)
                .fill(3)
                .map((_, i) => {
                    const isCenter = i === 1;
                    const isRight = i === 2;
                    return (
                        <ButtonsColumn key={i}
                            $isCenter={isCenter}
                        >
                            {isCenter ? 
                                <>
                                    {/* Styling should always be the same as in HUDView/GameStartView */}
                                    <ButtonsRow $gap="66px"
                                        $isColumn
                                        style={{marginTop: "110px"}}
                                    >
                                        <LayoutButton
                                            id={GAME_HUD_IDS.BANNER}
                                            tab={HUD_TABS.GAME_HUD}
                                            width="100%"
                                            height="162px"
                                            type={LAYOUT_BUTTON_TYPE.ADD_BANNER}
                                        />
                                    </ButtonsRow>
                                </>
                             : 
                                <>
                                    <ButtonsRow $gap="16px"
                                        $isColumn
                                    >
                                        {Array(2)
                                            .fill(2)
                                            .map((_, index) => 
                                                // Styling should always be the same as in HUDView/GameStartView
                                                <LayoutButton
                                                    id={
                                                        i === 0
                                                            ? GAME_HUD_IDS[
                                                                  ("COMPONENT_LEFT_" +
                                                                      (index +
                                                                          1)) as unknown as keyof typeof GAME_HUD_IDS
                                                              ]
                                                            : GAME_HUD_IDS[
                                                                  ("COMPONENT_RIGHT_" +
                                                                      (index +
                                                                          1)) as unknown as keyof typeof GAME_HUD_IDS
                                                              ]
                                                    }
                                                    tab={HUD_TABS.GAME_HUD}
                                                    key={index}
                                                    width="100%"
                                                    maxWidth="285px"
                                                    height="27px"
                                                    type={LAYOUT_BUTTON_TYPE.ADD_COMPONENT}
                                                />,
                                            )}
                                    </ButtonsRow>
                                    {isRight ? 
                                        // Styling should always be the same as in HUDView/GameStartView
                                        <ButtonsRow $isWeapons>
                                            {Array(5)
                                                .fill(5)
                                                .map((_, index) => 
                                                    <LayoutButton
                                                        id={
                                                            GAME_HUD_IDS[
                                                                ("ITEM_" +
                                                                    (index + 1)) as unknown as keyof typeof GAME_HUD_IDS
                                                            ]
                                                        }
                                                        tab={HUD_TABS.GAME_HUD}
                                                        key={index}
                                                        width="109px"
                                                        maxWidth="109px"
                                                        height="109px"
                                                        itemKey={index + 1}
                                                        type={LAYOUT_BUTTON_TYPE.ADD_ITEM_BUTTON}
                                                    />,
                                                )}
                                        </ButtonsRow>
                                     : 
                                        // Styling should always be the same as in HUDView/GameStartView
                                        <ButtonsRow $gap="16px"
                                            $justify={i === 0 ? "flex-start" : "flex-end"}
                                        >
                                            <LayoutButton
                                                emptyButtonStyle={{margin: "0 auto 0 0"}}
                                                id={i === 0 ? GAME_HUD_IDS.MINI_MAP_LEFT : GAME_HUD_IDS.MINI_MAP_RIGHT}
                                                tab={HUD_TABS.GAME_HUD}
                                                width="174px"
                                                maxWidth="174px"
                                                height="174px"
                                                type={
                                                    i === 0
                                                        ? LAYOUT_BUTTON_TYPE.ADD_LEFT_MINI_MAP
                                                        : LAYOUT_BUTTON_TYPE.ADD_RIGHT_MINI_MAP
                                                }
                                            />
                                        </ButtonsRow>
                                    }
                                </>
                            }
                        </ButtonsColumn>
                    );
                })}
        </Grid>
    );
};
