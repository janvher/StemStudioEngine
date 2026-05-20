import { useEffect, useRef } from "react";

import type EngineRuntime from "../EngineRuntime";
import global from "../global";
import { showToast } from "../showToast";
import { editorHasUnsavedChanges } from "../utils/editorUnsavedChanges";

type AppVersionManifest = {
    buildId: string;
    version: string;
    builtAt: string;
};

const UPDATE_CHECK_INTERVAL_MS = 60_000;

const getVersionManifestUrl = () => new URL("app-version.json", window.location.origin + import.meta.env.BASE_URL);
const getServiceWorkerUrl = () => new URL("service-worker.js", window.location.origin + import.meta.env.BASE_URL);

export const AppUpdateManager = () => {
    const availableUpdateBuildIdRef = useRef<string | null>(null);
    const deferredUpdateBuildIdRef = useRef<string | null>(null);
    const isReloadingRef = useRef(false);

    const getApp = () => global.app as EngineRuntime | undefined;

    const hasUnsavedChanges = () => {
        const sceneUserData = getApp()?.editor?.scene?.userData;
        return editorHasUnsavedChanges(sceneUserData);
    };

    const reloadEditor = () => {
        if (isReloadingRef.current) {
            return;
        }

        isReloadingRef.current = true;
        window.setTimeout(() => window.location.reload(), 750);
    };

    const applyAvailableUpdate = () => {
        if (!availableUpdateBuildIdRef.current) {
            return;
        }

        deferredUpdateBuildIdRef.current = null;
        showToast({
            type: "info",
            title: "New version available",
            body: "Reloading the editor to apply the latest build.",
            duration: 2000,
        });
        reloadEditor();
    };

    const promptForDeferredReload = () => {
        showToast({
            type: "warning",
            title: "Update postponed",
            body: "Save your changes and the editor will reload into the latest build.",
            duration: 5000,
        });
    };

    const promptForUpdate = async (manifest: AppVersionManifest) => {
        const app = getApp();
        availableUpdateBuildIdRef.current = manifest.buildId;

        try {
            await app?.editor?.checkForUnsavedChanges(
                "A new version of the editor is available. Reload now?",
                undefined,
                undefined,
                "Reload now",
                "Later",
            );
            applyAvailableUpdate();
        } catch {
            deferredUpdateBuildIdRef.current = manifest.buildId;
            promptForDeferredReload();
        }
    };

    useEffect(() => {
        if (!import.meta.env.PROD) {
            return;
        }

        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register(getServiceWorkerUrl(), { scope: import.meta.env.BASE_URL })
                .catch(error => {
                    console.warn("[update] Service worker registration failed", error);
                });
        }

        let disposed = false;

        const checkForUpdates = async () => {
            if (disposed || isReloadingRef.current) {
                return;
            }

            if (deferredUpdateBuildIdRef.current && !hasUnsavedChanges()) {
                applyAvailableUpdate();
                return;
            }

            try {
                const response = await fetch(getVersionManifestUrl(), {
                    cache: "no-store",
                    headers: {
                        "cache-control": "no-cache",
                    },
                });

                if (!response.ok) {
                    return;
                }

                const manifest = (await response.json()) as Partial<AppVersionManifest>;

                if (
                    !manifest.buildId ||
                    manifest.buildId === __APP_BUILD_ID__ ||
                    manifest.buildId === availableUpdateBuildIdRef.current
                ) {
                    return;
                }

                await promptForUpdate(manifest as AppVersionManifest);
            } catch (error) {
                console.warn("[update] Version check failed", error);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                void checkForUpdates();
            }
        };

        const updateInterval = window.setInterval(() => {
            void checkForUpdates();
        }, UPDATE_CHECK_INTERVAL_MS);

        window.addEventListener("focus", handleVisibilityChange);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        const app = getApp();
        app?.on("sceneSaved.AppUpdateManager", () => {
            if (deferredUpdateBuildIdRef.current && !hasUnsavedChanges()) {
                applyAvailableUpdate();
            }
        });

        void checkForUpdates();

        return () => {
            disposed = true;
            window.clearInterval(updateInterval);
            window.removeEventListener("focus", handleVisibilityChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            app?.on("sceneSaved.AppUpdateManager", null);
        };
    }, []);

    return null;
};
