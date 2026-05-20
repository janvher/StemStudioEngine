import { BehaviorBase } from "../Behavior";
import EventBus from "../event/EventBus";
import GameManager from "../game/GameManager";

/**
 * Example of how an NPC behavior can use Discord integration
 */
export class DiscordNPCExample extends BehaviorBase {
    // ... standard behavior properties ...
    
    private game?: GameManager;
    private userGuildName?: string;
    private isFriend = false;
    
    async init(game: GameManager): Promise<void> {
        this.game = game;
        
        // Example 1: Direct service access
        if (game.discord.isAuthenticated()) {
            await this.checkUserStatus();
        }
        
        // Example 2: Listen for Discord events
        EventBus.instance.subscribe("discord.authenticated", this.onDiscordAuth.bind(this));
    }
    
    private async checkUserStatus() {
        if (!this.game) return;
        
        // Get user info
        const user = await this.game.discord.getCurrentUser();
        if (!user) return;
        
        // Check if user is in a specific guild
        const guilds = await this.game.discord.getUserGuilds();
        const specialGuild = guilds.find(g => g.name === "My Game Community");
        
        if (specialGuild) {
            this.userGuildName = specialGuild.name;
            // NPC can react differently to guild members
            this.updateNPCDialog("Welcome, guild member!");
            
            // Check if user is admin
            const isAdmin = await this.game.discord.hasAdminPermissions(specialGuild.id);
            if (isAdmin) {
                this.updateNPCDialog("Welcome, guild admin! Here's a special item!");
                this.giveSpecialItem();
            }
        }
        
        // Check friends list
        const friends = await this.game.discord.getUserFriends();
        const developerFriend = friends.find(f => f.user.username === "GameDeveloper");
        
        if (developerFriend) {
            this.isFriend = true;
            this.updateNPCDialog("Oh, you know the developer! Here's a secret!");
        }
    }
    
    private async onDiscordAuth() {
        // React when user authenticates
        await this.checkUserStatus();
    }
    
    async onEvent(msg: string, data: any) {
        if (msg === "player.interact" && this.game) {
            // When player interacts with NPC
            if (this.userGuildName) {
                // Send a message to Discord channel
                await this.game.discord.sendMessage(
                    this.attributes.channelId,
                    `${data.playerName} just talked to the NPC in-game!`,
                );
            }
        }
    }
    
    private updateNPCDialog(message: string) {
        // Update NPC's dialog
        EventBus.instance.send("npc.updateDialog", {
            npcId: this.uuid,
            message: message,
        });
    }
    
    private giveSpecialItem() {
        // Give player a special item
        EventBus.instance.send("player.giveItem", {
            itemId: "discord_admin_sword",
            quantity: 1,
        });
    }
    
    // ... rest of behavior implementation ...
}