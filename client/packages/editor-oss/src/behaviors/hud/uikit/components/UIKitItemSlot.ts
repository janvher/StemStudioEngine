/**
 * UIKit replacement for CustomItemButton.tsx
 * Renders an inventory/weapon slot with item image, amount, and key number.
 */
import {Container, Image, Text} from "@ni2khanna/uikit";

import {IItemButtonInterface, UI_ITEM_BUTTON_TYPES} from "@stem/editor-oss/editor/assets/v2/HUD/HUDEditView/types";
import {InGameData} from "@stem/editor-oss/editor/assets/v2/HUD/HUDView/types";
import {HUD_UIKIT_FONT_FAMILIES, resolveUIKitFontFamily} from "../fonts";
import {cssColorToHex} from "../utils";

export class UIKitItemSlot {
    readonly container: Container;
    private itemImage: Image<any, any, any>;
    private amountText: Text;
    private selectBorder: Container;
    readonly isWeapon: boolean;
    private lastWeaponImage?: string;
    private lastItemImageVisible = false;
    private lastSelected = false;

    constructor(
        private style: IItemButtonInterface,
        private itemKey: number,
    ) {
        this.isWeapon = style.UITag === UI_ITEM_BUTTON_TYPES.WEAPON;

        this.container = new Container({
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            pointerEvents: "auto",
            fontFamilies: HUD_UIKIT_FONT_FAMILIES,
        });

        // Main slot container
        const slot = new Container({
            width: 109,
            height: 109,
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            backgroundColor: 0x333333,
            opacity: 0.5,
        });
        this.container.add(slot);

        // Item image (placeholder, updated via update())
        this.itemImage = new Image({
            width: "100%",
            height: "100%",
            objectFit: "cover",
            visibility: "hidden",
        });
        slot.add(this.itemImage);

        // Amount text (bottom-right)
        this.amountText = new Text({
            text: "",
            fontSize: style.fontSize || 14,
            color: cssColorToHex(style.fontColor),
            fontFamily: resolveUIKitFontFamily(style.fontFamily),
            fontFamilies: HUD_UIKIT_FONT_FAMILIES,
            positionType: "absolute",
            positionBottom: 8,
            positionRight: 8,
        });
        slot.add(this.amountText);

        // Selection border (hidden by default)
        this.selectBorder = new Container({
            width: 114,
            height: 114,
            borderWidth: 3,
            borderColor: 0xffffff,
            positionType: "absolute",
            positionTop: -3,
            visibility: "hidden",
        });
        this.container.add(this.selectBorder);

        // Key number label
        const keyLabel = new Text({
            text: `${itemKey}`,
            fontSize: style.fontSize || 20,
            color: cssColorToHex(style.fontColor),
            fontFamily: resolveUIKitFontFamily(style.fontFamily),
            fontFamilies: HUD_UIKIT_FONT_FAMILIES,
        });
        this.container.add(keyLabel);
    }

    update(gameData: InGameData, weaponIndex?: number) {
        if (!this.isWeapon) return;

        const weapons = gameData.playerWeapons;
        const currentItem = gameData.pickedWeaponOrItem;
        const weapon = weaponIndex !== undefined ? weapons?.[weaponIndex] : undefined;
        const weaponImage = weapon?.hudImage;

        // Update item image
        if (weaponImage) {
            if (this.lastWeaponImage !== weaponImage || !this.lastItemImageVisible) {
                this.lastWeaponImage = weaponImage;
                this.lastItemImageVisible = true;
                this.itemImage.setProperties({src: weaponImage, visibility: "visible"} as any);
            }
        } else if (this.lastItemImageVisible) {
            this.lastWeaponImage = undefined;
            this.lastItemImageVisible = false;
            this.itemImage.setProperties({visibility: "hidden"});
        }

        // Update selection border
        const isActive = !!currentItem?.userData?.ID && currentItem?.userData?.ID === weapon?.userData?.ID;
        if (this.lastSelected !== isActive) {
            this.lastSelected = isActive;
            this.selectBorder.setProperties({visibility: isActive ? "visible" : "hidden"});
        }
    }

    dispose() {
        this.container.dispose();
    }
}
