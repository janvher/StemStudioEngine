type ErrorWithStatus = Error & {
    status?: number;
    response?: {
        status?: number;
    };
    code?: string;
};

export interface SceneLoadErrorDetails {
    status?: number;
    isAccessDenied: boolean;
    isNotFound: boolean;
    isNetwork: boolean;
}

/**
 * Normalizes scene-loading errors from API/axios/custom throws.
 * @param error
 */
export function getSceneLoadErrorDetails(error: unknown): SceneLoadErrorDetails {
    const err = error as ErrorWithStatus | undefined;
    const status = typeof err?.status === "number"
        ? err.status
        : typeof err?.response?.status === "number"
            ? err.response.status
            : undefined;

    const message = (err?.message || "").toLowerCase();
    const code = (err?.code || "").toLowerCase();
    const isNetwork = message.includes("network")
        || message.includes("fetch")
        || message.includes("timeout")
        || code === "err_network"
        || code === "econnaborted";

    return {
        status,
        isAccessDenied: status === 403 || message.includes("unauthorized") || message.includes("permission"),
        isNotFound: status === 404 || message.includes("not found"),
        isNetwork,
    };
}

/**
 *
 * @param error
 */
export function isSceneInaccessibleError(error: unknown): boolean {
    const details = getSceneLoadErrorDetails(error);
    return details.isAccessDenied || details.isNotFound;
}

