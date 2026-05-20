import {FileData} from "../../types/file";

export enum HUD_TABS {
    GAME_START_MENU = "Game Start Menu",
    IN_GAME_MENU = "In Game Menu",
    GAME_HUD = "Game HUD",
    MOBILE_GAME_CONTROLS = "Mobile Game Controls",
}

export enum LAYOUT_BUTTON_TYPE {
    ADD_GAME_LOGO = "UI Game Logo",
    ADD_MENU_BG = "Main Menu Background",
    ADD_GAME_BUTTON = "UI Button",
    ADD_RIGHT_MINI_MAP = "UI Right Mini Map",
    ADD_LEFT_MINI_MAP = "UI Left Mini Map",
    ADD_COMPONENT = "UI Component",
    ADD_BANNER = "UI Banner",
    ADD_ITEM_BUTTON = "UI Item Button",
    ADD_PANEL_BG = "Panel Background",
}

export enum FONT_FAMILIES {
    ROBOTO = "Roboto",
    OPEN_SANS = "OpenSans",
    MONTSERRAT = "Montserrat",
    LATO = "Lato",
    INTER = "Inter",
}

export interface ISound {
    ID: string;
    Name: string;
    Url: string;
}

export interface IGameButtonInterface {
    UIButtonType: string;
    fontFamily: string;
    fontSize: number;
    fontColor: string;
    buttonColor: string;
    uploadedButtonImg?: string;
    iconSelected?: Icon;
    radius: number;
    hoverSound?: FileData;
    clickSound?: FileData;
}

export interface IBannerInterface {
    UITag: string;
    extraUITags: string[];
    fontFamily: FONT_FAMILIES;
    fontSize: number;
    fontColor: string;
}

export interface IComponentInterface {
    UIType: UI_COMPONENT_TYPES;
    variable: string;
    fontFamily: FONT_FAMILIES;
    fontSize: number;
    fontColor: string;
    barColor: string;
    statBarColor: string;
    iconSelected: Icon;
    uploadedButtonImg?: string;
    radius: number;
}

export interface IMiniMapInterface {
    UIStyle: MINI_MAP_STYLES;
    iconSelected: Icon;
    enemyColor: string;
    teamColor: string;
    uploadedMapImg: string;
    useMiniMapCamera: boolean;
}

export interface IItemButtonInterface {
    UITag: UI_ITEM_BUTTON_TYPES;
    fontFamily: FONT_FAMILIES;
    fontSize: number;
    fontColor: string;
    maxAmount: string;
}

export interface Icon {
    src: any;
    alt: string;
    maxWidth?: string;
}

export enum START_MENU_BUTTON_TYPES {
    START_GAME = "Start Game",
    SETTINGS = "Settings",
    MULTIPLAYER = "Multiplayer",
    LOAD_GAME = "Load Game",
    NEW_GAME = "New Game",
    QUIT = "End Game",
}

export enum UI_COMPONENT_TYPES {
    Collectable = "Collectable",
    // Weapon = "Weapon",
    // Ammo = "Ammo",
    Health = "Health",
    Lives = "Lives",
    Score = "Score",
    Timer = "Timer",
}

export enum UI_ITEM_BUTTON_TYPES {
    WEAPON = "Weapon",
    HEALTH = "Health",
    AMMO = "Ammo",
}

export enum MINI_MAP_STYLES {
    DARK_VERSION = "Dark Version",
    LIGHT_VERSION = "Light Version",
}

export enum START_MENU_IDS {
    LOGO_LEFT = "start-menu-game-logo-left",

    MENU_BG = "start-menu-game-menu-bg",
    PANEL_BG = "start-menu-game-panel-bg",

    GAME_BUTTON_LEFT_1 = "start-menu-game-button-column-left-1",
    GAME_BUTTON_LEFT_2 = "start-menu-game-button-column-left-2",
    GAME_BUTTON_LEFT_3 = "start-menu-game-button-column-left-3",
    GAME_BUTTON_LEFT_4 = "start-menu-game-button-column-left-4",
    GAME_BUTTON_LEFT_5 = "start-menu-game-button-column-left-5",

    MENU_MUSIC = "menu_music",
}

export enum IN_GAME_MENU_IDS {
    LOGO_LEFT = "in-game-menu-game-logo-left",

    MENU_BG = "in-game-menu-game-menu-bg",
    PANEL_BG = "in-game-menu-game-panel-bg",

    GAME_BUTTON_LEFT_1 = "in-game-menu-game-button-column-left-1",
    GAME_BUTTON_LEFT_2 = "in-game-menu-game-button-column-left-2",
    GAME_BUTTON_LEFT_3 = "in-game-menu-game-button-column-left-3",
    GAME_BUTTON_LEFT_4 = "in-game-menu-game-button-column-left-4",
    GAME_BUTTON_LEFT_5 = "in-game-menu-game-button-column-left-5",

    MENU_MUSIC = "in-game-menu-menu_music",
}

export enum GAME_HUD_IDS {
    COMPONENT_LEFT_1 = "game-hud-component-left-1",
    COMPONENT_LEFT_2 = "game-hud-component-left-2",

    COMPONENT_MID_1 = "game-hud-component-mid-1",

    COMPONENT_RIGHT_1 = "game-hud-component-right-1",
    COMPONENT_RIGHT_2 = "game-hud-component-right-2",

    BANNER = "game-hud-banner",

    MINI_MAP_LEFT = "game-hud-mini-map-left",
    MINI_MAP_RIGHT = "game-hud-mini-map-right",

    ITEM_1 = "game-hud-item-1",
    ITEM_2 = "game-hud-item-2",
    ITEM_3 = "game-hud-item-3",
    ITEM_4 = "game-hud-item-4",
    ITEM_5 = "game-hud-item-5",
}

export type StartGameMenuDataType = {
    [key in START_MENU_IDS]?: null | string | IGameButtonInterface | FileData;
};
export type InGameMenuDataType = {
    [key in IN_GAME_MENU_IDS]?: null | string | IGameButtonInterface | FileData;
};
