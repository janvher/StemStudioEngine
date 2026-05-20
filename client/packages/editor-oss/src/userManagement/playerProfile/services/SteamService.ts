import {SteamPlayer} from "../../types";

/**
 * Steam API interface exposed via Electron preload script
 */
interface SteamAPI {
    isAvailable: () => boolean;
    getSteamId: () => string | null;
    getPersonaName: () => string | null;
    getAuthSessionTicket: () => Promise<string>;
}

/**
 * Get Steam user info from the preload-exposed Steam API
 */
export async function getSteamUser(): Promise<SteamPlayer | null> {
    try {
        console.log("🎮 [SteamService] getSteamUser() - Attempting to get Steam user info...");

        // Check for contextBridge-exposed Steam API (from preload script)
        const steamAPI = (window as any).steamAPI as SteamAPI | undefined;

        if (!steamAPI) {
            console.log("🎮 [SteamService] Steam API not available (not in Electron or preload not loaded)");
            return null;
        }

        if (!steamAPI.isAvailable()) {
            console.log("🎮 [SteamService] Steam SDK not initialized (Steam client may not be running)");
            return null;
        }

        // Get Steam user info
        const steamIdStr = steamAPI.getSteamId();
        const personaName = steamAPI.getPersonaName();

        if (!steamIdStr || !personaName) {
            console.log("🎮 [SteamService] Failed to get Steam user info");
            return null;
        }

        console.log("🎮 [SteamService] Steam user info retrieved:", {
            steam_id: steamIdStr.slice(0, 8) + "...",
            persona_name: personaName,
        });

        // Try to get auth session ticket
        let authTicket = "";
        try {
            authTicket = await steamAPI.getAuthSessionTicket();
        } catch (error) {
            console.warn("🎮 [SteamService] Failed to get auth session ticket:", error);
            // Continue without ticket
        }

        const steamPlayer: SteamPlayer = {
            steam_id: steamIdStr,
            persona_name: personaName,
            avatar_url: `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/00/default.jpg`,
            auth_ticket: authTicket,
        };

        return steamPlayer;
    } catch (error) {
        console.error("❌ [SteamService] Failed to get Steam user info:", error);
        return null;
    }
}
