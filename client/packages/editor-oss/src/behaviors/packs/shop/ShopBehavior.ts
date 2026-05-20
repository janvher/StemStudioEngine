import * as THREE from "three";

import { AssetRef } from '@stem/editor-oss/asset-management/AssetRef';
import { PrefabManager } from "@stem/editor-oss/prefab/PrefabManager";
import { COLLISION_TYPE } from "@stem/editor-oss/types/editor";
import { BehaviorBase } from "../../Behavior";
import CollisionDetector from "../../collisions/CollisionDetector";
import GameManager from "../../game/GameManager";

class ShopBehavior extends BehaviorBase {
    teleportTargetUuid?: string;

    private game?: GameManager;
    private prefabManager?: PrefabManager;
    private collisionDetector?: CollisionDetector;
    private listenerId?: string;
    private isMenuOpen: boolean = false;

    init(game: GameManager) {
        this.game = game;
        this.prefabManager = game.prefabManager;
        this.collisionDetector = game.collisionDetector;
        this.physics = game.collisionDetector?.physics;
    }

    onAdded() {
        this.addCollisionListener();
        this.preloadPrefabs();
    }

    onRemoved(): void {
        this.removeCollisionListener();
    }

    onReset() { }

    preloadPrefabs(): void {
        if (!this.target?.userData?.behaviors || !this.prefabManager || !this.game?.scene) return;

        const shopEntries = Object.values(this.target.userData.behaviors);
        const prefabRefs: AssetRef[] = [];

        shopEntries.forEach((shop: any) => {
            if (shop.attributesData?.items) {
                shop.attributesData.items.forEach((item: any) => {
                    if (item?.itemId) {
                        prefabRefs.push(item.itemId);
                    }
                });
            }
        });

        for (const prefabRef of prefabRefs) {
            void this.prefabManager.preloadPrefab(prefabRef);
        }
    }

    onCollision() {}

    update() {
        if (!this.game?.player || !this.target) return;

        const playerBox = new THREE.Box3().setFromObject(this.game.player);
        const targetBox = new THREE.Box3().setFromObject(this.target);

        if (playerBox.intersectsBox(targetBox)) {
            if (!this.isMenuOpen) {
                this.createShopMenu();
                this.isMenuOpen = true;
            }
        } else {
            if (this.isMenuOpen) {
                const menu = document.getElementById('shopMenu');
                if (menu) {
                    menu.remove();
                }
                this.isMenuOpen = false;
            }
        }
    }

    //TODO some ideas - in next version replace the html with 
    //template snippets for the user to select their own layout
    createShopMenu() {
        if (document.getElementById('shopMenu')) return;

        let shopDataHtml = "<p>No shop items available</p>";
        let introDialogHtml = "<p>No introduction available.</p>";
        let shopImageUrl = "data:image/svg+xml;charset=UTF-8," +
            encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#18181b" stroke="#3f3f46" stroke-width="2"/><text x="50" y="50" font-family="Arial" font-size="12" fill="#71717a" text-anchor="middle" dominant-baseline="middle">No Image</text></svg>`);

        // FIXME: refactor this in more readable and maintainable way, less branching, functions and dont use userData, only attributes from behaviors
        if (this.target && this.target.userData?.behaviors) {
            const shopEntries = Object.values(this.target.userData.behaviors);
            let rowItems: string[] = [];
            let itemsHtml = "";

            shopEntries.forEach((shop: any) => {
                if (shop.attributesData?.introDialog) {
                    introDialogHtml = `<p>${shop.attributesData.introDialog}</p>`;
                }

                if (shop.attributesData?.shopImage) {
                    shopImageUrl = shop.attributesData.shopImage;
                }

                if (shop.attributesData?.items) { 
                    shop.attributesData.items.forEach((item: any) => {
                        if (!item?.itemId) return;

                        const displayName = item.itemDisplayName;
                        const imageUrl = "data:image/svg+xml;charset=UTF-8," +
                            encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#18181b" stroke="#3f3f46" stroke-width="2"/><text x="50" y="50" font-family="Arial" font-size="12" fill="#71717a" text-anchor="middle" dominant-baseline="middle">No Image</text></svg>`);

                        const paymentImageUrl = "data:image/svg+xml;charset=UTF-8," +
                            encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15"><rect width="15" height="15" fill="transparent" stroke="white" stroke-width="1"/></svg>`);

                        rowItems.push(`
                        <div style="width: 125px; display: flex; flex-direction: column; margin: 3px; text-align: left; padding: 0px; border-radius: 15px; border: 0px solid transparent; background: #27272a;">
                            <div style="width: 100%; height: 100px; overflow: hidden; background: transparent; border-radius: 15px 15px 0 0;">
                                <img src="${imageUrl}" alt="${displayName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 15px 15px 0 0;">
                            </div>
                            <span style="margin-top: 10px; padding-left: 8px; padding-left: 8px">${displayName} </span>
                            <div style="display: flex; align-items: left; gap: 5px; margin-top: 10px; padding-left: 8px; padding-bottom: 8px">
                                <img src="${paymentImageUrl}" alt="Payment" style="width: 25px; height: 25px; border-radius: 0px; border: 0px;">
                                <span>${item.price ?? "N/A"}</span>
                            </div>
                        </div>`);

                        if (rowItems.length === 6) { 
                            itemsHtml += `<div style="display: flex; justify-content: flex-start; gap: 10px; margin-bottom: 10px;">${rowItems.join("")}</div>`;
                            rowItems = [];
                        }
                    });
                }
            });

            // Make sure to fill in empty items if the last row has fewer than 6 items
            if (rowItems.length > 0) {
                while (rowItems.length < 6) {
                    rowItems.push(`
                    <div style="width: 125px; display: flex; flex-direction: column; align-items: center; margin: 3px; text-align: center; padding: 10px; border-radius: 15px; border: 2px solid transparent; background: #27272a;">
                        <div style="width: 100px; height: 100px; overflow: hidden; background: transparent;"></div>
                    </div>
                `);
                }
                itemsHtml += `<div style="display: flex; justify-content: flex-start; gap: 10px; margin-bottom: 10px;">${rowItems.join("")}</div>`;
            }

            if (itemsHtml) {
                shopDataHtml = `<div style="display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 10px; width: 100%;">${itemsHtml}</div>`;
            }
        }

        const menu = document.createElement('div');
        menu.id = 'shopMenu';
        menu.innerHTML = `
         <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #202020; color: white; padding: 10px; display: flex; flex-direction: column; border-radius: 10px; z-index: 1000; border: 2px solid #202020; box-sizing: border-box; max-height: 80vh; overflow-y: auto;">

            <!-- Image and Intro Dialog Section -->
            <div style="display: flex; align-items: flex-start; gap: 10px; background: #27272a; padding: 10px; border-radius: 10px; margin-bottom: 10px; width: calc(3 * 130px + 2 * 10px);">
                <div style="display: flex; align-items: flex-start; gap: 10px;">
                    <img src="${shopImageUrl}" alt="Shop Image" style="width: 100px; height: 100px; object-fit: cover; border-radius: 10px; border: 0px solid white;">
                    <div style="flex-grow: 1; text-align: left; color: white; display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start;">
                        ${introDialogHtml}
                    </div>
                </div>
            </div>

            <!-- Scrollable Shop Items Section (Vertical Scroll Only) -->
            <div style="flex-grow: 1; overflow-y: auto; overflow-x: hidden; margin-bottom: 10px;">
                ${shopDataHtml}
            </div>

            <!-- Buttons -->
            <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 10px 0 0;">
                <button style="background-color: blue; color: white; padding: 10px; border: none; border-radius: 5px; cursor: pointer;">REMAINING</button>
                <button style="background-color: #27272a; color: white; padding: 10px; border: none; border-radius: 5px; cursor: pointer;" onclick="document.getElementById('shopMenu')?.remove()">CANCEL</button>
            </div>
        </div>`;

        document.body.appendChild(menu);
    }

    addCollisionListener() {
        if (!this.collisionDetector || !this.target) {
            return;
        }

        this.listenerId = this.collisionDetector.addListener(
            this.target,
            {
                type: COLLISION_TYPE.WITH_PLAYER,
                callback: this.onCollision.bind(this),
                useBoundingBoxes: true,
            },
            true,
        );
    }

    removeCollisionListener() {
        if (!this.collisionDetector || !this.target || !this.listenerId) {
            return;
        }
        this.collisionDetector.deleteListener(this.target, this.listenerId);
        this.listenerId = undefined;
    }
}

export default ShopBehavior;
