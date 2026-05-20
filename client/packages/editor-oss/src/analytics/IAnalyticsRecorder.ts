export type AnalyticsParams = Record<string, string | number | boolean>;

/**
 * IAnalyticsRecorder is the seam between editor-side product analytics
 * (page views, button clicks, sign-in funnel) and any concrete
 * recording surface. Integrated mode wires Firebase Analytics; OSS
 * mode wires `NullAnalyticsRecorder` so events are silently dropped
 * (OSS doesn't ship telemetry).
 */
export interface IAnalyticsRecorder {
    /** Record a named event with arbitrary string/number/boolean params. */
    logEvent(name: string, params?: AnalyticsParams): void;
    /** Associate subsequent events with a user identifier. */
    setUserId(userId: string | undefined): void;
    /** Attach long-lived properties (plan tier, locale, etc.) to the user. */
    setUserProperties(params: AnalyticsParams): void;
}

/** Default no-op implementation. Used by OSS builds and as a fallback. */
export class NullAnalyticsRecorder implements IAnalyticsRecorder {
    logEvent(_name: string, _params?: AnalyticsParams): void {/* no-op */}
    setUserId(_userId: string | undefined): void {/* no-op */}
    setUserProperties(_params: AnalyticsParams): void {/* no-op */}
}
