import React, { createContext, useContext, useState, useCallback, useEffect, useId } from "react";
import type { Object3D } from "three";

import { 
    AssetResolutionContext,
    ReadonlyAssetResolutionContext,
    emptyAssetResolutionContext,
    getAssetResolutionContext,
    setAssetRevision as objectSetAssetRevision,
    removeAssetRevision as objectRemoveAssetRevision,
} from "../asset-management/AssetResolutionContext";
import global from "../global";

type AssetResolutionAPI = {
    context: ReadonlyAssetResolutionContext;
    root: Object3D;

    // Asset → Revision
    setAssetRevision: (assetId: string, revision: string) => void;
    removeAssetRevision: (assetId: string) => void;
};

const AssetResolutionReactContext = createContext<AssetResolutionAPI | null>(null);

export const AssetResolutionProvider: React.FC<{
    object: Object3D,
    children: React.ReactNode,
}> = ({ object, children }) => {
    const instanceId = useId();
    const [context, setContext] = useState<AssetResolutionContext>(
        getAssetResolutionContext(object) || emptyAssetResolutionContext,
    );

    // Update asset → revision mapping
    const setAssetRevision = useCallback((assetId: string, revision: string) => {
        objectSetAssetRevision(object, assetId, revision);
        global.app?.call("objectChanged", null, object);
    }, [object]);

    // Remove revision mapping
    const removeAssetRevision = useCallback((assetId: string) => {
        objectRemoveAssetRevision(object, assetId);
        global.app?.call("objectChanged", null, object);
    }, [object]);

    // Get the context from the new object
    useEffect(() => {
        const eventName = `objectChanged.AssetResolutionProvider-${instanceId}`;
        setContext(getAssetResolutionContext(object) || emptyAssetResolutionContext);

        // Listen for changes to the object
        global.app?.on(eventName, (changedObject: unknown) => {
            if (changedObject === object) {
                setContext(getAssetResolutionContext(object) || emptyAssetResolutionContext);
            }
        });

        return () => {
            global.app?.on(eventName, null);
        };
    }, [object, instanceId]);

    return (
        <AssetResolutionReactContext.Provider
            value={{
                context,
                root: object,
                setAssetRevision,
                removeAssetRevision,
            }}
        >
            {children}
        </AssetResolutionReactContext.Provider>
    );
};

// Hook
export const useAssetResolutionContext = () => {
    const ctx = useContext(AssetResolutionReactContext);
    if (!ctx) {
        // Routes outside the scene tree (dashboard, create page, settings)
        // mount hooks that transitively need this context but never resolve
        // a real object. Return a no-op shape instead of throwing so those
        // routes render. The scene-internal callers that actually need a
        // root Object3D will fail at the consumer level, not here.
        return {
            context: emptyAssetResolutionContext,
            root: null as unknown as Object3D,
            setAssetRevision: () => {},
            removeAssetRevision: () => {},
        };
    }
    return ctx;
};
