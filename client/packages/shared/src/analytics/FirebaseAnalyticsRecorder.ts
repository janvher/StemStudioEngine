import {logEvent, setUserId, setUserProperties, type Analytics} from "firebase/analytics";

import type {AnalyticsParams, IAnalyticsRecorder} from "@stem/editor-oss/analytics";

import {analytics as defaultAnalytics} from "../firebase";

/**
 * Firebase-backed analytics recorder. Adapts the firebase/analytics
 * module to the brand-neutral `IAnalyticsRecorder` interface.
 * Lives in `shared/` so editor-oss stays free of `firebase/analytics`
 * imports.
 *
 * The Firebase `Analytics` handle is lazily resolved from the shared
 * firebase module — when that module returns null (initialization
 * failed or analytics is disabled in this build), each call falls
 * through to `window.gtag` for compatibility with the legacy
 * GA snippet, then silently no-ops.
 */
export class FirebaseAnalyticsRecorder implements IAnalyticsRecorder {
    private readonly analytics: Analytics | null;

    constructor(analytics: Analytics | null = defaultAnalytics) {
        this.analytics = analytics;
    }

    logEvent(name: string, params: AnalyticsParams = {}): void {
        try {
            if (this.analytics) {
                logEvent(this.analytics, name, params);
                return;
            }
            if (typeof window !== "undefined") {
                (window as unknown as {gtag?: (cmd: "event", name: string, params: AnalyticsParams) => void})
                    .gtag?.("event", name, params);
            }
        } catch (error) {
            console.debug("[analytics] failed to log event", name, error);
        }
    }

    setUserId(userId: string | undefined): void {
        if (!this.analytics || !userId) return;
        try {
            setUserId(this.analytics, userId);
        } catch (error) {
            console.debug("[analytics] failed to set userId", error);
        }
    }

    setUserProperties(params: AnalyticsParams): void {
        if (!this.analytics) return;
        try {
            setUserProperties(this.analytics, params);
        } catch (error) {
            console.debug("[analytics] failed to set user properties", error);
        }
    }
}
