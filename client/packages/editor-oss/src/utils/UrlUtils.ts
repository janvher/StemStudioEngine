import {FileData} from "../editor/assets/v2/types/file";
import global from "../global";
import {isInDiscordEnvironment} from "../userManagement/playerProfile/discordEnvironment";

const getFallbackServer = (): string => window.location.origin;
const MULTIPLAYER_API_SERVER = process.env.REACT_APP_MULTIPLAYER_API_SERVER;

const getServerBase = (isMp = false): string => {
    if (isMp && MULTIPLAYER_API_SERVER) {
        return MULTIPLAYER_API_SERVER;
    }

    const server = global.app?.options?.server;

    return server || getFallbackServer();
};

export const baseApiUrl = (): string => {
    const inDiscord = isInDiscordEnvironment();
    if (inDiscord) {
        return discordProxyUrlFromPath("");
    }
    return getServerBase();
};

export const backendUrlFromPath = (url: string | FileData | null, isMp = false): string | undefined => {
    if (url) {
        if (typeof url !== "string") {
            url = url.Url;
        }
        url = url.trim();
        if (url.indexOf("http") === -1) {
            const isApiUrl = url.indexOf("/api/") >= 0;
            const inDiscord = isInDiscordEnvironment();
            if (inDiscord && isApiUrl) {
                url = discordProxyUrlFromPath(url);
            } else {
                url = `${getServerBase(isMp)}${url}`;
            }
        }
    }
    return url ?? "";
};

export const backendWebSocketUrlFromPath = (url: string): string => {
    const server = getServerBase();
    if (url.indexOf("wss") === -1) {
        if (url.indexOf("http") > -1) {
            url = `${server.replace("http", "wss")}${url}`;
        } else if (url.indexOf("https") > -1) {
            url = `${server.replace("https", "wss")}${url}`;
        }
    }
    return url;
};

export const discordProxyUrlFromPath = (resourcePath: string): string => {
    return `${window.location.protocol}//${window.location.hostname}/.proxy${resourcePath}`;
};

export const isLocal = (): boolean => {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
};
