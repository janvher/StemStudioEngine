// OSS stub for `firebase/app`. Aliased by vite.config.ts when BUILD_MODE=oss
// so the Firebase SDK never enters the OSS bundle. Editor-oss code that
// touches Firebase is already gated at runtime by `IS_OSS` (or by upstream
// `AuthorizationContext` short-circuits) — none of these functions execute
// in OSS, so throwing on call is safer than silently doing nothing.
/* eslint-disable @typescript-eslint/no-explicit-any */

const unreachable = (name: string): never => {
    throw new Error(`firebase/app.${name}() is not available in OSS builds`);
};

export interface FirebaseApp {
    name: string;
    options: Record<string, unknown>;
}

export const initializeApp = (..._args: any[]): FirebaseApp => unreachable("initializeApp");
export const getApps = (): FirebaseApp[] => [];
export const getApp = (..._args: any[]): FirebaseApp => unreachable("getApp");
export const deleteApp = async (..._args: any[]): Promise<void> => unreachable("deleteApp");
