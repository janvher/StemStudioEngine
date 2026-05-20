import {lazy, Suspense, useEffect, type ReactNode} from "react";
import {createBrowserRouter, RouterProvider} from "react-router-dom";

import {useAuthorizationContext} from "./context";
import global from "./global";
import {LocalizationObserver} from "./i18n/LocalizationObserver";
import {RouteErrorBoundary} from "./RouteErrorBoundary";
import {ROUTES} from "./routes";

const CreateDashboard = lazy(() =>
    import("./editor/assets/v2/CreateDashboard/CreateDashboard").then(m => ({default: m.CreateDashboard})),
);
const About = lazy(() => import("./v2/pages/About/About").then(m => ({default: m.About})));
const ContactUs = lazy(() => import("./v2/pages/ContactUs/ContactUs").then(m => ({default: m.ContactUs})));
const Create = lazy(() => import("./v2/pages/Create/Create").then(m => ({default: m.Create})));
const LoginPage = lazy(() => import("./v2/pages/LoginPage/LoginPage").then(m => ({default: m.LoginPage})));
const Player = lazy(() => import("./v2/pages/Player/Player").then(m => ({default: m.Player})));
const SearchResults = lazy(() =>
    import("./v2/pages/SearchResults/SearchResults").then(m => ({default: m.SearchResults})),
);
const StemEditor = lazy(() =>
    import("./v2/pages/StemEditor/StemEditor").then(m => ({default: m.StemEditor})),
);
const TermsAndPolicy = lazy(() =>
    import("./v2/pages/TermsAndPolicy/TermsAndPolicy").then(m => ({default: m.TermsAndPolicy})),
);
export const AppRouter = () => {
    const app = global?.app;
    const container = app?.container;
    const {isAuthorized, isWhitelisted, isInitializingAuth} = useAuthorizationContext();
    const hasPlatformAccess = isAuthorized && isWhitelisted !== false;

    const routerFutureSettings = {
        v7_startTransition: true,
        v7_fetcherPersist: true,
        v7_normalizeFormMethod: true,
        v7_partialHydration: true,
        v7_relativeSplatPath: true,
        v7_skipActionErrorRevalidation: true,
    };

    const noLocalize = (element: ReactNode) => <div data-no-localize="true">{element}</div>;
    const withRouteErrorBoundary = <T extends {element: ReactNode}>(routes: T[]) =>
        routes.map(route => ({
            ...route,
            errorElement: <RouteErrorBoundary />,
        }));

    const waitlistRouter = createBrowserRouter(
        withRouteErrorBoundary([
            {
                path: ROUTES.TERMS_OF_SERVICE,
                element: noLocalize(<TermsAndPolicy />),
            },
            {
                path: ROUTES.PRIVACY_POLICY,
                element: noLocalize(<TermsAndPolicy privacyPolicy />),
            },
            {
                path: ROUTES.THIRD_PARTY_ATTRIBUTIONS,
                element: noLocalize(<TermsAndPolicy attributions />),
            },
            {
                path: ROUTES.ABOUT,
                element: <About />,
            },
            {
                path: ROUTES.CONTACT_US,
                element: <ContactUs />,
            },
            {
                path: ROUTES.LOGIN,
                element: <LoginPage />,
            },
            {
                path: ROUTES.SIGN_UP,
                element: <LoginPage />,
            },
            {
                path: ROUTES.REGISTER,
                element: <LoginPage />,
            },
            {
                path: ROUTES.WAITLIST,
                element: <LoginPage />,
            },
            {
                path: ROUTES.FORGOT_PASSWORD,
                element: <LoginPage />,
            },
            {
                path: ROUTES.PLAY,
                element: <Player />,
            },
            {
                path: ROUTES.GAME_OVERVIEW,
                element: <CreateDashboard />,
            },
            {
                path: ROUTES.DASHBOARD,
                element: <LoginPage />,
            },
            {
                path: ROUTES.DISCOVER,
                element: <CreateDashboard />,
            },
            {
                path: ROUTES.BROWSE,
                element: <CreateDashboard />,
            },
            {
                path: ROUTES.HOME,
                element: <CreateDashboard />,
            },
            {
                path: "*",
                element: <LoginPage />,
            },
        ]),
        {
            future: routerFutureSettings as any,
        },
    );

    const router = createBrowserRouter(
        withRouteErrorBoundary([
            {
                path: ROUTES.SEARCH_RESULTS,
                element: <SearchResults />,
            },
            {
                path: ROUTES.VIEW_MORE,
                element: <SearchResults />,
            },
            {
                path: ROUTES.SETTINGS,
                element: hasPlatformAccess ? <CreateDashboard /> : <LoginPage />,
            },
            {
                path: ROUTES.DASHBOARD,
                element: hasPlatformAccess ? <CreateDashboard /> : <LoginPage />,
            },
            {
                path: ROUTES.MY_AVATARS,
                element: hasPlatformAccess ? <CreateDashboard /> : <LoginPage />,
            },
            {
                path: ROUTES.MY_AVATARS_NEW,
                element: hasPlatformAccess ? <CreateDashboard /> : <LoginPage />,
            },
            {
                path: ROUTES.MY_AVATARS_EDIT,
                element: hasPlatformAccess ? <CreateDashboard /> : <LoginPage />,
            },
            {
                path: ROUTES.PLAY,
                element: <Player />,
            },
            {
                path: ROUTES.LOGIN,
                element: <LoginPage />,
            },
            {
                path: ROUTES.SIGN_UP,
                element: <LoginPage />,
            },
            {
                path: ROUTES.REGISTER,
                element: <LoginPage />,
            },
            {
                path: ROUTES.WAITLIST,
                element: <LoginPage />,
            },
            {
                path: ROUTES.FORGOT_PASSWORD,
                element: <LoginPage />,
            },
            {
                path: ROUTES.CREATE_PROJECT,
                element: hasPlatformAccess ? <Create /> : <LoginPage />,
            },
            {
                path: ROUTES.CREATE_PROJECT_WITH_ID,
                element: hasPlatformAccess ? <Create /> : <LoginPage />,
            },
            {
                path: ROUTES.REMIX,
                element: <CreateDashboard />,
            },
            {
                path: ROUTES.DISCOVER,
                element: <CreateDashboard />,
            },
            {
                path: ROUTES.BROWSE,
                element: <CreateDashboard />,
            },
            {
                path: ROUTES.STEM_EDITOR,
                element: hasPlatformAccess ? <StemEditor /> : <LoginPage />,
            },
            {
                path: ROUTES.TERMS_OF_SERVICE,
                element: noLocalize(<TermsAndPolicy />),
            },
            {
                path: ROUTES.PRIVACY_POLICY,
                element: noLocalize(<TermsAndPolicy privacyPolicy />),
            },
            {
                path: ROUTES.THIRD_PARTY_ATTRIBUTIONS,
                element: noLocalize(<TermsAndPolicy attributions />),
            },
            {
                path: ROUTES.ABOUT,
                element: <About />,
            },
            {
                path: ROUTES.CONTACT_US,
                element: <ContactUs />,
            },
            {
                path: ROUTES.ADMIN_PANEL,
                element: hasPlatformAccess ? <CreateDashboard /> : <LoginPage />,
            },
            {
                path: ROUTES.GAME_OVERVIEW,
                element: <CreateDashboard />,
            },
            {
                path: ROUTES.HOME,
                element: <CreateDashboard />,
            },
            {
                path: "*",
                element: <CreateDashboard />,
            },
        ]),
        {
            future: routerFutureSettings as any,
        },
    );

    useEffect(() => {
        if (!container) return;

        const handleContextMenu = (event: MouseEvent) => {
            const contextMenuPathsToBlock: string[] = [ROUTES.CREATE_PROJECT, ROUTES.CREATE_PROJECT_WITH_ID, "/stem-editor"];
            if (contextMenuPathsToBlock.some(path => window.location.pathname.includes(path))) {
                event.preventDefault();
                app?.call("contextmenu", null, event);
            } else {
                event.stopPropagation();
            }
        };

        container.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("contextmenu", handleContextMenu);

        return () => {
            container.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("contextmenu", handleContextMenu);
        };
    }, [container, window.location.pathname]);

    if (isWhitelisted === false && !isInitializingAuth) {
        return (
            <Suspense fallback={null}>
                <LocalizationObserver />
                <RouterProvider router={waitlistRouter} />
            </Suspense>
        );
    }

    return (
        <Suspense fallback={null}>
            <LocalizationObserver />
            <RouterProvider router={router} />
        </Suspense>
    );
};
