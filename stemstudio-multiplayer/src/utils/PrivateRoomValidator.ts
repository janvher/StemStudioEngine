import { Types } from 'mongoose';
import { InviteCodeGenerator } from './InviteCodeGenerator.js';

/**
 * Private Room Validation and Security
 *
 * Provides comprehensive input validation, rate limiting, and security controls
 * for private room operations. Protects against abuse, malformed requests,
 * and unauthorized access attempts.
 *
 * Security Features:
 * - Rate limiting per user (rooms: 5/hour, joins: 10/minute)
 * - Input sanitization and validation
 * - Scene permission verification
 * - Invite code format validation
 * - Automatic cleanup of tracking data
 */

export interface CreatePrivateRoomRequest {
    name: string;
    sceneId: string;
    maxPlayers: number;
    settings: {
        allowWaitingList: boolean;
        autoStart: boolean;
    };
}

export interface JoinRoomRequest {
    inviteCode: string;
    token: string;
    user: {
        id: string;
        name: string;
        email: string;
        username: string;
        avatar: string;
    };
}

export interface UpdateRoomSettingsRequest {
    maxPlayers?: number;
    allowWaitingList?: boolean;
    autoStart?: boolean;
}

/**
 * Main validation class with rate limiting and security controls
 *
 * Implements in-memory rate limiting (should be replaced with Redis in production
 * for distributed systems) and comprehensive request validation.
 */
export class PrivateRoomValidator {
    private static readonly MAX_ROOMS_PER_USER_PER_HOUR = 50;
    private static readonly MAX_JOIN_ATTEMPTS_PER_MINUTE = 10;
    private static readonly MIN_ROOM_NAME_LENGTH = 5;
    private static readonly MAX_ROOM_NAME_LENGTH = 100;

    // In-memory tracking (use Redis for production distributed systems)
    private static userRoomCreationTracker = new Map<string, number[]>();
    private static userJoinAttemptTracker = new Map<string, number[]>();

    /**
     * Validate create private room request
     */
    static validateCreateRequest(req: CreatePrivateRoomRequest): {
        isValid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        // Validate sceneId
        if (!req.sceneId || typeof req.sceneId !== 'string') {
            errors.push('Scene ID is required and must be a string');
        } else if (!Types.ObjectId.isValid(req.sceneId)) {
            errors.push('Scene ID must be a valid ObjectId');
        }

        // Validate maxPlayers
        if (typeof req.maxPlayers !== 'number') {
            errors.push('Max players must be a number');
        } else if (req.maxPlayers < 2) {
            errors.push('Max players must be at least 2');
        } else if (req.maxPlayers > 50) {
            errors.push('Max players cannot exceed 50');
        }

        //Validate name
        if (typeof req.name !== 'string') {
            errors.push("Name must be a string");
        } else if (req.name.length < PrivateRoomValidator.MIN_ROOM_NAME_LENGTH) {
            errors.push(`Name must be at least ${PrivateRoomValidator.MIN_ROOM_NAME_LENGTH} characters`);
        }

        // Validate settings
        if (!req.settings || typeof req.settings !== 'object') {
            errors.push('Settings object is required');
        } else {
            if (typeof req.settings.allowWaitingList !== 'boolean') {
                errors.push('allowWaitingList must be a boolean');
            }
            if (typeof req.settings.autoStart !== 'boolean') {
                errors.push('autoStart must be a boolean');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate join room request
     */
    static validateJoinRequest(req: JoinRoomRequest): {
        isValid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        // Validate invite code
        if (!req.inviteCode || typeof req.inviteCode !== 'string') {
            errors.push('Invite code is required');
        } else {
            const normalizedCode = InviteCodeGenerator.normalize(req.inviteCode);
            if (!normalizedCode) {
                errors.push('Invalid invite code format');
            }
        }

        // Validate token
        if (!req.token || typeof req.token !== 'string') {
            errors.push('Authentication token is required');
        }

        // Validate user data
        if (!req.user || typeof req.user !== 'object') {
            errors.push('User data is required');
        } else {
            if (!req.user.id || typeof req.user.id !== 'string') {
                errors.push('User ID is required');
            }
            if (!req.user.name || typeof req.user.name !== 'string') {
                errors.push('User name is required');
            } else if (req.user.name.length > PrivateRoomValidator.MAX_ROOM_NAME_LENGTH) {
                errors.push(`User name cannot exceed ${PrivateRoomValidator.MAX_ROOM_NAME_LENGTH} characters`);
            }
            if (!req.user.email || typeof req.user.email !== 'string') {
                errors.push('User email is required');
            } else if (!PrivateRoomValidator.isValidEmail(req.user.email)) {
                errors.push('Invalid email format');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate update room settings request
     */
    static validateUpdateSettingsRequest(req: UpdateRoomSettingsRequest): {
        isValid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        // Validate maxPlayers if provided
        if (req.maxPlayers !== undefined) {
            if (typeof req.maxPlayers !== 'number') {
                errors.push('Max players must be a number');
            } else if (req.maxPlayers < 2) {
                errors.push('Max players must be at least 2');
            } else if (req.maxPlayers > 50) {
                errors.push('Max players cannot exceed 50');
            }
        }

        // Validate boolean settings
        if (req.allowWaitingList !== undefined && typeof req.allowWaitingList !== 'boolean') {
            errors.push('allowWaitingList must be a boolean');
        }
        if (req.autoStart !== undefined && typeof req.autoStart !== 'boolean') {
            errors.push('autoStart must be a boolean');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Check if user has exceeded room creation rate limit
     */
    static checkRoomCreationRateLimit(userId: string): {
        allowed: boolean;
        remainingAttempts: number;
        resetTime: Date;
    } {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);

        // Get user's creation history
        let userHistory = PrivateRoomValidator.userRoomCreationTracker.get(userId) || [];

        // Remove old entries (older than 1 hour)
        userHistory = userHistory.filter(timestamp => timestamp > oneHourAgo);

        // Update the tracker
        PrivateRoomValidator.userRoomCreationTracker.set(userId, userHistory);

        const recentCreations = userHistory.length;
        const allowed = recentCreations < PrivateRoomValidator.MAX_ROOMS_PER_USER_PER_HOUR;

        // Calculate reset time (1 hour from oldest entry)
        const oldestEntry = userHistory.length > 0 ? Math.min(...userHistory) : now;
        const resetTime = new Date(oldestEntry + (60 * 60 * 1000));

        return {
            allowed,
            remainingAttempts: Math.max(0, PrivateRoomValidator.MAX_ROOMS_PER_USER_PER_HOUR - recentCreations),
            resetTime
        };
    }

    /**
     * Check if user has exceeded join attempt rate limit
     */
    static checkJoinAttemptRateLimit(userId: string): {
        allowed: boolean;
        remainingAttempts: number;
        resetTime: Date;
    } {
        const now = Date.now();
        const oneMinuteAgo = now - (60 * 1000);

        // Get user's join attempt history
        let userHistory = PrivateRoomValidator.userJoinAttemptTracker.get(userId) || [];

        // Remove old entries (older than 1 minute)
        userHistory = userHistory.filter(timestamp => timestamp > oneMinuteAgo);

        // Update the tracker
        PrivateRoomValidator.userJoinAttemptTracker.set(userId, userHistory);

        const recentAttempts = userHistory.length;
        const allowed = recentAttempts < PrivateRoomValidator.MAX_JOIN_ATTEMPTS_PER_MINUTE;

        // Calculate reset time (1 minute from oldest entry)
        const oldestEntry = userHistory.length > 0 ? Math.min(...userHistory) : now;
        const resetTime = new Date(oldestEntry + (60 * 1000));

        return {
            allowed,
            remainingAttempts: Math.max(0, PrivateRoomValidator.MAX_JOIN_ATTEMPTS_PER_MINUTE - recentAttempts),
            resetTime
        };
    }

    /**
     * Record a room creation attempt
     */
    static recordRoomCreation(userId: string): void {
        const now = Date.now();
        const userHistory = PrivateRoomValidator.userRoomCreationTracker.get(userId) || [];
        userHistory.push(now);
        PrivateRoomValidator.userRoomCreationTracker.set(userId, userHistory);
    }

    /**
     * Record a join attempt
     */
    static recordJoinAttempt(userId: string): void {
        const now = Date.now();
        const userHistory = PrivateRoomValidator.userJoinAttemptTracker.get(userId) || [];
        userHistory.push(now);
        PrivateRoomValidator.userJoinAttemptTracker.set(userId, userHistory);
    }

    /**
     * Validate email format
     */
    private static isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Sanitize room name or user input
     */
    static sanitizeInput(input: string): string {
        return input
            .trim()
            .replace(/[<>]/g, '') // Remove potential XSS characters
            .substring(0, PrivateRoomValidator.MAX_ROOM_NAME_LENGTH);
    }

    /**
     * Check if a user ID is valid (Firebase UID format)
     */
    static isValidUserId(userId: string): boolean {
        // Firebase UIDs are typically 28 characters long, alphanumeric + some special chars
        return typeof userId === 'string' &&
               userId.length > 0 &&
               userId.length <= 128 &&
               /^[a-zA-Z0-9_-]+$/.test(userId);
    }

    /**
     * Validate scene access permissions
     */
    static validateSceneAccess(sceneOwner: string, collaborators: string[], userId: string, userEmail: string): boolean {
        // User is the owner
        if (sceneOwner === userId) {
            return true;
        }

        // User is a collaborator
        return collaborators && collaborators.includes(userEmail);
    }

    /**
     * Clean up old rate limiting data
     */
    static cleanupRateLimitData(): void {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        const oneMinuteAgo = now - (60 * 1000);

        // Clean room creation tracker
        for (const [userId, timestamps] of PrivateRoomValidator.userRoomCreationTracker.entries()) {
            const filteredTimestamps = timestamps.filter(t => t > oneHourAgo);
            if (filteredTimestamps.length === 0) {
                PrivateRoomValidator.userRoomCreationTracker.delete(userId);
            } else {
                PrivateRoomValidator.userRoomCreationTracker.set(userId, filteredTimestamps);
            }
        }

        // Clean join attempt tracker
        for (const [userId, timestamps] of PrivateRoomValidator.userJoinAttemptTracker.entries()) {
            const filteredTimestamps = timestamps.filter(t => t > oneMinuteAgo);
            if (filteredTimestamps.length === 0) {
                PrivateRoomValidator.userJoinAttemptTracker.delete(userId);
            } else {
                PrivateRoomValidator.userJoinAttemptTracker.set(userId, filteredTimestamps);
            }
        }
    }

    /**
     * Get rate limiting constants for external use
     */
    static getRateLimits() {
        return {
            MAX_ROOMS_PER_USER_PER_HOUR: PrivateRoomValidator.MAX_ROOMS_PER_USER_PER_HOUR,
            MAX_JOIN_ATTEMPTS_PER_MINUTE: PrivateRoomValidator.MAX_JOIN_ATTEMPTS_PER_MINUTE,
            MIN_ROOM_NAME_LENGTH: PrivateRoomValidator.MIN_ROOM_NAME_LENGTH,
            MAX_ROOM_NAME_LENGTH: PrivateRoomValidator.MAX_ROOM_NAME_LENGTH
        };
    }
}

// Clean up rate limiting data every 15 minutes
setInterval(() => {
    PrivateRoomValidator.cleanupRateLimitData();
}, 15 * 60 * 1000);