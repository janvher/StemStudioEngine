//This class integrates the game with 2D screen elements it keeps score
//based on coins, stars and keys quickest solution I could come up with
//with the latest time frame changes for game concepts
//It also implements a small game flow that allows players to win even
//if they do not get all the coins but find the key

import {QueryClientProvider} from "@tanstack/react-query";
import {Root, createRoot} from "react-dom/client";

import {SoundManager} from "./SoundManager";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {SceneAssetResolutionProvider} from "@stem/editor-oss/context/SceneAssetResolutionContext";
import {HUDView} from "@stem/editor-oss/editor/assets/v2/HUD/HUDView/HUDView";
import {getZIndexWithinHUD, HUD_Z_INDEX} from "@stem/editor-oss/editor/assets/v2/HUD/HUDView/services";
import global from "@stem/editor-oss/global";
import {queryClient} from "@web-shared/queryClient";
import {ISoundSettings} from "@stem/editor-oss/types/editor";
import {IHUDManager} from "./IHUDManager";

class HUDManager implements IHUDManager {
    scene: any = null;
    containerId: string = "";
    soundManager: SoundManager;
    private hudRoot: Root | null = null;
    engine: EngineRuntime | null = null;

    constructor(scene: any) {
        this.scene = scene;
        this.containerId = "hud-view-container";
        this.hudRoot = null;

        //expose clear sounds and clear score divs to playSrc menu
        this.soundManager = new SoundManager(scene);
        this.engine = global.app;
    }

    create(emptyHUD = false) {
        const hudContainer = document.createElement("div");
        hudContainer.setAttribute("id", this.containerId);
        hudContainer.style.position = "absolute";
        hudContainer.style.left = "env(safe-area-inset-left)";
        hudContainer.style.right = "env(safe-area-inset-right)";
        hudContainer.style.top = "env(safe-area-inset-top)";
        hudContainer.style.bottom = "env(safe-area-inset-bottom)";

        hudContainer.style.zIndex = `${getZIndexWithinHUD(HUD_Z_INDEX.HUDBase, 10)}`;
        hudContainer.style.pointerEvents = "none";

        this.hudRoot = createRoot(hudContainer);
        this.hudRoot.render(
            <QueryClientProvider client={queryClient}>
                <SceneAssetResolutionProvider>
                    <HUDView emptyHUD={emptyHUD} />
                </SceneAssetResolutionProvider>
            </QueryClientProvider>,
        );

        this.engine?.container.append(hudContainer);

        window.addEventListener("popstate", () => {
            this.clear();
        });
    }

    clear() {
        if (this.hudRoot) {
            this.hudRoot.unmount();
            this.hudRoot = null;
        }

        const hudContainer = document.getElementById(this.containerId);
        if (hudContainer) {
            hudContainer.remove();
        }

        this.soundManager.clearLoadedSounds();
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

export default HUDManager;
