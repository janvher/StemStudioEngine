import { PrivateRoom, IPrivateRoom, IWaitingPlayer, IActivePlayer } from '../models/PrivateRoom.js';
import { Player, WaitingPlayer, PrivateRoomInfo } from '../rooms/schema/GameRoomState.js';
import { GameRoom } from '../rooms/GameRoom.js';
import { firebaseService } from '../firebase/firebase.service.js';
import { Types } from 'mongoose';

/**
 * Private Room Lifecycle Management Service
 *
 * Manages the complete lifecycle of private rooms including player state transitions,
 * waiting list management, promotion notifications, and real-time synchronization
 * between the database and Colyseus room state.
 *
 * Core Responsibilities:
 * - Player join/leave event handling with capacity enforcement
 * - Waiting list queue management and automatic promotions
 * - Real-time WebSocket event broadcasting
 * - Promotion invitation timeouts and acceptance handling
 * - Automatic room cleanup and expiration
 * - State synchronization between database and game room
 *
 * Design Pattern: Singleton to ensure consistent state management across the application
 */

export enum PrivateRoomEvents {
    PLAYER_JOINED = 'private_room:player_joined',
    PLAYER_LEFT = 'private_room:player_left',
    WAITING_LIST_UPDATED = 'private_room:waiting_list_updated',
    PLAYER_PROMOTED = 'private_room:player_promoted',
    ROOM_FULL = 'private_room:room_full',
    ROOM_SETTINGS_UPDATED = 'private_room:settings_updated',
    INVITATION_EXPIRED = 'private_room:invitation_expired'
}

export interface PlayerPromotionNotification {
    userId: string;
    displayName: string;
    inviteCode: string;
    expiresAt: number;
}

export class PrivateRoomLifecycleManager {
    private static readonly PROMOTION_INVITE_TIMEOUT = 30 * 1000; // 30 seconds
    private static readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
    private static instance: PrivateRoomLifecycleManager;

    // Track pending invitations
    private pendingInvitations = new Map<string, NodeJS.Timeout>();

    private constructor() {
        //this.startCleanupTimer();
    }

    static getInstance(): PrivateRoomLifecycleManager {
        if (!PrivateRoomLifecycleManager.instance) {
            PrivateRoomLifecycleManager.instance = new PrivateRoomLifecycleManager();
        }
        return PrivateRoomLifecycleManager.instance;
    }

    /**
     * Player Join Event Handler
     *
     * Processes a player joining a private room, updating the database state,
     * synchronizing the room state, and broadcasting events to all clients.
     * Handles capacity checks and room locking when at maximum capacity.
     */
    async onPlayerJoin(room: GameRoom, player: Player, inviteCode?: string): Promise<void> {
        try {
            let privateRoom: IPrivateRoom | null = null;

            if (inviteCode) {
                privateRoom = await PrivateRoom.findOne({ inviteCode });
            } else if (room.state.privateRoomInfo) {
                privateRoom = await PrivateRoom.findOne({
                    inviteCode: room.state.privateRoomInfo.inviteCode
                });
            }

            if (!privateRoom) {
                console.warn(`Private room not found for invite code ${inviteCode || room.state.privateRoomInfo?.inviteCode}`);
                return;
            }

            // Add player to active players
            const added = privateRoom.addActivePlayer(player.user.id, player.sessionId);
            if (!added) {
                console.warn(`Could not add player ${player.user.id} to private room ${privateRoom.inviteCode}`);
                return;
            }

            await privateRoom.save();

            // Update room state
            this.updateRoomPrivateInfo(room, privateRoom);

            // Emit event
            room.broadcast(PrivateRoomEvents.PLAYER_JOINED, {
                playerId: player.user.id,
                playerName: player.name,
                currentPlayers: privateRoom.activePlayers.length,
                maxPlayers: privateRoom.maxPlayers
            });

            console.log(`Player ${player.name} joined private room ${privateRoom.inviteCode}`);

            // Check if room became full
            if (privateRoom.isFull()) {
                room.broadcast(PrivateRoomEvents.ROOM_FULL, {
                    waitingListCount: privateRoom.waitingListCount
                });
            }

        } catch (error) {
            console.error('Error handling player join in private room:', error);
        }
    }

    /**
     * Handle player leaving a private room
     */
    async onPlayerLeave(room: GameRoom, player: Player): Promise<void> {
        try {
            const privateRoom = await PrivateRoom.findOne({ inviteCode: room.state.privateRoomInfo?.inviteCode });
            if (!privateRoom) {
                return;
            }

            // Remove player from active players
            const removedPlayer = privateRoom.removeActivePlayer(player.sessionId);
            if (!removedPlayer) {
                console.warn(`Player ${player.sessionId} not found in private room active players`);
                return;
            }

            await privateRoom.save();

            // Update room state
            this.updateRoomPrivateInfo(room, privateRoom);

            // Emit event
            room.broadcast(PrivateRoomEvents.PLAYER_LEFT, {
                playerId: player.user.id,
                playerName: player.name,
                currentPlayers: privateRoom.activePlayers.length,
                maxPlayers: privateRoom.maxPlayers
            });

            console.log(`Player ${player.name} left private room ${privateRoom.inviteCode}`);

            // Try to promote someone from waiting list
            if (!privateRoom.isFull() && privateRoom.waitingListCount > 0) {
                await this.promoteNextPlayer(room, privateRoom);
            }

        } catch (error) {
            console.error('Error handling player leave in private room:', error);
        }
    }

    /**
     * Add player to waiting list
     */
    async addToWaitingList(inviteCode: string, userId: string, displayName: string): Promise<boolean> {
        try {
            const privateRoom = await PrivateRoom.findOne({ inviteCode });
            if (!privateRoom) {
                return false;
            }

            const added = privateRoom.addToWaitingList(userId, displayName);
            if (!added) {
                return false;
            }

            await privateRoom.save();

            // Find associated game room and update state
            const room = this.findGameRoomByInviteCode(privateRoom.inviteCode);
            if (room) {
                this.updateRoomPrivateInfo(room, privateRoom);

                // Broadcast waiting list update
                room.broadcast(PrivateRoomEvents.WAITING_LIST_UPDATED, {
                    waitingListCount: privateRoom.waitingListCount,
                    position: privateRoom.waitingList.findIndex(p => p.userId === userId && p.status === 'waiting') + 1
                });
            }

            console.log(`Player ${displayName} added to waiting list for room ${privateRoom.inviteCode}`);
            return true;

        } catch (error) {
            console.error('Error adding player to waiting list:', error);
            return false;
        }
    }

    /**
     * Remove player from waiting list
     */
    async removeFromWaitingList(inviteCode: string, userId: string): Promise<boolean> {
        try {
            const privateRoom = await PrivateRoom.findOne({ inviteCode });
            if (!privateRoom) {
                return false;
            }

            const removed = privateRoom.removeFromWaitingList(userId);
            if (!removed) {
                return false;
            }

            await privateRoom.save();

            // Clear any pending invitation timeout
            this.clearPendingInvitation(userId);

            // Find associated game room and update state
            const room = this.findGameRoomByInviteCode(privateRoom.inviteCode);
            if (room) {
                this.updateRoomPrivateInfo(room, privateRoom);

                // Broadcast waiting list update
                room.broadcast(PrivateRoomEvents.WAITING_LIST_UPDATED, {
                    waitingListCount: privateRoom.waitingListCount
                });
            }

            console.log(`Player ${userId} removed from waiting list for room ${privateRoom.inviteCode}`);
            return true;

        } catch (error) {
            console.error('Error removing player from waiting list:', error);
            return false;
        }
    }

    /**
     * Waiting List Promotion System
     *
     * Automatically promotes the next eligible player from the waiting list when
     * a spot becomes available. Sends timed promotion invitations with automatic
     * timeout handling to ensure queue progression.
     */
    private async promoteNextPlayer(room: GameRoom, privateRoom: IPrivateRoom): Promise<void> {
        try {
            const nextPlayer = privateRoom.getNextWaitingPlayer();
            if (!nextPlayer) {
                return;
            }

            // Update player status to 'invited'
            const waitingPlayer = privateRoom.waitingList.find(
                p => p.userId === nextPlayer.userId && p.status === 'waiting'
            );

            if (!waitingPlayer) {
                return;
            }

            waitingPlayer.status = 'invited';
            await privateRoom.save();

            // Update room state
            this.updateRoomPrivateInfo(room, privateRoom);

            // Send promotion notification
            const notification: PlayerPromotionNotification = {
                userId: nextPlayer.userId,
                displayName: nextPlayer.displayName,
                inviteCode: privateRoom.inviteCode,
                expiresAt: Date.now() + PrivateRoomLifecycleManager.PROMOTION_INVITE_TIMEOUT
            };

            // Broadcast to all clients - the promoted user's client should handle this
            room.broadcast(PrivateRoomEvents.PLAYER_PROMOTED, notification);

            // Set timeout to decline invitation if not accepted
            const timeout = setTimeout(async () => {
                await this.handleInvitationTimeout(privateRoom.inviteCode, nextPlayer.userId);
            }, PrivateRoomLifecycleManager.PROMOTION_INVITE_TIMEOUT);

            this.pendingInvitations.set(nextPlayer.userId, timeout);

            console.log(`Player ${nextPlayer.displayName} promoted from waiting list for room ${privateRoom.inviteCode}`);

        } catch (error) {
            console.error('Error promoting player from waiting list:', error);
        }
    }

    /**
     * Handle invitation timeout
     */
    private async handleInvitationTimeout(inviteCode: string, userId: string): Promise<void> {
        try {
            const privateRoom = await PrivateRoom.findOne({ inviteCode });
            if (!privateRoom) {
                return;
            }

            // Set player status to 'declined'
            const waitingPlayer = privateRoom.waitingList.find(
                p => p.userId === userId && p.status === 'invited'
            );

            if (waitingPlayer) {
                waitingPlayer.status = 'declined';
                await privateRoom.save();

                // Clear the pending invitation
                this.clearPendingInvitation(userId);

                // Find associated game room
                const room = this.findGameRoomByInviteCode(privateRoom.inviteCode);
                if (room) {
                    // Update room state
                    this.updateRoomPrivateInfo(room, privateRoom);

                    // Broadcast invitation expiry
                    room.broadcast(PrivateRoomEvents.INVITATION_EXPIRED, {
                        userId,
                        waitingListCount: privateRoom.waitingListCount
                    });

                    // Try to promote next player
                    if (!privateRoom.isFull() && privateRoom.waitingListCount > 0) {
                        await this.promoteNextPlayer(room, privateRoom);
                    }
                }

                console.log(`Invitation expired for user ${userId} in room ${privateRoom.inviteCode}`);
            }

        } catch (error) {
            console.error('Error handling invitation timeout:', error);
        }
    }

    /**
     * Accept promotion invitation
     */
    async acceptPromotion(userId: string, inviteCode: string): Promise<boolean> {
        try {
            const privateRoom = await PrivateRoom.findOne({ inviteCode });
            if (!privateRoom) {
                return false;
            }

            // Find the invited player
            const waitingPlayer = privateRoom.waitingList.find(
                p => p.userId === userId && p.status === 'invited'
            );

            if (!waitingPlayer) {
                return false;
            }

            // Clear the pending invitation timeout
            this.clearPendingInvitation(userId);

            // Remove from waiting list (they'll join as active player)
            privateRoom.removeFromWaitingList(userId);
            await privateRoom.save();

            console.log(`User ${userId} accepted promotion invitation for room ${privateRoom.inviteCode}`);
            return true;

        } catch (error) {
            console.error('Error accepting promotion:', error);
            return false;
        }
    }

    /**
     * Update room settings
     */
    async updateRoomSettings(
        inviteCode: string,
        ownerId: string,
        updates: { maxPlayers?: number; allowWaitingList?: boolean; autoStart?: boolean }
    ): Promise<IPrivateRoom | null> {
        try {
            const privateRoom = await PrivateRoom.findOne({ inviteCode, ownerId });
            if (!privateRoom) {
                return null;
            }

            // Update settings
            if (updates.maxPlayers !== undefined) {
                // Don't allow reducing below current active players
                if (updates.maxPlayers >= privateRoom.activePlayers.length) {
                    privateRoom.maxPlayers = updates.maxPlayers;
                } else {
                    throw new Error('Cannot reduce max players below current active players');
                }
            }

            if (updates.allowWaitingList !== undefined) {
                privateRoom.settings.allowWaitingList = updates.allowWaitingList;

                // If disabling waiting list, remove all waiting players
                if (!updates.allowWaitingList) {
                    privateRoom.waitingList = [];
                }
            }

            if (updates.autoStart !== undefined) {
                privateRoom.settings.autoStart = updates.autoStart;
            }

            await privateRoom.save();

            // Find associated game room and update state
            const room = this.findGameRoomByInviteCode(privateRoom.inviteCode);
            if (room) {
                this.updateRoomPrivateInfo(room, privateRoom);

                // Broadcast settings update
                room.broadcast(PrivateRoomEvents.ROOM_SETTINGS_UPDATED, {
                    maxPlayers: privateRoom.maxPlayers,
                    allowWaitingList: privateRoom.settings.allowWaitingList,
                    autoStart: privateRoom.settings.autoStart
                });
            }

            console.log(`Room settings updated for ${privateRoom.inviteCode}`);
            return privateRoom;

        } catch (error) {
            console.error('Error updating room settings:', error);
            return null;
        }
    }

    /**
     * Deactivate a private room
     */
    async deactivateRoom(inviteCode: string, ownerId: string): Promise<boolean> {
        try {
            const privateRoom = await PrivateRoom.findOne({ inviteCode, ownerId });
            if (!privateRoom) {
                return false;
            }

            privateRoom.isActive = false;
            await privateRoom.save();

            // Clear all pending invitations for this room
            // for (const waitingPlayer of privateRoom.waitingList) {
            //     this.clearPendingInvitation(waitingPlayer.userId);
            // }

            console.log(`Private room ${privateRoom.inviteCode} deactivated`);
            return true;

        } catch (error) {
            console.error('Error deactivating room:', error);
            return false;
        }
    }

    /**
     * Update room's private info state
     */
    private updateRoomPrivateInfo(room: GameRoom, privateRoom: IPrivateRoom): void {
        if (!room.state.privateRoomInfo) {
            room.state.privateRoomInfo = new PrivateRoomInfo(
                privateRoom.inviteCode,
                privateRoom.ownerId,
                privateRoom.maxPlayers
            );
        }

        // Update settings
        room.state.privateRoomInfo.maxPlayers = privateRoom.maxPlayers;
        room.state.privateRoomInfo.allowWaitingList = privateRoom.settings.allowWaitingList;
        room.state.privateRoomInfo.autoStart = privateRoom.settings.autoStart;

        // Update waiting list
        room.state.privateRoomInfo.waitingList.clear();
        privateRoom.waitingList.forEach((waitingPlayer, index) => {
            if (waitingPlayer.status === 'waiting') {
                const schemaWaitingPlayer = new WaitingPlayer(
                    waitingPlayer.userId,
                    waitingPlayer.displayName,
                    index + 1,
                    waitingPlayer.status
                );
                room.state.privateRoomInfo!.waitingList.set(waitingPlayer.userId, schemaWaitingPlayer);
            }
        });
    }

    /**
     * Find game room by invite code (this would need to be implemented based on your room tracking)
     */
    private findGameRoomByInviteCode(inviteCode: string): GameRoom | null {
        // This is a placeholder - you'll need to implement room tracking
        // based on your Colyseus setup
        console.warn('findGameRoomByInviteCode not implemented - room state updates may not work');
        return null;
    }

    /**
     * Clear pending invitation timeout
     */
    private clearPendingInvitation(userId: string): void {
        const timeout = this.pendingInvitations.get(userId);
        if (timeout) {
            clearTimeout(timeout);
            this.pendingInvitations.delete(userId);
        }
    }

    /**
     * Start periodic cleanup of expired rooms and invitations
     */
    // private startCleanupTimer(): void {
    //     setInterval(async () => {
    //         await this.cleanupExpiredRooms();
    //     }, PrivateRoomLifecycleManager.CLEANUP_INTERVAL);
    // }

    /**
     * Clean up expired private rooms
     */
    // private async cleanupExpiredRooms(): Promise<void> {
    //     try {
    //         const expiredRooms = await PrivateRoom.find({
    //             $or: [
    //                 { expiresAt: { $lt: new Date() } },
    //                 { isActive: false, updatedAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } } // Inactive for 1 hour
    //             ]
    //         });
    //
    //         for (const room of expiredRooms) {
    //             // Clear any pending invitations
    //             for (const waitingPlayer of room.waitingList) {
    //                 this.clearPendingInvitation(waitingPlayer.userId);
    //             }
    //
    //             // Remove from database
    //             await PrivateRoom.findByIdAndDelete(room._id);
    //             console.log(`Cleaned up expired private room: ${room.inviteCode}`);
    //         }
    //
    //     } catch (error) {
    //         console.error('Error during room cleanup:', error);
    //     }
    // }

    /**
     * Get room statistics
     */
    async getRoomStats(inviteCode: string): Promise<{
        activePlayers: number;
        waitingPlayers: number;
        maxPlayers: number;
        isActive: boolean;
    } | null> {
        try {
            const privateRoom = await PrivateRoom.findOne({ inviteCode });
            if (!privateRoom) {
                return null;
            }

            return {
                activePlayers: privateRoom.currentPlayerCount,
                waitingPlayers: privateRoom.waitingListCount,
                maxPlayers: privateRoom.maxPlayers,
                isActive: privateRoom.isActive
            };

        } catch (error) {
            console.error('Error getting room stats:', error);
            return null;
        }
    }
}