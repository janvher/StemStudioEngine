/*
 * Copyright 2017-2020 The ShadowEditor Authors. All rights reserved.
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file.
 *
 * For more information, please visit: https://github.com/tengge1/ShadowEditor
 * You can also visit: https://gitee.com/tengge1/ShadowEditor
 */
import MIMETypeUtils from "./MIMETypeUtils.js";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import axios, { AxiosError } from "axios";
import createError from "http-errors";
import pako from "pako";

let authToken: string | undefined = undefined;

export const axiosTokenConfig = (token: string | undefined) => {
    authToken = token;
};

export interface AjaxParams {
    url?: string;
    method?: string;
    data?: Record<string, unknown> | string | null;
    token?: string | null;
    multipart?: boolean;
    usesApiKey?: boolean;
    needAuthorization?: boolean;
    timeout?: number;
}

export const ajax = async (
    params: AjaxParams
): Promise<AxiosResponse | undefined> => {
    const url = params.url ?? "";
    const method = params.method ?? "GET";
    const data = params.data ?? null;
    const multipart = params.multipart ?? true;
    const usesApiKey = params.usesApiKey ?? false;
    const secure = params.needAuthorization ?? true;
    const timeout = params.timeout ?? 10000;

    const headers: Record<string, string> = {};
    if (!usesApiKey && secure) {
        if (authToken !== null) {
            headers["Authorization"] = `Bearer ${authToken}`;
        } else {
            throw new createError.Unauthorized();
        }
    }

    const request: AxiosRequestConfig = {
        method: method,
        url: url,
        headers,
        timeout: timeout
    };

    if (method !== "GET") {
        request["transformRequest"] = [
            (data: unknown, headers: Record<string, string>) => {
                if (typeof data === "string" && data.length > 1024) {
                    headers["Content-Encoding"] = "gzip";
                    const zippedData = pako.gzip(data);
                    console.log(
                        `API: compressing data: ${data.length} -> ${zippedData.length}`
                    );
                    return zippedData;
                }
                return data;
            }
        ];
    }

    if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
        let hasFile = false;
        let name: string;

        for (name in data) {
            if (data[name] instanceof Blob) {
                hasFile = true;
                break;
            }
        }

        if (hasFile || multipart) {
            if (hasFile) {
                const formData = new FormData();
                for (name in data) {
                    const value = data[name];
                    if (value instanceof File) {
                        formData.append(name, value);
                    } else if (value instanceof Blob) {
                        formData.append(
                            name,
                            value,
                            `${(value as File).name || 'blob'}.${MIMETypeUtils.getExtension(value.type)}`
                        );
                    }
                }
                request.data = formData;
            } else {
                const bodies = [];
                for (name in data) {
                    const value = data[name];
                    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                        bodies.push(name + "=" + encodeURIComponent(value));
                    }
                }
                const body = bodies.join("&");
                if (body.length) {
                    if (request.headers !== null) {
                        request.headers["Content-type"] = "application/x-www-form-urlencoded";
                    }
                }
                request.data = body;
            }
        } else {
            request.headers = { "Content-type": "application/json" };
            request.data = data;
        }
    }

    try {
        return await axios(request);
    } catch (error) {
        console.error(`ERROR: API request failed`);
        if (error instanceof AxiosError) {
            let msg = error.message;
            if (error.response) {
                msg = msg + ` with status code ${error.response.status}`;
            } else if (error.request) {
                msg = msg + " because no response was received";
            }
            console.error(`Error: ${msg}`);
        }

        throw error;
    }
};

export const post = async (
    params: AjaxParams
): Promise<AxiosResponse | undefined> => {
    return ajax({ ...params, method: "POST" });
};

export const get = async (
    params: AjaxParams
): Promise<AxiosResponse | undefined> => {
    return ajax({ ...params, method: "GET" });
};

const Ajax = {
    request: ajax,
    get,
    post
};

export default Ajax;
