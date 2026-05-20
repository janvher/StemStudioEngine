export type BackendMode = "remote" | "local";

export type BackendEntrypoint = "editor" | "play";

export type BackendAdapter = {
    mode: BackendMode;
    entrypoint: BackendEntrypoint;
    server: string;
};

const BACKEND_MODE_QUERY_KEYS = ["backend", "adapter"];
const LOCAL_SERVER_QUERY_KEYS = ["localBackendUrl", "localServer"];
const BACKEND_MODE_STORAGE_KEY = "stem.backend.mode";

declare global {
    interface Window {
        __STEM_BACKEND_ADAPTER__?: BackendAdapter;
    }
}

const readQueryParam = (keys: string[]): string | null => {
    const params = new URLSearchParams(window.location.search);
    for (const key of keys) {
        const value = params.get(key)?.trim();
        if (value) return value;
    }
    return null;
};

const normalizeMode = (value?: string | null): BackendMode | null => {
    if (!value) return null;
    const normalized = value.toLowerCase();
    if (normalized === "local") return "local";
    if (normalized === "remote") return "remote";
    return null;
};

const resolveMode = (): BackendMode => {
    const fromQuery = normalizeMode(readQueryParam(BACKEND_MODE_QUERY_KEYS));
    if (fromQuery) {
        window.localStorage.setItem(BACKEND_MODE_STORAGE_KEY, fromQuery);
        return fromQuery;
    }

    const fromStorage = normalizeMode(window.localStorage.getItem(BACKEND_MODE_STORAGE_KEY));
    if (fromStorage) return fromStorage;

    const fromEnv = normalizeMode(process.env.REACT_ENGINE_BACKEND_MODE as string | undefined);
    if (fromEnv) return fromEnv;

    return "remote";
};

const resolveLocalServerOrigin = (): string => {
    const fromQuery = readQueryParam(LOCAL_SERVER_QUERY_KEYS);
    const fromEnv = (process.env.REACT_ENGINE_LOCAL_BACKEND_URL as string | undefined)?.trim();
    const candidate = fromQuery || fromEnv;

    if (candidate) {
        try {
            return new URL(candidate, window.location.origin).origin;
        } catch {
            // fall back to default below
        }
    }

    return `${window.location.protocol}//${window.location.hostname}:3030`;
};

export const createBackendAdapter = (entrypoint: BackendEntrypoint): BackendAdapter => {
    const mode = resolveMode();
    const server = mode === "local" ? resolveLocalServerOrigin() : window.location.origin;
    const adapter: BackendAdapter = {mode, entrypoint, server};
    window.__STEM_BACKEND_ADAPTER__ = adapter;
    return adapter;
};

export const getBackendAdapter = (): BackendAdapter | null => {
    return window.__STEM_BACKEND_ADAPTER__ ?? null;
};

export const isLocalBackendMode = (): boolean => {
    const adapter = getBackendAdapter();
    if (adapter) return adapter.mode === "local";
    return resolveMode() === "local";
};
