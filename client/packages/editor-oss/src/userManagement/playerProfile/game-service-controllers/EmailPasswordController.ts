/**
 * Email/Password Authentication Controller
 *
 * Manages email/password authentication for the application.
 * Handles user registration, sign-in, and password management.
 */

import {getAuthProvider} from "../../../auth";
import {BaseGameServiceController, GameServiceSettings} from "./BaseGameServiceController";
import EngineRuntime from "../../../EngineRuntime";
import EventBus from "../../../behaviors/event/EventBus";
import {showToast} from "../../../showToast";
import {IUser} from "../../types";


export interface EmailPasswordControllerSettings extends GameServiceSettings {
    allowRegistration?: boolean;
    requireEmailVerification?: boolean;
}

/**
 * Controller for email/password authentication
 */
export class EmailPasswordController extends BaseGameServiceController {
    protected settings: EmailPasswordControllerSettings;
    private isAuthenticating = false;

    constructor(engine: EngineRuntime, settings: EmailPasswordControllerSettings = {}) {
        super(engine, {controllerName: "EmailPasswordController", settings, platform: "email"});
        this.settings = settings;
    }

    /**
     * Initialize SDK - Implementation of abstract method
     * For email/password, we just check Firebase is available
     */
    protected async initializeSDK(): Promise<void> {
        // Check if Firebase is available
        const auth = this.engine.authManager;
        if (!auth) {
            throw new Error("Authentication manager not available");
        }
    }

    /**
     * Setup authentication - Implementation of abstract method
     * For email/password, this is handled through UI components
     */
    protected async setupAuthentication(): Promise<void> {
        // Email/password authentication is triggered by user actions through UI
        // We don't auto-authenticate here
    }

    /**
     * Setup game features - Implementation of abstract method
     */
    protected setupGameFeatures(): void {
        // No specific game features for email/password auth
    }

    /**
     * Sign in with email and password
     * @param email
     * @param password
     */
    async signIn(email: string, password: string): Promise<IUser | null> {
        if (this.isAuthenticating) {
            this.logWarn("Authentication already in progress");
            return null;
        }

        this.isAuthenticating = true;

        try {
            const user = await this.loginEmailPlayer(email, password);
            if (user) {
                this.handleUserAuthenticated(user);

                // Fire success event
                EventBus.instance.send("emailPasswordAuthSuccess", {
                    id: user.id,
                    name: user.name || "User",
                    email: email,
                });

                return user;
            } else {
                throw new Error("Sign in returned null user");
            }
        } catch (error) {
            this.logError("Email/password sign in failed:", error);

            // Fire failure event
            EventBus.instance.send("emailPasswordAuthFailed", {
                error,
                email,
                type: "signin",
            });

            showToast({
                type: "error",
                title: "Sign In Failed",
                body: (error as any)?.message || "Invalid email or password",
            });

            return null;
        } finally {
            this.isAuthenticating = false;
        }
    }

    /**
     * Register with email and password
     * @param email
     * @param password
     * @param displayName
     */
    async register(email: string, password: string, displayName?: string): Promise<IUser | null> {
        if (!this.settings.allowRegistration) {
            this.logWarn("Registration is disabled");
            showToast({
                type: "error",
                title: "Registration Disabled",
                body: "New user registration is not allowed",
            });
            return null;
        }

        if (this.isAuthenticating) {
            this.logWarn("Authentication already in progress");
            return null;
        }

        this.isAuthenticating = true;

        try {
            const user = await this.createEmailPlayer(email, password, displayName);
            if (user) {
                this.handleUserAuthenticated(user);

                // Fire success event
                EventBus.instance.send("emailPasswordAuthSuccess", {
                    id: user.id,
                    name: user.name || displayName || "User",
                    email: email,
                    isNewUser: true,
                });

                if (this.settings.requireEmailVerification) {
                    showToast({
                        type: "info",
                        title: "Verify Your Email",
                        body: "Please check your email to verify your account",
                    });
                }

                return user;
            } else {
                throw new Error("Registration returned null user");
            }
        } catch (error) {
            this.logError("Email/password registration failed:", error);

            // Fire failure event
            EventBus.instance.send("emailPasswordAuthFailed", {
                error,
                email,
                type: "register",
            });

            showToast({
                type: "error",
                title: "Registration Failed",
                body: (error as any)?.message || "Failed to create account",
            });

            return null;
        } finally {
            this.isAuthenticating = false;
        }
    }

    /**
     * Link anonymous account to email/password
     * @param email
     * @param password
     */
    async linkAnonymousAccount(email: string, password: string): Promise<IUser | null> {
        if (this.isAuthenticating) {
            this.logWarn("Authentication already in progress");
            return null;
        }

        const authManager = this.engine.authManager;
        if (!authManager?.isAnonymous()) {
            this.logWarn("Current user is not anonymous");
            showToast({
                type: "error",
                title: "Linking Failed",
                body: "Account linking is only available for anonymous users",
            });
            return null;
        }

        this.isAuthenticating = true;

        try {
            const user = await this.linkAnonymousToEmailPasswordInternal(email, password);
            if (user) {
                this.handleUserAuthenticated(user);

                // Fire success event
                EventBus.instance.send("emailPasswordAuthSuccess", {
                    id: user.id,
                    name: user.name || "User",
                    email: email,
                    wasAnonymous: true,
                });

                showToast({
                    type: "success",
                    title: "Account Linked",
                    body: "Your anonymous account has been upgraded",
                });

                return user;
            } else {
                throw new Error("Account linking returned null user");
            }
        } catch (error) {
            this.logError("Account linking failed:", error);

            // Fire failure event
            EventBus.instance.send("emailPasswordAuthFailed", {
                error,
                email,
                type: "link",
            });

            showToast({
                type: "error",
                title: "Linking Failed",
                body: (error as any)?.message || "Failed to link account",
            });

            return null;
        } finally {
            this.isAuthenticating = false;
        }
    }

    /**
     * Check if registration is allowed
     */
    isRegistrationAllowed(): boolean {
        return this.settings.allowRegistration ?? true;
    }

    /**
     * Check if email verification is required
     */
    isEmailVerificationRequired(): boolean {
        return this.settings.requireEmailVerification ?? false;
    }

    /**
     * Internal method to login with email/password using Firebase
     * @param email
     * @param password
     */
    private async loginEmailPlayer(email: string, password: string): Promise<IUser | null> {
        const authUser = await getAuthProvider().signInWithEmailAndPassword(email, password);
        if (!authUser) return null;

        const idToken = await authUser.getIdToken();
        const user: IUser = {
            id: authUser.uid,
            firebaseId: authUser.uid,
            email: authUser.email,
            name: authUser.displayName || "User",
            username: authUser.email?.split("@")[0] || `user_${authUser.uid.slice(0, 8)}`,
            avatar: authUser.photoURL,
            token: idToken,
            platform: "email",
        };

        return user;
    }

    /**
     * Internal method to create new user with email/password using Firebase
     * @param email
     * @param password
     * @param displayName
     */
    private async createEmailPlayer(email: string, password: string, displayName?: string): Promise<IUser | null> {
        const authUser = await getAuthProvider().createUserWithEmailAndPassword(email, password);
        if (!authUser) return null;

        const idToken = await authUser.getIdToken();
        const user: IUser = {
            id: authUser.uid,
            firebaseId: authUser.uid,
            email: authUser.email,
            name: displayName || authUser.displayName || "User",
            username: authUser.email?.split("@")[0] || `user_${authUser.uid.slice(0, 8)}`,
            avatar: authUser.photoURL,
            token: idToken,
            platform: "email",
        };

        return user;
    }

    /**
     * Internal method to link anonymous account to email/password
     * @param email
     * @param password
     */
    private async linkAnonymousToEmailPasswordInternal(email: string, password: string): Promise<IUser | null> {
        const authUser = await getAuthProvider().linkAnonymousToEmailPassword(email, password);
        if (!authUser) return null;

        const idToken = await authUser.getIdToken();
        const user: IUser = {
            id: authUser.uid,
            firebaseId: authUser.uid,
            email: authUser.email,
            name: authUser.displayName || "User",
            username: authUser.email?.split("@")[0] || `user_${authUser.uid.slice(0, 8)}`,
            avatar: authUser.photoURL,
            token: idToken,
            platform: "email",
        };

        return user;
    }
}

export default EmailPasswordController;
