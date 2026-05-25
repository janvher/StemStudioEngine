/* eslint-disable @typescript-eslint/no-unused-expressions */
import moment from "moment";
import React, {useCallback, useEffect, useRef, useState} from "react";

import {
    emitRewardEvent,
    REWARD_APP_EVENTS,
    REWARD_EVENT_TYPES,
    trackRewardEvent,
    type TrackRewardEventInput,
} from "@stem/network/api/rewards";
import {checkIsSceneCollaborator} from "@stem/network/api/scene";
import {getLikedGames} from "@stem/network/api/updateUser";
import {getAiCreditsConfig} from "@stem/network/api/user";
import {isSignUpRoutePath, ROUTES} from "@web-shared/routes";
import {getAuthProvider, type IAuthUser} from "../auth";
import {getRemoteDocStore} from "../data";
import {IS_OSS} from "../mode/buildMode";
import {OSS_LOCAL_USER_ID} from "@web-shared/ossUser";
import global from "../global";

/** Type alias kept for source compatibility with the previous firebase types. */
type User = IAuthUser;
type UserInfo = IAuthUser;

/**
 * In OSS mode there is no Firebase / no account system. The editor runs
 * locally and every server call ships this constant token in the
 * `Authorization` header. The OSS Go AI server accepts it as a valid
 * identity when `BUILD_MODE=oss`.
 */
const OSS_DUMMY_TOKEN = "stemstudio-token";
const OSS_DUMMY_USER_ID = OSS_LOCAL_USER_ID;
import {useWindowPathname} from "../hooks/useWindowPathname";
import i18n from "../i18n/config";
import {showToast} from "../showToast";
import Ajax from "../utils/Ajax";
import {setProductAnalyticsUser} from "../utils/productAnalytics";
import {isAuthRoute} from "../utils/routeLoadGuards";
import {backendUrlFromPath} from "../utils/UrlUtils";
import {IEditorUser} from "../v2/pages/types";

interface AuthorizationContextValue {
    isAuthorized: boolean;
    setIsAuthorized: React.Dispatch<React.SetStateAction<boolean>>;
    onboarding: boolean;
    setOnboarding: React.Dispatch<React.SetStateAction<boolean>>;
    userInitialized: boolean;
    handleLogOut: () => void;
    authToken: string | null;
    isInitializingAuth: boolean;
    dbUser: IEditorUser | null;
    setDbUser: React.Dispatch<React.SetStateAction<IEditorUser | null>>;
    likedGamesIds: string[];
    setLikedGamesIds: React.Dispatch<React.SetStateAction<string[]>>;
    handleGetLikedGames: () => Promise<void>;
    saveUser: (updatedUser: IEditorUser) => Promise<void>;
    getUser: (userId?: string, userName?: string) => Promise<IEditorUser | undefined>;
    validateUsername: (username: string) => Promise<boolean>;
    saveUsernameInFirebase: (username: string) => Promise<true | undefined>;
    isAdmin: boolean;
    isWhitelisted: boolean | undefined;
    checkForAvatar: () => Promise<boolean>;
    fetchUser: () => Promise<IEditorUser | null>;
    onLogOut: () => void;
    isCollaborator: boolean;
    aiCredits: number | null;
    setAiCredits: React.Dispatch<React.SetStateAction<number | null>>;
    refreshAiCredits: () => Promise<number | null>;
    updateRecentlyViewed: () => Promise<void>;
}

// Fallback values used before config is loaded from the server
const AI_CREDITS_DEFAULT_FALLBACK = 5000;
const AI_CREDITS_REFRESH_INTERVAL_FALLBACK = 7 * 24 * 60 * 60;

export const AuthorizationContext = React.createContext<AuthorizationContextValue>(null!);

export interface AuthorizationContextProviderProps {
    children: React.ReactNode;
}

const AuthorizationContextProvider: React.FC<AuthorizationContextProviderProps> = ({children}) => {
    const app = global.app;
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [userInitialized, setUserInitialized] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [initLoading, setInitloading] = useState(true);
    const [isWhitelisted, setIsWhitelisted] = useState<boolean>();
    const [dbUser, setDbUser] = useState<IEditorUser | null>(null);
    const [likedGamesIds, setLikedGamesIds] = useState<string[]>([]);
    const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
    const [isCollaborator, setIsCollaborator] = useState(false);
    const [aiCredits, setAiCredits] = useState<number | null>(null);
    const aiCreditsConfigRef = useRef({
        defaultAmount: AI_CREDITS_DEFAULT_FALLBACK,
        refreshRate: AI_CREDITS_REFRESH_INTERVAL_FALLBACK,
    });
    const [onboarding, setOnboarding] = useState(false);
    const pathname = useWindowPathname();
    const authReady = isAuthorized && !!authToken && !!getAuthProvider().getCurrentUser();
    const shouldLoadAiCreditsConfig = authReady && !isAuthRoute(pathname);
    const submittingRegistrationRef = useRef(false);

    // OSS mode: skip the Firebase auth flow entirely. Stamp a dummy token,
    // mark the session as authorized, and provide a local user record. The
    // ai-server accepts this token when BUILD_MODE=oss. Runs once at mount.
    useEffect(() => {
        if (!IS_OSS) return;
        setAuthToken(OSS_DUMMY_TOKEN);
        setIsAuthorized(true);
        setIsWhitelisted(true);
        setUserInitialized(true);
        setInitloading(false);
        setDbUser({
            id: OSS_DUMMY_USER_ID,
            username: "local",
            email: "local@stemstudio.invalid",
        } as unknown as IEditorUser);
        global.app?.authManager?.setAuthToken(OSS_DUMMY_TOKEN);
    }, []);

    // Fetch AI credits config only for authenticated sessions.
    useEffect(() => {
        if (!shouldLoadAiCreditsConfig) {
            aiCreditsConfigRef.current = {
                defaultAmount: AI_CREDITS_DEFAULT_FALLBACK,
                refreshRate: AI_CREDITS_REFRESH_INTERVAL_FALLBACK,
            };
            return;
        }

        let isCancelled = false;

        getAiCreditsConfig()
            .then(config => {
                if (isCancelled) {
                    return;
                }
                aiCreditsConfigRef.current = {
                    defaultAmount: config.DefaultAmount,
                    refreshRate: config.CreditsRefreshRate,
                };
            })
            .catch(e => console.warn("Failed to load AI credits config, using defaults:", e));

        return () => {
            isCancelled = true;
        };
    }, [shouldLoadAiCreditsConfig]);

    const checkCollaborator = async (sceneID: string) => {
        if (!sceneID || !global.app?.editor?.isCollaborative) {
            setIsCollaborator(false);
            return;
        }
        try {
            const isCollaborator = await checkIsSceneCollaborator(sceneID);
            setIsCollaborator(isCollaborator);
        } catch (error) {
            console.warn("Failed to check collaborator status:", error);
            // Default to false if check fails
            setIsCollaborator(false);
        }
    };

    useEffect(() => {
        global.app?.on("sceneLoaded.AuthorizationContext", () => checkCollaborator(global.app?.editor?.sceneID || ""));
        return () => {
            global.app?.on("sceneLoaded.AuthorizationContext", null);
        };
    }, []);

    const onLogOut = () => {
        setIsAuthorized(false);
        setDbUser(null);
        setAiCredits(null);
        setIsWhitelisted(undefined);
        setIsAdmin(false);
    };

    const handleLogOut = async () => {
        // Step 1: Clean up game services if playing
        if (global.app?.isPlaying && global.app?.game) {
            const gameServices = global.app.game.getUnifiedGameServices();
            if (gameServices) {
                gameServices.stop();
            }
        }

        // Step 2: Clean up local state BEFORE signing out
        onLogOut();

        // Step 3: Clear global app state
        if (global.app) {
            global.app.authManager?.setAuthToken(null);
            global.app.authManager?.setUser(null);
        }

        // Step 4: Sign out from Firebase
        try {
            await getAuthProvider().signOut();
        } catch (error) {
            console.error("Error during Firebase sign out:", error);
        }

        // Step 5: Navigate after cleanup is complete
        window.location.href = ROUTES.HOME;
    };

    // Function to handle token regeneration
    const regenerateToken = async (): Promise<string | null> => {
        const user = getAuthProvider().getCurrentUser();
        if (user) {
            try {
                return await user.getIdToken(true);
            } catch (error) {
                console.error("Error regenerating token:", error);
                return null;
            }
        }
        console.error("No user is currently signed in.");
        return null;
    };

    const setupUserAndToken = (userInfo: UserInfo | null, token: string | null, continueInit?: boolean) => {
        setAuthToken(token);
        global.app?.authManager.setAuthToken(token);
        setIsAuthorized(token !== null);
        if (token === null) {
            setIsWhitelisted(undefined);
            setIsAdmin(false);
        }
        if (!continueInit) {
            setInitloading(false);
        }
    };

    const checkForAvatar = async () => {
        try {
            const response = await Ajax.get({
                url: backendUrlFromPath(`/api/Mesh/GetAvatar?UserID=${dbUser!.id}`), // ERROR: Unsafe null assertion, should check if dbUser exists
                needAuthorization: false,
            });

            if (response?.data.Code !== 200 && response?.data.Msg) {
                throw Error(response?.data.Msg);
            }

            const model = response?.data.Data;
            return !!model;
        } catch (error) {
            console.error(error instanceof Error ? error.message : error);
            return false;
        }
    };

    useEffect(() => {
        const currentPath = window.location.pathname;
        const sanitizedPath = currentPath.replace(/\/$/, "");

        if (dbUser?.username) {
            global.app?.authManager.setUserName(dbUser.username);
            global.app?.authManager.setUser({
                id: dbUser?.id,
                avatar: dbUser?.avatar,
                email: dbUser?.email,
                username: dbUser?.username,
                name: dbUser?.name,
                firebaseId: dbUser?.id,
                platform: "firebase",
            });
            setUserInitialized(true);
        }

        if (!!dbUser && !dbUser?.username && location.pathname !== ROUTES.LOGIN) {
            setOnboarding(true);
        }

        if (
            isAuthorized &&
            dbUser &&
            sanitizedPath !== (ROUTES.LOGIN as string) &&
            !isSignUpRoutePath(sanitizedPath)
        ) {
            if (!dbUser.id) {
                window.location.href = ROUTES.LOGIN;
                return;
            }
            if (!dbUser.username && isWhitelisted) {
                window.location.href = ROUTES.LOGIN + "?onboard=true";
                return;
            }
        }
    }, [isAuthorized, dbUser, isWhitelisted]);

    useEffect(() => {
        const container = document.getElementById("container");
        if (container) {
            const path = window.location.pathname;
            if (
                // path === ROUTES.HOME ||
                path === (ROUTES.SEARCH_RESULTS as string) ||
                path === (ROUTES.TERMS_OF_SERVICE as string) ||
                path === (ROUTES.PRIVACY_POLICY as string) ||
                path.includes("/play/") ||
                path.includes("/user/") ||
                path.includes("/view-more/")
            ) {
                container.style.overflowY = "auto";
                container.style.position = "relative";
            } else {
                container.style.overflow = "hidden";
            }
            container.scrollTo(0, 0);
        }
    }, [window.location.pathname]);

    useEffect(() => {
        let initialized = false;
        let fallbackTimeout: NodeJS.Timeout | null = null;

        const unsubscribe = getAuthProvider().onAuthStateChanged(async user => {
            console.log("AUTH STATE CHANGED:", user);
            if (user && !user?.emailVerified) {
                console.log("Email not verified, signing out...");
                await getAuthProvider().signOut();
                const path = window.location.pathname;
                if (path !== ROUTES.LOGIN && path !== ROUTES.SIGN_UP) {
                    window.location.href = ROUTES.LOGIN;
                }
            }
            if (!initialized) {
                initialized = true;
                if (!user) {
                    console.log("Initial null user — ignoring");

                    // fallback check
                    fallbackTimeout = setTimeout(async () => {
                        if (!getAuthProvider().getCurrentUser()) {
                            console.log("Still no user after delay → treating as logged out");
                            setInitloading(false);
                            await onAuthUserSet(null);
                        } else {
                            console.log("User recovered after delay");
                        }
                    }, 500);

                    return;
                }
            }

            await onAuthUserSet(user);
        });

        // Re-check auth state when network connectivity is restored.
        // Firebase may not re-fire onAuthStateChanged after a network switch,
        // leaving the sign-in flow stuck in a loading state.
        const handleOnline = () => {
            const user = getAuthProvider().getCurrentUser();
            if (user) {
                console.log("Network restored: re-processing auth state");
                void onAuthUserSet(user);
            }
        };
        window.addEventListener("online", handleOnline);

        global.app?.on("updateToken", (token: string) => {
            setAuthToken(token);
            global.app?.authManager.setAuthToken(token);
            setIsAuthorized(!!token);
        });

        return () => {
            unsubscribe?.();
            if (fallbackTimeout) {
                clearTimeout(fallbackTimeout);
            }
            window.removeEventListener("online", handleOnline);
            if (refreshInterval !== null) {
                clearInterval(refreshInterval);
            }
            global.app?.on("updateToken", null);
        };
    }, []);

    useEffect(() => {
        if (global.app) {
            global.app.userId = dbUser?.id || null;
        }
    }, [dbUser]);

    useEffect(() => {
        setProductAnalyticsUser(dbUser?.id, {
            is_admin: isAdmin,
            is_whitelisted: isWhitelisted === true,
            has_username: !!dbUser?.username,
        });
    }, [dbUser?.id, dbUser?.username, isAdmin, isWhitelisted]);

    const onAuthUserSet = async (user: User | null) => {
        try {
            if (user === null) {
                setupUserAndToken(null, null);
                return;
            }
            const token = await regenerateToken();
            if (token === null) {
                setupUserAndToken(null, null);
                return;
            }
            // Firebase JWTs expire after one hour. Refresh every 55 minutes
            // so the next request always has a fresh token. The previous
            // implementation parsed the JWT's expirationTime to time this
            // exactly; that's a narrow gain not worth piping
            // getIdTokenResult through the IAuthProvider interface.
            const timeoutDuration = 55 * 60 * 1000;
            if (refreshInterval !== null) {
                clearInterval(refreshInterval);
            }
            const intervalId = setInterval(async () => {
                const newToken = await regenerateToken();
                setupUserAndToken(newToken ? user : null, newToken, true);
            }, timeoutDuration);
            setRefreshInterval(intervalId);
            setupUserAndToken(user, token, true);
        } catch (error) {
            console.error(error);
        } finally {
            setInitloading(false);
        }
    };

    const createNewUser = useCallback(async () => {
        try {
            const authUser = getAuthProvider().getCurrentUser();
            if (!authUser) {
                showToast({
                    title: i18n.t("Something went wrong"),
                    body: i18n.t("Couldn't authenticate user."),
                    type: "error",
                });
                console.log("Cannot create user, authentication data is missing");
                return;
            }

            const user: IEditorUser = {
                id: authUser.uid,
                name: authUser.displayName || "",
                email: authUser.email || "",
                avatar: authUser.photoURL || "",
                memberSince: moment().unix(),
                aiCredits: aiCreditsConfigRef.current.defaultAmount,
                lastCreditsRefresh: moment().unix(),
            };

            const id = authUser.uid;
            const store = getRemoteDocStore();
            await store.setDoc("users", id, user);

            const stored = await store.getDoc<IEditorUser>("users", id);
            if (stored) setDbUser(stored);
        } catch (e) {
            console.error("Error from adding document: ", e);
        }
    }, []);

    const validateUsername = useCallback(
        async (username: string) => {
            try {
                const matches = await getRemoteDocStore().queryDocs("users", [["username", "==", username]]);
                return matches.length === 0;
            } catch (e) {
                console.error("Error from fetching document: ", e);
                showToast({
                    title: i18n.t("Something went wrong"),
                    body: i18n.t("Couldn't validate username."),
                    type: "error",
                });
                return false;
            }
        },
        [createNewUser], // ERROR: Unnecessary dependency
    );

    const saveUsernameInFirebase = useCallback(
        async (username: string) => {
            try {
                const authUser = getAuthProvider().getCurrentUser();

                if (!authUser) {
                    console.error("Cannot get user, Firebase authentication data is missing");
                    throw new Error("Firebase authentication data is missing");
                }

                const id = authUser.uid;
                const store = getRemoteDocStore();
                const user = await store.getDoc<IEditorUser>("users", id);

                if (user) {
                    await store.updateDoc("users", id, {username});
                    setDbUser({
                        ...user,
                        username,
                    });
                    return true;
                } else {
                    console.error("No such user in db!");
                    throw new Error("No such user in db!");
                }
            } catch (e) {
                console.error("Error from setting username: ", e);
                showToast({
                    title: i18n.t("Something went wrong"),
                    body: i18n.t("Couldn't set your username."),
                    type: "error",
                });
            }
        },
        [createNewUser], // ERROR: Unnecessary dependency
    );

    const updateRecentlyViewed = async () => {
        const sceneID = app?.editor?.sceneID;
        if (sceneID && dbUser) {
            const current = dbUser?.recentlyViewed || [];

            const updated = [sceneID, ...current.filter(id => id !== sceneID)];

            await saveUser({
                ...dbUser,
                recentlyViewed: updated,
            });
        }
    };

    const getUser = useCallback(
        async (userId?: string, username?: string) => {
            try {
                const authUser = getAuthProvider().getCurrentUser();

                if (authUser?.email && !authUser?.emailVerified) {
                    //Discord users may not have emails set
                    setIsAuthorized(false);
                    setDbUser(null);
                    showToast({
                        title: "Verify your email",
                        body: "We sent you a verification link.",
                        type: "info",
                        duration: 5000,
                    });
                    const path = window.location.pathname;
                    if (path !== ROUTES.LOGIN) {
                        window.location.href = ROUTES.LOGIN;
                    }
                    return;
                }

                if (!username && !userId && !authUser) {
                    console.error("Cannot get user, Firebase authentication data is missing");
                    return;
                }

                const store = getRemoteDocStore();
                // Auth-provider doesn't expose providerData generically; use the
                // platform identifier on the IAuthUser shape when available.
                // Email-password sign-ins have isAnonymous=false and a real email.
                if (authUser && authUser.email && !authUser.isAnonymous) {
                    if (submittingRegistrationRef.current) {
                        return;
                    }

                    submittingRegistrationRef.current = true;

                    // User registered with password, email is verified -> submit registration.
                    // If user is not already registered, it will be submitted now with waitlist email sent
                    const formData = await store.getDoc<Record<string, unknown>>(
                        "pendingUsersForm",
                        authUser.uid,
                    );
                    if (formData) {
                        const response = await Ajax.post({
                            url: backendUrlFromPath("/api/Registration/Submit")!,
                            msgBodyType: "json",
                            data: JSON.stringify(formData),
                        });
                        if (response?.data.Code !== 200) {
                            throw new Error((response?.data.Msg as string) || "Submission failed.");
                        }
                        await store.deleteDoc("pendingUsersForm", authUser.uid);
                    }
                }

                const safeUsername = decodeURIComponent(username || "").replace("-", " ");

                if (safeUsername) {
                    const byUsername = await store.queryDocs<IEditorUser>("users", [
                        ["username", "==", safeUsername],
                    ]);
                    if (byUsername.length > 0) return byUsername[byUsername.length - 1];

                    const byName = await store.queryDocs<IEditorUser>("users", [
                        ["name", "==", safeUsername],
                    ]);
                    return byName.length > 0 ? byName[byName.length - 1] : undefined;
                }

                const id = userId || authUser?.uid;
                if (!id) return;

                let user = await store.getDoc<IEditorUser>("users", id);

                if (userId) {
                    return user ?? undefined;
                }

                if (user) {
                    const now = moment().unix();
                    const updates: Partial<IEditorUser> = {};
                    if (!user.id) {
                        updates.id = id;
                    }
                    if (!user.email && authUser?.email) {
                        updates.email = authUser.email;
                    }

                    if (!user.memberSince) {
                        updates.memberSince = now;
                    }
                    const needsCreditsRefresh =
                        (!user.lastCreditsRefresh ||
                            now - user.lastCreditsRefresh >= aiCreditsConfigRef.current.refreshRate) &&
                        aiCreditsConfigRef.current.refreshRate > 0;
                    if (needsCreditsRefresh) {
                        updates.aiCredits = aiCreditsConfigRef.current.defaultAmount;
                        updates.lastCreditsRefresh = now;
                    }
                    if (Object.keys(updates).length > 0) {
                        await store.updateDoc("users", id, updates);
                        user = {...user, ...updates};
                    }
                    setAiCredits(user.aiCredits ?? aiCreditsConfigRef.current.defaultAmount);
                    setDbUser(user);
                } else {
                    console.log("No such user in db! Adding new one");
                    await createNewUser();
                }
            } catch (e) {
                console.error("Error from fetching document: ", e);
                showToast({
                    title: i18n.t("Something went wrong"),
                    body: i18n.t("Couldn't fetch user data."),
                    type: "error",
                });
                await handleLogOut();
            } finally {
                submittingRegistrationRef.current = false;
            }
        },
        [createNewUser],
    );

    const fetchUser = async () => {
        // Two guards, in order:
        //   1. authReady — token + Firebase currentUser are populated. Without
        //      this, a premature call to /api/User/Get would either 401 or
        //      race with session setup.
        //   2. emailVerified — even with a valid session, we don't load user
        //      data until the user has verified their email.
        if (IS_OSS) return null;
        if (!authReady) {
            return null;
        }
        const authUser = getAuthProvider().getCurrentUser();
        if (!authUser?.emailVerified) {
            return null;
        }
        try {
            const data = await Ajax.get({
                url: backendUrlFromPath("/api/User/Get"),
            });

            if (data?.data.Data) {
                const userData = data.data.Data as IEditorUser & {
                    isAdmin?: boolean;
                    isWhitelisted?: boolean;
                };
                setIsAdmin(userData.isAdmin === true);
                setIsWhitelisted(userData.isWhitelisted);

                return userData;
            }
            return null;
        } catch (error) {
            console.error("Error fetching user data:", error);
            return null;
        }
    };

    useEffect(() => {
        if (authReady) {
            void fetchUser();
        }
    }, [authReady]);

    const saveUser = async (updatedUser: IEditorUser) => {
        try {
            if (!updatedUser || !updatedUser.id) {
                showToast({body: i18n.t("User data is missing or incomplete"), type: "warning"});

                console.log("Cannot save user, user data is missing or incomplete");
                return;
            }

            await getRemoteDocStore().setDoc("users", updatedUser.id, updatedUser);
            console.log("User data saved successfully:");
            setDbUser(updatedUser);
        } catch (e) {
            console.error("Error saving document: ", e);
            showToast({type: "error", title: "Saving failed."});
        }
    };

    const refreshAiCredits = useCallback(async (): Promise<number | null> => {
        try {
            const authUser = getAuthProvider().getCurrentUser();
            if (!authUser) return null;
            const user = await getRemoteDocStore().getDoc<IEditorUser>("users", authUser.uid);
            if (user) {
                const newCredits = user.aiCredits ?? aiCreditsConfigRef.current.defaultAmount;
                setAiCredits(newCredits);
                return newCredits;
            }
            return null;
        } catch (e) {
            console.error("Error refreshing AI credits:", e);
            return null;
        }
    }, []);

    useEffect(() => {
        if (authReady) {
            void getUser();
        }
    }, [authReady, getUser]);

    const handleGetLikedGames = async () => {
        const res = await getLikedGames();
        if (res) {
            setLikedGamesIds(res);
        }
    };

    useEffect(() => {
        if (dbUser) {
            void handleGetLikedGames();
        }
    }, [dbUser]);

    useEffect(() => {
        const getRewardSceneContext = () => ({
            sceneId: global.app?.editor?.sceneID ?? undefined,
            creatorUserId: global.app?.editor?.projectUserId,
        });

        const handleAiModelGeneration = () => {
            void refreshAiCredits();
            emitRewardEvent({
                eventType: REWARD_EVENT_TYPES.AI_MODEL_GENERATED,
                ...getRewardSceneContext(),
            });
        };
        const handleAiImageGeneration = () => {
            void refreshAiCredits();
            emitRewardEvent({
                eventType: REWARD_EVENT_TYPES.AI_IMAGE_GENERATED,
                ...getRewardSceneContext(),
            });
        };
        const handleAiAssistantUsage = () => {
            void refreshAiCredits();
            emitRewardEvent({
                eventType: REWARD_EVENT_TYPES.AI_ASSISTANT_USED,
                ...getRewardSceneContext(),
            });
        };

        global.app?.on("aiModelGenerationResponse.AuthorizationContext", handleAiModelGeneration);
        global.app?.on("aiImageGenerationResponse.AuthorizationContext", handleAiImageGeneration);
        global.app?.on("aiAssistantResponse.AuthorizationContext", handleAiAssistantUsage);

        return () => {
            global.app?.on("aiModelGenerationResponse.AuthorizationContext", null);
            global.app?.on("aiImageGenerationResponse.AuthorizationContext", null);
            global.app?.on("aiAssistantResponse.AuthorizationContext", null);
        };
    }, [refreshAiCredits]);

    useEffect(() => {
        const getRewardSceneContext = () => ({
            sceneId: global.app?.editor?.sceneID ?? undefined,
            creatorUserId: global.app?.editor?.projectUserId,
        });

        const handleMultiplayerJoined = () => {
            emitRewardEvent({
                eventType: REWARD_EVENT_TYPES.MULTIPLAYER_JOINED,
                ...getRewardSceneContext(),
            });
        };
        const handleMultiplayerHosted = () => {
            emitRewardEvent({
                eventType: REWARD_EVENT_TYPES.MULTIPLAYER_HOSTED,
                ...getRewardSceneContext(),
            });
        };

        global.app?.on("multiplayerConnected.AuthorizationContext", handleMultiplayerJoined);
        global.app?.on("multiplayerHostStarted.AuthorizationContext", handleMultiplayerHosted);

        return () => {
            global.app?.on("multiplayerConnected.AuthorizationContext", null);
            global.app?.on("multiplayerHostStarted.AuthorizationContext", null);
        };
    }, []);

    useEffect(() => {
        const handleRewardTrack = async (input?: TrackRewardEventInput) => {
            if (!input?.eventType) return;

            try {
                const result = await trackRewardEvent(input);
                if (dbUser?.id) {
                    void refreshAiCredits();
                    window.setTimeout(() => void refreshAiCredits(), 1500);
                    window.setTimeout(() => void refreshAiCredits(), 4000);
                }
                global.app?.call(REWARD_APP_EVENTS.TRACKED, null, input, result);
            } catch (error) {
                console.warn("Reward tracking bridge failed:", error);
                global.app?.call(REWARD_APP_EVENTS.TRACK_FAILED, null, input, error);
            }
        };

        global.app?.on(`${REWARD_APP_EVENTS.TRACK}.AuthorizationContext`, handleRewardTrack);

        return () => {
            global.app?.on(`${REWARD_APP_EVENTS.TRACK}.AuthorizationContext`, null);
        };
    }, [dbUser?.id, refreshAiCredits]);

    // Post-purchase credit refresh: when redirected back from Stripe checkout
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("purchase") === "success") {
            const timer = setTimeout(() => {
                const purchaseKey = "reward.purchase.success";
                if (!window.sessionStorage.getItem(purchaseKey)) {
                    window.sessionStorage.setItem(purchaseKey, "1");
                    emitRewardEvent({
                        eventType: REWARD_EVENT_TYPES.CREDITS_PURCHASED,
                    });
                }
                void refreshAiCredits().then(() => {
                    showToast({type: "success", title: "Credits purchased successfully!"});
                });
                // Clean URL
                params.delete("purchase");
                const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "");
                window.history.replaceState({}, "", newUrl);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    return (
        <AuthorizationContext.Provider
            value={{
                onLogOut,
                isAuthorized,
                setIsAuthorized,
                userInitialized,
                handleLogOut,
                authToken,
                isInitializingAuth: initLoading,
                dbUser,
                setDbUser,
                likedGamesIds,
                setLikedGamesIds,
                handleGetLikedGames,
                saveUser,
                getUser,
                validateUsername,
                saveUsernameInFirebase,
                isAdmin,
                isWhitelisted,
                checkForAvatar,
                updateRecentlyViewed,
                fetchUser,
                isCollaborator,
                aiCredits,
                setAiCredits,
                refreshAiCredits,
                onboarding,
                setOnboarding,
            }}
        >
            {children}
        </AuthorizationContext.Provider>
    );
};

export default AuthorizationContextProvider;
