import {getAnalyticsRecorder} from "../analytics";

export const PRODUCT_ANALYTICS_EVENTS = {
    PAGE_VIEW: "product_page_view",
    NAV_CLICK: "product_nav_click",
    AUTH_GATE_SHOWN: "auth_gate_shown",
    LOGIN_VIEWED: "login_viewed",
    SIGN_IN_ATTEMPTED: "sign_in_attempted",
    SIGN_IN_SUCCEEDED: "sign_in_succeeded",
    SIGN_IN_FAILED: "sign_in_failed",
    SIGN_UP_ATTEMPTED: "sign_up_attempted",
    SIGN_UP_SUCCEEDED: "sign_up_succeeded",
    SIGN_UP_FAILED: "sign_up_failed",
    PASSWORD_RESET_ATTEMPTED: "password_reset_attempted",
    OAUTH_ATTEMPTED: "oauth_attempted",
    HOME_EXAMPLE_SELECTED: "home_example_selected",
    HOME_PROMPT_SUBMITTED: "home_prompt_submitted",
    START_FROM_SCRATCH_CLICKED: "start_from_scratch_clicked",
    CREATE_PROMPT_SUBMITTED: "create_prompt_submitted",
    CREATE_BLANK_STARTED: "create_blank_started",
    TEMPLATE_REMIX_STARTED: "template_remix_started",
    GAME_CARD_OPENED: "game_card_opened",
    GAME_PLAY_CLICKED: "game_play_clicked",
    GAME_REMIX_CLICKED: "game_remix_clicked",
    GAME_LIKE_CLICKED: "game_like_clicked",
    GAME_SHARE_CLICKED: "game_share_clicked",
    GAME_DETAIL_VIEWED: "game_detail_viewed",
    USER_CONTEXT_SET: "user_context_set",
} as const;

export type ProductAnalyticsEvent =
    (typeof PRODUCT_ANALYTICS_EVENTS)[keyof typeof PRODUCT_ANALYTICS_EVENTS];

export type ProductAnalyticsParams = Record<string, string | number | boolean | null | undefined>;

type DebugAnalyticsEvent = {
    name: ProductAnalyticsEvent;
    params: Record<string, string | number | boolean>;
};

declare global {
    interface Window {
        __STEM_ANALYTICS_EVENTS__?: DebugAnalyticsEvent[];
    }
}

const sanitizeParams = (params?: ProductAnalyticsParams): Record<string, string | number | boolean> => {
    const sanitized: Record<string, string | number | boolean> = {};
    if (!params) return sanitized;

    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        sanitized[key] = value;
    }

    return sanitized;
};

export const trackProductEvent = (
    name: ProductAnalyticsEvent,
    params?: ProductAnalyticsParams,
) => {
    const payload = sanitizeParams(params);

    if (typeof window !== "undefined" && Array.isArray(window.__STEM_ANALYTICS_EVENTS__)) {
        window.__STEM_ANALYTICS_EVENTS__.push({name, params: payload});
    }

    getAnalyticsRecorder().logEvent(name, payload);
};

export const trackPageView = (page: string, params?: ProductAnalyticsParams) => {
    trackProductEvent(PRODUCT_ANALYTICS_EVENTS.PAGE_VIEW, {
        page,
        path: typeof window !== "undefined" ? window.location.pathname : "",
        ...params,
    });
};

export const trackNavigationClick = (destination: string, source: string) => {
    trackProductEvent(PRODUCT_ANALYTICS_EVENTS.NAV_CLICK, {
        destination,
        source,
    });
};

export const trackAuthGate = (source: string, returnTo: string) => {
    trackProductEvent(PRODUCT_ANALYTICS_EVENTS.AUTH_GATE_SHOWN, {
        source,
        return_to: returnTo,
    });
};

export const setProductAnalyticsUser = (
    userId: string | undefined,
    params?: ProductAnalyticsParams,
) => {
    if (!userId) return;
    const recorder = getAnalyticsRecorder();
    recorder.setUserId(userId);
    recorder.setUserProperties(sanitizeParams(params));
    trackProductEvent(PRODUCT_ANALYTICS_EVENTS.USER_CONTEXT_SET, {
        user_id_set: true,
        ...params,
    });
};
