import {ROUTES} from "@web-shared/routes";

export function isAuthRoute(pathname: string) {
    return (
        pathname === ROUTES.LOGIN ||
        pathname === ROUTES.SIGN_UP ||
        pathname === ROUTES.REGISTER ||
        pathname === ROUTES.WAITLIST ||
        pathname === ROUTES.FORGOT_PASSWORD
    );
}

export function isDashboardDataRoute(pathname: string) {
    return (
        pathname === ROUTES.HOME ||
        pathname === ROUTES.DASHBOARD ||
        pathname === ROUTES.DISCOVER ||
        pathname === ROUTES.BROWSE ||
        pathname === ROUTES.REMIX ||
        pathname === ROUTES.SETTINGS ||
        pathname === ROUTES.ADMIN_PANEL ||
        pathname.startsWith("/game/")
    );
}
