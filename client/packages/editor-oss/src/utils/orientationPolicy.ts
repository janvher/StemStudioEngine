import {DetectDevice} from "./DetectDevice";

export type DeviceOrientation = "portrait" | "landscape";

export type OrientationPolicy =
    | "any"
    | "preferPortrait"
    | "preferLandscape"
    | "requirePortrait"
    | "requireLandscape";

export const DEFAULT_ORIENTATION_POLICY: OrientationPolicy = "any";

export const getCurrentDeviceOrientation = (): DeviceOrientation => {
    if (typeof window === "undefined") return "landscape";
    return window.innerHeight >= window.innerWidth ? "portrait" : "landscape";
};

export const getOrientationTarget = (policy: OrientationPolicy): DeviceOrientation | null => {
    switch (policy) {
        case "preferPortrait":
        case "requirePortrait":
            return "portrait";
        case "preferLandscape":
        case "requireLandscape":
            return "landscape";
        case "any":
        default:
            return null;
    }
};

export const isOrientationRequired = (policy: OrientationPolicy): boolean =>
    policy === "requirePortrait" || policy === "requireLandscape";

export const shouldApplyOrientationPolicy = (policy: OrientationPolicy): boolean =>
    policy !== "any" && DetectDevice.isMobile();

export const doesOrientationMatchPolicy = (
    policy: OrientationPolicy,
    currentOrientation: DeviceOrientation = getCurrentDeviceOrientation(),
): boolean => {
    const target = getOrientationTarget(policy);
    if (!target) return true;
    return target === currentOrientation;
};

export const requestOrientationLock = async (policy: OrientationPolicy): Promise<boolean> => {
    const target = getOrientationTarget(policy);
    if (!target || typeof window === "undefined") return false;

    const orientationApi = window.screen?.orientation as ScreenOrientation | undefined;
    if (!orientationApi || typeof orientationApi.lock !== "function") return false;

    try {
        await orientationApi.lock(target);
        return true;
    } catch {
        return false;
    }
};
