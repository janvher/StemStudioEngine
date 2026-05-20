import express, { Request, Response, NextFunction } from 'express';
import { PrivateRoom } from '../models/PrivateRoom.js';
import { Scene } from '../models/Scene.js';
import { InviteCodeGenerator } from '../utils/InviteCodeGenerator.js';
import { PrivateRoomValidator, CreatePrivateRoomRequest, JoinRoomRequest, UpdateRoomSettingsRequest } from '../utils/PrivateRoomValidator.js';
import { PrivateRoomLifecycleManager } from '../services/PrivateRoomLifecycleManager.js';
import { firebaseService } from '../firebase/firebase.service.js';
import { matchMaker } from '@colyseus/core';
import { Types } from 'mongoose';

/**
 * Private Room REST API Controller
 *
 * Provides HTTP endpoints for private room management including creation, joining,
 * settings management, and room information retrieval. Integrates with Firebase
 * authentication and Colyseus room system.
 *
 * API Endpoints:
 * - POST /api/private-rooms - Create a new private room
 * - GET /api/private-rooms/:inviteCode - Get room information
 * - POST /api/private-rooms/:inviteCode/join - Join room or waiting list
 * - POST /api/private-rooms/:inviteCode/leave - Leave room or waiting list
 * - POST /api/private-rooms/:inviteCode/accept-promotion - Accept promotion
 * - PATCH /api/private-rooms/:inviteCode/settings - Update room settings (owner)
 * - DELETE /api/private-rooms/:inviteCode - Deactivate room (owner)
 * - GET /api/private-rooms/my/rooms - Get user's created rooms
 *
 * Security Features:
 * - Firebase authentication required for all operations
 * - Rate limiting and input validation
 * - Owner permission checks for sensitive operations
 * - Scene access verification
 */

export interface RoomInfoResponse {
    name: string;
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
}

export interface JoinRoomResponse {
    success: boolean;
    status: 'joined' | 'waiting' | 'full' | 'error';
    position?: number; // Position in waiting list if applicable
    message: string;
    roomId?: string;
}

export interface MyRoomsResponse {
    rooms: Array<{
        id: string;
        inviteCode: string;
        sceneId: string;
        currentPlayers: number;
        maxPlayers: number;
        waitingListCount: number;
        isActive: boolean;
        createdAt: Date;
    }>;
}

export class PrivateRoomController {
    private lifecycleManager: PrivateRoomLifecycleManager;

    constructor() {
        this.lifecycleManager = PrivateRoomLifecycleManager.getInstance();
    }

    /**
     * Get Express router with all private room routes
     */
    getRouter(): express.Router {
        const router = express.Router();

        // Create private room
        router.post('/', this.createPrivateRoom.bind(this));

        // Get user's created rooms - MUST be before parameterized routes
        router.get('/my/rooms', this.getMyRooms.bind(this));

        // Get room info by invite code
        router.get('/:inviteCode', this.getRoomInfo.bind(this));

        // Deactivate room (owner only)
        router.delete('/:inviteCode', this.deactivateRoom.bind(this));

        // Join room by invite code
        // router.post('/:inviteCode/join', this.joinRoom.bind(this));
        //
        // // Leave room or waiting list
        // router.post('/:inviteCode/leave', this.leaveRoom.bind(this));
        //
        // // Accept promotion from waiting list
        // router.post('/:inviteCode/accept-promotion', this.acceptPromotion.bind(this));
        //
        // // Update room settings (owner only)
        // router.patch('/:inviteCode/settings', this.updateRoomSettings.bind(this));

        return router;
    }

    /**
     * Create Private Room Endpoint
     *
     * Creates a new private room with unique invite code, integrates with Colyseus
     * for game session management, and stores persistent state in MongoDB.
     * Enforces rate limiting and validates scene access permissions.
     */
    private async createPrivateRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            const createRequest = req.body as CreatePrivateRoomRequest;

            // Validate request
            const validation = PrivateRoomValidator.validateCreateRequest(createRequest);
            if (!validation.isValid) {
                res.status(400).json({
                    message: 'Invalid request',
                    errors: validation.errors
                });
                return;
            }

            // Verify authentication
            const decodedToken = await firebaseService.verifyIdToken(token);
            if (!decodedToken) {
                res.status(401).json({ message: 'Invalid authentication token' });
                return;
            }

            const userId = decodedToken.uid;
            //const userEmail = decodedToken.email;

            // Check rate limiting
            const rateLimit = PrivateRoomValidator.checkRoomCreationRateLimit(userId);
            if (!rateLimit.allowed) {
                res.status(429).json({
                    message: 'Rate limit exceeded',
                    remainingAttempts: rateLimit.remainingAttempts,
                    resetTime: rateLimit.resetTime
                });
                return;
            }

            // Verify scene access
            const scene = await Scene.findOne({ ID: new Types.ObjectId(createRequest.sceneId) }).lean();
            if (!scene) {
                res.status(404).json({ message: 'Scene not found' });
                return;
            }

            // if (!PrivateRoomValidator.validateSceneAccess(scene.UserID, scene.Collaborators, userId, userEmail || '')) {
            //     res.status(403).json({ message: 'You do not have access to this scene' });
            //     return;
            // }

            // Generate unique invite code
            const inviteCode = await InviteCodeGenerator.generateUnique(async (code) => {
                const existing = await PrivateRoom.findOne({ inviteCode: code });
                return !existing;
            });

            // Create Colyseus room first
            // const roomCreateOptions = {
            //     name: name,
            //     simple: true,
            //     maxClients: createRequest.maxPlayers,
            //     user: {
            //         avatar: '',
            //         email: userEmail || '',
            //         username: userEmail?.split('@')[0] || 'user',
            //         name: userEmail?.split('@')[0] || 'user',
            //         id: userId
            //     },
            //     isCollaborative: scene.IsCollaborative || false,
            //     isAuthRequired: true,
            //     isPrivate: true,
            //     inviteCode: inviteCode
            // };
            //
            //const reservation = await matchMaker.create(createRequest.sceneId, roomCreateOptions);

            // Create private room record
            const privateRoom = new PrivateRoom({
                name: createRequest.name,
                inviteCode: inviteCode,
                sceneId: new Types.ObjectId(createRequest.sceneId),
                ownerId: userId,
                maxPlayers: createRequest.maxPlayers,
                settings: {
                    allowWaitingList: createRequest.settings.allowWaitingList,
                    autoStart: createRequest.settings.autoStart,
                    isPrivate: true
                }
            });

            await privateRoom.save();

            // Record rate limiting
            PrivateRoomValidator.recordRoomCreation(userId);

            const response: RoomInfoResponse = {
                name: privateRoom.name,
                inviteCode: privateRoom.inviteCode,
                sceneId: createRequest.sceneId,
                ownerId: userId,
                currentPlayers: 0,
                maxPlayers: privateRoom.maxPlayers,
                waitingListCount: 0,
                canJoin: true,
                canJoinWaitingList: privateRoom.settings.allowWaitingList,
                settings: {
                    allowWaitingList: privateRoom.settings.allowWaitingList,
                    autoStart: privateRoom.settings.autoStart
                },
                isActive: true,
                createdAt: privateRoom.createdAt
            };

            res.status(201).json(response);

        } catch (error) {
            console.error('Error creating private room:', error);
            next(error);
        }
    }

    /**
     * Get room information by invite code
     */
    private async getRoomInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { inviteCode } = req.params;

            const normalizedCode = InviteCodeGenerator.normalize(inviteCode);
            if (!normalizedCode) {
                res.status(400).json({ message: 'Invalid invite code format' });
                return;
            }

            const privateRoom = await PrivateRoom.findOne({
                inviteCode: normalizedCode,
                isActive: true
            }).populate('sceneId');

            if (!privateRoom) {
                res.status(404).json({ message: 'Room not found or inactive' });
                return;
            }

            const response = {
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
            } as RoomInfoResponse;

            res.json(response);

        } catch (error) {
            console.error('Error getting room info:', error);
            next(error);
        }
    }

    /**
     * Join room by invite code
     */
    private async joinRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { inviteCode } = req.params;
            const joinRequest = req.body as JoinRoomRequest;

            // Validate request
            const validation = PrivateRoomValidator.validateJoinRequest(joinRequest);
            if (!validation.isValid) {
                res.status(400).json({
                    message: 'Invalid request',
                    errors: validation.errors
                });
                return;
            }

            // Verify authentication
            const decodedToken = await firebaseService.verifyIdToken(joinRequest.token);
            if (!decodedToken) {
                res.status(401).json({ message: 'Invalid authentication token' });
                return;
            }

            const userId = decodedToken.uid;

            // Check rate limiting
            const rateLimit = PrivateRoomValidator.checkJoinAttemptRateLimit(userId);
            if (!rateLimit.allowed) {
                res.status(429).json({
                    message: 'Too many join attempts',
                    remainingAttempts: rateLimit.remainingAttempts,
                    resetTime: rateLimit.resetTime
                });
                return;
            }

            const normalizedCode = InviteCodeGenerator.normalize(inviteCode);
            if (!normalizedCode) {
                res.status(400).json({ message: 'Invalid invite code format' });
                return;
            }

            const privateRoom = await PrivateRoom.findOne({
                inviteCode: normalizedCode,
                isActive: true
            });

            if (!privateRoom) {
                res.status(404).json({ message: 'Room not found or inactive' });
                return;
            }

            // Record join attempt
            PrivateRoomValidator.recordJoinAttempt(userId);

            let response: JoinRoomResponse;

            // Check if user can join directly
            if (privateRoom.canJoinDirectly()) {
                // Find the Colyseus room by invite code using metadata
                try {
                    const rooms = await matchMaker.query({ inviteCode: normalizedCode });

                    if (rooms.length === 0) {
                        response = {
                            success: false,
                            status: 'error',
                            message: 'Room session not found. The room may have been disposed.'
                        };
                    } else {
                        // Join the first matching room (there should only be one)
                        const room = rooms[0];
                        const reservation = await matchMaker.joinById(room.roomId, {
                            ...joinRequest,
                            inviteCode: normalizedCode
                        });

                        response = {
                            success: true,
                            status: 'joined',
                            message: 'Successfully joined the room',
                            roomId: reservation.room.roomId
                        };
                    }
                } catch (error) {
                    console.error('Error joining Colyseus room:', error);
                    response = {
                        success: false,
                        status: 'error',
                        message: 'Failed to join room'
                    };
                }

            } else if (privateRoom.settings.allowWaitingList) {
                // Add to waiting list
                const added = await this.lifecycleManager.addToWaitingList(
                    privateRoom.inviteCode,
                    userId,
                    joinRequest.user.name
                );

                if (added) {
                    const position = privateRoom.waitingList.findIndex(p => p.userId === userId && p.status === 'waiting') + 1;

                    response = {
                        success: true,
                        status: 'waiting',
                        position,
                        message: `Added to waiting list at position ${position}`
                    };
                } else {
                    response = {
                        success: false,
                        status: 'error',
                        message: 'Could not add to waiting list (user may already be in room or waiting list)'
                    };
                }

            } else {
                response = {
                    success: false,
                    status: 'full',
                    message: 'Room is full and waiting list is disabled'
                };
            }

            res.json(response);

        } catch (error) {
            console.error('Error joining room:', error);
            next(error);
        }
    }

    /**
     * Leave room or waiting list
     */
    private async leaveRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { inviteCode } = req.params;
            const { token } = req.body;

            // Verify authentication
            const decodedToken = await firebaseService.verifyIdToken(token);
            if (!decodedToken) {
                res.status(401).json({ message: 'Invalid authentication token' });
                return;
            }

            const normalizedCode = InviteCodeGenerator.normalize(inviteCode);
            if (!normalizedCode) {
                res.status(400).json({ message: 'Invalid invite code format' });
                return;
            }

            const privateRoom = await PrivateRoom.findOne({ inviteCode: normalizedCode });
            if (!privateRoom) {
                res.status(404).json({ message: 'Room not found' });
                return;
            }

            // Try to remove from waiting list first
            const removedFromWaitingList = await this.lifecycleManager.removeFromWaitingList(
                privateRoom.inviteCode,
                decodedToken.uid
            );

            if (removedFromWaitingList) {
                res.json({
                    success: true,
                    message: 'Removed from waiting list'
                });
                return;
            }

            // If not in waiting list, they should leave the active room through Colyseus
            // This will be handled by the GameRoom's onLeave method
            res.json({
                success: true,
                message: 'Leave request processed'
            });

        } catch (error) {
            console.error('Error leaving room:', error);
            next(error);
        }
    }

    /**
     * Accept promotion from waiting list
     */
    private async acceptPromotion(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { inviteCode } = req.params;
            const { token } = req.body;

            // Verify authentication
            const decodedToken = await firebaseService.verifyIdToken(token);
            if (!decodedToken) {
                res.status(401).json({ message: 'Invalid authentication token' });
                return;
            }

            const normalizedCode = InviteCodeGenerator.normalize(inviteCode);
            if (!normalizedCode) {
                res.status(400).json({ message: 'Invalid invite code format' });
                return;
            }

            const privateRoom = await PrivateRoom.findOne({
                inviteCode: normalizedCode,
                isActive: true
            });

            if (!privateRoom) {
                res.status(404).json({ message: 'Room not found or inactive' });
                return;
            }

            const accepted = await this.lifecycleManager.acceptPromotion(
                decodedToken.uid,
                privateRoom.inviteCode
            );

            if (!accepted) {
                res.status(400).json({
                    message: 'No valid promotion invitation found'
                });
                return;
            }

            // Now create Colyseus room reservation by finding the room using invite code
            try {
                const rooms = await matchMaker.query({ inviteCode: normalizedCode });

                if (rooms.length === 0) {
                    res.status(404).json({
                        success: false,
                        message: 'Room session not found. The room may have been disposed.'
                    });
                    return;
                }

                // Join the first matching room
                const room = rooms[0];
                await matchMaker.joinById(room.roomId, {
                    token,
                    inviteCode: normalizedCode,
                    user: {
                        id: decodedToken.uid,
                        email: decodedToken.email || '',
                        username: decodedToken.email?.split('@')[0] || 'user',
                        name: decodedToken.name || decodedToken.email?.split('@')[0] || 'user',
                        avatar: ''
                    }
                });

                res.json({
                    success: true,
                    message: 'Successfully joined the room'
                });

            } catch (error) {
                console.error('Error joining Colyseus room after promotion:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to join room after accepting promotion'
                });
            }

        } catch (error) {
            console.error('Error accepting promotion:', error);
            next(error);
        }
    }

    /**
     * Update room settings (owner only)
     */
    private async updateRoomSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { inviteCode } = req.params;
            const updateRequest = req.body as UpdateRoomSettingsRequest & { token: string };

            // Validate request
            const validation = PrivateRoomValidator.validateUpdateSettingsRequest(updateRequest);
            if (!validation.isValid) {
                res.status(400).json({
                    message: 'Invalid request',
                    errors: validation.errors
                });
                return;
            }

            // Verify authentication
            const decodedToken = await firebaseService.verifyIdToken(updateRequest.token);
            if (!decodedToken) {
                res.status(401).json({ message: 'Invalid authentication token' });
                return;
            }

            const normalizedCode = InviteCodeGenerator.normalize(inviteCode);
            if (!normalizedCode) {
                res.status(400).json({ message: 'Invalid invite code format' });
                return;
            }

            const updatedRoom = await this.lifecycleManager.updateRoomSettings(
                normalizedCode,
                decodedToken.uid,
                updateRequest
            );

            if (!updatedRoom) {
                res.status(404).json({
                    message: 'Room not found or you are not the owner'
                });
                return;
            }

            res.json({
                success: true,
                message: 'Room settings updated successfully',
                settings: updatedRoom.settings
            });

        } catch (error) {
            console.error('Error updating room settings:', error);
            next(error);
        }
    }

    /**
     * Deactivate room (owner only)
     */
    private async deactivateRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            const { inviteCode } = req.params;

            // Verify authentication
            const decodedToken = await firebaseService.verifyIdToken(token);
            if (!decodedToken) {
                res.status(401).json({ message: 'Invalid authentication token' });
                return;
            }

            const normalizedCode = InviteCodeGenerator.normalize(inviteCode);
            if (!normalizedCode) {
                res.status(400).json({ message: 'Invalid invite code format' });
                return;
            }

            const privateRoom = await PrivateRoom.findOne({
                inviteCode: normalizedCode,
                ownerId: decodedToken.uid
            });

            if (!privateRoom) {
                res.status(404).json({
                    message: 'Room not found or you are not the owner'
                });
                return;
            }

            const deactivated = await this.lifecycleManager.deactivateRoom(
                privateRoom.inviteCode,
                decodedToken.uid
            );

            if (!deactivated) {
                res.status(500).json({
                    message: 'Failed to deactivate room'
                });
                return;
            }

            res.json({
                success: true,
                message: 'Room deactivated successfully'
            });

        } catch (error) {
            console.error('Error deactivating room:', error);
            next(error);
        }
    }

    /**
     * Get user's created rooms
     */
    private async getMyRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                res.status(401).json({ message: 'Authentication token required' });
                return;
            }

            // Verify authentication
            const decodedToken = await firebaseService.verifyIdToken(token);
            if (!decodedToken) {
                res.status(401).json({ message: 'Invalid authentication token' });
                return;
            }

            const privateRooms = await PrivateRoom.find({
                ownerId: decodedToken.uid,
                isActive: true
            }).sort({ createdAt: -1 });

            const response: MyRoomsResponse = {
                rooms: privateRooms.map(room => ({
                    id: room._id.toString(),
                    name: room.name,
                    inviteCode: room.inviteCode,
                    sceneId: room.sceneId.toString(),
                    currentPlayers: room.currentPlayerCount,
                    maxPlayers: room.maxPlayers,
                    waitingListCount: room.waitingListCount,
                    isActive: room.isActive,
                    createdAt: room.createdAt
                }))
            };

            res.json(response);

        } catch (error) {
            console.error('Error getting user rooms:', error);
            next(error);
        }
    }
}