import _ from "lodash";
import {useEffect, useRef, useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";

import {LoginBox} from "./LoginBox/LoginBox";
import {Wrapper} from "./LoginPage.style";
import {Onboarding} from "./Onboarding/Onboarding";
import {TOSText} from "./TOSText";
import {Waitlist} from "./Waitlist";
import {useAppGlobalContext, useAuthorizationContext} from "../../../context";
import global from "../../../global";
import {isSignUpRoutePath, ROUTES} from "@web-shared/routes";
import {showToast} from "../../../showToast";
import ApplicationAuthStore from "../../../userManagement/editorProfile/ApplicationAuthStore";
import {discordAuthenticateWithCode} from "../../../userManagement/utils/DiscordLoginWrapper";
import {PRODUCT_ANALYTICS_EVENTS, trackPageView, trackProductEvent} from "../../../utils/productAnalytics";
import {BackgroundShader} from "../Background/BackgroundShader";

export const LoginPage = () => {
    const {isAuthorized, dbUser, isWhitelisted, isInitializingAuth, setOnboarding, onboarding} =
        useAuthorizationContext();
    const authManagerRef = useRef(global.app?.authManager ?? new ApplicationAuthStore());
    const onCorrectAuthRef = useRef(false);
    const {setMainLoaderState} = useAppGlobalContext();
    const navigate = useNavigate();
    const location = useLocation();
    const signup = isSignUpRoutePath(location.pathname);
    const navigationOptions = {state: {from: signup ? ROUTES.SIGN_UP : ROUTES.LOGIN}};

    const [showWaitlist, setShowWaitlist] = useState(false);
    const [loading, setIsLoading] = useState(true);
    const [navigateTo, setNavigateTo] = useState<string | undefined>();
    const [isCompletingExternalAuth, setIsCompletingExternalAuth] = useState(false);

    const getReturnTo = () => {
        const params = new URLSearchParams(window.location.search);
        return (
            params.get("from") ||
            sessionStorage.getItem("loginRedirectFrom") ||
            (location.state?.from as string | undefined) ||
            ""
        );
    };

    useEffect(() => {
        if (showWaitlist && location.pathname !== ROUTES.WAITLIST && dbUser?.username) {
            void navigate(ROUTES.WAITLIST);
        }
    }, [dbUser?.username, location.pathname, navigate, showWaitlist]);

    useEffect(() => {
        const returnTo = getReturnTo();
        trackPageView("login", {
            signup_route: signup,
            return_to: returnTo,
        });
        trackProductEvent(PRODUCT_ANALYTICS_EVENTS.LOGIN_VIEWED, {
            signup_route: signup,
            return_to: returnTo,
        });
    }, [location.state, signup]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get("onboard") === "true") {
            setOnboarding(true);
        }
    }, [location.search]);

    const onCorrectAuth = () => {
        if (onCorrectAuthRef.current) {
            return;
        } else {
            onCorrectAuthRef.current = true;
        }
        const from = getReturnTo();
        if (!isWhitelisted) {
            console.log("USER NOT WHITELISTED");
            return;
        }
        const locationPath = location.pathname + location.search + location.hash;
        let navTo: string | undefined = ROUTES.DASHBOARD.toString();

        if (!_.isEmpty(from)) {
            navTo = from;
        } else if (
            !_.isEmpty(locationPath) &&
            location.pathname !== ROUTES.LOGIN &&
            !isSignUpRoutePath(location.pathname)
        ) {
            navTo = locationPath;
        }
        trackProductEvent(PRODUCT_ANALYTICS_EVENTS.SIGN_IN_SUCCEEDED, {
            destination: navTo || ROUTES.DASHBOARD,
            signup_route: signup,
        });
        setNavigateTo(navTo);
    };

    useEffect(() => {
        if (navigateTo && !isInitializingAuth && !onboarding && dbUser) {
            if (dbUser?.username) {
                sessionStorage.removeItem("loginRedirectFrom");
                if (navigateTo.includes("view.html?sceneID")) {
                    window.location.href = navigateTo;
                } else {
                    void navigate(navigateTo, {replace: true});
                }
            } else {
                setMainLoaderState({visible: true, message: ""});
                setTimeout(() => {
                    setOnboarding(true);
                }, 400);
            }
        }
    }, [navigateTo, dbUser, isInitializingAuth, onboarding, setMainLoaderState]);

    useEffect(() => {
        if (isInitializingAuth || isWhitelisted === undefined) {
            return;
        }

        if (isAuthorized && dbUser) {
            if (isWhitelisted) {
                // User is already authenticated and whitelisted, redirect to dashboard
                onCorrectAuth();
            } else {
                const loadOnboarding = !dbUser.username && isWhitelisted;
                setMainLoaderState({visible: loadOnboarding, message: ""});
                setOnboarding(loadOnboarding);
            }
        }
    }, [isAuthorized, dbUser, isWhitelisted, isInitializingAuth, setMainLoaderState]);

    useEffect(() => {
        if (isWhitelisted !== undefined) {
            setShowWaitlist(!isWhitelisted);
            if (dbUser) {
                setIsLoading(false);
            }
        } else if (!isInitializingAuth) {
            setTimeout(() => {
                setIsLoading(false);
            }, 400);
        }
    }, [isWhitelisted, isInitializingAuth, dbUser]);

    useEffect(() => {
        if (!isWhitelisted || !dbUser) return;

        if (dbUser.username) {
            onCorrectAuth();
        } else {
            void navigate(ROUTES.LOGIN + "?onboard=true");
        }
    }, [isWhitelisted, dbUser, navigate, location.pathname, isInitializingAuth]);

    useEffect(() => {
        if (showWaitlist || onboarding) {
            setIsLoading(false);
        }
    }, [onboarding, showWaitlist]);

    useEffect(() => {
        const fetchUser = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get("code");
            if (!code) return;

            setIsCompletingExternalAuth(true);
            try {
                await discordAuthenticateWithCode({authManager: authManagerRef.current, code, appLogin: true});

                onCorrectAuth();
            } catch (err) {
                console.error("Error during Discord login:", err);
                showToast({type: "error", title: "Error logging in with Discord"});
            } finally {
                setIsCompletingExternalAuth(false);
            }
        };

        if (!isInitializingAuth) {
            void fetchUser();
        }
    }, [isInitializingAuth]);

    useEffect(() => {
        setMainLoaderState({visible: isInitializingAuth || loading || isCompletingExternalAuth, message: ""});
    }, [isInitializingAuth, loading, isCompletingExternalAuth, setMainLoaderState]);

    const isRedirectingAuthenticatedUser =
        !isInitializingAuth && !onboarding && !!isAuthorized && !!dbUser && !!isWhitelisted;

    if (
        isInitializingAuth ||
        isCompletingExternalAuth ||
        isRedirectingAuthenticatedUser ||
        loading ||
        (!!navigateTo && !onboarding)
    ) {
        return null;
    }

    return (
        <Wrapper>
            <BackgroundShader />
            {onboarding && isWhitelisted ? (
                <Onboarding
                    onCorrectAuth={onCorrectAuth}
                    setOnboarding={setOnboarding}
                />
            ) : showWaitlist ? (
                <>
                    <Waitlist setShowWaitlist={setShowWaitlist} />
                    <TOSText navigationOptions={navigationOptions} />
                </>
            ) : (
                <LoginBox navigationOptions={navigationOptions} />
            )}
        </Wrapper>
    );
};
