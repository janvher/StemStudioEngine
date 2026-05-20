import React, {useCallback, useMemo, useState} from "react";

import {Item} from "../editor/assets/v2/common/BasicCombobox/BasicCombobox";
import {HUD_TABS, LAYOUT_BUTTON_TYPE} from "../editor/assets/v2/HUD/HUDEditView/types";
import {FileData} from "../editor/assets/v2/types/file";

interface HUDContextValue {
    popupType: LAYOUT_BUTTON_TYPE | undefined;
    setPopupType: React.Dispatch<React.SetStateAction<LAYOUT_BUTTON_TYPE | undefined>>;
    isPopupOpen: boolean;
    openPopup: (type: LAYOUT_BUTTON_TYPE, id: string) => void;
    closePopup: () => void;
    popupCallback: ((arg: any) => void) | undefined;
    setPopupCallback: React.Dispatch<React.SetStateAction<((arg: any) => void) | undefined>>;
    popupId: string | undefined;
    setPopupId: React.Dispatch<React.SetStateAction<string | undefined>>;
    activeScreen: HUD_TABS;
    setActiveScreen: React.Dispatch<React.SetStateAction<HUD_TABS>>;
    openColorPicker: boolean;
    setOpenColorPicker: React.Dispatch<React.SetStateAction<boolean>>;
    soundOptions: Item[];
    setSoundOptions: React.Dispatch<React.SetStateAction<Item[]>>;
    soundAssets: FileData[];
    setSoundAssets: React.Dispatch<React.SetStateAction<FileData[]>>;
}

export const HUDContext = React.createContext<HUDContextValue>(null!);

export interface HUDContextProviderProps {
    children: React.ReactNode;
}

const HUDContextProvider: ({children}: HUDContextProviderProps) => React.ReactElement = ({children}) => {
    const [activeScreen, setActiveScreen] = useState(HUD_TABS.GAME_START_MENU);
    const [popupType, setPopupType] = useState<LAYOUT_BUTTON_TYPE>();
    const [popupId, setPopupId] = useState<string>();
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [popupCallback, setPopupCallback] = useState<(arg: any) => void>();
    const [openColorPicker, setOpenColorPicker] = useState(false);

    const [soundOptions, setSoundOptions] = useState<Item[]>([]);
    const [soundAssets, setSoundAssets] = useState<FileData[]>([]);

    const openPopup = useCallback((type: LAYOUT_BUTTON_TYPE, id: string) => {
        if (type === LAYOUT_BUTTON_TYPE.ADD_PANEL_BG) {
            setOpenColorPicker(true);
            return;
        }
        setPopupId(id);
        setPopupType(type);
        setIsPopupOpen(true);
    }, []);

    const closePopup = useCallback(() => {
        setPopupId(undefined);
        setPopupType(undefined);
        setIsPopupOpen(false);
    }, []);

    const contextValue = useMemo<HUDContextValue>(
        () => ({
            popupType,
            setPopupType,
            openPopup,
            closePopup,
            isPopupOpen,
            popupCallback,
            setPopupCallback,
            popupId,
            setPopupId,
            activeScreen,
            setActiveScreen,
            openColorPicker,
            setOpenColorPicker,
            soundOptions,
            setSoundOptions,
            soundAssets,
            setSoundAssets,
        }),
        [
            popupType,
            openPopup,
            closePopup,
            isPopupOpen,
            popupCallback,
            popupId,
            activeScreen,
            openColorPicker,
            soundOptions,
            soundAssets,
        ],
    );

    return <HUDContext.Provider value={contextValue}>{children}</HUDContext.Provider>;
};

export default HUDContextProvider;
