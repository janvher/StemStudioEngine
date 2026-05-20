import {setAnalyticsRecorder} from "@stem/editor-oss/analytics";

import {FirebaseAnalyticsRecorder} from "../analytics/FirebaseAnalyticsRecorder";

let registered = false;

/**
 * Register the Firebase-backed analytics recorder for the integrated
 * build. Lives in `shared/` because this is the seam where
 * `firebase/analytics` crosses into the engine. OSS builds never call
 * this; the factory falls through to `NullAnalyticsRecorder`.
 *
 * Idempotent.
 */
export function initIntegratedAnalytics(): void {
    if (registered) return;
    setAnalyticsRecorder(new FirebaseAnalyticsRecorder());
    registered = true;
}
