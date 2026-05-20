import type Redis from "ioredis";
import type { Cluster } from "ioredis";
import express from "express";
import console from "node:console";
import type { RoomListingData } from "@colyseus/core/build/matchmaker/driver/index.js";
import type { RoomCreateOptions } from "./GameRoom.js";
import { matchMaker } from "@colyseus/core";
import PrivateMatchMaker from "./PrivateMatchMaker.js";

type RoomInfo = {
    roomId: string;
    sceneId: string;
    inviteCode: string;
    isPrivate: boolean;
    isRunning: boolean;
    clientCount: number;
    name?: string;
    ownerId?: string;
}

export default class MatchMaker {

    public static init(redisClient: Redis | Cluster | null) {
        MatchMaker.instance = new MatchMaker(redisClient);
    }

    public static getRouter(): express.Router {
        const router = express.Router();

        router.get("/:sceneId/:inviteCode", async (req: express.Request, res: express.Response) => {
            const sceneId = req.params.sceneId;
            const inviteCode = req.params.inviteCode;
            let roomInfo: RoomInfo | null = null;

            const runningRoom = await MatchMaker.instance.getRoomByInviteCode(sceneId, inviteCode);
            if (runningRoom) {
                roomInfo = {
                    roomId: runningRoom.roomId,
                    sceneId: sceneId,
                    inviteCode: inviteCode,
                    isPrivate: runningRoom.metadata ? runningRoom.metadata.isPrivate : false,
                    isRunning: true,
                    clientCount: runningRoom.clients,
                    name: runningRoom.metadata ? runningRoom.metadata.name : undefined,
                    ownerId: runningRoom.metadata ? runningRoom.metadata.ownerId : undefined
                } as RoomInfo;
            }

            if (!runningRoom) {
                //find a private room with this inviteCode
                const privateRoom = await PrivateMatchMaker.getInstance().getRoomInfo(inviteCode);
                if (privateRoom) {
                    roomInfo = {
                        roomId: privateRoom.roomId,
                        sceneId: sceneId,
                        inviteCode: inviteCode,
                        isPrivate: true,
                        isRunning: false,
                        clientCount: 0,
                        name: privateRoom.name,
                        ownerId: privateRoom.ownerId
                    } as RoomInfo;
                }
            }

            if (!roomInfo) {
                res.status(400).send({ message: "Room not found" });
                return;
            }

            res.status(200).json(roomInfo);
        });


        router.post('/:sceneId', async (req, res, next) => {
            console.log(`POST /match/scenes/:sceneId`, req.params, req.headers, req.body);
            try {
                if (!MatchMaker.instance) {
                    throw new Error("MatchMaker is not initialized");
                }
                const sceneId = req.params.sceneId;
                const inviteCode = req.body.code;
                const roomCreateOptions =  req.body.options as RoomCreateOptions;
                //join by invite code
                if (inviteCode) {
                    const room = await MatchMaker.instance.getRoomByInviteCode(sceneId, inviteCode);
                    let roomId = room ? room.roomId : null;
                    if (!roomId) {
                        //find a private room with this inviteCode
                        const roomInfo = await PrivateMatchMaker.getInstance().getRoomInfo(inviteCode);
                        if (roomInfo && roomInfo.sceneId === sceneId) {
                            //TODO: lock inviteCode
                            //create room instance
                            roomCreateOptions.isPrivate = true;
                            roomCreateOptions.name = roomInfo.name;
                            roomCreateOptions.ownerId = roomInfo.ownerId;
                            roomCreateOptions.inviteCode = inviteCode;
                            const reservation = await matchMaker.create(sceneId, roomCreateOptions);
                            roomId = reservation.room.roomId;
                            //TODO: unlock inviteCode
                        }
                    }
                    if (roomId) {
                        res.status(200).json({
                            roomId: roomId
                        });
                    } else {
                        res.status(400).json({
                            message: "Room not found",
                            error: "Failed to find room by the inviteCode: "+inviteCode
                        });
                    }
                } else {
                    //default option - find or create room to join
                    MatchMaker.instance.createRoomIfNeeded(sceneId, roomCreateOptions).then(roomId => {
                        res.status(200).json({
                            roomId: roomId,
                            message: inviteCode ? "Room with invite code not found or is full" : ""
                        });
                    }).catch(err => {
                        res.status(500).json({
                            message: "Failed to pick or create the room",
                            error: JSON.stringify(err)
                        });
                    });
                }
            } catch (err) {
                next(err);
            }
        });

        return router;
    }

    //////////// private stuff /////////

    private static instance: MatchMaker | null = null;

    private constructor(
        private redisInstance: Cluster | Redis
    ) {}

    /**
     * Find room by invite code across all registered room types
     */
    private async getRoomByInviteCode(sceneId: string, inviteCode: string): Promise<RoomListingData | null> {
        try {
            console.log(`Searching for room with invite code: ${inviteCode}`);

            const rooms = await matchMaker.query({
                name: sceneId
            });

            console.log("getRoomByInviteCode: matchMaker.query for "+sceneId, rooms);

            for (const room of rooms) {
                if (room.metadata && room.metadata.inviteCode === inviteCode && room.clients < room.maxClients) {
                    console.log(`Found room ${room.roomId} with invite code ${inviteCode}`);
                    return room;
                }
            }

            console.log(`No room found with invite code: ${inviteCode}`);
            return null;
        } catch (error) {
            console.error(`Error finding room by invite code ${inviteCode}:`, error);
            return null;
        }
    }

    private lockKeyForRoom(roomId: string) {
        const lockKey = `lock:${roomId}`;
        return lockKey;
    }

    private async lockRedis(roomId: string): Promise<void> {
        const lockKey = this.lockKeyForRoom(roomId);
        const lockTimeout = 5000; // milliseconds
        // Attempt to acquire a lock using Redis' SET with NX flag.
        const lockAcquired = await this.redisInstance?.set(lockKey, 'locked', 'PX', lockTimeout, 'NX');
        if (!lockAcquired) {
            // If we didn’t get the lock, wait a bit and retry.
            await new Promise((resolve) => setTimeout(resolve, 100));
            return this.lockRedis(roomId);
        }
    }

    private async unlockRedis(roomId: string): Promise<void> {
        const lockKey = this.lockKeyForRoom(roomId);
        // Release the lock.
        await this.redisInstance?.del(lockKey);
    }

    private static pickBestRoom(roomsWithSpace: RoomListingData[]): RoomListingData | undefined {
        // we peek room with 50% of the max clients first

        //sorted desc
        const halfEmpty = roomsWithSpace.filter(room => room.clients <= Math.ceil(room.maxClients / 2)).sort((a, b) => b.clients - a.clients);
        //sorted asc
        const halfFull = roomsWithSpace.filter(room => room.clients > Math.ceil(room.maxClients / 2)).sort((a, b) => a.clients - b.clients);

        if (halfEmpty.length > 0) {
            return halfEmpty[0];
        } else if (halfFull.length > 0) {
            return halfFull[0];
        } else {
            //impossible
            console.error("MP: impossible error in getBestRoomToJoin");
            return undefined;
        }
    }

    private async createRoomIfNeeded(sceneId: string, roomCreateOptions: RoomCreateOptions): Promise<string> {
        try {
            if (this.redisInstance) {
                await this.lockRedis(sceneId);
            }
            // Look for an existing room with a matching customId.
            const rooms = await matchMaker.query({
                name: sceneId
            });
            console.log(`Found rooms as a result of query : ${sceneId} -> ${JSON.stringify(rooms)}`);
            
            // For collaborative mode, only one room should exist
            if (roomCreateOptions.isCollaborative) {
                const existingCollaborativeRoom = rooms.find(room => !room.metadata.isPrivate);
                if (existingCollaborativeRoom) {
                    console.log(`Collaborative room already exists for ${sceneId}: ${existingCollaborativeRoom.roomId}`);
                    return existingCollaborativeRoom.roomId;
                }
                // No collaborative room exists, create one
                console.log(`Creating new collaborative room for ${sceneId}`);
                const reservation = await matchMaker.create(sceneId, roomCreateOptions);
                return reservation.room.roomId;
            }
            
            // Non-collaborative mode: use existing logic
            const availableRooms = rooms.filter(room => !room.metadata.isPrivate && room.clients < room.maxClients);
            //if not rooms are available, create the new one
            if (availableRooms.length <= 0) {
                console.log(`No room found for ${sceneId}. Creating new room.`);
                const reservation =  await matchMaker.create(sceneId, roomCreateOptions);
                return reservation.room.roomId;
            }
            return MatchMaker.pickBestRoom(availableRooms)?.roomId;
        } catch (err) {
            console.error(`Failed to create room: ${JSON.stringify(err)}`);
            throw err;
        } finally {
            if (this.redisInstance) {
                await this.unlockRedis(sceneId);
            }
        }
    }
}


