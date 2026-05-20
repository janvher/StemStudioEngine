/**
 * Mobile Game Services API Wrapper
 *
 * Provides a unified interface for Apple Game Center and Google Play Games Services
 * using the capacitor-game-connect plugin
 */

import { App } from '@capacitor/app';
import {CapacitorGameConnect} from "@ni2khanna/capacitor-game-connect";

import {showToast} from "../../../showToast";
import {GameServiceType} from "../../utils/PlatformDetector";

// Types for mobile game services
export interface MobileGamePlayer {
    player_id: string;
    player_name: string;
    avatar_url?: string;
    bundleId?: string;
}

export interface PlayerScore {
    player_score: number;
}

export interface Leaderboard {
    id: string;
    name: string;
    platform: "ios" | "android";
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    platform: "ios" | "android";
    unlocked: boolean;
    progress?: number;
    maxProgress?: number;
}

export interface SavedGame {
    name: string;
    data: string;
    modifiedTimestamp: number;
}

// CapacitorGameConnect is now properly imported from @ni2khanna/capacitor-game-connect

/**
 * Mobile Game Services API class
 * Wraps the capacitor-game-connect plugin with error handling and fallbacks
 */
export class CapacitorMobileServices {
    /**
     * Sign in to the appropriate game service
     * @param service
     */
    async signIn(service: GameServiceType): Promise<MobileGamePlayer | null> {
        console.log("🔐 [CapacitorMobileServices] signIn() - Starting");

        try {
            console.log("🔐 [CapacitorMobileServices] signIn() - About to call CapacitorGameConnect.signIn()...");
            console.log("🔐 [CapacitorMobileServices] signIn() - CapacitorGameConnect object:", CapacitorGameConnect);
            console.log(
                "🔐 [CapacitorMobileServices] signIn() - CapacitorGameConnect.signIn function:",
                typeof CapacitorGameConnect.signIn,
            );

            // Add timeout wrapper for sign-in attempts
            const signInWithTimeout = () => {
                return Promise.race([
                    CapacitorGameConnect.signIn(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Sign-in timeout after 30 seconds")), 60000),
                    ),
                ]);
            };

            const result = (await signInWithTimeout()) as {
                player_name: string;
                player_id: string;
            };

            console.log("🔐 [CapacitorMobileServices] signIn() - CapacitorGameConnect.signIn() completed successfully");
            console.log("🔐 [CapacitorMobileServices] signIn() - Raw result:", result);
            console.log("🔐 [CapacitorMobileServices] signIn() - Result details:", {
                player_id: result.player_id?.slice(0, 8) + "...",
                player_name: result.player_name,
                hasResult: !!result,
                resultType: typeof result,
                resultKeys: Object.keys(result || {}),
            });

            const player = {
                player_id: result.player_id,
                player_name: result.player_name,
                avatar_url: undefined, // Game Connect doesn't provide avatar URLs by default
            };

            console.log("✅ [CapacitorMobileServices] Sign-in successful, returning player:", {
                player_id: player.player_id?.slice(0, 8) + "...",
                player_name: player.player_name,
            });

            return player;
        } catch (error: any) {
            console.error("❌ [CapacitorMobileServices] signIn() - CapacitorGameConnect.signIn() threw exception:");
            console.error("❌ [CapacitorMobileServices] signIn() - Error message:", error?.message);
            console.error("❌ [CapacitorMobileServices] signIn() - Error name:", error?.name);
            console.error("❌ [CapacitorMobileServices] signIn() - Error code:", error?.code);
            console.error("❌ [CapacitorMobileServices] signIn() - Error stack:", error?.stack);
            console.error("❌ [CapacitorMobileServices] signIn() - Full error object:", error);
            console.error("❌ [CapacitorMobileServices] signIn() - Error type:", typeof error);
            console.error("❌ [CapacitorMobileServices] signIn() - Error constructor:", error?.constructor?.name);

            const serviceName = service === GameServiceType.GAME_CENTER ? "Game Center" : "Google Play Games";
            console.log(`📱 [CapacitorMobileServices] signIn() - Service name for error: ${serviceName}`);

            showToast({
                type: "error",
                title: `${serviceName} Sign-In Failed`,
                body: "Could not sign in to game services. Some features may be unavailable.",
            });

            // Re-throw the error so we can see it in the parent catch block too
            throw error;
        }
    }

    /**
     * Get Game Center credential for Firebase authentication
     */
    async getGameCenterCredential(): Promise<{credential: any; providerId: string}> {
        console.log("🔐 [CapacitorMobileServices] getGameCenterCredential() - Starting");

        try {
            const result = await CapacitorGameConnect.getGameCenterCredential();
            console.log("🔐 [CapacitorMobileServices] getGameCenterCredential() - Success:", result);
            return result;
        } catch (error: any) {
            console.error("❌ [CapacitorMobileServices] getGameCenterCredential() - Failed:", error);
            throw error;
        }
    }

    /**
     * Get Google Play Games credential for Firebase authentication
     * @param serverClientId
     */
    async getGooglePlayCredential(serverClientId: string): Promise<{credential: any; providerId: string}> {
        console.log("🔐 [CapacitorMobileServices] getGooglePlayCredential() - Starting");

        try {
            const result = await CapacitorGameConnect.getGooglePlayCredential({serverClientId});
            console.log("🔐 [CapacitorMobileServices] getGooglePlayCredential() - Success:", result);
            return result;
        } catch (error: any) {
            console.error("❌ [CapacitorMobileServices] getGooglePlayCredential() - Failed:", error);
            throw error;
        }
    }

    /**
     * Show the native leaderboard UI
     * @param leaderboardId
     */
    async showLeaderboard(leaderboardId: string): Promise<boolean> {
        try {
            await CapacitorGameConnect.showLeaderboard({leaderboardID: leaderboardId});
            return true;
        } catch (error) {
            console.error("Failed to show leaderboard:", error);

            showToast({
                type: "error",
                title: "Leaderboard Error",
                body: "Could not display leaderboard. Please try again.",
            });

            return false;
        }
    }

    /**
     * Submit a score to a leaderboard
     * @param service
     * @param leaderboardId
     * @param score
     */
    async submitScore(service: GameServiceType, leaderboardId: string, score: number): Promise<boolean> {
        try {
            await CapacitorGameConnect.submitScore({
                leaderboardID: leaderboardId,
                totalScoreAmount: score,
            });

            const serviceName = service === GameServiceType.GAME_CENTER ? "Game Center" : "Google Play Games";

            showToast({
                type: "success",
                title: "Score Submitted",
                body: `Your score of ${score} has been submitted to ${serviceName}!`,
            });

            return true;
        } catch (error) {
            console.error("Failed to submit score:", error);

            showToast({
                type: "error",
                title: "Score Submission Failed",
                body: "Could not submit your score. Please try again.",
            });

            return false;
        }
    }

    /**
     * Get the player's total score from a leaderboard
     * @param leaderboardId
     */
    async getUserScore(leaderboardId: string): Promise<number | null> {
        try {
            const result = await CapacitorGameConnect.getUserTotalScore({
                leaderboardID: leaderboardId,
            });

            return result.player_score;
        } catch (error) {
            console.error("Failed to get user score:", error);
            return null;
        }
    }

    /**
     * Show the native achievements UI
     */
    async showAchievements(): Promise<boolean> {
        try {
            await CapacitorGameConnect.showAchievements();
            return true;
        } catch (error) {
            console.error("Failed to show achievements:", error);

            showToast({
                type: "error",
                title: "Achievements Error",
                body: "Could not display achievements. Please try again.",
            });

            return false;
        }
    }

    /**
     * Unlock an achievement
     * @param achievementId
     */
    async unlockAchievement(achievementId: string): Promise<boolean> {
        try {
            await CapacitorGameConnect.unlockAchievement({
                achievementID: achievementId,
            });

            showToast({
                type: "success",
                title: "Achievement Unlocked!",
                body: "You've earned a new achievement!",
            });

            return true;
        } catch (error) {
            console.error("Failed to unlock achievement:", error);
            return false;
        }
    }

    /**
     * Increment progress on an incremental achievement
     * @param achievementId
     * @param points
     */
    async incrementAchievementProgress(achievementId: string, points: number): Promise<boolean> {
        try {
            await CapacitorGameConnect.incrementAchievementProgress({
                achievementID: achievementId,
                pointsToIncrement: points,
            });

            return true;
        } catch (error) {
            console.error("Failed to increment achievement progress:", error);
            return false;
        }
    }
}

//reloader function to reload the page when the app is moved to the background
const initializeAppReloader = () => {
    // Check if the code is running on a native platform (iOS or Android)
    if (!App) {
        console.warn('Capacitor App plugin not available. Skipping background reload setup.');
        return;
    }

    void App.addListener('appStateChange', ({ isActive }) => {
        // 'isActive' is true when the app is in the foreground.
        if (isActive) {
            console.log('App returned to foreground. Reloading WebView...');

            // Trigger a full browser reload, which reloads the web assets
            // and re-initializes the JavaScript state.
            window.location.reload();
        } else {
            console.log('App moved to background.');
        }
    });

    console.log('Capacitor App State listener initialized.');
};

//initializeAppReloader();

// Export singleton instance
export const capacitorMobileServices = new CapacitorMobileServices();

