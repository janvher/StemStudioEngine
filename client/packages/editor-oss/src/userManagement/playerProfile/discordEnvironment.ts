let isInsideDiscordCached: boolean | undefined;

export function isInDiscordEnvironment() {
    if (isInsideDiscordCached === undefined) {
        isInsideDiscordCached = (typeof location !== "undefined" && location.host?.includes("discordsays.com")) || false;
    }

    return isInsideDiscordCached;
}

export function getDiscordClientIdFromUrl() {
    return location.host.split(".")[0];
}
