/**
 * CrazyGames Integration Controller
 *
 * Manages CrazyGames SDK integration, authentication, and game services.
 * Handles score submission, achievements, and platform-specific features.
 */

import {MathUtils} from "three";

import {BaseGameServiceController, GameServiceSettings} from "./BaseGameServiceController";
import EngineRuntime from "../../../EngineRuntime";
import {IUser} from "../../types";



export interface CrazyGamesControllerSettings extends GameServiceSettings {
    gameId?: string;
}

/**
 * Controller for CrazyGames platform integration
 */
export class CrazyGamesController extends BaseGameServiceController {
    protected settings: CrazyGamesControllerSettings;
    private sdk: any = null;

    constructor(engine: EngineRuntime, settings: CrazyGamesControllerSettings = {}) {
        super(engine, {controllerName: "CrazyGamesController", settings, platform: "crazygames"});
        this.settings = settings;
    }

    /**
     * Override stop to clean up CrazyGames-specific state
     */
    stop(): void {
        this.sdk = null;
        super.stop();
    }

    /**
     * Initialize the CrazyGames SDK - Implementation of abstract method
     */
    protected async initializeSDK(): Promise<void> {
        // Check if CrazyGames SDK is available
        if (typeof window !== "undefined" && (window as any).CrazyGames) {
            this.sdk = (window as any).CrazyGames;

            // Initialize SDK
            if (this.sdk.init) {
                try {
                    await this.sdk.init();
                } catch (error) {
                    this.logError("SDK initialization failed:", error);
                    throw error;
                }
            }
        } else {
            throw new Error("CrazyGames SDK not available");
        }
    }

    /**
     * Setup authentication with CrazyGames - Implementation of abstract method
     */
    protected async setupAuthentication(): Promise<void> {
        try {
            if (!this.sdk) {
                throw new Error("CrazyGames SDK not initialized");
            }

            // Use sceneId from constructor
            if (!this.sceneId) {
                throw new Error("Cannot authenticate with CrazyGames without a valid scene ID");
            }

            // Get CrazyGames Game ID for this scene
            const gameId = await this.engine.authManager?.crazyGamesGetGameID(this.sceneId);
            if (!gameId) {
                this.logWarn(`CrazyGames Game ID not configured for scene ${this.sceneId}`);
            }

            // Get user data and token from SDK
            let userData = null;
            let token = null;

            try {
                userData = await this.sdk.user.getUser();
                token = await this.sdk.user.getUserToken();
            } catch (sdkError) {
                this.log("User not logged in to CrazyGames, using guest mode");
            }

            if (userData && token) {
                const player: IUser = {
                    id: userData.userId || MathUtils.generateUUID(),
                    username: userData.username || `crazygames_${Date.now()}`,
                    avatar: userData.profilePictureUrl || null,
                    platform: "crazygames",
                    name: userData.username || "CrazyGames Player",
                    email: null,
                    firebaseId: null,
                    token: null,
                };

                // Authenticate with backend - include sceneId
                const authEndpoint = `/api/User/CrazyGamesAuth?sceneID=${this.sceneId}`;
                const user = await this.registerPlayerWithBackend(
                    player,
                    authEndpoint,
                    token,
                    userData.username || "CrazyGames Player",
                );

                if (user) {
                    this.handleUserAuthenticated(user);
                } else {
                    throw new Error("Backend authentication failed");
                }
            } else {
                // Guest mode
                const guestPlayer: IUser = {
                    id: `crazygames_guest_${MathUtils.generateUUID()}`,
                    username: `Guest_${Date.now()}`,
                    avatar: null,
                    platform: "crazygames",
                    name: "CrazyGames Guest",
                    email: null,
                    firebaseId: null,
                    token: null,
                    isGuest: true,
                };

                this.handleUserAuthenticated(guestPlayer);
            }
        } catch (error) {
            this.logError("CrazyGames authentication failed:", error);
            // Fall back to guest mode on error
            const fallbackPlayer: IUser = {
                id: `crazygames_fallback_${MathUtils.generateUUID()}`,
                username: `Player_${Date.now()}`,
                avatar: null,
                platform: "crazygames",
                name: "Player",
                email: null,
                firebaseId: null,
                token: null,
                isGuest: true,
            };
            this.handleUserAuthenticated(fallbackPlayer);
        }
    }

    /**
     * Setup game features (leaderboards, achievements, etc.) - Implementation of abstract method
     */
    protected setupGameFeatures(): void {
        // Setup advertisement handling
        this.setupAdvertisements();

        // Setup game data features
        this.setupGameData();

        // Setup social features if enabled
        if (this.settings.features?.socialFeatures) {
            this.setupSocialFeatures();
        }
    }

    /**
     * Setup advertisement integration
     */
    private setupAdvertisements(): void {
        // Advertisement API setup - available when needed
    }

    /**
     * Setup game data features
     */
    private setupGameData(): void {
        // Game data API setup - available when needed
    }

    /**
     * Setup social features
     */
    private setupSocialFeatures(): void {
        // Social API setup - available when needed
    }

    /**
     * Show game pause (for ads)
     */
    protected onGamePaused(): void {
        if (this.sdk && this.sdk.game && this.sdk.game.gamePause) {
            this.sdk.game.gamePause();
        }
        super.onGamePaused();
    }

    /**
     * Show game start (after ads)
     */
    protected onGameStarted(): void {
        if (this.sdk && this.sdk.game && this.sdk.game.gameStart) {
            this.sdk.game.gameStart();
        }
        super.onGameStarted();
    }

    /**
     * Request banner ad
     */
    async requestBanner(): Promise<boolean> {
        try {
            if (this.sdk && this.sdk.ad && this.sdk.ad.requestBanner) {
                await this.sdk.ad.requestBanner();
                return true;
            } else {
                return false;
            }
        } catch (error) {
            this.logError("Banner ad request failed:", error);
            return false;
        }
    }

    /**
     * Request video ad
     */
    async requestVideoAd(): Promise<boolean> {
        try {
            if (this.sdk && this.sdk.ad && this.sdk.ad.requestVideoAd) {
                await this.sdk.ad.requestVideoAd();
                return true;
            } else {
                return false;
            }
        } catch (error) {
            this.logError("Video ad request failed:", error);
            return false;
        }
    }


    /**
     * Submit score to leaderboard
     * @param leaderboardId
     * @param score
     */
    async submitScore(leaderboardId: string, score: number): Promise<boolean> {
        // CrazyGames handles scores internally via their platform
        return true;
    }

    /**
     * Unlock achievement
     * @param achievementId
     */
    async unlockAchievement(achievementId: string): Promise<boolean> {
        // CrazyGames handles achievements internally via their platform
        return true;
    }

    /**
     * Notify game start
     */
    onGameStart(): void {
        if (this.sdk?.game?.gameStart) {
            this.sdk.game.gameStart();
        }
    }

    /**
     * Notify game end
     */
    onGameEnd(): void {
        if (this.sdk?.game?.gamePause) {
            this.sdk.game.gamePause();
        }
    }

    /**
     * Check if CrazyGames SDK is available
     */
    static isInCrazyGames(): boolean {
        // Check for CrazyGames SDK
        const hasCrazyGamesSDK = !!(window as any).CrazyGames;

        // Check for CrazyGames domain
        const isCrazyGamesDomain =
            typeof window !== "undefined" &&
            (window.location.hostname.includes("crazygames.com") || window.location.hostname.includes("crazygames."));

        // Check URL parameter for testing
        const urlParams = new URLSearchParams(window.location.search);
        const platformParam = urlParams.get("platform") === "crazygames";

        return hasCrazyGamesSDK || isCrazyGamesDomain || platformParam;
    }
}

export default CrazyGamesController;
