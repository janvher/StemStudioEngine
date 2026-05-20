/**
 * UIKit replacement for Health component from CustomComponent.tsx
 * Renders a health bar with icon, fill bar, and percentage text.
 */
import {Container, Image, Text} from "@ni2khanna/uikit";

import {IComponentInterface} from "@stem/editor-oss/editor/assets/v2/HUD/HUDEditView/types";
import {HUD_UIKIT_FONT_FAMILIES, resolveUIKitFontFamily} from "../fonts";
import {cssColorToHex} from "../utils";

const BAR_WIDTH = 200;

export class UIKitHealthBar {
    readonly container: Container;
    private fill: Container;
    private label: Text;
    private lastFillWidth?: number;
    private lastLabelText?: string;

    constructor(style: IComponentInterface) {
        const barColor = cssColorToHex(style.barColor);
        const fillColor = cssColorToHex(style.statBarColor);
        const borderRadius = style.radius ?? 8;

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

        // Bar background
        const barBg = new Container({
            width: BAR_WIDTH,
            height: 20,
            backgroundColor: barColor,
            borderRadius,
            overflow: "hidden",
            flexGrow: 1,
        });
        this.container.add(barBg);

        // Fill
        this.fill = new Container({
            width: BAR_WIDTH,
            height: "100%",
            backgroundColor: fillColor,
            borderRadius,
        });
        barBg.add(this.fill);

        // Percentage text overlay
        this.label = new Text({
            text: "100%",
            fontSize: style.fontSize || 12,
            color: cssColorToHex(style.fontColor),
            fontFamily: resolveUIKitFontFamily(style.fontFamily),
            fontFamilies: HUD_UIKIT_FONT_FAMILIES,
            positionType: "absolute",
            positionLeft: 0,
            positionTop: 0,
            width: "100%",
            height: "100%",
            textAlign: "center",
            verticalAlign: "center",
        });
        barBg.add(this.label);
    }

    update(current: number, max: number) {
        const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
        const pct = Math.floor(ratio * 100);
        const nextFillWidth = ratio * BAR_WIDTH;
        if (this.lastFillWidth !== nextFillWidth) {
            this.lastFillWidth = nextFillWidth;
            this.fill.setProperties({width: nextFillWidth});
        }

        const nextLabelText = `${pct}%`;
        if (this.lastLabelText !== nextLabelText) {
            this.lastLabelText = nextLabelText;
            this.label.setProperties({text: nextLabelText});
        }
    }

    dispose() {
        this.container.dispose();
    }
}
