import {DiscordSDK} from "@discord/embedded-app-sdk";
import type {Types} from "@discord/embedded-app-sdk";

type OAuthScopes = Types.OAuthScopes;

import {BaseGameServiceController, GameServiceSettings} from "./BaseGameServiceController";
import {IDiscordUser} from "@stem/network/api/discord";
import EngineRuntime from "../../../EngineRuntime";
import EventBus from "../../../behaviors/event/EventBus";
import {showToast} from "../../../showToast";
import ApplicationAuthStore from "../../editorProfile/ApplicationAuthStore";
import {getDiscordClientIdFromUrl, isInDiscordEnvironment} from "../discordEnvironment";
import {discordAuthenticateWithCode, discordAuthenticateWithRefreshToken} from "../../utils/DiscordLoginWrapper";

/**
 * Configuration constants for Discord integration
 */
const DISCORD_CONFIG = {
    AVATAR_SIZE: 256,
    MODAL_CLASS: "authentication-required-modal",
    HUD_CONTAINER_SELECTOR: "#hud-view-container",
    AUTH_URL_BASE: "https://discord.com/oauth2/authorize",
    CDN_BASE: "https://cdn.discordapp.com",
} as const;

/**
 * Toast message templates
 */
const TOAST_MESSAGES = {
    PLAYMODE_ONLY: {
        title: "Discord Integration",
        body: "Discord integration is not available in editor mode. Use published game link to play.",
        type: "info" as const,
    },
    AUTH_REQUIRED: {
        title: "Discord Integration",
        body: "Please authenticate with Discord to continue.",
        type: "info" as const,
    },
    AUTH_FAILED: {
        title: "Discord Integration",
        body: "Failed to authenticate with Discord. Please try again.",
        type: "error" as const,
    },
    AUTH_OPTIONAL_FAILED: {
        title: "Discord Integration",
        body: "Discord authentication failed. You can still play without it.",
        type: "info" as const,
    },
} as const;

/**
 * Handles Discord authentication modal UI
 */
class DiscordAuthModal {
    private static readonly MODAL_STYLES = {
        container: {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: "10000",
            pointerEvents: "all",
        },
        message: {
            color: "#fff",
            fontSize: "1.5rem",
            marginBottom: "24px",
            textAlign: "center",
        },
        button: {
            padding: "12px 24px",
            fontSize: "1rem",
            cursor: "pointer",
        },
    } as const;

    static create(onRetry: () => void): HTMLElement {
        const container = document.createElement("div");
        container.className = DISCORD_CONFIG.MODAL_CLASS;
        Object.assign(container.style, this.MODAL_STYLES.container);

        const message = document.createElement("div");
        message.textContent = "Authentication is required to play this game.";
        Object.assign(message.style, this.MODAL_STYLES.message);

        const retryButton = document.createElement("button");
        retryButton.textContent = "Retry Authentication";
        Object.assign(retryButton.style, this.MODAL_STYLES.button);
        retryButton.onclick = () => {
            onRetry();
            container.remove();
        };

        container.appendChild(message);
        container.appendChild(retryButton);

        return container;
    }

    static remove(): void {
        const modal = document.querySelector(`.${DISCORD_CONFIG.MODAL_CLASS}`);
        modal?.remove();
    }
}

export interface DiscordIntegrationControllerSettings extends GameServiceSettings {
    isRequiredToPlay?: boolean;
    scopes?: OAuthScopes[];
}

/**
 * Handles Discord authentication and integration
 */
export class DiscordController extends BaseGameServiceController {
    protected settings: DiscordIntegrationControllerSettings;
    discordSDK: DiscordSDK | null = null;
    private clientId?: string = "";

    private authManager?: ApplicationAuthStore | null = null;
    private refreshTimer: NodeJS.Timeout | null = null;

    constructor(engine: EngineRuntime, settings: DiscordIntegrationControllerSettings = {}) {
        super(engine, {controllerName: "DiscordController", settings, platform: "discord"});
        this.settings = settings;
    }

    /**
     * Override stop to clean up Discord-specific state
     */
    stop(): void {
        this.log("Stopping Discord Integration Controller...");

        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }

        this.discordSDK = null;
        this.authManager = null;

        super.stop();
    }

    /**
     * Initialize Discord SDK - Implementation of abstract method
     */
    protected async initializeSDK(): Promise<void> {
        this.log("Initializing Discord SDK...");

        const isInDiscord = DiscordController.isInDiscord();
        const isRequiredInBrowser = !isInDiscord && this.settings.isRequiredToPlay;

        // Skip if not in Discord and not required for browser
        if (!isInDiscord && !isRequiredInBrowser) {
            this.log("Skipping Discord integration - not in Discord and not required for browser");
            throw new Error("Discord SDK not available - not in Discord environment");
        }

        if (!this.engine.options.isPlayModeOnly) {
            this.log("Skipping Discord integration - not in play mode");
            throw new Error("Discord integration only available in play mode");
        }

        this.log(
            `Initializing Discord integration - InDiscord: ${isInDiscord}, RequiredInBrowser: ${isRequiredInBrowser}`,
        );
        this.clientId = DiscordController.getClientIdFromUrl();
        this.authManager = this.engine.authManager || null;
    }

    /**
     * Setup Discord authentication - Implementation of abstract method
     */
    protected async setupAuthentication(): Promise<void> {
        this.log("Setting up Discord authentication...");

        try {
            await this.authenticate();
            this.log("Discord authentication completed", this.getCurrentUser());
        } catch (error) {
            this.logError("Discord authentication setup failed:", error);
            throw error;
        }
    }

    /**
     * Setup Discord game features - Implementation of abstract method
     */
    protected setupGameFeatures(): void {
        this.log("Setting up Discord game features...");
        this.setupEventListeners();
        this.log("✅ Discord game features setup complete");
    }

    /**
     * Handle game started event
     */
    protected onGameStarted(): void {
        super.onGameStarted();
        if (!this.isAuthenticated() && this.isAuthenticationRequired()) {
            this.showAuthenticationModal();
        }
    }

    /**
     * Main authentication flow
     */
    private async authenticate(): Promise<void> {
        try {
            const discordRefreshToken = this.authManager?.getDiscordRefreshToken();

            if (discordRefreshToken) {
                await this.signInWithRefrehToken();
            } else {
                const code = await this.getAuthorizationCode();
                if (!code) {
                    this.handleMissingAuthCode();
                    return;
                }

                await this.signInWithCode(code);
            }
        } catch (error) {
            this.handleAuthenticationFailure(error);
        }
    }

    /**
     * Get authorization code based on environment (Discord app vs browser)
     * @returns Authorization code or null if not available
     */
    private async getAuthorizationCode(): Promise<string | null> {
        if (DiscordController.isInDiscord()) {
            return this.getCodeFromDiscordSDK();
        }
        return this.getCodeFromURL();
    }

    /**
     * Get authorization code from Discord SDK (when running in Discord)
     * @returns Authorization code or null if not available
     */
    private async getCodeFromDiscordSDK(): Promise<string | null> {
        // Only use Discord SDK when actually running in Discord
        if (!DiscordController.isInDiscord()) {
            console.log("[DiscordController] Not in Discord, skipping SDK authorization");
            return null;
        }

        if (!this.discordSDK) {
            await this.initializeDiscordSDK();
        }

        const code = await this.authorizeWithSdk();
        if (code) {
            console.log("User authenticated with Discord SDK successfully.");
        }
        return code;
    }

    /**
     * Get authorization code from URL parameters (browser flow)
     * @returns Authorization code or null if not available
     */
    private getCodeFromURL(): string | null {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");

        if (!code) {
            void this.redirectToDiscordAuth();
            return null;
        }

        return code;
    }

    /**
     * Handle missing authorization code
     */
    private handleMissingAuthCode(): void {
        const isInDiscord = DiscordController.isInDiscord();

        if (isInDiscord) {
            console.warn("No Discord code received in Discord app. Authentication failed.");
            showToast(TOAST_MESSAGES.AUTH_REQUIRED);
        } else {
            // In browser, this is expected - we need to redirect to Discord auth
            console.log("No Discord code in browser. Redirecting to Discord authentication.");
            showToast({
                title: "Discord Authentication Required",
                body: "This game requires Discord authentication. You will be redirected to Discord to sign in.",
                type: "info" as const,
            });
        }
    }

    /**
     * Handle authentication failures
     * @param error - The error that occurred during authentication
     */
    protected handleAuthenticationFailure(error: unknown): void {
        console.error("Discord authentication failed:", error);
        EventBus.instance.send("discordAuthFailed", error);

        if (this.isAuthenticationRequired()) {
            const isInDiscord = DiscordController.isInDiscord();
            if (isInDiscord) {
                showToast(TOAST_MESSAGES.AUTH_FAILED);
            } else {
                // In browser, provide more helpful message
                showToast({
                    title: "Discord Authentication Required",
                    body: "This game requires Discord authentication. Please complete the Discord sign-in process to continue.",
                    type: "error" as const,
                });
            }
            throw error;
        } else {
            showToast(TOAST_MESSAGES.AUTH_OPTIONAL_FAILED);
        }
        super.handleAuthenticationFailure(error);
    }

    /**
     * Check if authentication is required to play
     * @returns True if authentication is required, false otherwise
     */
    private isAuthenticationRequired(): boolean {
        return !!this.settings?.isRequiredToPlay;
    }

    /**
     * Initialize Discord SDK
     */
    private async initializeDiscordSDK(): Promise<void> {
        if (!this.clientId) {
            throw new Error("Discord client ID is not configured");
        }

        try {
             
            this.discordSDK = new DiscordSDK(this.clientId);
            console.log("Discord SDK initialized:", this.discordSDK);
            await this.discordSDK.ready();
        } catch (error) {
            console.error("Failed to initialize Discord SDK:", error);
            throw error;
        }
    }

    /**
     * Build Discord OAuth URL
     * @returns Discord OAuth authorization URL
     */
    private async buildDiscordAuthUrl(): Promise<string> {
        await this.fetchDiscordClientID();
        if (!this.clientId) {
            return "";
        }
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: window.location.href,
            response_type: "code",
            scope: (this.settings.scopes ?? []).join(" "),
        });

        return `${DISCORD_CONFIG.AUTH_URL_BASE}?${params.toString()}`;
    }

    /**
     * Redirect to Discord OAuth
     */
    private async redirectToDiscordAuth(): Promise<void> {
        const authUrl = await this.buildDiscordAuthUrl();
        window.open(authUrl, "_self");
    }

    /**
     * Authorize with Discord SDK
     * @returns Authorization code or null if failed
     */
    private async authorizeWithSdk(): Promise<string | null> {
        if (!this.discordSDK || !this.clientId) {
            console.error("Discord SDK is not initialized.");
            return null;
        }

        try {
            const {code} = await this.discordSDK.commands.authorize({
                client_id: this.clientId,
                response_type: "code",
                scope: [...this.settings.scopes ?? []] as OAuthScopes[],
                prompt: "none",
            });

            return code;
        } catch (error) {
            console.error("Discord SDK authorization failed:", error);
            throw error;
        }
    }

    private setCurrentUser(user: IDiscordUser): void {
        this.currentUser = {
            id: user.id,
            name: user.displayName ?? user.username,
            username: user.username,
            email: user.email,
            platform: "discord",
            avatar: user.avatar ?? "",
            avatarUrl: user.avatarUrl ?? "",
        };
    }

    /**
     * Sign in with authorization code
     * @param code - Authorization code from Discord
     */
    private async signInWithCode(code: string): Promise<void> {
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete("code");
            window.history.replaceState({}, document.title, url.pathname + url.search.replace(/(\?|&)code=[^&]*/, ""));
            const {user, expires_in } =
                await discordAuthenticateWithCode({
                    authManager: this.authManager!,
                    code,
                    redirect_uri: url.href,
                    sceneID: this.engine.editor?.sceneID || "",
                }) || {};
            if (user) {
                this.processUserData(user);
                this.setCurrentUser(user);
                this.notifyUserAuthenticated(user);
                if (expires_in) {
                    void this.awaitTokenExpiration(expires_in);
                }
            } else {
                throw new Error("No custom token received from backend");
            }

            console.log("Discord user authenticated:", user);
        } catch (error) {
            console.error("Discord sign-in failed:", error);
            throw error;
        }
    }

    /**
     * Sign in with refresh token
     * This is used when the user has already authenticated before and we have a refresh token
     */
    private async signInWithRefrehToken(): Promise<void> {
        try {
            const {user, expires_in} =
                await discordAuthenticateWithRefreshToken(this.authManager!, this.engine.editor?.sceneID || "") || {};
            if (user) {
                this.processUserData(user);
                this.setCurrentUser(user);
                this.notifyUserAuthenticated(user);
                if (expires_in) {
                    await this.awaitTokenExpiration(expires_in);
                }
            } else {
                throw new Error("No custom token received from backend");
            }
        } catch (error) {
            this.handleAuthenticationFailure(error);
            return;
        }
    }

    /**
     * Process user data and add avatar URL
     * @param user - Discord user data
     */
    private processUserData(user: IDiscordUser): void {
        user.avatarUrl = user.avatar
            ? `${DISCORD_CONFIG.CDN_BASE}/avatars/${user.id}/${user.avatar}.webp?size=${DISCORD_CONFIG.AVATAR_SIZE}`
            : `${DISCORD_CONFIG.CDN_BASE}/embed/avatars/${user.discriminator}.png`;
    }

    /**
     * Notify other components about user authentication
     * @param user - Authenticated Discord user
     */
    private notifyUserAuthenticated(user: IDiscordUser): void {
        EventBus.instance.send("discordAuthSuccess", user);
    }

    /**
     * Show authentication modal
     */
    private showAuthenticationModal(): void {
        this.engine.stopAnimationLoop();
        this.displayAuthenticationModal();
    }

    /**
     * Display authentication required modal
     */
    private displayAuthenticationModal(): void {
        const modal = DiscordAuthModal.create(() => {
            void this.retryAuthentication();
        });

        const hudContainer = document.querySelector(DISCORD_CONFIG.HUD_CONTAINER_SELECTOR);
        if (hudContainer) {
            hudContainer.appendChild(modal);
        } else {
            document.body.appendChild(modal);
        }
    }

    /**
     * Retry authentication process
     */
    private async retryAuthentication(): Promise<void> {
        DiscordAuthModal.remove();

        try {
            await this.authenticate();
            this.engine.startAnimationLoop();
        } catch (error) {
            console.error("Retry authentication failed:", error);
            this.showAuthenticationModal();
        }
    }

    /**
     * await token expiration handling
     * @param expiresIn
     */
    async awaitTokenExpiration(expiresIn: number): Promise<void> {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }

        const expirationTime = this.authManager?.getTokenExpirationTime();

        if (!expirationTime || expirationTime?.getTime() <= Date.now()) {
            console.warn("Token already expired, handling expiration immediately.");
            await this.handleTokenExpiration();
            return;
        }

        // Set a timeout to handle token expiration
        this.refreshTimer = setTimeout(
            async () => {
                await this.handleTokenExpiration();
            },
            (expiresIn - 60) * 1000,
        ); // Convert seconds to milliseconds

        console.log(`Token will expire in ${expiresIn} seconds. Waiting for expiration...`);
    }

    /**
     * Handle authentication after expiration
     * This method is called after token expiration
     */
    private async handleTokenExpiration(): Promise<void> {
        if (this.isAuthenticated()) {
            console.warn("Token expired, re-authenticating...");
            try {
                await this.authenticate();
            } catch (error) {
                console.error("Re-authentication failed:", error);
                this.showAuthenticationModal();
            }
        } else {
            this.showAuthenticationModal();
        }
    }

    /**
     * get Discord client ID
     */
    private async fetchDiscordClientID(): Promise<void> {
        try {
            if (!this.engine.editor?.sceneID) {
                throw new Error("Scene ID is not available. Cannot fetch Discord client ID.");
            }

            const clientId = await this.engine.authManager?.discordGetClientID(this.engine.editor?.sceneID);
            this.clientId = clientId || "";
        } catch (error) {
            console.error("Failed to fetch Discord client ID:", error);
            this.clientId = "";
        }
    }

    public static isInDiscord() {
        return isInDiscordEnvironment();
    }

    public static getClientIdFromUrl() {
        return getDiscordClientIdFromUrl();
    }
}
