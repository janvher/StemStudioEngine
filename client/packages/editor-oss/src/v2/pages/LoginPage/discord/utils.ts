import {IDiscordUser} from "@stem/network/api/discord";

const DISCORD_API_BASE_URL = "https://discord.com/api";

export default class DiscordUtils {
    public static async getUserDataFromToken(authToken: string): Promise<IDiscordUser> {
        try {
            const response = await fetch(`${DISCORD_API_BASE_URL}/users/@me`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });

            if (!response.ok) {
                console.error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
                throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
            }

            const responseJson = await response.json();

            // Get user data
            const username = responseJson.username;
            const id = responseJson.id;
            const displayName = responseJson.global_name || username;
            const email = responseJson.email;
            const discriminator = responseJson.discriminator;
            const avatarUrl = responseJson.avatar
                ? `https://cdn.discordapp.com/avatars/${responseJson.id}/${responseJson.avatar}.png`
                : `https://cdn.discordapp.com/embed/avatars/${discriminator}.png`; // Default avatar if no avatar set

            return {username, displayName, avatarUrl, id, email, discriminator};
        } catch (error) {
            console.error("Error in getUserDataFromToken:", error);
            throw error;
        }
    }
}
