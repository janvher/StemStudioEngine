import React, { useState, useEffect, useId } from "react";
import type { Scene } from "three";

import EngineRuntime from "../EngineRuntime";
import global from "../global";
import { AssetResolutionProvider } from './AssetResolutionContext';

const getGlobalScene = (): Scene | null => {
    const app = global.app as EngineRuntime | undefined | null;
    return app?.editor?.scene || null;
};

export const SceneAssetResolutionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const instanceId = useId();
    const [scene, setScene] = useState<Scene | null>(getGlobalScene());

    useEffect(() => {
        const app = global.app as EngineRuntime | undefined | null;
        if (!app) {
            return;
        }

        const eventName = `sceneLoaded.SceneAssetResolutionProvider-${instanceId}`;

        app.on(eventName, () => {
            setScene(getGlobalScene());
        });

        return () => {
            app.on(eventName, null);
        };
    }, [instanceId]);

    if (!scene) {
        return null;
    }

    return (
        <AssetResolutionProvider object={scene}>
            {children}
        </AssetResolutionProvider>
    );
};
