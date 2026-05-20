import {afterEach, describe, expect, it, vi} from "vitest";

import global from "../global";
import {backendUrlFromPath, baseApiUrl} from "./UrlUtils";

vi.mock("../userManagement/playerProfile/game-service-controllers", () => ({
    DiscordController: {
        isInDiscord: () => false,
    },
}));

describe("UrlUtils", () => {
    afterEach(() => {
        global.app = null;
    });

    it("falls back to the current origin when global.app is unavailable", () => {
        global.app = null;

        expect(baseApiUrl()).toBe(window.location.origin);
        expect(backendUrlFromPath("/api/User/Get")).toBe(`${window.location.origin}/api/User/Get`);
    });

    it("uses the application server when global.app is available", () => {
        global.app = {
            options: {
                server: "https://api.example.com",
            },
        } as any;

        expect(baseApiUrl()).toBe("https://api.example.com");
        expect(backendUrlFromPath("/api/User/Get")).toBe("https://api.example.com/api/User/Get");
    });
});
