import {NullAnalyticsRecorder, type IAnalyticsRecorder} from "./IAnalyticsRecorder";

let singleton: IAnalyticsRecorder | undefined;

/**
 * Returns the process-wide analytics recorder. Defaults to
 * `NullAnalyticsRecorder` (silent drop) until an integrated bootstrap
 * registers a real impl.
 */
export function getAnalyticsRecorder(): IAnalyticsRecorder {
    if (!singleton) {
        singleton = new NullAnalyticsRecorder();
    }
    return singleton;
}

/** Replace the singleton. Integrated bootstrap calls this with a Firebase-backed impl. */
export function setAnalyticsRecorder(recorder: IAnalyticsRecorder | undefined): void {
    singleton = recorder;
}
