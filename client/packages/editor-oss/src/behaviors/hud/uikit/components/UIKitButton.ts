/**
 * UIKit replacement for CustomGameButton.tsx
 * Renders a styled button with optional icon and text label.
 * Supports hover, active (pressed), and click animation states.
 */
import {Container, Image, Text} from "@ni2khanna/uikit";

import {IGameButtonInterface} from "@stem/editor-oss/editor/assets/v2/HUD/HUDEditView/types";
import {HUD_UIKIT_FONT_FAMILIES, resolveUIKitFontFamily} from "../fonts";
import {cssColorToHex} from "../utils";

export class UIKitButton {
    readonly container: Container;
    private label: Text;
    private clickAnimTimeout?: ReturnType<typeof setTimeout>;
    private originalTextColor: number;

    constructor(
        style: IGameButtonInterface,
        onClick: () => void,
        onHover?: () => void,
        opts?: {customText?: string; disabled?: boolean},
    ) {
        const hasImage = !!style.uploadedButtonImg;
        const bgColor = cssColorToHex(style.buttonColor);
        const borderRadius = style.radius ?? 8;
        const buttonLabel = (opts?.customText || style.UIButtonType || "").toUpperCase();
        this.originalTextColor = cssColorToHex(style.fontColor);

        this.container = new Container({
            width: 285,
            height: 32,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-start",
            borderRadius,
            overflow: "hidden",
            cursor: opts?.disabled ? "default" : "pointer",
            pointerEvents: opts?.disabled ? "none" : "auto",
            ...(hasImage ? {} : {backgroundColor: bgColor}),
            hover: opts?.disabled
                ? undefined
                : {
                      opacity: 0.85,
                      transformScaleX: 1.02,
                      transformScaleY: 1.02,
                  },
            active: opts?.disabled
                ? undefined
                : {
                      opacity: 0.7,
                      transformScaleX: 0.96,
                      transformScaleY: 0.96,
                  },
            onPointerDown: opts?.disabled
                ? undefined
                : () => {
                      console.warn(`[UIKitButton] clicked: "${buttonLabel}"`);
                      this.playClickAnimation(() => onClick());
                  },
            onPointerEnter: onHover ? () => onHover() : undefined,
            fontFamilies: HUD_UIKIT_FONT_FAMILIES,
        } as any);

        // Button image background
        if (hasImage) {
            const bgImage = new Image({
                src: style.uploadedButtonImg!,
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

        // Icon section
        if (style.iconSelected) {
            const iconWrap = new Container({
                width: 54,
                height: "100%",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: 0x222538,
                pointerEvents: "none",
            });
            const icon = new Image({
                src: style.iconSelected.src,
                width: 20,
                height: 20,
                objectFit: "cover",
            });
            iconWrap.add(icon);
            this.container.add(iconWrap);
        }

        const textWrap = new Container({
            flexGrow: 1,
            height: "100%",
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "none",
            fontFamilies: HUD_UIKIT_FONT_FAMILIES,
        });

        // Text label
        this.label = new Text({
            text: buttonLabel,
            fontSize: style.fontSize || 14,
            color: this.originalTextColor,
            fontFamily: resolveUIKitFontFamily(style.fontFamily),
            fontFamilies: HUD_UIKIT_FONT_FAMILIES,
            textAlign: "center",
        });
        textWrap.add(this.label);
        this.container.add(textWrap);
    }

    /**
     * Brief scale-down pulse + text color darken to give visual click feedback.
     * @param onComplete
     */
    private playClickAnimation(onComplete?: () => void) {
        // Scale down + darken text
        this.container.setProperties({
            transformScaleX: 0.92,
            transformScaleY: 0.92,
        });
        this.label.setProperties({color: 0x888888});

        // Scale back + restore text color after a short delay, then fire callback
        this.clickAnimTimeout = setTimeout(() => {
            this.container.setProperties({
                transformScaleX: 1,
                transformScaleY: 1,
            });
            this.label.setProperties({color: this.originalTextColor});
            this.clickAnimTimeout = undefined;
            onComplete?.();
        }, 150);
    }

    setVisible(visible: boolean) {
        this.container.setProperties({visibility: visible ? "visible" : "hidden"});
    }

    dispose() {
        if (this.clickAnimTimeout) {
            clearTimeout(this.clickAnimTimeout);
        }
        this.container.dispose();
    }
}
