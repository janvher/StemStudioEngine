/**
 * UIKit replacement for Score, Timer, Lives, Collectable from CustomComponent.tsx
 * Renders an icon + text display for game stats.
 */
import {Container, Image, Text} from "@ni2khanna/uikit";

import {IComponentInterface, UI_COMPONENT_TYPES} from "@stem/editor-oss/editor/assets/v2/HUD/HUDEditView/types";
import {HUD_UIKIT_FONT_FAMILIES, resolveUIKitFontFamily} from "../fonts";
import {cssColorToHex} from "../utils";

export class UIKitStatDisplay {
    readonly container: Container;
    private valueText: Text;
    readonly type: UI_COMPONENT_TYPES;
    private lastText?: string;

    constructor(style: IComponentInterface) {
        this.type = style.UIType;

        this.container = new Container({
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            width: 285,
            height: 27,
            pointerEvents: "none",
            fontFamilies: HUD_UIKIT_FONT_FAMILIES,
        });

        // Icon
        if (style.iconSelected) {
            const icon = new Image({
                src: style.iconSelected.src,
                width: 24,
                height: 24,
                objectFit: "cover",
            });
            this.container.add(icon);
        }

        // Value text
        this.valueText = new Text({
            text: this.getDefaultText(),
            fontSize: style.fontSize || 14,
            color: cssColorToHex(style.fontColor),
            fontFamily: resolveUIKitFontFamily(style.fontFamily),
            fontFamilies: HUD_UIKIT_FONT_FAMILIES,
        });
        this.container.add(this.valueText);
    }

    private getDefaultText(): string {
        switch (this.type) {
            case UI_COMPONENT_TYPES.Score:
                return "0";
            case UI_COMPONENT_TYPES.Timer:
                return "00:00:00";
            case UI_COMPONENT_TYPES.Lives:
                return "0/0";
            case UI_COMPONENT_TYPES.Collectable:
                return "0";
            default:
                return "";
        }
    }

    updateScore(score: number) {
        this.setText(`${score}`);
    }

    updateTimer(timeRemaining: string) {
        this.setText(timeRemaining);
    }

    updateLives(current: number, total: number) {
        this.setText(`${current}/${total}`);
    }

    updateCollectable(value: number) {
        this.setText(`${value}`);
    }

    private setText(nextText: string) {
        if (this.lastText === nextText) {
            return;
        }
        this.lastText = nextText;
        this.valueText.setProperties({text: nextText});
    }

    dispose() {
        this.container.dispose();
    }
}
