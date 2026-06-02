import {QueryClientProvider} from "@tanstack/react-query";
import {useEffect} from "react";

// Side-effect import: runs every initIntegrated*() at module load so the
// AuthorizationContext provider mounted below sees the real Firebase-
// backed auth provider. Without this, getAuthProvider() throws in
// integrated mode because the singleton was never registered, and
// silently fell back to NullAuthProvider before that guard existed —
// causing every cloud request to ship `stemstudio-token` and 401.
import "./bootstrap/integrated";

import {IS_OSS} from "./buildMode";
import {AppRouter} from "./AppRouter";
import AppGlobalContextProvider from "./context/AppGlobalContext";
import AuthorizationContextProvider from "./context/AuthorizationContext";
import HomepageContextProvider from "./context/HomepageContext";
import {OssAssetRegistryProvider} from "./context/OssAssetRegistryContext";
import {OSSBootstrapModal} from "./editor/assets/v2/OSSBootstrapModal/OSSBootstrapModal";
import {ensureProjectStoreRehydrated, isOSSBootstrapped} from "./persistence";
import {applyPlaygroundModeAttribute} from "./playgroundMode";
import "./playgroundMode.css";
import {queryClient} from "./queryClient";

// Tag <html data-playground-mode> before React renders so CSS selectors in
// playgroundMode.css apply on the first paint. Safe to call repeatedly.
applyPlaygroundModeAttribute();

const OSSPersistenceBootstrapper = () => {
    useEffect(() => {
        // Only rehydrate once the user has gone through the first-time modal.
        // Before that, the modal itself will register the chosen store on
        // confirm; rehydrating here too would race with that flow. Scene
        // loads on un-bootstrapped routes fall back to a lazy rehydration
        // via `ensureProjectStoreRehydrated()` in the scene loader.
        if (!isOSSBootstrapped()) return;
        void ensureProjectStoreRehydrated();
    }, []);
    return null;
};

export const PublicAppContainerLite = () => {
    return (
        <AuthorizationContextProvider>
            <QueryClientProvider client={queryClient}>
                <OssAssetRegistryProvider>
                    <AppGlobalContextProvider>
                        <HomepageContextProvider>
                            <AppRouter />
                            {IS_OSS ? <OSSPersistenceBootstrapper /> : null}
                            <OSSBootstrapModal />
                        </HomepageContextProvider>
                    </AppGlobalContextProvider>
                </OssAssetRegistryProvider>
            </QueryClientProvider>
        </AuthorizationContextProvider>
    );
};
