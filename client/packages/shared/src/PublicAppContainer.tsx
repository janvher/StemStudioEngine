import {QueryClientProvider} from "@tanstack/react-query";
import {useEffect, useRef} from "react";
import {toast, Toaster} from "toastywave";

import {AppRouter} from "./AppRouter";
import AppGlobalContextProvider from "./context/AppGlobalContext";
import AuthorizationContextProvider from "./context/AuthorizationContext";
import HomepageContextProvider from "./context/HomepageContext";
import {SceneRevisionsModalRenderer} from "./editor/assets/v2/SceneRevisionsModalRenderer/SceneRevisionsModalRenderer";
import {queryClient} from "./queryClient";
import {AppUpdateManager} from "./update/AppUpdateManager";
import {OfflineIndicator} from "./update/OfflineIndicator";
import CSPMetaTag, {customCSPPolicies} from "./utils/CSPMetaTag";
import {logLevelMismatch} from "./utils/Logger";

const LogLevelMismatchToast = () => {
    useEffect(() => {
        if (logLevelMismatch) {
            toast.warning(
                `Log level override: project uses "${logLevelMismatch.env}" (.env) but localStorage overrides to "${logLevelMismatch.stored}". ` +
                `Reset via editor menu > Log Level, or clear localStorage key "logLevelOverride".`,
            );
        }
    }, []);
    return null;
};

export const PublicAppContainer = () => {
    const toastContainerRef = useRef<HTMLDivElement>(null);

    return (
        <>
            <CSPMetaTag customPolicies={customCSPPolicies} />
            <AuthorizationContextProvider>
                <QueryClientProvider client={queryClient}>
                    <AppGlobalContextProvider>
                        <HomepageContextProvider>
                            <AppUpdateManager />
                            <OfflineIndicator />
                            <AppRouter />
                            <SceneRevisionsModalRenderer />
                            <div
                                ref={toastContainerRef}
                                className="my-toaster"
                            >
                                <Toaster
                                    position="bottom-right"
                                    theme="dark"
                                    container={toastContainerRef as any}
                                />
                                <LogLevelMismatchToast />
                            </div>
                        </HomepageContextProvider>
                    </AppGlobalContextProvider>
                </QueryClientProvider>
            </AuthorizationContextProvider>
        </>
    );
};
