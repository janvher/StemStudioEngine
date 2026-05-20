
/**
 * Module: Ajax.ts
 * Purpose: Contains logic for ajax.
 */


import axios, {AxiosError, type AxiosRequestConfig, type AxiosResponse} from "axios";
import * as pako from "pako";

import MIMETypeUtils from "./MIMETypeUtils";
import {getAuthProvider} from "../auth";
import global from "../global";
import {IS_OSS} from "../mode/buildMode";

// Create axios instance with keep-alive configuration
const axiosInstance = axios.create({
    timeout: 90000, // Default 90 second timeout - can be overridden per request
});

let refreshTokenPromise: Promise<string | null> | null = null;

/**
 * Resolve the auth token to attach to a request, falling back through explicit
 * token, app-managed token, and Firebase's current user.
 * @param explicitToken Token supplied directly by the caller, used as-is when present.
 * @returns The resolved bearer token, or null when no token is available.
 */
async function resolveAuthToken(explicitToken?: string | null): Promise<string | null> {
    if (explicitToken) {
        return explicitToken;
    }

    const appToken = global.app?.authManager?.getAuthToken() ?? null;
    if (appToken) {
        return appToken;
    }

    const user = getAuthProvider().getCurrentUser();
    if (!user) {
        return null;
    }

    try {
        return await user.getIdToken();
    } catch {
        return null;
    }
}

/**
 * Force-refresh the Firebase ID token and propagate the new value to the app
 * auth manager. Concurrent callers share a single in-flight refresh.
 * @returns The refreshed token, or null when no Firebase user is signed in or the refresh fails.
 */
async function refreshAuthToken(): Promise<string | null> {
    if (refreshTokenPromise) {
        return refreshTokenPromise;
    }

    refreshTokenPromise = (async () => {
        const user = getAuthProvider().getCurrentUser();
        if (!user) {
            return null;
        }

        try {
            const token = await user.getIdToken(true);
            global.app?.call("updateToken", null, token);
            global.app?.authManager.setAuthToken(token);
            return token;
        } catch {
            return null;
        } finally {
            refreshTokenPromise = null;
        }
    })();

    return refreshTokenPromise;
}

/**
 *
 */
function handleLoggedOut(): void {
    // OSS has no auth — never bounce the user to "/" because a stray /api/*
    // call returned 401. The integrated build still uses the boot-to-login flow.
    if (IS_OSS) return;
    global.app?.authManager.setAuthToken(null);
    if (window.location.pathname !== "/") {
        window.location.href = "/";
    }
}

// Calculate dynamic timeout based on expected file size
/**
 *
 * @param contentLength
 */
function calculateTimeout(contentLength?: number): number {
    if (!contentLength) return 90000; // Default 90 seconds

    // Base timeout: 90 seconds + additional time based on file size
    // Assume 1MB/second download speed as baseline (conservative)
    const baseTimeout = 90000;
    const sizeBasedTimeout = 5 * (contentLength / (1024 * 1024)) * 1000; // 5 seconds per MB
    const maxTimeout = 300000; // Cap at 5 minutes

    return Math.min(baseTimeout + sizeBasedTimeout, maxTimeout);
}

export interface AjaxParams {
    url?: string;
    method?: string;
    data?: any;
    token?: string | null;
    msgBodyType?: "multipart" | "urlEncoded" | "json";
    usesApiKey?: boolean;
    needAuthorization?: boolean;
    signal?: AbortSignal;
    timeout?: number;
    expectedSize?: number; // Expected content length for dynamic timeout calculation
    responseType?: AxiosRequestConfig["responseType"];
}

export const ajax = async (params: AjaxParams): Promise<AxiosResponse | undefined> => {
    const signal = params.signal;
    const url = params.url || "";
    const method = params.method || "GET";
    const data = params.data || null;
    const msgBodyType = params.msgBodyType ?? "urlEncoded";
    const usesApiKey = params.usesApiKey ?? false;
    const secure = params.needAuthorization ?? true;
    const token = await resolveAuthToken(params.token ?? null);

    //TODO: backend requires refactoring to support gzip encoding
    let headers: Record<string, string> = {};
    if (!usesApiKey && token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    if (!usesApiKey && secure && !token) {
        throw new Error("Unauthorized ajax error");
    }

    // Calculate timeout based on expected size or use provided timeout
    const requestTimeout = params.timeout || calculateTimeout(params.expectedSize);

    let request = {
        method: method,
        url: url,
        headers,
        signal,
        timeout: requestTimeout,
        responseType: params.responseType,
    } as AxiosRequestConfig & {_retry?: boolean};

    if (method !== "GET") {
        request["transformRequest"] = [
            (data, headers) => {
                if (typeof data === "string" && data.length > 1024) {
                    headers["Content-Encoding"] = "gzip";
                    let zippedData = pako.gzip(data);
                    console.log(`API: compressing data: ${data.length} -> ${zippedData.length}`);
                    return zippedData;
                }
                return data;
            },
        ];
    }

    if (data) {
        let hasFile = false,
            name;

        for (name in data) {
            if (data[name] instanceof Blob || data[name] instanceof File) {
                hasFile = true;
                break;
            }
        }

        if (hasFile || msgBodyType !== "json") {
            if (hasFile || msgBodyType === "multipart") {

                let formData = new FormData();

                for (name in data) {
                    if (data[name] instanceof File) {
                        formData.append(name, data[name]);
                    } else if (data[name] instanceof Blob) {
                        formData.append(
                            name,
                            data[name],
                            `${data[name].name}.${MIMETypeUtils.getExtension(data[name].type)}`,
                        );
                    } else if (typeof data[name] === "object") {
                        formData.append(name, JSON.stringify(data[name]));
                    } else {
                        formData.append(name, data[name]);
                    }
                }

                request.data = formData;
            } else if (msgBodyType === "urlEncoded") {

                let bodies = [];
                for (name in data) {
                    bodies.push(name + "=" + encodeURIComponent(data[name]));
                }

                let body = bodies.join("&");
                if (body.length) {
                    request.headers!["Content-type"] = "application/x-www-form-urlencoded";
                }

                request.data = body;
            }
        } else {
            request.headers!["Content-type"] = "application/json";
            request.data = typeof data === "string" ? data : JSON.stringify(data);
        }
    }

    try {
        return await axiosInstance(request);
    } catch (error) {
        console.error(`ERROR: API request failed`);
        console.error(request);
        if (error instanceof AxiosError) {
            const axiosError = error as AxiosError;
            let msg = axiosError.message;
            if (axiosError.response) {
                msg = msg + ` with status code ${axiosError.response.status}`;
            } else if (axiosError.request) {
                msg = msg + " because no response was received";
            }

            console.error(`API failed : ${msg}`);

            if (axiosError.response?.status === 401) {
                if (!request._retry) {
                    const refreshedToken = await refreshAuthToken();
                    if (refreshedToken) {
                        const retryRequest = {
                            ...request,
                            headers: {
                                ...(request.headers || {}),
                                Authorization: `Bearer ${refreshedToken}`,
                            },
                            _retry: true,
                        } as AxiosRequestConfig & {_retry?: boolean};

                        try {
                            return await axiosInstance(retryRequest);
                        } catch (retryError) {
                            if (retryError instanceof AxiosError && retryError.response?.status === 401) {
                                handleLoggedOut();
                            }
                            throw retryError;
                        }
                    }
                }

                handleLoggedOut();
            }
        }

        throw error;
    }
};

export const post = async (params: AjaxParams): Promise<AxiosResponse | undefined> => {
    return ajax({...params, method: "POST"});
};

export const ajaxDelete = async (params: AjaxParams): Promise<AxiosResponse | undefined> => {
    return ajax({...params, method: "DELETE"});
};

export const put = async (params: AjaxParams): Promise<AxiosResponse | undefined> => {
    return ajax({...params, method: "PUT"});
};

export const get = async (params: AjaxParams): Promise<AxiosResponse | undefined> => {
    return ajax({...params, method: "GET"});
};

const Ajax = {
    request: ajax,
    get,
    post,
    put,
    ajaxDelete,
};

export default Ajax;
