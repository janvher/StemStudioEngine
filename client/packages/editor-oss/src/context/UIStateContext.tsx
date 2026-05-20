import React, {useMemo, useState} from "react";

import {ActivePage, RIGHT_PANEL_VERSIONS} from "./appStateTypes";

export interface UIStateContextValue {
    activeRightPanel: RIGHT_PANEL_VERSIONS;
    setActiveRightPanel: React.Dispatch<React.SetStateAction<RIGHT_PANEL_VERSIONS>>;
    activePage: ActivePage;
    setActivePage: (page: Exclude<ActivePage, undefined>) => void;
    stemLoaderVisible: boolean;
    setStemLoaderVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export const UIStateContext = React.createContext<UIStateContextValue>(null!);

export interface UIStateContextProviderProps {
    children: React.ReactNode;
}

const UIStateContextProvider: React.FC<UIStateContextProviderProps> = ({children}) => {
    const [activeRightPanel, setActiveRightPanel] = useState<RIGHT_PANEL_VERSIONS>(RIGHT_PANEL_VERSIONS.GameSettings);
    const [activePage, setActivePage] = useState<ActivePage>();
    const [stemLoaderVisible, setStemLoaderVisible] = useState(false);

    const contextValue = useMemo<UIStateContextValue>(
        () => ({
            activeRightPanel,
            setActiveRightPanel,
            activePage,
            setActivePage,
            stemLoaderVisible,
            setStemLoaderVisible,
        }),
        [activeRightPanel, activePage, stemLoaderVisible],
    );

    return <UIStateContext.Provider value={contextValue}>{children}</UIStateContext.Provider>;
};

export default UIStateContextProvider;

export const useUIStateContext = () => React.useContext(UIStateContext);
