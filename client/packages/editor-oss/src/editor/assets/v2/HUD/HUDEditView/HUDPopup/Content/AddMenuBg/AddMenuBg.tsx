import {useEffect, useState} from "react";

import {useHUDContext, useHUDInGameMenuContext, useHUDStartGameMenuContext} from "@stem/editor-oss/context";
import {GAME_IMAGE_SIZE} from "@web-shared/editorConfig";
import {backendUrlFromPath} from "@stem/editor-oss/utils/UrlUtils";
import {UploadField} from "../../../../../common/UploadField/UploadField";
import {FileData} from "../../../../../types/file";
import {HUD_TABS, IN_GAME_MENU_IDS, START_MENU_IDS} from "../../../types";
import {Wrapper} from "../AddLogo/AddLogo.style";

export const AddMenuBg = () => {
    const {popupCallback, popupId, activeScreen} = useHUDContext();
    const {startGameMenuLayout, setStartGameMenuLayout} = useHUDStartGameMenuContext();
    const {inGameMenuLayout, setInGameMenuLayout} = useHUDInGameMenuContext();

    const [uploadedFile, setUploadedFile] = useState<FileData | string | null>(null);

    useEffect(() => {
        let img;
        if (activeScreen === HUD_TABS.GAME_START_MENU && popupId) {
            img = startGameMenuLayout?.[popupId as keyof typeof startGameMenuLayout];
        }

        if (activeScreen === HUD_TABS.IN_GAME_MENU && popupId) {
            img = inGameMenuLayout?.[popupId as keyof typeof inGameMenuLayout];
        }

        if (img) {
            setUploadedFile(img as string);
        }
    }, [activeScreen, startGameMenuLayout, inGameMenuLayout]);

    useEffect(() => {
        if (uploadedFile && popupCallback) {
            popupCallback(backendUrlFromPath(uploadedFile));
        }
    }, [popupCallback]);

    useEffect(() => {
        if (activeScreen === HUD_TABS.GAME_START_MENU) {
            setUploadedFile(startGameMenuLayout?.[START_MENU_IDS.MENU_BG] as string);
        } else if (activeScreen === HUD_TABS.IN_GAME_MENU) {
            setUploadedFile(inGameMenuLayout?.[IN_GAME_MENU_IDS.MENU_BG] as string);
        }
    }, [uploadedFile, popupCallback, startGameMenuLayout, inGameMenuLayout]);

    const deleteImg = () => {
        if (activeScreen === HUD_TABS.GAME_START_MENU) {
            setStartGameMenuLayout({
                ...startGameMenuLayout,
                [START_MENU_IDS.MENU_BG]: null,
            });
        } else if (activeScreen === HUD_TABS.IN_GAME_MENU) {
            setInGameMenuLayout({
                ...inGameMenuLayout,
                [IN_GAME_MENU_IDS.MENU_BG]: null,
            });
        }
    };

    return (
        <Wrapper>
            <div className="title">Upload Image &#40;512x512&#41;</div>
            <UploadField
                width="100%"
                height="210px"
                uploadedFile={uploadedFile}
                setUploadedFile={setUploadedFile}
                deleteHandler={deleteImg}
                size={GAME_IMAGE_SIZE}
                uploadHandler={arg => popupCallback && popupCallback(backendUrlFromPath(arg))}
            />
        </Wrapper>
    );
};
