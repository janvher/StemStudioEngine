/**
 * CopilotClient
 *
 * HTTP client for the Copilot backend server.
 * Base URL is resolved from REACT_APP_COPILOT_SERVER_URL env variable,
 * falling back to localhost:3000.
 *
 * Every request automatically includes an `Authorization: Bearer <token>` header
 * sourced from `global.app?.authManager?.getAuthToken()` (Firebase ID token).
 */

import global from "../../global";

const BASE_URL = (process.env.REACT_APP_COPILOT_SERVER_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 *
 */
function getAuthToken(): string | null {
    return global.app?.authManager?.getAuthToken() ?? null;
}

type RequestOptions = {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    headers?: Record<string, string>;
    signal?: AbortSignal;
};

export class CopilotClient {
    private static instance: CopilotClient | null = null;

    private readonly baseUrl: string;

    private constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    public static getInstance(): CopilotClient {
        if (!CopilotClient.instance) {
            CopilotClient.instance = new CopilotClient(BASE_URL);
        }
        return CopilotClient.instance;
    }

    /** Reset singleton (useful for testing or environment changes). */
    public static resetInstance(): void {
        CopilotClient.instance = null;
    }

    private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
        const {method = "GET", body, headers = {}, signal} = options;

        const authToken = getAuthToken();
        const authHeaders: Record<string, string> = authToken ? {Authorization: `Bearer ${authToken}`} : {};

        const init: RequestInit = {
            method,
            headers: {
                "Content-Type": "application/json",
                ...authHeaders,
                ...headers,
            },
            signal,
        };

        if (body !== undefined) {
            init.body = JSON.stringify(body);
        }

        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, init);

        if (!response.ok) {
            let message = `CopilotClient: ${method} ${url} failed with status ${response.status}`;
            try {
                const errBody = (await response.json()) as {error?: string};
                if (errBody.error) message += ` — ${errBody.error}`;
            } catch {
                // ignore JSON parse errors
            }
            throw new Error(message);
        }

        return response.json() as Promise<T>;
    }

    // ------------------------------------------------------------------
    // Convenience wrappers
    // ------------------------------------------------------------------

    get<T>(path: string, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
        return this.request<T>(path, {...options, method: "GET"});
    }

    post<T>(path: string, body: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
        return this.request<T>(path, {...options, method: "POST", body});
    }

    // ------------------------------------------------------------------
    // Health check
    // ------------------------------------------------------------------

    health(): Promise<{status: string; timestamp: string; uptime: number}> {
        return this.get("/health");
    }
}

export const copilotClient = CopilotClient.getInstance();
