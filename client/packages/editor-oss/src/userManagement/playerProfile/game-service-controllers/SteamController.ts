/**
 * Steam Integration Controller
 *
 * Manages Steam authentication and services using Greenworks.
 * Handles Steam player authentication and backend integration.
 */

import {BaseGameServiceController, GameServiceSettings} from "./BaseGameServiceController";
import EngineRuntime from "../../../EngineRuntime";
import {IUser, SteamPlayer} from "../../types";
import {getSteamUser} from "../services/SteamService";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SteamControllerSettings extends GameServiceSettings {
    // Steam-specific settings can be added here if needed
}

/**
 * Controller for Steam platform integration
 */
export class SteamController extends BaseGameServiceController {
    protected settings: SteamControllerSettings;
    private steamPlayer: SteamPlayer | null = null;

    constructor(engine: EngineRuntime, settings: SteamControllerSettings = {}) {
        super(engine, {controllerName: "SteamController", settings, platform: "steam"});
        this.settings = settings;
    }

    /**
     * Check if Steam is available (via preload-exposed Steam API)
     */
    static isAvailable(): boolean {
        const steamAPI = (window as any).steamAPI;
        return steamAPI && typeof steamAPI.isAvailable === "function" && steamAPI.isAvailable() === true;
    }

    /**
     * Initialize Steam SDK (Greenworks) - Implementation of abstract method
     */
    protected async initializeSDK(): Promise<void> {
        if (!SteamController.isAvailable()) {
            throw new Error("Steam (Greenworks) not available");
        }
    }

    /**
     * Setup Steam authentication - Implementation of abstract method
     */
    protected async setupAuthentication(): Promise<void> {
        try {
            // Get Steam user info from Greenworks
            this.steamPlayer = await getSteamUser();
            if (!this.steamPlayer) {
                throw new Error("Could not get Steam user info from Greenworks");
            }

            // Use sceneId from constructor instead of accessing editor
            if (!this.sceneId) {
                throw new Error("Cannot authenticate with Steam without a valid scene ID");
            }

            // Get Steam App ID from backend for this scene
            const appId = await this.engine.authManager?.steamGetAppID(this.sceneId);
            if (!appId) {
                this.logWarn(`Steam App ID not configured for scene ${this.sceneId}, using fallback`);
            }

            // Authentication details captured for debugging if needed

            // Convert Steam player to IUser
            const unifiedPlayer: IUser = {
                id: this.steamPlayer.steam_id,
                name: this.steamPlayer.persona_name,
                email: null,
                avatar: this.steamPlayer.avatar_url || null,
                username: this.steamPlayer.persona_name,
                firebaseId: null,
                token: null,
                platform: "steam",
            };

            // Authenticate with backend - include sceneId in endpoint
            const authEndpoint = `/api/User/SteamAuth?sceneID=${this.sceneId}`;
            const user = await this.registerPlayerWithBackend(
                unifiedPlayer,
                authEndpoint,
                this.steamPlayer.auth_ticket || "",
                "Steam Player",
            );

            if (user) {
                this.handleUserAuthenticated(user);
            } else {
                throw new Error("Backend Steam authentication failed");
            }
        } catch (error) {
            this.logError("Steam authentication failed:", error);
            throw error;
        }
    }

    /**
     * Setup Steam game features - Implementation of abstract method
     */
    protected setupGameFeatures(): void {
        // Steam-specific features like achievements, leaderboards, etc. can be added here
    }

    /**
     * Get current Steam player info
     */
    getCurrentSteamPlayer(): SteamPlayer | null {
        return this.steamPlayer;
    }
}

export default SteamController;
