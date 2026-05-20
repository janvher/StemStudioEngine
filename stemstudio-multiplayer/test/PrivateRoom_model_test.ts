import { expect } from "chai";
import mongoose, { Types } from "mongoose";
import { PrivateRoom, IPrivateRoom } from "../src/models/PrivateRoom.js";

// Connect to test database
before(async () => {
    if (!mongoose.connection.readyState) {
        await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test-private-rooms');
    }
});

// Clean up after tests
after(async () => {
    await mongoose.connection.close();
});

describe("PrivateRoom Model", () => {
    beforeEach(async () => {
        // Clear the collection before each test
        await PrivateRoom.deleteMany({});
    });

    describe("schema validation", () => {
        const validPrivateRoomData = {
            inviteCode: "ABC123",
            sceneId: new Types.ObjectId(),
            ownerId: "owner_123",
            maxPlayers: 4,
            settings: {
                allowWaitingList: true,
                autoStart: false,
                isPrivate: true
            }
        };

        it("should create a private room with valid data", async () => {
            const privateRoom = new PrivateRoom(validPrivateRoomData);
            const saved = await privateRoom.save();

            expect(saved).to.exist;
            expect(saved.inviteCode).to.equal(validPrivateRoomData.inviteCode);
            expect(saved.maxPlayers).to.equal(validPrivateRoomData.maxPlayers);
            expect(saved.isActive).to.be.true; // default value
            expect(saved.activePlayers).to.have.length(0);
            expect(saved.waitingList).to.have.length(0);
        });

        it("should require inviteCode", async () => {
            const invalidData = { ...validPrivateRoomData };
            delete (invalidData as any).inviteCode;

            const privateRoom = new PrivateRoom(invalidData);

            try {
                await privateRoom.save();
                expect.fail("Should have thrown validation error");
            } catch (error: any) {
                expect(error.errors.roomId).to.exist;
            }
        });

        it("should require unique roomId", async () => {
            const privateRoom1 = new PrivateRoom(validPrivateRoomData);
            await privateRoom1.save();

            const privateRoom2 = new PrivateRoom(validPrivateRoomData);

            try {
                await privateRoom2.save();
                expect.fail("Should have thrown duplicate key error");
            } catch (error: any) {
                expect(error.code).to.equal(11000); // MongoDB duplicate key error
            }
        });

        it("should require unique inviteCode", async () => {
            const privateRoom1 = new PrivateRoom(validPrivateRoomData);
            await privateRoom1.save();

            const privateRoom2 = new PrivateRoom({
                ...validPrivateRoomData,
                roomId: "different_room_id"
            });

            try {
                await privateRoom2.save();
                expect.fail("Should have thrown duplicate key error");
            } catch (error: any) {
                expect(error.code).to.equal(11000); // MongoDB duplicate key error
            }
        });

        it("should enforce inviteCode length constraints", async () => {
            const shortCode = new PrivateRoom({
                ...validPrivateRoomData,
                inviteCode: "ABC12", // Too short
                roomId: "room_1"
            });

            const longCode = new PrivateRoom({
                ...validPrivateRoomData,
                inviteCode: "ABCDEFGHI", // Too long
                roomId: "room_2"
            });

            try {
                await shortCode.save();
                expect.fail("Should have thrown validation error for short code");
            } catch (error: any) {
                expect(error.errors.inviteCode).to.exist;
            }

            try {
                await longCode.save();
                expect.fail("Should have thrown validation error for long code");
            } catch (error: any) {
                expect(error.errors.inviteCode).to.exist;
            }
        });

        it("should enforce maxPlayers constraints", async () => {
            const tooFew = new PrivateRoom({
                ...validPrivateRoomData,
                maxPlayers: 1,
                roomId: "room_1"
            });

            const tooMany = new PrivateRoom({
                ...validPrivateRoomData,
                maxPlayers: 51,
                roomId: "room_2"
            });

            try {
                await tooFew.save();
                expect.fail("Should have thrown validation error for too few players");
            } catch (error: any) {
                expect(error.errors.maxPlayers).to.exist;
            }

            try {
                await tooMany.save();
                expect.fail("Should have thrown validation error for too many players");
            } catch (error: any) {
                expect(error.errors.maxPlayers).to.exist;
            }
        });

        it("should automatically uppercase inviteCode", async () => {
            const privateRoom = new PrivateRoom({
                ...validPrivateRoomData,
                inviteCode: "abc123"
            });

            const saved = await privateRoom.save();
            expect(saved.inviteCode).to.equal("ABC123");
        });

        it("should set default expiresAt to 24 hours from now", async () => {
            const before = new Date();
            const privateRoom = new PrivateRoom(validPrivateRoomData);
            const saved = await privateRoom.save();
            const after = new Date();

            const expectedExpiry = new Date(before.getTime() + 24 * 60 * 60 * 1000);
            const timeDiff = Math.abs(saved.expiresAt.getTime() - expectedExpiry.getTime());

            // Allow for some time difference due to test execution
            expect(timeDiff).to.be.lessThan(1000); // Less than 1 second difference
        });
    });

    describe("virtual properties", () => {
        let privateRoom: IPrivateRoom;

        beforeEach(async () => {
            privateRoom = new PrivateRoom({
                roomId: "test_room_123",
                inviteCode: "ABC123",
                sceneId: new Types.ObjectId(),
                ownerId: "owner_123",
                maxPlayers: 4
            });
            await privateRoom.save();
        });

        it("should calculate currentPlayerCount virtual", () => {
            expect(privateRoom.currentPlayerCount).to.equal(0);

            privateRoom.activePlayers.push({
                userId: "user1",
                sessionId: "session1",
                joinedAt: new Date()
            });

            expect(privateRoom.currentPlayerCount).to.equal(1);
        });

        it("should calculate waitingListCount virtual", () => {
            expect(privateRoom.waitingListCount).to.equal(0);

            privateRoom.waitingList.push({
                userId: "user1",
                displayName: "User 1",
                joinedAt: new Date(),
                status: 'waiting'
            });

            privateRoom.waitingList.push({
                userId: "user2",
                displayName: "User 2",
                joinedAt: new Date(),
                status: 'declined'
            });

            // Only count 'waiting' status
            expect(privateRoom.waitingListCount).to.equal(1);
        });
    });

    describe("instance methods", () => {
        let privateRoom: IPrivateRoom;

        beforeEach(async () => {
            privateRoom = new PrivateRoom({
                roomId: "test_room_123",
                inviteCode: "ABC123",
                sceneId: new Types.ObjectId(),
                ownerId: "owner_123",
                maxPlayers: 3 // Small number for testing
            });
            await privateRoom.save();
        });

        describe("isFull", () => {
            it("should return false when room is not full", () => {
                expect(privateRoom.isFull()).to.be.false;
            });

            it("should return true when room is full", () => {
                // Add players up to max capacity
                for (let i = 0; i < 3; i++) {
                    privateRoom.activePlayers.push({
                        userId: `user${i}`,
                        sessionId: `session${i}`,
                        joinedAt: new Date()
                    });
                }

                expect(privateRoom.isFull()).to.be.true;
            });
        });

        describe("canJoinDirectly", () => {
            it("should return true when room is active and not full", () => {
                expect(privateRoom.canJoinDirectly()).to.be.true;
            });

            it("should return false when room is full", () => {
                // Fill the room
                for (let i = 0; i < 3; i++) {
                    privateRoom.activePlayers.push({
                        userId: `user${i}`,
                        sessionId: `session${i}`,
                        joinedAt: new Date()
                    });
                }

                expect(privateRoom.canJoinDirectly()).to.be.false;
            });

            it("should return false when room is not active", () => {
                privateRoom.isActive = false;
                expect(privateRoom.canJoinDirectly()).to.be.false;
            });
        });

        describe("addToWaitingList", () => {
            it("should add user to waiting list", () => {
                const success = privateRoom.addToWaitingList("user1", "User One");
                expect(success).to.be.true;
                expect(privateRoom.waitingList).to.have.length(1);
                expect(privateRoom.waitingList[0].userId).to.equal("user1");
                expect(privateRoom.waitingList[0].displayName).to.equal("User One");
                expect(privateRoom.waitingList[0].status).to.equal("waiting");
            });

            it("should not add user if already in waiting list", () => {
                privateRoom.addToWaitingList("user1", "User One");
                const success = privateRoom.addToWaitingList("user1", "User One Again");

                expect(success).to.be.false;
                expect(privateRoom.waitingList).to.have.length(1);
            });

            it("should not add user if already an active player", () => {
                privateRoom.activePlayers.push({
                    userId: "user1",
                    sessionId: "session1",
                    joinedAt: new Date()
                });

                const success = privateRoom.addToWaitingList("user1", "User One");
                expect(success).to.be.false;
                expect(privateRoom.waitingList).to.have.length(0);
            });
        });

        describe("removeFromWaitingList", () => {
            beforeEach(() => {
                privateRoom.addToWaitingList("user1", "User One");
                privateRoom.addToWaitingList("user2", "User Two");
            });

            it("should remove user from waiting list", () => {
                const success = privateRoom.removeFromWaitingList("user1");
                expect(success).to.be.true;
                expect(privateRoom.waitingList).to.have.length(1);
                expect(privateRoom.waitingList[0].userId).to.equal("user2");
            });

            it("should return false if user not in waiting list", () => {
                const success = privateRoom.removeFromWaitingList("nonexistent");
                expect(success).to.be.false;
                expect(privateRoom.waitingList).to.have.length(2);
            });
        });

        describe("addActivePlayer", () => {
            it("should add active player", () => {
                const success = privateRoom.addActivePlayer("user1", "session1");
                expect(success).to.be.true;
                expect(privateRoom.activePlayers).to.have.length(1);
                expect(privateRoom.activePlayers[0].userId).to.equal("user1");
                expect(privateRoom.activePlayers[0].sessionId).to.equal("session1");
            });

            it("should not add player if already active", () => {
                privateRoom.addActivePlayer("user1", "session1");
                const success = privateRoom.addActivePlayer("user1", "session2");

                expect(success).to.be.false;
                expect(privateRoom.activePlayers).to.have.length(1);
            });

            it("should not add player if room is full", () => {
                // Fill the room
                for (let i = 0; i < 3; i++) {
                    privateRoom.addActivePlayer(`user${i}`, `session${i}`);
                }

                const success = privateRoom.addActivePlayer("user3", "session3");
                expect(success).to.be.false;
                expect(privateRoom.activePlayers).to.have.length(3);
            });

            it("should remove player from waiting list when added as active", () => {
                privateRoom.addToWaitingList("user1", "User One");
                expect(privateRoom.waitingList).to.have.length(1);

                const success = privateRoom.addActivePlayer("user1", "session1");
                expect(success).to.be.true;
                expect(privateRoom.activePlayers).to.have.length(1);
                expect(privateRoom.waitingList).to.have.length(0);
            });
        });

        describe("removeActivePlayer", () => {
            beforeEach(() => {
                privateRoom.addActivePlayer("user1", "session1");
                privateRoom.addActivePlayer("user2", "session2");
            });

            it("should remove active player", () => {
                const removedPlayer = privateRoom.removeActivePlayer("session1");
                expect(removedPlayer).to.exist;
                expect(removedPlayer!.userId).to.equal("user1");
                expect(privateRoom.activePlayers).to.have.length(1);
                expect(privateRoom.activePlayers[0].userId).to.equal("user2");
            });

            it("should return null if session not found", () => {
                const removedPlayer = privateRoom.removeActivePlayer("nonexistent");
                expect(removedPlayer).to.be.null;
                expect(privateRoom.activePlayers).to.have.length(2);
            });
        });

        describe("getNextWaitingPlayer", () => {
            it("should return first waiting player", () => {
                privateRoom.addToWaitingList("user1", "User One");
                privateRoom.addToWaitingList("user2", "User Two");

                // Set first player to declined
                privateRoom.waitingList[0].status = 'declined';

                const nextPlayer = privateRoom.getNextWaitingPlayer();
                expect(nextPlayer).to.exist;
                expect(nextPlayer!.userId).to.equal("user2");
            });

            it("should return null if no waiting players", () => {
                const nextPlayer = privateRoom.getNextWaitingPlayer();
                expect(nextPlayer).to.be.null;
            });

            it("should return null if all players are declined or invited", () => {
                privateRoom.addToWaitingList("user1", "User One");
                privateRoom.addToWaitingList("user2", "User Two");

                privateRoom.waitingList[0].status = 'declined';
                privateRoom.waitingList[1].status = 'invited';

                const nextPlayer = privateRoom.getNextWaitingPlayer();
                expect(nextPlayer).to.be.null;
            });
        });
    });
});