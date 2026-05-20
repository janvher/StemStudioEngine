/**
 * UIKit replacement for InGameView.tsx
 * Renders the pause/in-game menu: logo + 5 buttons (with "Resume Game" for start button).
 */
import {Container, Image} from "@ni2khanna/uikit";

import {
    IGameButtonInterface,
    IN_GAME_MENU_IDS,
    InGameMenuDataType,
} from "@stem/editor-oss/editor/assets/v2/HUD/HUDEditView/types";
import {checkIfQuitBtn, checkIfStartBtn} from "@stem/editor-oss/editor/assets/v2/HUD/HUDView/services";
import EventBus from "../../../event/EventBus";
import {UIKitButton} from "../components/UIKitButton";
import {UIKitLogo} from "../components/UIKitLogo";
import {HUD_UIKIT_FONT_FAMILIES} from "../fonts";
import {cssColorToHex} from "../utils";

export class UIKitInGameMenu {
    readonly container: Container;
    private buttons: UIKitButton[] = [];
    private logo?: UIKitLogo;

    constructor(
        inGameUI: InGameMenuDataType,
        private onResume: () => void,
    ) {
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

        const menuBg = inGameUI[IN_GAME_MENU_IDS.MENU_BG] as string | undefined;
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
        const panelBg = inGameUI[IN_GAME_MENU_IDS.PANEL_BG] as string | undefined;
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
        if (inGameUI?.["in-game-menu-game-logo-left" as IN_GAME_MENU_IDS]) {
            const logoUrl = inGameUI[IN_GAME_MENU_IDS.LOGO_LEFT] as string;
            this.logo = new UIKitLogo(logoUrl);
            column.add(this.logo.container);
        }

        // 5 buttons
        for (let i = 1; i <= 5; i++) {
            const id = `in-game-menu-game-button-column-left-${i}` as IN_GAME_MENU_IDS;
            const styleData = inGameUI[id] as IGameButtonInterface | undefined;
            if (!styleData) continue;

            const isStartBtn = checkIfStartBtn(styleData.UIButtonType);
            const isDisabled = checkIfQuitBtn(styleData.UIButtonType);

            const button = new UIKitButton(
                styleData,
                () => this.handleButtonClick(styleData),
                () => this.handleHover(styleData),
                {
                    customText: isStartBtn ? "Resume Game" : undefined,
                    disabled: isDisabled,
                },
            );
            this.buttons.push(button);
            column.add(button.container);
        }
    }

    private handleButtonClick(style: IGameButtonInterface) {
        const clickSound = style.clickSound;
        const btn = style.UIButtonType;
        console.warn(`[UIKitInGameMenu] button clicked: type="${btn}"`);

        if (clickSound) {
            EventBus.instance.send("game.playSound", clickSound.ID);
        }

        if (checkIfStartBtn(btn)) {
            console.warn("[UIKitInGameMenu] → sending game.resume");
            EventBus.instance.send("game.resume");
            EventBus.instance.send("game.clear_sounds");
            this.onResume();
        } else if (checkIfQuitBtn(btn)) {
            console.warn("[UIKitInGameMenu] → quit (not implemented)");
        }
    }

    private handleHover(style: IGameButtonInterface) {
        const hoverSound = style.hoverSound;
        if (hoverSound) {
            EventBus.instance.send("game.playSound", hoverSound.ID);
        }
    }

    dispose() {
        this.buttons.forEach(btn => btn.dispose());
        this.logo?.dispose();
        this.container.dispose();
    }
}
