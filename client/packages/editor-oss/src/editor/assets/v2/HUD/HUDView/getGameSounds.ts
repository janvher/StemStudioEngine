import {getAssetDerivatives} from "@stem/network/api/asset";
import {ISoundSettings} from "@stem/editor-oss/types/editor";
import {FileData} from "../../types/file";
import {IN_GAME_MENU_IDS, START_MENU_IDS} from "../HUDEditView/types";

export const getSoundsFromUI = async (gameUI: any, isStartMenu: boolean, pauseMenu?: boolean): Promise<ISoundSettings[]> => {
    const soundsArr: ISoundSettings[] = [];
    for (const key in gameUI) {
        const item = gameUI[key];
        if (item && typeof item !== "string") {
            // Check if it's an object and has hoverSound or clickSound
            if (item && "hoverSound" in item && item.hoverSound) {
                const sound = item.hoverSound;
                soundsArr.push({id: sound.ID, url: sound.Url, loop: false, volume: 0.1, soundType: ""});
            }
            if (item && "clickSound" in item && item.clickSound) {
                const sound = item.clickSound;
                soundsArr.push({id: sound.ID, url: sound.Url, loop: false, volume: 0.1, soundType: ""});
            }
        }
    }

    if (isStartMenu || pauseMenu) {
        const menuMusic = gameUI[pauseMenu ? IN_GAME_MENU_IDS.MENU_MUSIC : START_MENU_IDS.MENU_MUSIC] as FileData;
        if (menuMusic) {
            let url = "";
            if ((menuMusic as any).NewApi) {
                const derivatives = await getAssetDerivatives(menuMusic.ID, (menuMusic as any).headRevisionId, {
                    includeDataUrl: true,
                });
                url = derivatives[0]?.dataUrl || "";
            } else {
                url = menuMusic.Url;
            }
            soundsArr.push({
                id: menuMusic.ID,
                url,
                loop: true,
                volume: 0.1,
                soundType: "menu-background",
            });
        }
    }

    // Remove duplicates based on sound ID
    const uniqueSoundsArr = Array.from(new Map(soundsArr.map(sound => [sound.id, sound])).values());

    return uniqueSoundsArr;
};
