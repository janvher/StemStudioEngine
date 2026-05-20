import { expect } from "chai";
import { PrivateRoomValidator } from "../src/utils/PrivateRoomValidator.js";
import { Types } from "mongoose";

describe("PrivateRoomValidator", () => {
    beforeEach(() => {
        // Clean up rate limiting data before each test
        PrivateRoomValidator.cleanupRateLimitData();
    });

    describe("validateCreateRequest", () => {
        const validRequest = {
            name: "Test Private Room",
            sceneId: new Types.ObjectId().toString(),
            maxPlayers: 4,
            settings: {
                allowWaitingList: true,
                autoStart: false
            },
            token: "valid_token_string"
        };

        it("should validate a valid create request", () => {
            const result = PrivateRoomValidator.validateCreateRequest(validRequest);
            expect(result.isValid).to.be.true;
            expect(result.errors).to.have.length(0);
        });

        it("should reject invalid sceneId", () => {
            const invalidRequest = { ...validRequest, sceneId: "invalid_id" };
            const result = PrivateRoomValidator.validateCreateRequest(invalidRequest);
            expect(result.isValid).to.be.false;
            expect(result.errors).to.include("Scene ID must be a valid ObjectId");
        });

        it("should reject missing sceneId", () => {
            const invalidRequest = { ...validRequest, sceneId: "" };
            const result = PrivateRoomValidator.validateCreateRequest(invalidRequest);
            expect(result.isValid).to.be.false;
            expect(result.errors).to.include("Scene ID is required and must be a string");
        });

        it("should reject invalid maxPlayers", () => {
            const tooSmall = { ...validRequest, maxPlayers: 1 };
            const result1 = PrivateRoomValidator.validateCreateRequest(tooSmall);
            expect(result1.isValid).to.be.false;
            expect(result1.errors).to.include("Max players must be at least 2");

            const tooLarge = { ...validRequest, maxPlayers: 51 };
            const result2 = PrivateRoomValidator.validateCreateRequest(tooLarge);
            expect(result2.isValid).to.be.false;
            expect(result2.errors).to.include("Max players cannot exceed 50");

            const notNumber = { ...validRequest, maxPlayers: "four" as any };
            const result3 = PrivateRoomValidator.validateCreateRequest(notNumber);
            expect(result3.isValid).to.be.false;
            expect(result3.errors).to.include("Max players must be a number");
        });

        it("should reject missing token", () => {
            const invalidRequest = { ...validRequest, token: "" };
            const result = PrivateRoomValidator.validateCreateRequest(invalidRequest);
            expect(result.isValid).to.be.false;
            expect(result.errors).to.include("Authentication token is required");
        });

        it("should reject invalid settings", () => {
            const invalidRequest = { ...validRequest, settings: null as any };
            const result = PrivateRoomValidator.validateCreateRequest(invalidRequest);
            expect(result.isValid).to.be.false;
            expect(result.errors).to.include("Settings object is required");
        });

        it("should reject invalid settings properties", () => {
            const invalidRequest = {
                ...validRequest,
                settings: {
                    allowWaitingList: "yes" as any,
                    autoStart: "no" as any
                }
            };
            const result = PrivateRoomValidator.validateCreateRequest(invalidRequest);
            expect(result.isValid).to.be.false;
            expect(result.errors).to.include("allowWaitingList must be a boolean");
            expect(result.errors).to.include("autoStart must be a boolean");
        });
    });

    describe("validateJoinRequest", () => {
        const validRequest = {
            inviteCode: "ABC234",
            token: "valid_token",
            user: {
                id: "user123",
                name: "Test User",
                email: "test@example.com",
                username: "testuser",
                avatar: "avatar_url"
            }
        };

        it("should validate a valid join request", () => {
            const result = PrivateRoomValidator.validateJoinRequest(validRequest);
            expect(result.isValid).to.be.true;
            expect(result.errors).to.have.length(0);
        });

        it("should reject invalid invite code", () => {
            const invalidRequest = { ...validRequest, inviteCode: "ABC12O" }; // Contains O
            const result = PrivateRoomValidator.validateJoinRequest(invalidRequest);
            expect(result.isValid).to.be.false;
            expect(result.errors).to.include("Invalid invite code format");
        });

        it("should reject missing invite code", () => {
            const invalidRequest = { ...validRequest, inviteCode: "" };
            const result = PrivateRoomValidator.validateJoinRequest(invalidRequest);
            expect(result.isValid).to.be.false;
            expect(result.errors).to.include("Invite code is required");
        });

        it("should reject missing token", () => {
            const invalidRequest = { ...validRequest, token: "" };
            const result = PrivateRoomValidator.validateJoinRequest(invalidRequest);
            expect(result.isValid).to.be.false;
            expect(result.errors).to.include("Authentication token is required");
        });

        it("should reject invalid user data", () => {
            const invalidRequest = { ...validRequest, user: null as any };
            const result = PrivateRoomValidator.validateJoinRequest(invalidRequest);
            expect(result.isValid).to.be.false;
            expect(result.errors).to.include("User data is required");
        });

        it("should reject missing user fields", () => {
            const invalidRequest = {
                ...validRequest,
                user: {
                    id: "",
                    name: "",
                    email: "invalid_email",
                    username: "testuser",
                    avatar: "avatar_url"
                }
            };
            const result = PrivateRoomValidator.validateJoinRequest(invalidRequest);
            expect(result.isValid).to.be.false;
            expect(result.errors).to.include("User ID is required");
            expect(result.errors).to.include("User name is required");
            expect(result.errors).to.include("Invalid email format");
        });

        it("should reject user name that's too long", () => {
            const longName = "a".repeat(101);
            const invalidRequest = {
                ...validRequest,
                user: { ...validRequest.user, name: longName }
            };
            const result = PrivateRoomValidator.validateJoinRequest(invalidRequest);
            expect(result.isValid).to.be.false;
            expect(result.errors).to.include("User name cannot exceed 100 characters");
        });
    });

    describe("validateUpdateSettingsRequest", () => {
        it("should validate valid update settings request", () => {
            const request = {
                maxPlayers: 6,
                allowWaitingList: false,
                autoStart: true
            };
            const result = PrivateRoomValidator.validateUpdateSettingsRequest(request);
            expect(result.isValid).to.be.true;
            expect(result.errors).to.have.length(0);
        });

        it("should validate partial update request", () => {
            const request = { maxPlayers: 8 };
            const result = PrivateRoomValidator.validateUpdateSettingsRequest(request);
            expect(result.isValid).to.be.true;
            expect(result.errors).to.have.length(0);
        });

        it("should reject invalid maxPlayers", () => {
            const request = { maxPlayers: 1 };
            const result = PrivateRoomValidator.validateUpdateSettingsRequest(request);
            expect(result.isValid).to.be.false;
            expect(result.errors).to.include("Max players must be at least 2");
        });

        it("should reject non-boolean settings", () => {
            const request = {
                allowWaitingList: "yes" as any,
                autoStart: "no" as any
            };
            const result = PrivateRoomValidator.validateUpdateSettingsRequest(request);
            expect(result.isValid).to.be.false;
            expect(result.errors).to.include("allowWaitingList must be a boolean");
            expect(result.errors).to.include("autoStart must be a boolean");
        });
    });

    describe("rate limiting", () => {
        const userId = "test_user_123";

        it("should allow room creation within limits", () => {
            const result = PrivateRoomValidator.checkRoomCreationRateLimit(userId);
            expect(result.allowed).to.be.true;
            expect(result.remainingAttempts).to.equal(5); // MAX_ROOMS_PER_USER_PER_HOUR
        });

        it("should track room creation attempts", () => {
            // First attempt
            PrivateRoomValidator.recordRoomCreation(userId);
            const result1 = PrivateRoomValidator.checkRoomCreationRateLimit(userId);
            expect(result1.remainingAttempts).to.equal(4);

            // Second attempt
            PrivateRoomValidator.recordRoomCreation(userId);
            const result2 = PrivateRoomValidator.checkRoomCreationRateLimit(userId);
            expect(result2.remainingAttempts).to.equal(3);
        });

        it("should block room creation after limit exceeded", () => {
            // Use up all attempts
            for (let i = 0; i < 5; i++) {
                PrivateRoomValidator.recordRoomCreation(userId);
            }

            const result = PrivateRoomValidator.checkRoomCreationRateLimit(userId);
            expect(result.allowed).to.be.false;
            expect(result.remainingAttempts).to.equal(0);
        });

        it("should allow join attempts within limits", () => {
            const result = PrivateRoomValidator.checkJoinAttemptRateLimit(userId);
            expect(result.allowed).to.be.true;
            expect(result.remainingAttempts).to.equal(10); // MAX_JOIN_ATTEMPTS_PER_MINUTE
        });

        it("should track join attempts", () => {
            // First few attempts
            for (let i = 0; i < 3; i++) {
                PrivateRoomValidator.recordJoinAttempt(userId);
            }

            const result = PrivateRoomValidator.checkJoinAttemptRateLimit(userId);
            expect(result.remainingAttempts).to.equal(7);
        });

        it("should block join attempts after limit exceeded", () => {
            // Use up all attempts
            for (let i = 0; i < 10; i++) {
                PrivateRoomValidator.recordJoinAttempt(userId);
            }

            const result = PrivateRoomValidator.checkJoinAttemptRateLimit(userId);
            expect(result.allowed).to.be.false;
            expect(result.remainingAttempts).to.equal(0);
        });
    });

    describe("utility functions", () => {
        it("should validate user ID format", () => {
            expect(PrivateRoomValidator.isValidUserId("valid_user_123")).to.be.true;
            expect(PrivateRoomValidator.isValidUserId("user-with-dashes")).to.be.true;
            expect(PrivateRoomValidator.isValidUserId("user_with_underscores")).to.be.true;

            expect(PrivateRoomValidator.isValidUserId("")).to.be.false;
            expect(PrivateRoomValidator.isValidUserId("user with spaces")).to.be.false;
            expect(PrivateRoomValidator.isValidUserId("user@email.com")).to.be.false;
        });

        it("should sanitize input", () => {
            expect(PrivateRoomValidator.sanitizeInput("  Test Name  ")).to.equal("Test Name");
            expect(PrivateRoomValidator.sanitizeInput("Test<script>")).to.equal("Testscript");
            expect(PrivateRoomValidator.sanitizeInput("Test>alert")).to.equal("Testalert");
            expect(PrivateRoomValidator.sanitizeInput("a".repeat(200))).to.have.length(100);
        });

        it("should validate scene access permissions", () => {
            const sceneOwner = "owner123";
            const collaborators = ["collaborator1@example.com", "collaborator2@example.com"];

            // Owner should have access
            expect(PrivateRoomValidator.validateSceneAccess(
                sceneOwner, collaborators, "owner123", "owner@example.com"
            )).to.be.true;

            // Collaborator should have access
            expect(PrivateRoomValidator.validateSceneAccess(
                sceneOwner, collaborators, "other_user", "collaborator1@example.com"
            )).to.be.true;

            // Non-collaborator should not have access
            expect(PrivateRoomValidator.validateSceneAccess(
                sceneOwner, collaborators, "other_user", "stranger@example.com"
            )).to.be.false;
        });

        it("should return rate limiting constants", () => {
            const limits = PrivateRoomValidator.getRateLimits();
            expect(limits.MAX_ROOMS_PER_USER_PER_HOUR).to.be.a("number");
            expect(limits.MAX_JOIN_ATTEMPTS_PER_MINUTE).to.be.a("number");
            expect(limits.MIN_ROOM_NAME_LENGTH).to.be.a("number");
            expect(limits.MAX_ROOM_NAME_LENGTH).to.be.a("number");
        });
    });

    describe("cleanupRateLimitData", () => {
        it("should clean up old rate limiting data", () => {
            const userId = "cleanup_test_user";

            // Record some attempts
            PrivateRoomValidator.recordRoomCreation(userId);
            PrivateRoomValidator.recordJoinAttempt(userId);

            // Verify data exists
            const beforeCleanup1 = PrivateRoomValidator.checkRoomCreationRateLimit(userId);
            const beforeCleanup2 = PrivateRoomValidator.checkJoinAttemptRateLimit(userId);
            expect(beforeCleanup1.remainingAttempts).to.equal(4);
            expect(beforeCleanup2.remainingAttempts).to.equal(9);

            // Run cleanup
            PrivateRoomValidator.cleanupRateLimitData();

            // Old data should still exist (not old enough)
            const afterCleanup1 = PrivateRoomValidator.checkRoomCreationRateLimit(userId);
            const afterCleanup2 = PrivateRoomValidator.checkJoinAttemptRateLimit(userId);
            expect(afterCleanup1.remainingAttempts).to.equal(4);
            expect(afterCleanup2.remainingAttempts).to.equal(9);
        });
    });
});