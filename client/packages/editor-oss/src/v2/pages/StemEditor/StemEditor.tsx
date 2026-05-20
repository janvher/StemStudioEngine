import {useEffect, useRef, useState} from "react";
import {useNavigate, useParams, useSearchParams} from "react-router-dom";

import {createAssetToken} from "@stem/network/api/scene/v2";
import {useAppGlobalContext, useAuthorizationContext} from "../../../context";
import {AssetSourceProvider} from "../../../context/AssetSourceContext";
import LibrariesContextProvider from "../../../context/LibrariesContext";
import ModelsTabContextProvider from "../../../context/ModelsTabContext";
import EditorComponent from "../../../editor/EditorComponent";
import Viewport from "../../../editor/viewport/Viewport";
import global from "../../../global";
import {ROUTES} from "@web-shared/routes";
import {showToast} from "../../../showToast";
import {StemStudioLoader} from "../../../ui";

export const StemEditor = () => {
    const {isAuthorized, userInitialized, isInitializingAuth, dbUser, isAdmin} = useAuthorizationContext();
    const {setActiveRightPanel, advancedMode} = useAppGlobalContext();
    const navigate = useNavigate();

    const app = global?.app;

    const {assetId} = useParams<{assetId: string}>();
    const [searchParams] = useSearchParams();
    const sceneId = searchParams.get("sceneId");
    const [showMask, setShowMask] = useState(true);
    const loadedAssetIdRef = useRef<string | null>(null);
    const loadingAssetIdRef = useRef<string | null>(null);

    const onShowMask = (enabled: boolean) => {
        setShowMask(enabled);
    };

    useEffect(() => {
        if (!isAuthorized && !isInitializingAuth) {
            void navigate(ROUTES.LOGIN);
        }
    }, [isAuthorized, isInitializingAuth, navigate]);

    // Event listeners for loading mask
    useEffect(() => {
        const container = document.getElementById("container");
        if (container) {
            container.style.overflow = "hidden";
        }
        app?.on("showMask.StemEditor", onShowMask);
        app?.on("playerInit.StemEditor", () => onShowMask(true));
        app?.on("playerStarted.StemEditor", () => onShowMask(false));
        app?.on("playerStopped.StemEditor", () => onShowMask(false));
        return () => {
            app?.on("showMask.StemEditor", null);
            app?.on("playerInit.StemEditor", null);
            app?.on("playerStarted.StemEditor", null);
            app?.on("playerStopped.StemEditor", null);
        };
    }, [app]);

    // Main stem loading effect
    useEffect(() => {
        if (!app || !isAuthorized || !userInitialized || !assetId) {
            return;
        }
        if (loadedAssetIdRef.current === assetId || loadingAssetIdRef.current === assetId) {
            return;
        }

        loadingAssetIdRef.current = assetId;

        void (async () => {
            try {
                // A scoped asset token is required for collaborators to read
                // the stem outside a scene context. Mint it when we have a
                // sceneId; on failure (e.g. admin opening a stem not owned by
                // the scene owner), fall through — the request may still
                // succeed via the user's direct asset-level permissions.
                let assetToken: string | undefined;
                if (sceneId) {
                    try {
                        const response = await createAssetToken(sceneId, assetId);
                        assetToken = response.token;
                    } catch (e) {
                        console.info("[StemEditor] No asset token minted; falling back to direct asset permissions:", e);
                    }
                }

                await app.setUpStemEditor(assetId, {assetToken});
                loadedAssetIdRef.current = assetId;
            } catch (e) {
                console.error("[StemEditor] Error loading stem:", e);
                showToast({type: "error", title: "Failed to load stem."});
                setShowMask(false);
            } finally {
                if (loadingAssetIdRef.current === assetId) {
                    loadingAssetIdRef.current = null;
                }
            }
        })();
    }, [assetId, sceneId, userInitialized, app, isAuthorized]);

    if (!isAuthorized) return null;

    return (
        <>
            <StemStudioLoader show={!!isInitializingAuth || showMask} isAutoLoading={false} />
            <Viewport />
            <AssetSourceProvider>
                <LibrariesContextProvider>
                    <ModelsTabContextProvider>
                        {!isInitializingAuth && (
                            <EditorComponent
                                setActiveRightPanel={setActiveRightPanel}
                                projectPhase={3}
                                dbUser={dbUser}
                                hasProjectID={false}
                                isAdmin={isAdmin}
                                advancedMode={advancedMode}
                            />
                        )}
                    </ModelsTabContextProvider>
                </LibrariesContextProvider>
            </AssetSourceProvider>
        </>
    );
};
