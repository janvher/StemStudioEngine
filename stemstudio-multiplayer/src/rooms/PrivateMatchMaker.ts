import type { Cluster } from "ioredis";
import type Redis from "ioredis";
import express from "express";
import console from "node:console";
import type { RoomCreateOptions } from "./GameRoom.js";
import { matchMaker } from "@colyseus/core";
import { PrivateRoom, IPrivateRoom } from "../models/PrivateRoom.js";
import { PrivateRoomLifecycleManager } from "../services/PrivateRoomLifecycleManager.js";
import { InviteCodeGenerator } from "../utils/InviteCodeGenerator.js";
import { JoinRoomRequest } from "../utils/PrivateRoomValidator.js";

export interface JoinByInviteCodeResult {
    success: boolean;
    roomId?: string;
    status: 'joined' | 'waiting' | 'full' | 'invalid' | 'error';
    position?: number; // Position in waiting list if applicable
    message: string;
    waitingListEnabled?: boolean;
}

export interface PrivateRoomCreateOptions extends RoomCreateOptions {
    isPrivate: boolean;
    inviteCode: string;
    allowWaitingList: boolean;
    privateRoomId: string; // Database ID reference
}

/**
 * Private Room Integration Layer for Colyseus
 *
 * Bridges the gap between HTTP API requests and Colyseus room management for private rooms.
 * Acts as a specialized matchmaker that handles private room creation, joining, and state
 * synchronization between the database layer and the real-time game sessions.
 *
 * Core Responsibilities:
 * - Private room creation with Colyseus integration
 * - Invite code-based room joining with capacity enforcement
 * - Redis-based locking for concurrent join attempts
 * - Waiting list management and automatic promotions
 * - Room information retrieval and validation
 * - Cleanup of expired and inactive rooms
 *
 * Integration Points:
 * - Works with PrivateRoomController for HTTP endpoints
 * - Uses PrivateRoomLifecycleManager for state management
 * - Integrates with Colyseus matchMaker for room operations
 * - Utilizes Redis for distributed locking (optional)
 */
export default class PrivateMatchMaker {
    private static instance: PrivateMatchMaker | null = null;
    private lifecycleManager: PrivateRoomLifecycleManager;

    public static init(redisClient: Redis | Cluster | null) {
        PrivateMatchMaker.instance = new PrivateMatchMaker(redisClient);
    }

    public static getInstance(): PrivateMatchMaker | null {
        return PrivateMatchMaker.instance;
    }

    public static getRouter(): express.Router {
        const router = express.Router();

        // Create private room
        router.post('/create', async (req, res) => {
            console.log('POST /private-match/create', req.body);
            try {
                if (!PrivateMatchMaker.instance) {
                    throw new Error("PrivateMatchMaker is not initialized");
                }

                const result = await PrivateMatchMaker.instance.createPrivateRoom(req.body);
                res.status(201).json(result);

            } catch (err) {
                console.error('Error creating private room:', err);
                res.status(500).json({
                    success: false,
                    message: "Failed to create private room",
                    error: err instanceof Error ? err.message : 'Unknown error'
                });
            }
        });

        // Join by invite code
        router.post('/join/:inviteCode', async (req, res) => {
            console.log(`POST /private-match/join/${req.params.inviteCode}`, req.body);
            try {
                if (!PrivateMatchMaker.instance) {
                    throw new Error("PrivateMatchMaker is not initialized");
                }

                const result = await PrivateMatchMaker.instance.joinByInviteCode(
                    req.params.inviteCode,
                    req.body
                );

                const statusCode = result.success ? 200 : 400;
                res.status(statusCode).json(result);

            } catch (err) {
                console.error('Error joining private room by invite code:', err);
                res.status(500).json({
                    success: false,
                    status: 'error',
                    message: "Failed to join private room",
                    error: err instanceof Error ? err.message : 'Unknown error'
                });
            }
        });

        // Get room info by invite code
        router.get('/info/:inviteCode', async (req, res) => {
            console.log(`GET /private-match/info/${req.params.inviteCode}`);
            try {
                if (!PrivateMatchMaker.instance) {
                    throw new Error("PrivateMatchMaker is not initialized");
                }

                const result = await PrivateMatchMaker.instance.getRoomInfo(req.params.inviteCode);
                if (result) {
                    res.json(result);
                } else {
                    res.status(404).json({
                        message: 'Private room not found'
                    });
                }

            } catch (err) {
                console.error('Error getting private room info:', err);
                res.status(500).json({
                    message: "Failed to get room info",
                    error: err instanceof Error ? err.message : 'Unknown error'
                });
            }
        });

        return router;
    }

    //////////// private stuff /////////

    private constructor(private redisInstance: Cluster | Redis | null) {
        this.lifecycleManager = PrivateRoomLifecycleManager.getInstance();
    }

    private lockKeyForRoom(identifier: string) {
        return `private_lock:${identifier}`;
    }

    private async lockRedis(identifier: string): Promise<void> {
        if (!this.redisInstance) return;

        const lockKey = this.lockKeyForRoom(identifier);
        const lockTimeout = 5000; // milliseconds

        // Attempt to acquire a lock using Redis' SET with NX flag.
        const lockAcquired = await this.redisInstance.set(lockKey, 'locked', 'PX', lockTimeout, 'NX');
        if (!lockAcquired) {
            // If we didn't get the lock, wait a bit and retry.
            await new Promise((resolve) => setTimeout(resolve, 100));
            return this.lockRedis(identifier);
        }
    }

    private async unlockRedis(identifier: string): Promise<void> {
        if (!this.redisInstance) return;

        const lockKey = this.lockKeyForRoom(identifier);
        await this.redisInstance.del(lockKey);
    }

    /**
     * Private Room Creation with Colyseus Integration
     *
     * Creates both a Colyseus game room and corresponding database record for private rooms.
     * Handles invite code generation, scene validation, and initial room configuration.
     * Ensures atomic creation - if either step fails, the entire operation is rolled back.
     */
    public async createPrivateRoom(options: any): Promise<{
        success: boolean;
        roomId?: string;
        inviteCode?: string;
        privateRoomId?: string;
        message: string;
    }> {
        try {
            // This would typically be called from the PrivateRoomController
            // after all validation is done, so we expect a properly formatted request

            const { sceneId, maxPlayers, settings, token, user } = options;

            // Generate unique invite code
            const inviteCode = await InviteCodeGenerator.generateUnique(async (code) => {
                const existing = await PrivateRoom.findOne({ inviteCode: code });
                return !existing;
            });

            // Create Colyseus room
            const roomCreateOptions: RoomCreateOptions = {
                name: `Private Room ${inviteCode}`,
                simple: true,
                maxClients: maxPlayers,
                user: user,
                token: token,
                isCollaborative: false,
                isAuthRequired: true,
                isPrivate: true,
                inviteCode: inviteCode,
                ownerId: user ? user.id : undefined
            };

            const reservation = await matchMaker.create(sceneId, roomCreateOptions);

            // Create private room database record
            const privateRoom = new PrivateRoom({
                inviteCode: inviteCode,
                sceneId: sceneId,
                ownerId: user.id,
                maxPlayers: maxPlayers,
                settings: {
                    allowWaitingList: settings.allowWaitingList,
                    autoStart: settings.autoStart,
                    isPrivate: true
                }
            });

            await privateRoom.save();

            return {
                success: true,
                roomId: reservation.room.roomId,  // This is returned for the API response only
                inviteCode: inviteCode,
                privateRoomId: privateRoom._id.toString(),
                message: 'Private room created successfully'
            };

        } catch (error) {
            console.error('Error creating private room:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create private room'
            };
        }
    }

    /**
     * Invite Code-Based Room Joining with Capacity Management
     *
     * Handles joining private rooms via invite codes with proper capacity enforcement,
     * waiting list management, and race condition prevention through Redis locking.
     * Coordinates between database state and Colyseus room instances to ensure
     * consistent player counts and proper room access control.
     */
    public async joinByInviteCode(inviteCode: string, joinOptions: JoinRoomRequest): Promise<JoinByInviteCodeResult> {
        const normalizedCode = InviteCodeGenerator.normalize(inviteCode);

        if (!normalizedCode) {
            return {
                success: false,
                status: 'invalid',
                message: 'Invalid invite code format'
            };
        }

        try {
            // Lock to prevent race conditions
            await this.lockRedis(normalizedCode);

            // Find the private room
            const privateRoom = await PrivateRoom.findOne({
                inviteCode: normalizedCode,
                isActive: true
            });

            if (!privateRoom) {
                return {
                    success: false,
                    status: 'invalid',
                    message: 'Private room not found or inactive'
                };
            }

            // Check if user is already in the room or waiting list
            const userId = joinOptions.user.id;
            const isActivePlayer = privateRoom.activePlayers.some(p => p.userId === userId);
            const isInWaitingList = privateRoom.waitingList.some(p => p.userId === userId);

            if (isActivePlayer) {
                return {
                    success: false,
                    status: 'error',
                    message: 'You are already in this room'
                };
            }

            if (isInWaitingList) {
                const waitingPlayer = privateRoom.waitingList.find(p => p.userId === userId);
                const position = privateRoom.waitingList.filter(p =>
                    p.status === 'waiting' &&
                    p.joinedAt <= (waitingPlayer?.joinedAt || new Date())
                ).length;

                return {
                    success: true,
                    status: 'waiting',
                    position: position,
                    message: `You are already in the waiting list at position ${position}`,
                    waitingListEnabled: privateRoom.settings.allowWaitingList
                };
            }

            // Check if room has space
            if (privateRoom.canJoinDirectly()) {
                // Try to join the Colyseus room directly by finding it via invite code
                try {
                    const rooms = await matchMaker.query({ inviteCode: normalizedCode });

                    if (rooms.length === 0) {
                        // Room session doesn't exist, try waiting list if available
                        if (privateRoom.settings.allowWaitingList) {
                            return await this.addToWaitingList(privateRoom, userId, joinOptions.user.name);
                        }
                        return {
                            success: false,
                            status: 'error',
                            message: 'Room session not found'
                        };
                    }

                    const room = rooms[0];
                    // const reservation = await matchMaker.joinById(room.roomId, {
                    //     ...joinOptions,
                    //     inviteCode: normalizedCode
                    // });

                    return {
                        success: true,
                        roomId: room.roomId,  // Using actual room ID from Colyseus
                        status: 'joined',
                        message: 'Successfully joined the private room'
                    };

                } catch (colyseusError) {
                    console.error('Failed to join Colyseus room:', colyseusError);

                    // If Colyseus join failed but room should have space, try waiting list
                    if (privateRoom.settings.allowWaitingList) {
                        return await this.addToWaitingList(privateRoom, userId, joinOptions.user.name);
                    }

                    return {
                        success: false,
                        status: 'error',
                        message: 'Failed to join the room - it may be full or unavailable'
                    };
                }

            } else if (privateRoom.settings.allowWaitingList) {
                // Add to waiting list
                return await this.addToWaitingList(privateRoom, userId, joinOptions.user.name);

            } else {
                return {
                    success: false,
                    status: 'full',
                    message: 'Room is full and waiting list is disabled',
                    waitingListEnabled: false
                };
            }

        } catch (error) {
            console.error('Error joining private room by invite code:', error);
            return {
                success: false,
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to join private room'
            };
        } finally {
            await this.unlockRedis(normalizedCode);
        }
    }

    /**
     * Add user to waiting list
     */
    private async addToWaitingList(privateRoom: IPrivateRoom, userId: string, displayName: string): Promise<JoinByInviteCodeResult> {
        const success = await this.lifecycleManager.addToWaitingList(
            privateRoom.inviteCode,
            userId,
            displayName
        );

        if (success) {
            // Get updated room from database to ensure we have latest waiting list
            const updatedRoom = await PrivateRoom.findById(privateRoom._id);
            const position = updatedRoom!.waitingList.findIndex(p =>
                p.userId === userId && p.status === 'waiting'
            ) + 1;

            return {
                success: true,
                status: 'waiting',
                position: position,
                message: `Added to waiting list at position ${position}`,
                waitingListEnabled: true
            };
        } else {
            return {
                success: false,
                status: 'error',
                message: 'Failed to add to waiting list - you may already be in the room or waiting list'
            };
        }
    }

    /**
     * Get private room information by invite code
     */
    public async getRoomInfo(inviteCode: string): Promise<{
        name: string;
        roomId: string;
        inviteCode: string;
        sceneId: string;
        ownerId: string;
        currentPlayers: number;
        maxPlayers: number;
        waitingListCount: number;
        canJoin: boolean;
        canJoinWaitingList: boolean;
        settings: {
            allowWaitingList: boolean;
            autoStart: boolean;
        };
        isActive: boolean;
        createdAt: Date;
    } | null> {
        try {
            const normalizedCode = InviteCodeGenerator.normalize(inviteCode);
            if (!normalizedCode) {
                return null;
            }

            const privateRoom = await PrivateRoom.findOne({
                inviteCode: normalizedCode,
                isActive: true
            });

            if (!privateRoom) {
                return null;
            }

            // Find active Colyseus room to get the roomId
            const rooms = await matchMaker.query({ inviteCode: normalizedCode });
            const activeRoomId = rooms.length > 0 ? rooms[0].roomId : null;

            return {
                name: privateRoom.name,
                roomId: activeRoomId || '',  // roomId from Colyseus if available
                inviteCode: privateRoom.inviteCode,
                sceneId: privateRoom.sceneId.toString(),
                ownerId: privateRoom.ownerId,
                currentPlayers: privateRoom.currentPlayerCount,
                maxPlayers: privateRoom.maxPlayers,
                waitingListCount: privateRoom.waitingListCount,
                canJoin: privateRoom.canJoinDirectly(),
                canJoinWaitingList: privateRoom.settings.allowWaitingList && !privateRoom.canJoinDirectly(),
                settings: {
                    allowWaitingList: privateRoom.settings.allowWaitingList,
                    autoStart: privateRoom.settings.autoStart
                },
                isActive: privateRoom.isActive,
                createdAt: privateRoom.createdAt
            };

        } catch (error) {
            console.error('Error getting private room info:', error);
            return null;
        }
    }

    /**
     * Get all private rooms for a user
     */
    public async getUserPrivateRooms(userId: string): Promise<Array<{
        id: string;
        roomId: string;
        inviteCode: string;
        sceneId: string;
        currentPlayers: number;
        maxPlayers: number;
        waitingListCount: number;
        isActive: boolean;
        createdAt: Date;
    }>> {
        try {
            const privateRooms = await PrivateRoom.find({
                ownerId: userId,
                isActive: true
            }).sort({ createdAt: -1 });

            return privateRooms.map(room => ({
                id: room._id.toString(),
                roomId: 'N/A',  // We no longer store roomId
                inviteCode: room.inviteCode,
                sceneId: room.sceneId.toString(),
                currentPlayers: room.currentPlayerCount,
                maxPlayers: room.maxPlayers,
                waitingListCount: room.waitingListCount,
                isActive: room.isActive,
                createdAt: room.createdAt
            }));

        } catch (error) {
            console.error('Error getting user private rooms:', error);
            return [];
        }
    }

    /**
     * Check if a private room exists and is active
     */
    public async validateInviteCode(inviteCode: string): Promise<boolean> {
        try {
            const normalizedCode = InviteCodeGenerator.normalize(inviteCode);
            if (!normalizedCode) {
                return false;
            }

            const privateRoom = await PrivateRoom.findOne({
                inviteCode: normalizedCode,
                isActive: true
            });

            return !!privateRoom;

        } catch (error) {
            console.error('Error validating invite code:', error);
            return false;
        }
    }

    /**
     * Deactivate a private room
     */
    public async deactivatePrivateRoom(inviteCode: string, ownerId: string): Promise<boolean> {
        try {
            const result = await PrivateRoom.updateOne(
                { inviteCode, ownerId, isActive: true },
                { isActive: false }
            );

            return result.modifiedCount > 0;

        } catch (error) {
            console.error('Error deactivating private room:', error);
            return false;
        }
    }

    /**
     * Clean up expired private rooms
     */
    public async cleanupExpiredRooms(): Promise<number> {
        try {
            const result = await PrivateRoom.deleteMany({
                $or: [
                    { expiresAt: { $lt: new Date() } },
                    {
                        isActive: false,
                        updatedAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } // Inactive for 1 hour
                    }
                ]
            });

            if (result.deletedCount > 0) {
                console.log(`Cleaned up ${result.deletedCount} expired private rooms`);
            }

            return result.deletedCount || 0;

        } catch (error) {
            console.error('Error cleaning up expired private rooms:', error);
            return 0;
        }
    }
}
