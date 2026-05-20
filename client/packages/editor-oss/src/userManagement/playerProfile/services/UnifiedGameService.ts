/**
 * Unified Game Service for Behaviors
 *
 * Provides a single interface for behaviors to interact with any game service
 * (Discord, Game Center, Google Play) without needing to know which one is active.
 *
 * This service automatically routes calls to the appropriate active service.
 */

import EngineRuntime from "../../../EngineRuntime";
import EventBus from "../../../behaviors/event/EventBus";
import global from "../../../global";
import {IUser, GameServiceUser} from "../../types";
import {GameServiceType} from "../../utils/PlatformDetector";
import UnifiedGameServicesController from "../UnifiedGameServicesController";

/**
 * Unified Game Service for behaviors to interact with any game service
 */
export class UnifiedGameService {
    private unifiedController: UnifiedGameServicesController | null = null;
    private currentUser: IUser | null = null;
    private engine: EngineRuntime | null = null;

    constructor() {
        this.engine = global.app;
        this.unifiedController = this.engine?.game?.getUnifiedGameServices() || null;
        // Listen for authentication events
        EventBus.instance.subscribe("gameServices.authenticated", this.handleAuthSuccess.bind(this));
        EventBus.instance.subscribe("gameServices.authFailed", this.handleAuthFailed.bind(this));
    }

    /**
     * Handle successful authentication
     * @param user
     */
    private handleAuthSuccess(user: any): void {
        // assert((user.type = "UnifiedGameUser")); // Removed assert
        this.currentUser = {
            id: user.id,
            name: user.name,
            email: user.email || null,
            firebaseId: user.firebaseId || null,
            avatar: user.avatar || user.avatarUrl || null,
            username: user.username || user.name || null,
            token: user.token || null,
            platform: user.platform || "firebase",
        };

        EventBus.instance.send("unifiedGameService.authenticated", this.currentUser);
    }

    /**
     * Handle authentication failure
     * @param data
     */
    private handleAuthFailed(data: any): void {
        // assert((data.type = "UnifiedGameUser")); // Removed assert
        this.currentUser = null;
        EventBus.instance.send("unifiedGameService.authFailed", data);
    }

    /**
     * Check if any game service is available
     */
    isAvailable(): boolean {
        return this.unifiedController?.isAnyServiceAvailable() || false;
    }

    /**
     * Check if user is authenticated with any service
     */
    isAuthenticated(): boolean {
        return this.unifiedController?.isAuthenticated() || false;
    }

    /**
     * Get current authenticated user
     */
    getCurrentUser(): GameServiceUser | null {
        return this.currentUser;
    }

    /**
     * Get the name of the active service
     */
    getActiveServiceName(): string {
        return this.unifiedController?.getActiveServiceName() || "None";
    }

    /**
     * Get the active service type
     */
    getActiveService(): GameServiceType {
        return this.unifiedController?.getActiveService() || GameServiceType.NONE;
    }

    /**
     * Submit a score to a leaderboard
     * @param leaderboardId - The ID of the leaderboard
     * @param score - The score to submit
     * @returns Promise<boolean> - Success status
     */
    async submitScore(leaderboardId: string, score: number): Promise<boolean> {
        if (!this.unifiedController) {
            console.warn("UnifiedGameService: No unified controller available");
            return false;
        }

        if (!this.isAuthenticated()) {
            console.warn("UnifiedGameService: User not authenticated");
            return false;
        }

        try {
            const success = await this.unifiedController.submitScore(leaderboardId, score);

            if (success) {
                EventBus.instance.send("unifiedGameService.scoreSubmitted", {
                    leaderboardId,
                    score,
                    user: this.currentUser,
                    service: this.getActiveService(),
                });
            }

            return success;
        } catch (error) {
            console.error("UnifiedGameService: Failed to submit score:", error);
            return false;
        }
    }

    /**
     * Unlock an achievement
     * @param achievementId - The ID of the achievement to unlock
     * @returns Promise<boolean> - Success status
     */
    async unlockAchievement(achievementId: string): Promise<boolean> {
        if (!this.unifiedController) {
            console.warn("UnifiedGameService: No unified controller available");
            return false;
        }

        if (!this.isAuthenticated()) {
            console.warn("UnifiedGameService: User not authenticated");
            return false;
        }

        try {
            const success = await this.unifiedController.unlockAchievement(achievementId);

            if (success) {
                EventBus.instance.send("unifiedGameService.achievementUnlocked", {
                    achievementId,
                    user: this.currentUser,
                    service: this.getActiveService(),
                });
            }

            return success;
        } catch (error) {
            console.error("UnifiedGameService: Failed to unlock achievement:", error);
            return false;
        }
    }

    /**
     * Show the leaderboards UI
     * @param leaderboardId - Optional specific leaderboard ID
     * @returns Promise<boolean> - Success status
     */
    async showLeaderboards(leaderboardId?: string): Promise<boolean> {
        if (!this.unifiedController) {
            console.warn("UnifiedGameService: No unified controller available");
            return false;
        }

        try {
            return await this.unifiedController.showLeaderboards(leaderboardId);
        } catch (error) {
            console.error("UnifiedGameService: Failed to show leaderboards:", error);
            return false;
        }
    }

    /**
     * Show the achievements UI
     * @returns Promise<boolean> - Success status
     */
    async showAchievements(): Promise<boolean> {
        if (!this.unifiedController) {
            console.warn("UnifiedGameService: No unified controller available");
            return false;
        }

        try {
            return await this.unifiedController.showAchievements();
        } catch (error) {
            console.error("UnifiedGameService: Failed to show achievements:", error);
            return false;
        }
    }

    /**
     * Get service availability information for UI display
     */
    getServiceInfo(): {
        available: boolean;
        authenticated: boolean;
        serviceName: string;
        serviceType: GameServiceType;
        user: GameServiceUser | null;
    } {
        return {
            available: this.isAvailable(),
            authenticated: this.isAuthenticated(),
            serviceName: this.getActiveServiceName(),
            serviceType: this.getActiveService(),
            user: this.currentUser,
        };
    }

    /**
     * Update game progress (useful for incremental achievements)
     * @param progressType - Type of progress (e.g., "games_played", "score_reached")
     * @param value - Progress value
     * @param achievementId - Optional achievement ID to update
     */
    async updateProgress(progressType: string, value: number, achievementId?: string): Promise<boolean> {
        if (!this.isAuthenticated()) {
            return false;
        }

        // If achievement ID is provided, try to increment progress
        if (achievementId && this.getActiveService() !== GameServiceType.DISCORD) {
            // Mobile services support incremental achievements
            const mobileController = this.engine?.game?.getUnifiedGameServices()?.["mobileController"];
            if (mobileController && typeof mobileController.incrementAchievementProgress === "function") {
                try {
                    return await mobileController.incrementAchievementProgress(achievementId, value);
                } catch (error) {
                    console.error("Failed to update achievement progress:", error);
                }
            }
        }

        // Send generic progress event for behaviors to handle
        EventBus.instance.send("unifiedGameService.progressUpdated", {
            progressType,
            value,
            achievementId,
            user: this.currentUser,
            service: this.getActiveService(),
        });

        return true;
    }

    /**
     * Get platform-specific help text
     */
    getPlatformHelp(): string {
        const service = this.getActiveService();

        switch (service) {
            case GameServiceType.DISCORD:
                return "Game features are integrated with Discord. Sign in to Discord to access social features.";

            case GameServiceType.CRAZYGAMES:
                return "Game features are integrated with CrazyGames. Leaderboards and achievements are managed by the platform.";

            case GameServiceType.STEAM:
                return "Game features are integrated with Steam. Access achievements and social features through the Steam client.";

            case GameServiceType.GAME_CENTER:
                return "Game features are integrated with Game Center. Sign in to access leaderboards and achievements.";

            case GameServiceType.GOOGLE_PLAY:
                return "Game features are integrated with Google Play Games. Sign in to access leaderboards and achievements.";

            case GameServiceType.EMAIL_PASSWORD:
                return "You are signed in with email/password authentication. Some platform features may not be available.";

            case GameServiceType.FIREBASE_ANONYMOUS:
                return "You are playing as a guest. Sign in to access full game features.";

            default:
                return "Game services are not available on this platform.";
        }
    }

    /**
     * Check if specific features are available
     * @param feature
     */
    hasFeature(feature: "leaderboards" | "achievements" | "social" | "cloudSave"): boolean {
        const service = this.getActiveService();

        switch (feature) {
            case "leaderboards":
                return (
                    service === GameServiceType.GAME_CENTER ||
                    service === GameServiceType.GOOGLE_PLAY ||
                    service === GameServiceType.CRAZYGAMES
                );

            case "achievements":
                return (
                    service === GameServiceType.GAME_CENTER ||
                    service === GameServiceType.GOOGLE_PLAY ||
                    service === GameServiceType.CRAZYGAMES ||
                    service === GameServiceType.STEAM
                );

            case "social":
                return service === GameServiceType.DISCORD || service === GameServiceType.STEAM;

            case "cloudSave":
                return service === GameServiceType.GAME_CENTER || service === GameServiceType.GOOGLE_PLAY;

            default:
                return false;
        }
    }

    /**
     * Check if email/password authentication is available
     */
    isEmailPasswordEnabled(): boolean {
        return this.unifiedController?.isEmailPasswordEnabled() || false;
    }

    /**
     * Check if CrazyGames integration is available
     */
    isCrazyGamesEnabled(): boolean {
        return this.unifiedController?.isCrazyGamesEnabled() || false;
    }

    /**
     * Authenticate with email/password
     * @param email - Email address
     * @param password - Password
     * @returns Promise<boolean> - Success status
     */
    async authenticateWithEmailPassword(email: string, password: string): Promise<boolean> {
        if (!this.unifiedController) {
            console.error("UnifiedGameService: UnifiedGameServicesController not available");
            return false;
        }
        return await this.unifiedController.authenticateWithEmailPassword(email, password);
    }

    /**
     * Register with email/password
     * @param email - Email address
     * @param password - Password
     * @param displayName - Optional display name
     * @returns Promise<boolean> - Success status
     */
    async registerWithEmailPassword(email: string, password: string, displayName?: string): Promise<boolean> {
        if (!this.unifiedController) {
            console.error("UnifiedGameService: UnifiedGameServicesController not available");
            return false;
        }
        return await this.unifiedController.registerWithEmailPassword(email, password, displayName);
    }

    /**
     * Get CrazyGames controller for advanced features
     */
    getCrazyGamesController() {
        return this.unifiedController?.getCrazyGamesController() || null;
    }

    /**
     * Request CrazyGames advertisement
     * @param type - Type of ad ("banner" or "video")
     * @returns Promise<boolean> - Success status
     */
    async requestCrazyGamesAd(type: "banner" | "video"): Promise<boolean> {
        const controller = this.getCrazyGamesController();
        if (!controller) {
            console.warn("UnifiedGameService: CrazyGames controller not available");
            return false;
        }

        try {
            if (type === "banner") {
                return await controller.requestBanner();
            } else {
                return await controller.requestVideoAd();
            }
        } catch (error) {
            console.error(`UnifiedGameService: Failed to request ${type} ad:`, error);
            return false;
        }
    }

    /**
     * Notify CrazyGames about game state changes
     * @param state - Game state ("start" | "pause")
     */
    notifyCrazyGamesGameState(state: "start" | "pause"): void {
        const controller = this.getCrazyGamesController();
        if (!controller) {
            return;
        }

        if (state === "start") {
            controller.onGameStart();
        } else {
            controller.onGameEnd();
        }
    }

    /**
     * Link anonymous account to email/password authentication
     * @param email - Email address
     * @param password - Password
     * @returns Promise<boolean> - Success status
     */
    async linkAnonymousToEmailPassword(email: string, password: string): Promise<boolean> {
        if (!this.unifiedController) {
            console.error("UnifiedGameService: UnifiedGameServicesController not available");
            return false;
        }
        return await this.unifiedController.linkAnonymousToEmailPassword(email, password);
    }

    /**
     * Link anonymous account to CrazyGames authentication
     * @returns Promise<boolean> - Success status
     */
    async linkAnonymousToCrazyGames(): Promise<boolean> {
        if (!this.unifiedController) {
            console.error("UnifiedGameService: UnifiedGameServicesController not available");
            return false;
        }
        return await this.unifiedController.authenticateWithCrazyGames();
    }

    /**
     * Check if current user can be upgraded from anonymous to authenticated
     * @returns boolean - True if user is anonymous and can be upgraded
     */
    canUpgradeAnonymousAccount(): boolean {
        return this.unifiedController?.canUpgradeAnonymousAccount() || false;
    }

    /**
     * Get available upgrade options for anonymous users
     * @returns Array of available authentication methods
     */
    getAvailableAccountUpgrades(): GameServiceType[] {
        return this.unifiedController?.getAvailableAccountUpgrades() || [];
    }

    /**
     * Cleanup resources
     */
    dispose(): void {
        EventBus.instance.unsubscribe("gameServices.authenticated");
        EventBus.instance.unsubscribe("gameServices.authFailed");

        this.currentUser = null;
        this.unifiedController = null;
        this.engine = null;
    }
}
// Create and export singleton instance
export const unifiedGameService = new UnifiedGameService();

// Export convenient helper functions for behaviors
/**
 *
 * @param leaderboardId
 * @param score
 */
export async function submitGameScore(leaderboardId: string, score: number): Promise<boolean> {
    return await unifiedGameService.submitScore(leaderboardId, score);
}

/**
 *
 * @param achievementId
 */
export async function unlockGameAchievement(achievementId: string): Promise<boolean> {
    return await unifiedGameService.unlockAchievement(achievementId);
}

/**
 *
 * @param leaderboardId
 */
export async function showGameLeaderboards(leaderboardId?: string): Promise<boolean> {
    return await unifiedGameService.showLeaderboards(leaderboardId);
}

/**
 *
 */
export async function showGameAchievements(): Promise<boolean> {
    return await unifiedGameService.showAchievements();
}

/**
 *
 */
export function isGameServiceAvailable(): boolean {
    return unifiedGameService.isAvailable();
}

/**
 *
 */
export function isUserAuthenticated(): boolean {
    return unifiedGameService.isAuthenticated();
}

/**
 *
 */
export function getCurrentGameUser(): GameServiceUser | null {
    return unifiedGameService.getCurrentUser();
}

/**
 *
 */
export function getGameServiceInfo() {
    return unifiedGameService.getServiceInfo();
}

/**
 *
 * @param progressType
 * @param value
 * @param achievementId
 */
export function updateGameProgress(progressType: string, value: number, achievementId?: string): Promise<boolean> {
    return unifiedGameService.updateProgress(progressType, value, achievementId);
}

// Email/Password authentication helpers
/**
 *
 */
export function isEmailPasswordAuthEnabled(): boolean {
    return unifiedGameService.isEmailPasswordEnabled();
}

/**
 *
 * @param email
 * @param password
 */
export async function authenticateWithEmailPassword(email: string, password: string): Promise<boolean> {
    return await unifiedGameService.authenticateWithEmailPassword(email, password);
}

/**
 *
 * @param email
 * @param password
 * @param displayName
 */
export async function registerWithEmailPassword(
    email: string,
    password: string,
    displayName?: string,
): Promise<boolean> {
    return await unifiedGameService.registerWithEmailPassword(email, password, displayName);
}

// CrazyGames helpers
/**
 *
 */
export function isCrazyGamesEnabled(): boolean {
    return unifiedGameService.isCrazyGamesEnabled();
}

/**
 *
 * @param type
 */
export async function requestCrazyGamesAd(type: "banner" | "video"): Promise<boolean> {
    return await unifiedGameService.requestCrazyGamesAd(type);
}

/**
 *
 * @param state
 */
export function notifyCrazyGamesGameState(state: "start" | "pause"): void {
    return unifiedGameService.notifyCrazyGamesGameState(state);
}

// Account linking helpers
/**
 *
 */
export function canUpgradeAnonymousAccount(): boolean {
    return unifiedGameService.canUpgradeAnonymousAccount();
}

/**
 *
 */
export function getAvailableAccountUpgrades(): GameServiceType[] {
    return unifiedGameService.getAvailableAccountUpgrades();
}

/**
 *
 * @param email
 * @param password
 */
export async function linkAnonymousToEmailPassword(email: string, password: string): Promise<boolean> {
    return await unifiedGameService.linkAnonymousToEmailPassword(email, password);
}

/**
 *
 */
export async function linkAnonymousToCrazyGames(): Promise<boolean> {
    return await unifiedGameService.linkAnonymousToCrazyGames();
}

export default UnifiedGameService;
