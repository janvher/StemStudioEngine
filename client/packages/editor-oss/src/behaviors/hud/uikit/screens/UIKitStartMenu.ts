/**
 * UIKit replacement for GameStartView.tsx
 * Renders the start menu screen: logo + 5 buttons + loading spinner.
 */
import {Container, Image, Text} from "@ni2khanna/uikit";

import {
    IGameButtonInterface,
    START_MENU_IDS,
    StartGameMenuDataType,
} from "@stem/editor-oss/editor/assets/v2/HUD/HUDEditView/types";
import {checkIfQuitBtn, checkIfStartBtn} from "@stem/editor-oss/editor/assets/v2/HUD/HUDView/services";
import EventBus from "../../../event/EventBus";
import {UIKitButton} from "../components/UIKitButton";
import {UIKitLogo} from "../components/UIKitLogo";
import {HUD_UIKIT_FONT_FAMILIES, resolveUIKitFontFamily} from "../fonts";
import {cssColorToHex} from "../utils";


export class UIKitStartMenu {
    readonly container: Container;
    private buttons: UIKitButton[] = [];
    private logo?: UIKitLogo;
    private loadingOverlay?: Container;
    private isLoading = false;

    constructor(startUI: StartGameMenuDataType) {
        const isImageSrc = (value?: string): boolean =>
            !!value && /^(https?:\/\/|data:|blob:|\/)/.test(value);

        // Grid-like centered layout
        this.container = new Container({
            width: "100%",
            height: "100%",
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "auto",
            fontFamilies: HUD_UIKIT_FONT_FAMILIES,
        });

        const menuBg = startUI[START_MENU_IDS.MENU_BG] as string | undefined;
        if (menuBg) {
            const bgImage = new Image({
                src: menuBg,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                pointerEvents: "none",
                positionType: "absolute",
                positionTop: 0,
                positionLeft: 0,
            });
            this.container.add(bgImage);
        }

        // Panel column
        const panelBg = startUI[START_MENU_IDS.PANEL_BG] as string | undefined;
        const panelBgIsImage = isImageSrc(panelBg);
        const column = new Container({
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            padding: 24,
            borderRadius: 12,
            pointerEvents: "auto",
            ...(panelBg
                ? (panelBgIsImage ? {} : {backgroundColor: cssColorToHex(panelBg), opacity: "100%"})
                : {backgroundColor: 0x000000, opacity: "50%"}),
        });
        this.container.add(column);

        if (panelBg && panelBgIsImage) {
            const panelImage = new Image({
                src: panelBg,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                pointerEvents: "none",
                positionType: "absolute",
                positionTop: 0,
                positionLeft: 0,
            });
            column.add(panelImage);
        }

        // Logo
        const logoData = startUI[START_MENU_IDS.LOGO_LEFT];
        if (logoData) {
            const logoUrl = startUI[START_MENU_IDS.LOGO_LEFT] as string;
            this.logo = new UIKitLogo(logoUrl);
            column.add(this.logo.container);
        }

        // 5 buttons
        for (let i = 1; i <= 5; i++) {
            const id = `start-menu-game-button-column-left-${i}` as START_MENU_IDS;
            const styleData = startUI[id] as IGameButtonInterface | undefined;
            if (!styleData) continue;

            const isDisabled = this.isLoading || checkIfQuitBtn(styleData.UIButtonType);
            const button = new UIKitButton(
                styleData,
                () => this.handleButtonClick(styleData),
                () => this.handleHover(styleData),
                {disabled: isDisabled},
            );
            this.buttons.push(button);
            column.add(button.container);
        }

        // Loading overlay (hidden by default)
        this.loadingOverlay = new Container({
            positionType: "absolute",
            positionTop: 0,
            positionLeft: 0,
            width: "100%",
            height: "100%",
            backgroundColor: 0x000000,
            opacity: "70%",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: 20,
            visibility: "hidden",
        });
        this.container.add(this.loadingOverlay);

        const loadingText = new Text({
            text: "Loading...",
            fontSize: 20,
            fontFamily: resolveUIKitFontFamily("inter"),
            fontFamilies: HUD_UIKIT_FONT_FAMILIES,
            color: 0xffffff,
        });
        this.loadingOverlay.add(loadingText);
    }

    private handleButtonClick(style: IGameButtonInterface) {
        if (this.isLoading) return;

        const clickSound = style.clickSound;
        const btn = style.UIButtonType;
        console.warn(`[UIKitStartMenu] button clicked: type="${btn}"`);

        if (clickSound) {
            EventBus.instance.send("game.playSound", clickSound.ID);
        }

        if (checkIfStartBtn(btn)) {
            console.warn("[UIKitStartMenu] → sending game.start");
            this.isLoading = true;
            this.showLoading(true);
            EventBus.instance.send("game.start");
            EventBus.instance.send("game.clear_sounds");
        } else if (checkIfQuitBtn(btn)) {
            console.warn("[UIKitStartMenu] → quit (not implemented)");
        }
    }

    private handleHover(style: IGameButtonInterface) {
        const hoverSound = style.hoverSound;
        if (hoverSound) {
            EventBus.instance.send("game.playSound", hoverSound.ID);
        }
    }

    private showLoading(show: boolean) {
        this.loadingOverlay?.setProperties({visibility: show ? "visible" : "hidden"});
        // Disable buttons during loading
        this.buttons.forEach(btn => {
            btn.container.setProperties({pointerEvents: show ? "none" : "auto"});
        });
    }

    dispose() {
        this.buttons.forEach(btn => btn.dispose());
        this.logo?.dispose();
        this.container.dispose();
    }
}
