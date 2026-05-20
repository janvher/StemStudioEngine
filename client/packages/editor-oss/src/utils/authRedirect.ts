import type {NavigateFunction} from "react-router-dom";

import {ROUTES} from "@web-shared/routes";
import {trackAuthGate} from "./productAnalytics";

export const redirectToLogin = (
    navigate: NavigateFunction,
    from: string = window.location.pathname + window.location.search + window.location.hash,
    source = "protected_action",
) => {
    trackAuthGate(source, from);
    void navigate(ROUTES.LOGIN, {state: {from}});
};
