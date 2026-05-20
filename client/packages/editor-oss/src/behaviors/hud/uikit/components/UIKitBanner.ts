/**
 * UIKit replacement for CustomBanner.tsx
 * Renders centered styled text for game-over banners, announcements, etc.
 */
import {Container, Text} from "@ni2khanna/uikit";

import {IBannerInterface} from "@stem/editor-oss/editor/assets/v2/HUD/HUDEditView/types";
import {HUD_UIKIT_FONT_FAMILIES, resolveUIKitFontFamily} from "../fonts";
import {cssColorToHex} from "../utils";

export class UIKitBanner {
    readonly container: Container;
    private label: Text;

    constructor(style: IBannerInterface, text?: string) {
        this.container = new Container({
            width: "100%",
            height: 162,
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "none",
            fontFamilies: HUD_UIKIT_FONT_FAMILIES,
        });

        this.label = new Text({
            text: text || style.UITag || "",
            fontSize: style.fontSize || 32,
            color: cssColorToHex(style.fontColor),
            fontFamily: resolveUIKitFontFamily(style.fontFamily),
            fontFamilies: HUD_UIKIT_FONT_FAMILIES,
            textAlign: "center",
        });
        this.container.add(this.label);
    }

    setText(text: string) {
        this.label.setProperties({text});
    }

    dispose() {
        this.container.dispose();
    }
}
