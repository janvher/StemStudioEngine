// OSS stub for `firebase/analytics`. See firebase-app.ts for the rationale.
// Analytics is intentionally disabled in OSS so user installs aren't
// reporting to a SaaS-managed pipeline. All exports are silent no-ops.
/* eslint-disable @typescript-eslint/no-explicit-any */

export type Analytics = any;

export const getAnalytics = (..._args: any[]): Analytics => null;
export const logEvent = (..._args: any[]): void => {/* no-op */};
export const setUserId = (..._args: any[]): void => {/* no-op */};
export const setUserProperties = (..._args: any[]): void => {/* no-op */};
export const setAnalyticsCollectionEnabled = (..._args: any[]): void => {/* no-op */};
export const isSupported = async (): Promise<boolean> => false;
