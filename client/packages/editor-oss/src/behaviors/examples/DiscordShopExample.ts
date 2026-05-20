import { BehaviorBase } from "../Behavior";
import EventBus from "../event/EventBus";
import GameManager from "../game/GameManager";

/**
 * Example of shop behavior using Discord for special pricing/items
 */
export class DiscordShopExample extends BehaviorBase {
    // ... standard behavior properties ...
    
    private game?: GameManager;
    private discountPercentage = 0;
    private specialItems: string[] = [];
    
    async init(game: GameManager): Promise<void> {
        this.game = game;
        
        if (game.discord.isAuthenticated()) {
            await this.setupDiscordPricing();
        }
    }
    
    private async setupDiscordPricing() {
        if (!this.game) return;
        
        // Check if user is in partner guilds
        const guilds = await this.game.discord.getUserGuilds();
        
        // Give discounts based on guild membership
        const partnerGuilds = [
            { id: "123456", name: "Game Partners", discount: 10 },
            { id: "789012", name: "VIP Community", discount: 20 },
            { id: "345678", name: "Beta Testers", discount: 15 },
        ];
        
        for (const partnerGuild of partnerGuilds) {
            const userGuild = guilds.find(g => g.id === partnerGuild.id);
            if (userGuild) {
                this.discountPercentage = Math.max(this.discountPercentage, partnerGuild.discount);
                
                // Check if user is owner for extra benefits
                if (userGuild.owner) {
                    this.specialItems.push(`${partnerGuild.name}_owner_item`);
                }
            }
        }
        
        // Special items for friends of the developer
        const friends = await this.game.discord.getUserFriends();
        const developerIds = ["dev_user_id_1", "dev_user_id_2"];
        
        const hasDeveloperFriend = friends.some(f => developerIds.includes(f.user.id));
        if (hasDeveloperFriend) {
            this.specialItems.push("developer_friend_exclusive");
            this.discountPercentage = Math.max(this.discountPercentage, 25);
        }
    }
    
    async onEvent(msg: string, data: any) {
        if (msg === "shop.getPricing" && data.itemId) {
            const basePrice = this.getBasePrice(data.itemId);
            const finalPrice = basePrice * (1 - this.discountPercentage / 100);
            
            // Send pricing back
            EventBus.instance.send("shop.pricing", {
                itemId: data.itemId,
                basePrice: basePrice,
                finalPrice: finalPrice,
                discount: this.discountPercentage,
                reason: this.discountPercentage > 0 ? "Discord member discount" : "",
            });
        }
        
        if (msg === "shop.getInventory") {
            // Include special Discord items
            const inventory = this.getBaseInventory();
            inventory.push(...this.specialItems);
            
            EventBus.instance.send("shop.inventory", {
                items: inventory,
                hasDiscordItems: this.specialItems.length > 0,
            });
        }
        
        if (msg === "shop.purchase" && data.itemId && this.game) {
            // Log purchase to Discord
            const user = await this.game.discord.getCurrentUser();
            if (user && this.attributes.logChannelId) {
                await this.game.discord.sendMessage(
                    this.attributes.logChannelId,
                    `${user.username} purchased ${data.itemId} in-game!`,
                );
            }
        }
    }
    
    private getBasePrice(itemId: string): number {
        // Return base price for item
        return 100; // Example
    }
    
    private getBaseInventory(): string[] {
        // Return base shop inventory
        return ["sword", "shield", "potion"];
    }
    
    // ... rest of behavior implementation ...
}