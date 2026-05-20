import {
    DiscordUser,
    DiscordGuild,
    DiscordRelationship,
    DiscordChannel,
    getDiscordUser,
    getDiscordGuilds,
    getDiscordFriends,
    getDiscordGuildChannels,
    sendDiscordMessage,
    isGuildOwner,
    hasAdminPermissions,
    updateDiscordStatus,
} from "@stem/network/api/discord";
import EventBus from "../../../behaviors/event/EventBus";
import global from "../../../global";
import ApplicationAuthStore from "../../editorProfile/ApplicationAuthStore";
/**
 * Discord Service for behaviors to interact with Discord API
 * This service provides a bridge between behaviors and the Discord API endpoints
 */
export class DiscordService {
    private cachedUser: DiscordUser | null = null;
    private cachedGuilds: DiscordGuild[] | null = null;
    private cachedFriends: DiscordRelationship[] | null = null;
    private authManager: ApplicationAuthStore | null = null;

    constructor() {
        this.authManager = global.app?.authManager as ApplicationAuthStore;
        // Listen for Discord authentication events
        EventBus.instance.subscribe("discordAuthSuccess", this.handleAuthSuccess.bind(this));
        EventBus.instance.subscribe("discordAuthFailed", this.handleAuthFailed.bind(this));
    }

    /**
     * Handle successful Discord authentication
     * @param user
     */
    private handleAuthSuccess(user: unknown): void {
        // The token should be available from the auth manager

        if (this.authManager?.getDiscordAccessToken()) {
            // Clear cache when new auth happens
            this.clearCache();
            EventBus.instance.send("discord.authenticated", {user});
        }
    }

    /**
     * Handle failed Discord authentication
     */
    private handleAuthFailed(): void {
        this.clearCache();
        EventBus.instance.send("discord.authFailed");
    }

    /**
     * Clear all cached data
     */
    private clearCache(): void {
        this.cachedUser = null;
        this.cachedGuilds = null;
        this.cachedFriends = null;
    }

    /**
     * Check if Discord is authenticated
     */
    isAuthenticated(): boolean {
        return !!this.authManager?.getDiscordAccessToken();
    }

    /**
     * Set Discord token manually (useful for testing or external auth flows)
     * @param token
     */
    setDiscordToken(token: string): void {
        this.authManager?.setDiscordAccessToken(token);
        this.clearCache();
    }

    /**
     * Get current Discord user
     * @param forceRefresh
     */
    async getCurrentUser(forceRefresh = false): Promise<DiscordUser | null> {
        const token = this.authManager?.getDiscordAccessToken();
        if (!token) {
            console.warn("Discord not authenticated");
            return null;
        }

        if (!forceRefresh && this.cachedUser) {
            return this.cachedUser;
        }

        const user = await getDiscordUser(token);
        if (user) {
            this.cachedUser = user;
            EventBus.instance.send("discord.userFetched", user);
        }

        return user;
    }

    /**
     * Get user's Discord guilds
     * @param forceRefresh
     */
    async getUserGuilds(forceRefresh = false): Promise<DiscordGuild[]> {
        const token = this.authManager?.getDiscordAccessToken();
        if (!token) {
            console.warn("Discord not authenticated");
            return [];
        }

        if (!forceRefresh && this.cachedGuilds) {
            return this.cachedGuilds;
        }

        const guilds = await getDiscordGuilds(token);
        this.cachedGuilds = guilds;
        EventBus.instance.send("discord.guildsFetched", guilds);

        return guilds;
    }

    /**
     * Get user's Discord friends
     * @param forceRefresh
     */
    async getUserFriends(forceRefresh = false): Promise<DiscordRelationship[]> {
        const token = this.authManager?.getDiscordAccessToken();
        if (!token) {
            console.warn("Discord not authenticated");
            return [];
        }

        if (!forceRefresh && this.cachedFriends) {
            return this.cachedFriends;
        }

        const friends = await getDiscordFriends(token);
        this.cachedFriends = friends;
        EventBus.instance.send("discord.friendsFetched", friends);

        return friends;
    }

    /**
     * Get channels for a specific guild
     * @param guildId
     */
    async getGuildChannels(guildId: string): Promise<DiscordChannel[]> {
        const token = this.authManager?.getDiscordAccessToken();
        if (!token) {
            console.warn("Discord not authenticated");
            return [];
        }

        return await getDiscordGuildChannels(token, guildId);
    }

    /**
     * Send a message to a Discord channel
     * @param channelId
     * @param content
     */
    async sendMessage(channelId: string, content: string): Promise<boolean> {
        const token = this.authManager?.getDiscordAccessToken();
        if (!token) {
            console.warn("Discord not authenticated");
            return false;
        }

        const success = await sendDiscordMessage(token, channelId, content);

        if (success) {
            EventBus.instance.send("discord.messageSent", {channelId, content});
        }

        return success;
    }

    /**
     * Check if user is owner of a guild
     * @param guildId
     */
    async isGuildOwner(guildId: string): Promise<boolean> {
        const token = this.authManager?.getDiscordAccessToken();
        if (!token) {
            return false;
        }

        return await isGuildOwner(token, guildId);
    }

    /**
     * Check if user has admin permissions in a guild
     * @param guildId
     */
    async hasAdminPermissions(guildId: string): Promise<boolean> {
        const token = this.authManager?.getDiscordAccessToken();
        if (!token) {
            return false;
        }

        return await hasAdminPermissions(token, guildId);
    }

    /**
     * Update user status (Note: This requires gateway connection)
     * @param status
     * @param activity
     * @param activity.name
     * @param activity.type
     */
    async updateStatus(status: string, activity?: {name: string; type: number}): Promise<boolean> {
        const token = this.authManager?.getDiscordAccessToken();
        if (!token) {
            console.warn("Discord not authenticated");
            return false;
        }

        return await updateDiscordStatus(token, {
            status,
            activities: activity ? [activity] : [],
            since: null,
            afk: false,
        });
    }
}
