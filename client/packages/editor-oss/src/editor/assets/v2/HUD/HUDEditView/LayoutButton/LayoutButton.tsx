import React, {useEffect, useRef, useState} from "react";
import styled from "styled-components";
import {useOnClickOutside} from "usehooks-ts";

import {flexCenter} from "../../../../../../assets/style";
import {
    useHUDContext,
    useHUDGameContext,
    useHUDInGameMenuContext,
    useHUDStartGameMenuContext,
} from "@stem/editor-oss/context";
import global from "@stem/editor-oss/global";
import StyledColorPicker from "../../../common/StyledColorPicker/StyledColorPicker";
import {CustomBanner} from "../CustomBanner/CustomBanner";
import {CustomComponent} from "../CustomComponents/CustomComponents";
import {CustomGameButton} from "../CustomGameButton/CustomGameButton";
import {CustomMiniMap} from "../CustomMiniMap/CustomMiniMap";
import {CustomItemButton} from "../CutomItemButton/CustomItemButton";
import {
    GAME_HUD_IDS,
    HUD_TABS,
    IBannerInterface,
    IComponentInterface,
    IGameButtonInterface,
    IItemButtonInterface,
    IMiniMapInterface,
    IN_GAME_MENU_IDS,
    LAYOUT_BUTTON_TYPE,
    START_MENU_BUTTON_TYPES,
    START_MENU_IDS,
} from "../types";

interface Props {
    className?: string;
    helperText?: string;
    hidePlus?: boolean;
    width: string;
    height: string;
    maxWidth?: string;
    maxHeight?: string;
    bgImage?: File | null;
    setBgImage?: React.Dispatch<React.SetStateAction<File | null>>;
    type: LAYOUT_BUTTON_TYPE;
    initialBgImg?: string;
    id: START_MENU_IDS | GAME_HUD_IDS | IN_GAME_MENU_IDS;
    tab: HUD_TABS;
    itemKey?: number;
    plusIconBig?: boolean;
    plusNewLine?: boolean;
    emptyButtonStyle?: React.CSSProperties;
}

export const LayoutButton = ({
    emptyButtonStyle,
    maxWidth,
    width,
    height,
    type,
    initialBgImg,
    id,
    tab,
    className,
    helperText,
    hidePlus,
    maxHeight,
    itemKey,
    plusIconBig,
    plusNewLine,
}: Props) => {
    const [, setActive] = useState(false);
    const {openPopup, setPopupCallback, setOpenColorPicker, openColorPicker, popupType} = useHUDContext();
    const app = (global as any).app;
    const {setStartGameMenuLayout, startGameMenuLayout} = useHUDStartGameMenuContext();
    const {inGameMenuLayout, setInGameMenuLayout} = useHUDInGameMenuContext();
    const {setGameLayout, gameLayout} = useHUDGameContext();
    const [openMenu, setOpenMenu] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const startGameMenuData = startGameMenuLayout?.[id as START_MENU_IDS];
    const gameLayoutData = gameLayout?.[id as GAME_HUD_IDS];
    const inGameLayoutData = inGameMenuLayout?.[id as IN_GAME_MENU_IDS];

    useOnClickOutside(ref as React.RefObject<HTMLElement>, () => setOpenMenu(false));

    const handleStartGameMenuTab = () => {
        setPopupCallback(() => (args: IGameButtonInterface | string | null) => {
            if (id === START_MENU_IDS.LOGO_LEFT) {
                app.editor.scene.userData.isStartGameMenuDefaultBanner = false;
            }
            setStartGameMenuLayout({
                ...startGameMenuLayout,
                [id]: args,
            });
        });
    };
    const handleInGameMenuTab = () => {
        if (id === IN_GAME_MENU_IDS.LOGO_LEFT) {
            app.editor.scene.userData.isInGameMenuDefaultBanner = false;
        }
        setPopupCallback(() => (args: IGameButtonInterface | string | null) => {
            setInGameMenuLayout({
                ...inGameMenuLayout,
                [id]: args,
            });
        });
    };

    const handleGameHudTab = () => {
        setPopupCallback(
            () => (args: IComponentInterface | IMiniMapInterface | IBannerInterface | IItemButtonInterface) => {
                console.log("setter", {
                    ...gameLayout,
                    [id]: args,
                });
                setGameLayout({
                    ...gameLayout,
                    [id]: args,
                });
            },
        );
    };

    const handleClick = () => {
        openPopup(type, id);
        setActive(true);
        if (tab === HUD_TABS.GAME_START_MENU) {
            handleStartGameMenuTab();
        } else if (tab === HUD_TABS.IN_GAME_MENU) {
            handleInGameMenuTab();
        } else if (tab === HUD_TABS.GAME_HUD) {
            handleGameHudTab();
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (tab === HUD_TABS.GAME_START_MENU) {
            setStartGameMenuLayout({
                ...startGameMenuLayout,
                [id]: undefined,
            });
        } else if (tab === HUD_TABS.IN_GAME_MENU) {
            setInGameMenuLayout({
                ...inGameMenuLayout,
                [id]: undefined,
            });
        } else if (tab === HUD_TABS.GAME_HUD) {
            setGameLayout({
                ...gameLayout,
                [id]: undefined,
            });
        }
        setOpenMenu(false);
    };

    useEffect(() => {
        if (popupType !== type) {
            setActive(false);
        }
    }, [popupType]);
    const allFieldsAreUndefined = (obj: object | string) =>
        Object.values(obj).every(value => value === undefined);

    return (
        <Wrapper>
            {(startGameMenuData && !allFieldsAreUndefined(startGameMenuData) ||
                inGameLayoutData && !allFieldsAreUndefined(inGameLayoutData)) &&
                type === LAYOUT_BUTTON_TYPE.ADD_GAME_BUTTON && 
                    <CustomGameButton
                        customStyle={
                            startGameMenuData
                                ? (startGameMenuData as IGameButtonInterface)
                                : (inGameLayoutData as IGameButtonInterface)
                        }
                        width={width}
                        height={height}
                        maxWidth={maxWidth}
                        onClick={handleClick}
                        textStyle={{textTransform: "uppercase"}}
                        customText={
                            inGameLayoutData &&
                            (inGameLayoutData as IGameButtonInterface)?.UIButtonType ===
                                START_MENU_BUTTON_TYPES.START_GAME
                                ? "Resume Game"
                                : undefined
                        }
                    />
                }
            {!!startGameMenuData &&
                (type === LAYOUT_BUTTON_TYPE.ADD_GAME_LOGO || type === LAYOUT_BUTTON_TYPE.ADD_MENU_BG) && 
                    <StyledLayoutButton
                        style={emptyButtonStyle}
                        $plusNewLine={plusNewLine}
                        $plusIconBig={!!plusIconBig}
                        id={id}
                        width={width}
                        height={height}
                        $maxWidth={maxWidth}
                        $maxHeight={maxHeight}
                        onClick={handleClick}
                        $bgImage={
                            type !== LAYOUT_BUTTON_TYPE.ADD_MENU_BG
                                ? (startGameMenuData as string) || undefined
                                : undefined
                        }
                        $whiteBorder
                        className={className}
                    >
                        {!hidePlus && "+"}
                        {helperText && <div className="helper">{helperText}</div>}
                    </StyledLayoutButton>
                }
            {inGameLayoutData &&
                (type === LAYOUT_BUTTON_TYPE.ADD_GAME_LOGO || type === LAYOUT_BUTTON_TYPE.ADD_MENU_BG) && 
                    <StyledLayoutButton
                        style={emptyButtonStyle}
                        $plusNewLine={plusNewLine}
                        $plusIconBig={!!plusIconBig}
                        id={id}
                        width={width}
                        height={height}
                        $maxWidth={maxWidth}
                        $maxHeight={maxHeight}
                        onClick={handleClick}
                        $bgImage={
                            type !== LAYOUT_BUTTON_TYPE.ADD_MENU_BG
                                ? (inGameLayoutData as string) || undefined
                                : undefined
                        }
                        $whiteBorder
                        className={className}
                    >
                        {!hidePlus && "+"}
                        {helperText && <div className="helper">{helperText}</div>}
                    </StyledLayoutButton>
                }

            {type === LAYOUT_BUTTON_TYPE.ADD_PANEL_BG && 
                <StyledLayoutButton
                    $plusIconBig={!!plusIconBig}
                    id={id}
                    width={width}
                    height={height}
                    $maxWidth={maxWidth}
                    $maxHeight={maxHeight}
                    onClick={handleClick}
                    className={className}
                    $bgImage={(inGameLayoutData as string) || undefined}
                >
                    {helperText && <div className="helper">{helperText}</div>}
                    {openColorPicker && 
                        <StyledColorPicker
                            className="colorPickerWrapperPanelBG"
                            color={(startGameMenuLayout?.[START_MENU_IDS.PANEL_BG] as string) || "#00000080"}
                            setColor={value =>
                                setStartGameMenuLayout({
                                    ...startGameMenuLayout,
                                    [id]: value,
                                })
                            }
                            hide={() => setOpenColorPicker(false)}
                        />
                    }
                </StyledLayoutButton>
            }

            {gameLayoutData && type === LAYOUT_BUTTON_TYPE.ADD_BANNER && 
                <CustomBanner
                    customStyle={gameLayoutData as IBannerInterface}
                    width={width}
                    height={height}
                    maxWidth={maxWidth}
                    onClick={handleClick}
                    id={id}
                />
            }

            {gameLayoutData && type === LAYOUT_BUTTON_TYPE.ADD_COMPONENT && 
                <CustomComponent
                    onClick={handleClick}
                    customStyle={gameLayoutData as IComponentInterface}
                    width={width}
                    maxWidth={maxWidth}
                    height={height}
                />
            }

            {gameLayoutData &&
                (type === LAYOUT_BUTTON_TYPE.ADD_LEFT_MINI_MAP || type === LAYOUT_BUTTON_TYPE.ADD_RIGHT_MINI_MAP) && 
                    <CustomMiniMap
                        onClick={handleClick}
                        customStyle={gameLayoutData as IMiniMapInterface}
                        width={"174px"}
                        height={"174px"}
                    />
                }
            {gameLayoutData && type === LAYOUT_BUTTON_TYPE.ADD_ITEM_BUTTON && 
                <CustomItemButton
                    onClick={handleClick}
                    customStyle={gameLayoutData as IItemButtonInterface}
                    width={"109px"}
                    height={"109px"}
                    itemKey={itemKey || 0}
                    id={id}
                    amount={0}
                    weaponIndex={-1}
                />
            }

            {!gameLayoutData &&
                (!startGameMenuData || allFieldsAreUndefined(startGameMenuData)) &&
                (!inGameLayoutData || allFieldsAreUndefined(inGameLayoutData)) &&
                type !== LAYOUT_BUTTON_TYPE.ADD_PANEL_BG && 
                    <StyledLayoutButton
                        $noRadius={type === LAYOUT_BUTTON_TYPE.ADD_ITEM_BUTTON}
                        style={emptyButtonStyle}
                        $plusNewLine={plusNewLine}
                        $plusIconBig={!!plusIconBig}
                        id={id}
                        width={width}
                        height={height}
                        $maxWidth={maxWidth}
                        $maxHeight={maxHeight}
                        onClick={handleClick}
                        $bgImage={initialBgImg || undefined}
                        className={className}
                    >
                        {!initialBgImg && !hidePlus && "+"}
                        {helperText && <div className="helper">{helperText}</div>}
                    </StyledLayoutButton>
                }
            {openMenu && 
                <Menu ref={ref}>
                    <span onClick={handleDelete}>Delete</span>
                </Menu>
            }
        </Wrapper>
    );
};

const StyledLayoutButton = styled.button<{
    width: string;
    height: string;
    $maxWidth?: string;
    $maxHeight?: string;
    $bgImage?: string;
    $plusIconBig: boolean;
    $plusNewLine?: boolean;
    $noRadius?: boolean;
    $whiteBorder?: boolean;
}>`
    position: relative;
    padding: 0;
    margin: 0 auto;
    display: block;
    box-sizing: border-box;
    background: none;
    cursor: pointer;
    color: #fff;
    pointer-events: all;
    border: ${({$whiteBorder}) => `1px solid ${$whiteBorder ? "#fff" : "var(--theme-grey-bg)"}`};

    width: ${({width}) => width};
    height: ${({height}) => height};
    max-width: ${({$maxWidth}) => $maxWidth ? $maxWidth : "100%"};
    max-height: ${({$maxHeight}) => $maxHeight ? $maxHeight : "unset"};
    font-size: ${({$plusIconBig}) => $plusIconBig ? "37px" : "25px"};
    pointer-events: all;
    display: flex;
    ${({$plusNewLine}) => $plusNewLine && `flex-direction: column`};
    align-items: center;
    justify-content: center;
    border-radius: ${({$noRadius}) => $noRadius ? 0 : "8px"};

    ${({$bgImage}) =>
        $bgImage &&
        `
background-image: url('${$bgImage}');
background-repeat: no-repeat;
background-size: cover;
background-position: center;
border: none;
`}

    .helper {
        display: block;
        font-size: var(--theme-font-size-s);
        font-weight: var(--theme-font-regular);
        line-height: 120%;
        color: var(--theme-font-main-selected-color);
    }

    .colorPickerWrapperPanelBG {
        position: absolute;
        top: 0;
        left: 112%;
        transform: translateY(-80%);
    }

    .top-trash-icon {
        top: 8px;
        transform: translateY(0);
    }
`;

export const Wrapper = styled.div`
    width: 100%;
    position: relative;
    pointer-events: all;
`;

export const Menu = styled.div`
    position: absolute;
    top: 50%;
    left: 100%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    text-align: center;
    min-width: 127px;
    padding: 8px 4px;
    border-radius: 12px;
    box-shadow: 0px 4px 15px 0px #000;
    background-color: var(--theme-container-unselected-tap-color);
    box-sizing: border-box;
    font-size: var(--theme-font-size-s);
    border: 2px solid var(--theme-container-stroke-color);
    span {
        cursor: pointer;
        color: var(--theme-font-unselected-color);
        transition: all 0.2s;
        &:hover {
            color: #fff;
        }
    }
`;

export const RemoveBtn = styled.button`
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);
    width: 10px;
    height: 13px;
    padding: 13px !important;
    background-color: #000 !important;
    border-radius: 50%;
    pointer-events: all;
    ${flexCenter};
`;
