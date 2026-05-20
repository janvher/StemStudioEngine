import {createContext, useContext, useEffect, useState, type ReactNode} from "react";

import type {AssetSource} from "../editor/asset-management/AssetSource";
import global from "../global";

const AssetSourceContext = createContext<AssetSource | null>(null);

/**
 * Provides the editor's AssetSource to the React tree. Listens for
 * sceneLoaded events to pick up the source after scene/stem setup.
 */
export const AssetSourceProvider = ({children}: {children: ReactNode}) => {
    const app = global?.app;
    const [source, setSource] = useState<AssetSource | null>(() => app?.editor?.assetSource ?? null);

    useEffect(() => {
        const onSceneLoaded = () => {
            setSource(app?.editor?.assetSource ?? null);
        };

        app?.on("sceneLoaded.AssetSourceProvider", onSceneLoaded);
        return () => {
            app?.on("sceneLoaded.AssetSourceProvider", null);
        };
    }, [app]);

    return <AssetSourceContext.Provider value={source}>{children}</AssetSourceContext.Provider>;
};

/**
 * Returns the current AssetSource, or null if no source is provided
 * (e.g., before a scene or stem is loaded).
 */
export const useAssetSource = (): AssetSource | null => {
    return useContext(AssetSourceContext);
};
