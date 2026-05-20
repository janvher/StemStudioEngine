import type { Document, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

/**
 * Private Room Database Model
 *
 * This module implements a MongoDB-based private room system for multiplayer games.
 * Private rooms allow users to create invite-only sessions with configurable settings,
 * waiting lists, and automatic player management.
 *
 * Key Features:
 * - Unique 6-character invite codes for easy sharing
 * - Configurable player limits with overflow handling via waiting lists
 * - Automatic room expiration and cleanup
 * - Real-time player state management
 */

export interface IWaitingPlayer {
    userId: string;
    displayName: string;
    joinedAt: Date;
    status: 'waiting' | 'invited' | 'declined';
}

export interface IActivePlayer {
    userId: string;
    sessionId: string;
    joinedAt: Date;
}

export interface IPrivateRoomSettings {
    allowWaitingList: boolean;
    autoStart: boolean;
    isPrivate: boolean;
}

export interface IPrivateRoom extends Document {
    name: string;
    inviteCode: string;
    sceneId: Types.ObjectId;
    ownerId: string;
    maxPlayers: number;
    isActive: boolean;
    settings: IPrivateRoomSettings;
    waitingList: IWaitingPlayer[];
    activePlayers: IActivePlayer[];
    createdAt: Date;
    expiresAt: Date;

    // Virtual properties
    currentPlayerCount: number;
    waitingListCount: number;

    // Methods
    isFull(): boolean;
    canJoinDirectly(): boolean;
    addToWaitingList(userId: string, displayName: string): boolean;
    removeFromWaitingList(userId: string): boolean;
    addActivePlayer(userId: string, sessionId: string): boolean;
    removeActivePlayer(sessionId: string): IActivePlayer | null;
    getNextWaitingPlayer(): IWaitingPlayer | null;
}

const WaitingPlayerSchema = new Schema<IWaitingPlayer>({
    userId: { type: String, required: true },
    displayName: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['waiting', 'invited', 'declined'],
        default: 'waiting'
    }
});

const ActivePlayerSchema = new Schema<IActivePlayer>({
    userId: { type: String, required: true },
    sessionId: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now }
});

const PrivateRoomSettingsSchema = new Schema<IPrivateRoomSettings>({
    allowWaitingList: { type: Boolean, default: true },
    autoStart: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: true }
});

const PrivateRoomSchema: Schema = new Schema<IPrivateRoom>({
    name: {
        type: String,
        required: false,
        minlength: 1,
        maxlength: 50
    },
    inviteCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        minlength: 6,
        maxlength: 8
    },
    sceneId: { type: Schema.Types.ObjectId, required: true, ref: 'Scene' },
    ownerId: { type: String, required: true },
    maxPlayers: {
        type: Number,
        required: true,
        min: 2,
        max: 50
    },
    isActive: { type: Boolean, default: true },
    settings: {
        type: PrivateRoomSettingsSchema,
        default: () => ({})
    },
    waitingList: [WaitingPlayerSchema],
    activePlayers: [ActivePlayerSchema],
    createdAt: { type: Date, default: Date.now },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    }
});

// Index for efficient lookups (inviteCode already has unique index from schema)
PrivateRoomSchema.index({ ownerId: 1 });
PrivateRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for current player count
PrivateRoomSchema.virtual('currentPlayerCount').get(function(this: IPrivateRoom) {
    return this.activePlayers ? this.activePlayers.length : 0;
});

// Virtual for waiting list count
PrivateRoomSchema.virtual('waitingListCount').get(function(this: IPrivateRoom) {
    return this.waitingList ? this.waitingList.filter((p: IWaitingPlayer) => p.status === 'waiting').length : 0;
});

/**
 * Room capacity and access control methods
 *
 * These methods manage player access to private rooms, enforcing capacity limits
 * and handling overflow scenarios through waiting lists.
 */
PrivateRoomSchema.methods.isFull = function(): boolean {
    return this.activePlayers.length >= this.maxPlayers;
};

PrivateRoomSchema.methods.canJoinDirectly = function(): boolean {
    return this.isActive && !this.isFull();
};

/**
 * Waiting list management
 *
 * Handles adding players to the waiting list when rooms are at capacity.
 * Prevents duplicate entries and validates user eligibility.
 */
PrivateRoomSchema.methods.addToWaitingList = function(userId: string, displayName: string): boolean {
    const isInWaitingList = this.waitingList.some((p: IWaitingPlayer) => p.userId === userId);
    const isActivePlayer = this.activePlayers.some((p: IActivePlayer) => p.userId === userId);

    if (isInWaitingList || isActivePlayer) {
        return false;
    }

    this.waitingList.push({
        userId,
        displayName,
        joinedAt: new Date(),
        status: 'waiting'
    });

    return true;
};

// Method to remove player from waiting list
PrivateRoomSchema.methods.removeFromWaitingList = function(userId: string): boolean {
    const initialLength = this.waitingList.length;
    this.waitingList = this.waitingList.filter((p: IWaitingPlayer) => p.userId !== userId);
    return this.waitingList.length < initialLength;
};

// Method to add active player
PrivateRoomSchema.methods.addActivePlayer = function(userId: string, sessionId: string): boolean {
    // Check if already active
    const isActivePlayer = this.activePlayers.some((p: IActivePlayer) => p.userId === userId);
    if (isActivePlayer || this.isFull()) {
        return false;
    }

    this.activePlayers.push({
        userId,
        sessionId,
        joinedAt: new Date()
    });

    // Remove from waiting list if present
    this.removeFromWaitingList(userId);

    return true;
};

// Method to remove active player
PrivateRoomSchema.methods.removeActivePlayer = function(sessionId: string): IActivePlayer | null {
    const playerIndex = this.activePlayers.findIndex((p: IActivePlayer) => p.sessionId === sessionId);
    if (playerIndex === -1) {
        return null;
    }

    const removedPlayer = this.activePlayers[playerIndex];
    this.activePlayers.splice(playerIndex, 1);
    return removedPlayer;
};

// Method to get next waiting player
PrivateRoomSchema.methods.getNextWaitingPlayer = function(): IWaitingPlayer | null {
    const waitingPlayer = this.waitingList.find((p: IWaitingPlayer) => p.status === 'waiting');
    return waitingPlayer || null;
};

export const PrivateRoom = mongoose.model<IPrivateRoom>("PrivateRoom", PrivateRoomSchema);