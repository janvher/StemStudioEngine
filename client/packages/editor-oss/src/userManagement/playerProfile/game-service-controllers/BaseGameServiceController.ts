/**
 * Base Game Service Controller
 *
 * Abstract base class for all platform-specific game service controllers.
 * Provides common patterns for initialization, authentication, and error handling.
 */

import {getAuthProvider} from "../../../auth";
import EngineRuntime from "../../../EngineRuntime";
import EventBus from "../../../behaviors/event/EventBus";
import global from "../../../global";
import {IUser, PlayerNetwork} from "../../types";

export interface GameServiceSettings {
    sceneId?: string; // Add sceneId to base settings
    [key: string]: any;
}

export interface GameServiceControllerOptions {
    controllerName: string;
    platform: PlayerNetwork;
    settings?: GameServiceSettings;
    sceneId?: string; // Add sceneId to options
}

/**
 * Abstract base class for game service controllers
 */
export abstract class BaseGameServiceController {
    protected engine: EngineRuntime;
    protected settings: GameServiceSettings;
    protected isInitialized = false;
    protected currentUser: IUser | null | undefined = null;
    protected controllerName: string;
    protected platform: PlayerNetwork;
    protected sceneId: string | undefined;

    constructor(engine: EngineRuntime, options: GameServiceControllerOptions) {
        this.engine = engine;
        this.settings = options.settings || {};
        this.controllerName = options.controllerName;
        this.platform = options.platform;
        this.sceneId = options.sceneId || options.settings?.sceneId; // Accept sceneId from either location

        // Constructor logging removed - not needed for production
    }

    /**
     * Initialize the game service - Template method pattern
     */
    async start(): Promise<IUser> {
        if (this.isInitialized) {
            console.warn(`${this.controllerName} already initialized`);
            return this.currentUser!;
        }

        try {
            await this.initializeSDK();
            this.setupEventListeners();
            await this.setupAuthentication();
            this.setupGameFeatures();
            this.isInitialized = true;
        } catch (error) {
            this.handleInitializationError(error);
            throw error;
        }

        return this.currentUser!;
    }

    /**
     * Stop the service controller
     */
    stop(): void {
        this.removeEventListeners();
        this.currentUser = null;
        this.isInitialized = false;
    }

    /**
     * Abstract methods to be implemented by subclasses
     */
    protected abstract initializeSDK(): Promise<void>;
    protected abstract setupAuthentication(): Promise<void>;
    protected abstract setupGameFeatures(): void;

    protected setupEventListeners(): void {
        global.app!.on("pauseGame.BaseGameService", this.onGamePaused.bind(this));
        global.app!.on("gameStarted.BaseGameService", this.onGameStarted.bind(this));
    }
    protected removeEventListeners(): void {
        global.app!.on("pauseGame.BaseGameService", null);
        global.app!.on("gameStarted.BaseGameService", null);
    }

    protected onGameStarted(): void {}
    protected onGamePaused(): void {}

    /**
     * Common error handling
     * @param error
     */
    protected handleInitializationError(error: unknown): void {
        console.error(`❌ [${this.controllerName}] Initialization failed:`, error);
        this.notifyAuthError(error);
    }

    /**
     * Common error notification
     * @param error
     */
    protected notifyAuthError(error: unknown): void {
        EventBus.instance.send("gameServices.authFailed", {
            type: "UnifiedGameUser",
            service: this.controllerName.toLowerCase(),
            error: error,
        });
    }

    /**
     * Common success authentication notification
     * @param user
     */
    protected notifyAuthSuccess(user: IUser): void {
        EventBus.instance.send("gameServices.authenticated", {
            type: "UnifiedGameUser",
            id: user.id,
            name: user.name,
            avatarUrl: user.avatar,
            service: this.controllerName.toLowerCase(),
            platform: this.controllerName,
        });
    }

    /**
     * Common backend authentication pattern
     * @param player
     * @param authEndpoint
     * @param platformToken
     * @param defaultPlayerName
     */
    protected async registerPlayerWithBackend(
        player: IUser,
        authEndpoint: string,
        platformToken: string,
        defaultPlayerName: string = "Player",
    ): Promise<IUser | null> {
        try {
            const response = await fetch(authEndpoint, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    user_id: player.id,
                    username: player.username,
                    avatar_url: player.avatar || "",
                    auth_token: platformToken,
                }),
            });

            if (!response.ok) {
                throw new Error(`Backend authentication failed: ${response.statusText}`);
            }

            const {custom_token, user: userData} = await response.json();

            const authUser = await getAuthProvider().signInWithCustomToken(custom_token);
            if (!authUser) {
                throw new Error("Auth provider sign-in failed");
            }

            const user: IUser = {
                id: player.id,
                firebaseId: authUser.uid,
                email: userData.email,
                name: userData.name || defaultPlayerName,
                username: userData.username || `${this.controllerName.toLowerCase()}_${player.id.slice(0, 8)}`,
                avatar: userData.avatar || null,
                token: await authUser.getIdToken(),
                platform: this.platform,
            };

            // Set user in application auth manager
            this.engine.authManager?.setUser(user);
            this.engine.authManager?.setAuthToken(user.token || null);

            return user;
        } catch (error) {
            console.error(`❌ [${this.controllerName}] Backend authentication failed:`, error);
            return null;
        }
    }

    /**
     * Common user state handling
     * @param user
     */
    protected handleUserAuthenticated(user: IUser): void {
        this.currentUser = user;
        this.notifyAuthSuccess(user);
    }

    protected handleAuthenticationFailure(error: unknown): void {
        this.currentUser = null;
        console.error(`❌ ${this.controllerName} authentication failed:`, error);
        this.notifyAuthError(error);
    }

    /**
     * Common logging helper
     * @param message
     * @param data
     */
    protected log(message: string, data?: any): void {
        if (data) {
            console.log(`🎮 [${this.controllerName}] ${message}`, data);
        } else {
            console.log(`🎮 [${this.controllerName}] ${message}`);
        }
    }

    /**
     * Common error logging helper
     * @param message
     * @param error
     */
    protected logError(message: string, error?: any): void {
        console.error(`❌ [${this.controllerName}] ${message}`, error);
    }

    /**
     * Common warning logging helper
     * @param message
     * @param data
     */
    protected logWarn(message: string, data?: any): void {
        console.warn(`⚠️ [${this.controllerName}] ${message}`, data);
    }

    /**
     * Public API methods
     */
    public getCurrentUser(): any {
        return this.currentUser;
    }

    isReady(): boolean {
        return this.isInitialized;
    }

    isAuthenticated(): boolean {
        return !!this.currentUser && !this.currentUser.isGuest;
    }
}
