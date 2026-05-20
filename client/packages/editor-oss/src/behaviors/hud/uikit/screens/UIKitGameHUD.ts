/**
 * UIKit replacement for GameHUDView.tsx
 * Renders the in-game HUD: health, score, timer, lives, mini-map, inventory items, banner.
 */
import {Container} from "@ni2khanna/uikit";

import {GameDataType} from "@stem/editor-oss/context/HUDGameContext";
import {
    GAME_HUD_IDS,
    IBannerInterface,
    IComponentInterface,
    IItemButtonInterface,
    IMiniMapInterface,
    UI_COMPONENT_TYPES,
    UI_ITEM_BUTTON_TYPES,
} from "@stem/editor-oss/editor/assets/v2/HUD/HUDEditView/types";
import {InGameData} from "@stem/editor-oss/editor/assets/v2/HUD/HUDView/types";
import {UIKitBanner} from "../components/UIKitBanner";
import {UIKitHealthBar} from "../components/UIKitHealthBar";
import {UIKitItemSlot} from "../components/UIKitItemSlot";
import {UIKitMiniMap} from "../components/UIKitMiniMap";
import {UIKitStatDisplay} from "../components/UIKitStatDisplay";
import {HUD_UIKIT_FONT_FAMILIES} from "../fonts";

interface HUDComponents {
    leftStats: (UIKitHealthBar | UIKitStatDisplay)[];
    rightStats: (UIKitHealthBar | UIKitStatDisplay)[];
    banner?: UIKitBanner;
    miniMapLeft?: UIKitMiniMap;
    miniMapRight?: UIKitMiniMap;
    items: UIKitItemSlot[];
    weaponButtonKeys: (GAME_HUD_IDS | null)[];
}

export class UIKitGameHUD {
    readonly container: Container;
    private components: HUDComponents;

    constructor(gameUI: GameDataType) {
        this.components = {
            leftStats: [],
            rightStats: [],
            items: [],
            weaponButtonKeys: [],
        };

        // Main 3-column layout
        this.container = new Container({
            width: "100%",
            height: "100%",
            flexDirection: "row",
            paddingTop: 24,
            paddingLeft: 10,
            paddingRight: 10,
            paddingBottom: 0,
            pointerEvents: "none",
            fontFamilies: HUD_UIKIT_FONT_FAMILIES,
        });

        // Left column
        const leftCol = new Container({
            flexGrow: 1,
            flexDirection: "column",
            gap: 16,
        });
        this.container.add(leftCol);

        // Center column
        const centerCol = new Container({
            flexGrow: 1,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingTop: 110,
        });
        this.container.add(centerCol);

        // Right column
        const rightCol = new Container({
            flexGrow: 1,
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 16,
        });
        this.container.add(rightCol);

        // Left stats (component-left-1, component-left-2)
        const leftStatsRow = new Container({flexDirection: "column", gap: 16});
        leftCol.add(leftStatsRow);
        for (let i = 1; i <= 2; i++) {
            const key = GAME_HUD_IDS[`COMPONENT_LEFT_${i}` as keyof typeof GAME_HUD_IDS];
            const style = gameUI[key] as IComponentInterface | undefined;
            if (!style) continue;
            const comp = this.createStatComponent(style);
            this.components.leftStats.push(comp);
            leftStatsRow.add(comp.container);
        }

        // Left mini-map
        const miniMapLeftStyle = gameUI[GAME_HUD_IDS.MINI_MAP_LEFT] as IMiniMapInterface | undefined;
        if (miniMapLeftStyle) {
            this.components.miniMapLeft = new UIKitMiniMap(miniMapLeftStyle);
            leftCol.add(this.components.miniMapLeft.container);
        }

        // Banner (center)
        const bannerStyle = gameUI[GAME_HUD_IDS.BANNER] as IBannerInterface | undefined;
        if (bannerStyle) {
            this.components.banner = new UIKitBanner(bannerStyle);
            this.components.banner.container.setProperties({visibility: "hidden"});
            centerCol.add(this.components.banner.container);
        }

        // Right stats (component-right-1, component-right-2)
        const rightStatsRow = new Container({flexDirection: "column", gap: 16, alignItems: "flex-end"});
        rightCol.add(rightStatsRow);
        for (let i = 1; i <= 2; i++) {
            const key = GAME_HUD_IDS[`COMPONENT_RIGHT_${i}` as keyof typeof GAME_HUD_IDS];
            const style = gameUI[key] as IComponentInterface | undefined;
            if (!style) continue;
            const comp = this.createStatComponent(style);
            this.components.rightStats.push(comp);
            rightStatsRow.add(comp.container);
        }

        // Right items (5 weapon/item slots)
        const itemsRow = new Container({
            flexDirection: "row",
            gap: 8,
            justifyContent: "flex-end",
            flexWrap: "wrap",
        });
        rightCol.add(itemsRow);

        const weaponKeys: (GAME_HUD_IDS | null)[] = [];
        for (let i = 1; i <= 5; i++) {
            const key = GAME_HUD_IDS[`ITEM_${i}` as keyof typeof GAME_HUD_IDS];
            const style = gameUI[key] as IItemButtonInterface | undefined;
            if (!style) continue;

            const slot = new UIKitItemSlot(style, i);
            this.components.items.push(slot);
            itemsRow.add(slot.container);

            if (style.UITag === UI_ITEM_BUTTON_TYPES.WEAPON) {
                weaponKeys.push(key);
            } else {
                weaponKeys.push(null);
            }
        }
        this.components.weaponButtonKeys = weaponKeys.filter(k => k !== null);

        // Right mini-map
        const miniMapRightStyle = gameUI[GAME_HUD_IDS.MINI_MAP_RIGHT] as IMiniMapInterface | undefined;
        if (miniMapRightStyle) {
            this.components.miniMapRight = new UIKitMiniMap(miniMapRightStyle);
            rightCol.add(this.components.miniMapRight.container);
        }
    }

    private createStatComponent(style: IComponentInterface): UIKitHealthBar | UIKitStatDisplay {
        if (style.UIType === UI_COMPONENT_TYPES.Health) {
            return new UIKitHealthBar(style);
        }
        return new UIKitStatDisplay(style);
    }

    showBanner(text: string) {
        if (this.components.banner) {
            this.components.banner.setText(text);
            this.components.banner.container.setProperties({visibility: "visible"});
        }
    }

    hideBanner() {
        this.components.banner?.container.setProperties({visibility: "hidden"});
    }

    update(gameData: InGameData) {
        // Update all left stats
        this.updateStatComponents(this.components.leftStats, gameData);
        // Update all right stats
        this.updateStatComponents(this.components.rightStats, gameData);

        // Update item slots
        this.components.items.forEach((slot, idx) => {
            const weaponIdx = this.components.weaponButtonKeys.indexOf(
                GAME_HUD_IDS[`ITEM_${idx + 1}` as keyof typeof GAME_HUD_IDS],
            );
            slot.update(gameData, weaponIdx >= 0 ? weaponIdx : undefined);
        });

        // Update mini-maps
        this.components.miniMapLeft?.update();
        this.components.miniMapRight?.update();
    }

    private updateStatComponents(stats: (UIKitHealthBar | UIKitStatDisplay)[], gameData: InGameData) {
        for (const comp of stats) {
            if (comp instanceof UIKitHealthBar) {
                comp.update(gameData.health, gameData.initialHealth);
            } else if (comp instanceof UIKitStatDisplay) {
                switch (comp.type) {
                    case UI_COMPONENT_TYPES.Score:
                        comp.updateScore(gameData.score);
                        break;
                    case UI_COMPONENT_TYPES.Timer:
                        comp.updateTimer(gameData.timeRemaining);
                        break;
                    case UI_COMPONENT_TYPES.Lives:
                        comp.updateLives(gameData.currentLives, gameData.totalLives);
                        break;
                    case UI_COMPONENT_TYPES.Collectable:
                        comp.updateScore(gameData.score);
                        break;
                }
            }
        }
    }

    dispose() {
        this.components.leftStats.forEach(c => c.dispose());
        this.components.rightStats.forEach(c => c.dispose());
        this.components.banner?.dispose();
        this.components.miniMapLeft?.dispose();
        this.components.miniMapRight?.dispose();
        this.components.items.forEach(s => s.dispose());
        this.container.dispose();
    }
}
