import type { Client } from "@colyseus/core";
import { Room } from "@colyseus/core";
import RoomController from "../controllers/RoomController.js";
import { GameRoomState, Player, PrivateRoomInfo, UserData } from "./schema/GameRoomState.js";
import type IRoomController from "../controllers/IRoomController.js";
import SimpleRoomController from "../controllers/SimpleRoomController.js";
import SimpleCollaborativeRoomController from "../controllers/SimpleCollaborativeRoomController.js";
import { PrivateRoom } from "../models/PrivateRoom.js";
import { PrivateRoomLifecycleManager } from "../services/PrivateRoomLifecycleManager.js";
import { InviteCodeGenerator } from "../utils/InviteCodeGenerator.js";
import AuthManager from "../auth/AuthManager.js";

export interface RoomCreateOptions {
    name: string;
    ownerId: string;
    simple: boolean;
    maxClients: number;
    user: UserData;
    gravity?: number;
    token: string;
    isCollaborative: boolean;
    isAuthRequired: boolean;
    isPrivate?: boolean;
    inviteCode?: string;
}

/**
 * Enhanced GameRoom with Private Room Support
 *
 * Extends the base Colyseus Room to support private rooms with invitation codes,
 * waiting lists, and capacity management. Integrates with the PrivateRoom database
 * model to provide persistent room state and player management.
 *
 * Key Features:
 * - Private room initialization with invite code validation
 * - Automatic capacity enforcement based on private room settings
 * - Real-time waiting list management and promotion notifications
 * - Owner-controlled room settings updates
 */
export class GameRoom extends Room<GameRoomState> {
    maxClients = 4;
    isCollaborative: boolean = false;
    isPrivate: boolean = false;

    roomController: IRoomController | undefined;
    private lifecycleManager: PrivateRoomLifecycleManager;

    async onCreate(options: RoomCreateOptions) {
        const { token, isAuthRequired, isCollaborative, simple, isPrivate, inviteCode } = options;

        this.isCollaborative = isCollaborative;
        this.isPrivate = isPrivate || false;
        this.lifecycleManager = PrivateRoomLifecycleManager.getInstance();

        try {
            const hasAccess = await AuthManager.verifyUser(this, isAuthRequired, token);

            if (!hasAccess) {
                console.error("User does not have access to join the room.");
                throw new Error("Access denied. User is not authorized to join this room.");
            }

            this.autoDispose = true;
            this.setState(new GameRoomState());
            if (options.maxClients) {
                this.maxClients = options.maxClients;
            }

            //set invite code
            this.state.inviteCode = inviteCode ?? InviteCodeGenerator.generate();
            await this.setMetadata({
                isPrivate: isPrivate,
                name: options.name,
                ownerId: options.ownerId,
                inviteCode: this.state.inviteCode,
            });

            // Set up private room info if this is a private room
            if (this.isPrivate) {
                await this.initializePrivateRoom(options);
            }

            // @ts-expect-error - onMessage wildcard handler not typed in Colyseus
            this.onMessage("*", (client, messageType: string, message: any) => {
                this.roomController?.onBaseMessage(client, messageType, message);
            });

            // Set up private room message handlers
            this.setupPrivateRoomMessageHandlers();

            if (simple) {
                this.roomController = isCollaborative
                    ? new SimpleCollaborativeRoomController(this, options)
                    : new SimpleRoomController(this, options);
            } else {
                this.roomController = new RoomController(this, options);
            }

            this.roomController.start();

            //ready !
            this.state.ready = true;
        } catch (error) {
            console.error("Error during room creation:", error);
            throw new Error("Failed to create room due to an error.");
        }
    }

    /**
     * Player Join Handler with Private Room Capacity Enforcement
     *
     * Handles player joining with proper validation for private rooms including
     * capacity checks, invite code validation, and waiting list management.
     * Ensures that private room max player limits are strictly enforced.
     */
    async onJoin(client: Client, options: any) {
        const { token, isAuthRequired, inviteCode } = options;
        try {
            // Private room validation and capacity enforcement
            if (this.isPrivate && inviteCode) {
                const privateRoom = await this.validateAndGetPrivateRoom(inviteCode);
                if (!privateRoom) {
                    throw new Error("Invalid invite code or room is not available");
                }

                // Enforce private room's max player limit
                if (this.clients.length >= privateRoom.maxPlayers) {
                    throw new Error(
                        `Room is full (${privateRoom.maxPlayers} players max). Use the waiting list API to join the queue.`
                    );
                }

                // Update Colyseus maxClients to match private room setting
                this.maxClients = privateRoom.maxPlayers;
            }

            const hasAccess = await AuthManager.verifyUser(this, isAuthRequired, token);
            if (!hasAccess) {
                console.error("User does not have access to join the room.");
                throw new Error("Access denied. User is not authorized to join this room.");
            }

            const player = new Player(
                client.id,
                client.sessionId,
                options.user.name,
                new UserData(
                    options.user.avatar,
                    options.user.email,
                    options.user.username,
                    options.user.name,
                    options.user.id
                )
            );

            this.state.players.set(client.sessionId, player);

            console.log(
                `onJoin: ${client.id} -> ${client.sessionId} -> ${options.user.name} -> ${this.clients.length}/${this.maxClients}`
            );

            this.roomController?.mergePhysicsDataToSnapshot?.(true);

            // Handle private room lifecycle
            if (this.isPrivate && inviteCode) {
                await this.lifecycleManager.onPlayerJoin(this, player, inviteCode);
            }

            this.roomController?.onPlayerJoined(player);

            if (this.clients.length >= this.maxClients && !this.isCollaborative) {
                //room from the list of available rooms
                await this.lock();
            }
        } catch (error) {
            console.error("Error during player join:", error);
            throw error; // Re-throw to prevent join
        }
    }

    async onLeave(client: Client, consented: boolean) {
        const player = this.state.players.get(client.sessionId);
        console.log(
            `onLeave: ${client.id} -> ${client.sessionId} -> ${player?.name} -> ${this.clients.length} < ${this.maxClients} (consented: ${consented})`
        );

        if (!player) {
            console.warn(`Player not found for session ${client.sessionId}`);
            return;
        }

        this.cleanupCollaborativePlayerState(player);

        // If user explicitly left (closed tab with intent), clean up immediately
        if (consented) {
            await this.cleanupPlayer(client, player);
            return;
        }

        // Network disconnect — allow reconnection for 30 seconds
        try {
            await this.allowReconnection(client, 30);
            console.log(`Player ${player.name} reconnected`);
        } catch {
            // Timeout expired — clean up
            await this.cleanupPlayer(client, player);
        }
    }

    private async cleanupPlayer(client: Client, player: Player): Promise<void> {
        this.state.players.delete(client.sessionId);
        this.roomController?.onPlayerLeft(player);

        // Handle private room lifecycle
        if (this.isPrivate) {
            await this.lifecycleManager.onPlayerLeave(this, player);
        }

        // Unlock room if below capacity (only for non-collaborative rooms)
        if (this.clients.length < this.maxClients && !this.isCollaborative) {
            await this.unlock();
        }
    }

    private cleanupCollaborativePlayerState(player: Player): void {
        // Clear any selections or temporary state associated with the player
        this.roomController?.clearClientSelection?.(player.user.id);
        this.roomController?.updateSceneCollection?.();
    }

    async onDispose() {
        console.log("room", this.roomId, "disposing...");

        this.roomController?.mergePhysicsDataToSnapshot?.(true);
        this.roomController?.clearAllSelections?.();
        this.roomController?.updateSceneCollection?.();
        this.roomController?.dispose();
    }

    /**
     * Initialize private room state
     */
    private async initializePrivateRoom(options: RoomCreateOptions): Promise<void> {
        if (!this.state.inviteCode) {
            console.warn("Invite code is not set for private room");
            return;
        }

        try {
            // Find the private room record
            const privateRoom = await PrivateRoom.findOne({
                inviteCode: this.state.inviteCode,
            });

            if (privateRoom) {
                // Set up private room info in state
                this.state.privateRoomInfo = new PrivateRoomInfo(
                    privateRoom.inviteCode,
                    privateRoom.ownerId,
                    privateRoom.maxPlayers
                );

                this.state.privateRoomInfo.allowWaitingList = privateRoom.settings.allowWaitingList;
                this.state.privateRoomInfo.autoStart = privateRoom.settings.autoStart;

                console.log(`Private room ${this.state.inviteCode} initialized`);
            }
        } catch (error) {
            console.error("Error initializing private room:", error);
        }
    }

    /**
     * Validate and retrieve private room data for join validation
     *
     * Performs invite code validation and returns the private room document
     * for capacity and settings enforcement.
     */
    private async validateAndGetPrivateRoom(inviteCode: string) {
        try {
            const normalizedCode = InviteCodeGenerator.normalize(inviteCode);
            if (!normalizedCode) return null;

            const privateRoom = await PrivateRoom.findOne({
                inviteCode: normalizedCode,
                isActive: true,
            });

            return privateRoom;
        } catch (error) {
            console.error("Error validating private room join:", error);
            return null;
        }
    }

    /**
     * Set up private room message handlers
     */
    private setupPrivateRoomMessageHandlers(): void {
        if (!this.isPrivate) return;

        // Handle promotion acceptance
        this.onMessage("accept_promotion", async (client, message) => {
            try {
                const success = await this.lifecycleManager.acceptPromotion(
                    client.auth?.uid || client.id,
                    this.state.inviteCode!
                );

                client.send("promotion_response", { success });
            } catch (error) {
                console.error("Error handling promotion acceptance:", error);
                client.send("promotion_response", { success: false, error: "Failed to accept promotion" });
            }
        });

        // Handle leaving waiting list
        this.onMessage("leave_waiting_list", async (client, message) => {
            try {
                if (!this.state.inviteCode) return;

                const privateRoom = await PrivateRoom.findOne({
                    inviteCode: this.state.inviteCode,
                });

                if (privateRoom) {
                    const success = await this.lifecycleManager.removeFromWaitingList(
                        this.state.inviteCode!,
                        client.auth?.uid || client.id
                    );

                    client.send("leave_waiting_list_response", { success });
                }
            } catch (error) {
                console.error("Error handling waiting list leave:", error);
                client.send("leave_waiting_list_response", { success: false });
            }
        });

        // Handle room settings update (owner only)
        this.onMessage("update_room_settings", async (client, message) => {
            try {
                if (
                    !this.state.privateRoomInfo ||
                    this.state.privateRoomInfo.ownerId !== (client.auth?.uid || client.id)
                ) {
                    client.send("settings_update_response", {
                        success: false,
                        error: "Only room owner can update settings",
                    });
                    return;
                }

                const updatedRoom = await this.lifecycleManager.updateRoomSettings(
                    this.state.inviteCode!,
                    client.auth?.uid || client.id,
                    message
                );

                client.send("settings_update_response", {
                    success: !!updatedRoom,
                    settings: updatedRoom?.settings,
                });
            } catch (error) {
                console.error("Error updating room settings:", error);
                client.send("settings_update_response", {
                    success: false,
                    error: "Failed to update settings",
                });
            }
        });
    }
}
