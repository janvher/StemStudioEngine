import {useEffect, useState} from "react";

import {Wrapper} from "./AddLogo.style";
import {useHUDContext, useHUDInGameMenuContext, useHUDStartGameMenuContext} from "@stem/editor-oss/context";
import {GAME_IMAGE_SIZE} from "@web-shared/editorConfig";
import {backendUrlFromPath} from "@stem/editor-oss/utils/UrlUtils";
import {UploadField} from "../../../../../common/UploadField/UploadField";
import {FileData} from "../../../../../types/file";
import {HUD_TABS, IN_GAME_MENU_IDS, START_MENU_IDS} from "../../../types";

export const AddLogo = () => {
    const {popupCallback, activeScreen} = useHUDContext();
    const {startGameMenuLayout, setStartGameMenuLayout} = useHUDStartGameMenuContext();
    const {inGameMenuLayout, setInGameMenuLayout} = useHUDInGameMenuContext();

    const [uploadedFile, setUploadedFile] = useState<FileData | string | null>(null);

    useEffect(() => {
        if (activeScreen === HUD_TABS.GAME_START_MENU) {
            setUploadedFile(startGameMenuLayout?.[START_MENU_IDS.LOGO_LEFT] as string);
        }
        if (activeScreen === HUD_TABS.IN_GAME_MENU) {
            setUploadedFile(inGameMenuLayout?.[IN_GAME_MENU_IDS.LOGO_LEFT] as string);
        }
    }, [activeScreen, startGameMenuLayout, inGameMenuLayout]);

    const deleteImg = () => {
        if (activeScreen === HUD_TABS.IN_GAME_MENU) {
            setInGameMenuLayout({
                ...inGameMenuLayout,
                [IN_GAME_MENU_IDS.LOGO_LEFT]: null,
            });
        } else if (activeScreen === HUD_TABS.GAME_START_MENU) {
            setStartGameMenuLayout({
                ...startGameMenuLayout,
                [START_MENU_IDS.LOGO_LEFT]: null,
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
