import React, {useEffect, useMemo, useState} from "react";

import {IGameMapping} from "@stem/network/api/gameMapping";
import EngineRuntime from "../EngineRuntime";
import global from "../global";
import {getGameUrl} from "../v2/pages/links";

export interface PublishingContextValue {
    publishedURL: string;
    setPublishedURL: React.Dispatch<React.SetStateAction<string>>;
    slug: string | null;
    setSlug: React.Dispatch<React.SetStateAction<string | null>>;
    gameMapping: IGameMapping | null;
    setGameMapping: React.Dispatch<React.SetStateAction<IGameMapping | null>>;
}

export const PublishingContext = React.createContext<PublishingContextValue>(null!);

export interface PublishingContextProviderProps {
    children: React.ReactNode;
}

const PublishingContextProvider: React.FC<PublishingContextProviderProps> = ({children}) => {
    const [publishedURL, setPublishedURL] = useState("");
    const [slug, setSlug] = useState<string | null>(null);
    const [gameMapping, setGameMapping] = useState<IGameMapping | null>(null);

    const app = (global as any).app as EngineRuntime;

    useEffect(() => {
        if (app?.editor?.sceneID) {
            const sceneID = app.editor.sceneID;
            const slugGameUrl = getGameUrl(sceneID, slug);
            const engineGameUrl = getGameUrl(sceneID, null);
            setPublishedURL(slug ? slugGameUrl : engineGameUrl);
        }
    }, [slug, app?.editor?.sceneID]);

    const contextValue = useMemo<PublishingContextValue>(
        () => ({
            publishedURL,
            setPublishedURL,
            slug,
            setSlug,
            gameMapping,
            setGameMapping,
        }),
        [publishedURL, slug, gameMapping],
    );

    return <PublishingContext.Provider value={contextValue}>{children}</PublishingContext.Provider>;
};

export default PublishingContextProvider;

export const usePublishingContext = () => React.useContext(PublishingContext);
