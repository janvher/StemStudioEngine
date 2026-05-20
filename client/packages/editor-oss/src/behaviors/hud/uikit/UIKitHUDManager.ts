/**
 * UIKit HUD Manager - Drop-in replacement for HUDManager.tsx
 * Uses UIKit Three.js components instead of React DOM.
 * Same interface: create(), clear(), loadSounds(), playSound(), stopSound(), clearSounds()
 */
import * as THREE from "three";

import {UIKitHUDRenderer} from "./UIKitHUDRenderer";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import {ISoundSettings} from "@stem/editor-oss/types/editor";
import GameManager from "../../game/GameManager";
import {SoundManager} from "../SoundManager";
import {IHUDManager} from "../IHUDManager";

class UIKitHUDManager implements IHUDManager {
    scene: THREE.Scene;
    soundManager: SoundManager;
    app: EngineRuntime | null = null;
    private renderer: UIKitHUDRenderer | null = null;
    private game: GameManager | null = null;
    private popstateHandler?: () => void;

    constructor(scene: THREE.Scene, game?: GameManager) {
        this.scene = scene;
        this.soundManager = new SoundManager(scene);
        this.app = global.app;
        this.game = game ?? null;
    }

    create(emptyHUD = false) {
        if (!this.game) {
            console.warn("UIKitHUDManager: No game reference, cannot create HUD");
            return;
        }
        this.renderer = new UIKitHUDRenderer(this.scene, this.game);
        this.renderer.show(emptyHUD);

        if (!this.popstateHandler) {
            this.popstateHandler = () => {
                this.clear();
            };
            window.addEventListener("popstate", this.popstateHandler);
        }
    }

    clear() {
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        if (this.popstateHandler) {
            window.removeEventListener("popstate", this.popstateHandler);
            this.popstateHandler = undefined;
        }
        this.soundManager.clearLoadedSounds();
    }

    update(delta: number) {
        this.renderer?.update(delta);
    }

    loadSounds(sounds: ISoundSettings[]) {
        if (sounds) {
            this.soundManager.loadSounds(sounds);
        }
    }

    stopSound(soundId: string) {
        if (soundId) {
            this.soundManager.stopSound(soundId);
        }
    }

    playSound(id: string) {
        this.soundManager.playSound(id);
    }

    clearSounds() {
        this.soundManager.clearLoadedSounds();
    }
}

export default UIKitHUDManager;
