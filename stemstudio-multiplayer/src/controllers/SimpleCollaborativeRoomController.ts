import type { Client } from "@colyseus/core";
import { EVENTS } from "../physics/common/events.js";
import { Scene } from "../models/Scene.js";
import mongoose, { Types } from "mongoose";
import GameApi from "../api/GameApi.js";
import SimpleRoomController from "./SimpleRoomController.js";
import { Behavior, Script } from "../rooms/schema/GameRoomState.js";
import { firebaseService } from "../firebase/firebase.service.js";

interface SceneChild {
    uuid: string;
    children: SceneChild[];
}

function jsonStringifySafe(value: any): string {
    return JSON.stringify(value, (key, val) => {
        if (typeof val === "bigint") {
            return Number(val);
        }
        return val;
    });
}
export default class SimpleCollaborativeRoomController extends SimpleRoomController {
    private updateInterval?: NodeJS.Timeout;
    private pendingUpdate: boolean = false;
    private isAssetBacked: boolean = false;

    start() {
        console.log("Room controller started");

        this.addObjects()
            .then(() => {
                this.room.state.ready = true;
                // Start periodic scene collection updates every 1 minute
                this.updateInterval = setInterval(() => {
                    this.updateSceneCollection().catch(console.error);
                }, 60000);
            })
            .catch(() => {
                console.error("Add objects to snapshot failed. Room is unusable: " + this.room.roomName);
            });
    }

    dispose() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = undefined;
        }
        console.log("Room controller disposed");
        //dispose here
    }

    addObjects() {
        return new Promise<void>((resolve, reject) => {
            GameApi.loadGame(this.room.roomName)
                .then((result) => {
                    this.isAssetBacked = !!result.metadata?.AssetID;
                    return this.parseGameData(result.data).then(() => {
                        resolve();
                    });
                })
                .catch((e) => {
                    console.error("Failed to load game: " + this.room.roomName, e);
                    reject(e);
                });
        });
    }

    parseGameData(jsons: any[]) {
        for (const n of jsons) {
            if (n.uuid) {
                this.room.state.snapshot.set(n.uuid, jsonStringifySafe(n));
            }
        }

        return Promise.resolve();
    }

    onBaseMessage(client: Client, messageType: string, message: any): void {
        switch (messageType) {
            case EVENTS.SNAPSHOT.ADD.OBJECT: {
                this.addObjectToSnapshot(message.uuid, message.object);
                break;
            }
            case EVENTS.SNAPSHOT.REMOVE.OBJECT: {
                this.removeObjectFromSnapshot(message.uuid);
                break;
            }
            case EVENTS.SNAPSHOT.UPDATE.OBJECT: {
                this.updateObjectInSnapshot(message.uuid, message.object);
                break;
            }
            case EVENTS.SNAPSHOT.UPDATE.OBJECT_USER_DATA: {
                this.updateObjectUserData(message.uuid, message.userData);
                break;
            }
            case EVENTS.SNAPSHOT.REQUEST: {
                this.handleSnapshotRequest(client);
                break;
            }
            case EVENTS.SNAPSHOT.UPDATE.SCENE_CHILDREN: {
                this.updateSceneChildrenInSnapshot(message.uuid, message.children);
                break;
            }
            case EVENTS.ASSETS.ADD: {
                this.addAsset(message);
                break;
            }
            case EVENTS.ASSETS.REMOVE: {
                this.removeAsset(message);
                break;
            }
            case EVENTS.ASSETS.UPDATE: {
                this.updateAsset(message);
                break;
            }
            case EVENTS.BEHAVIORS.REGISTER.BEHAVIOR: {
                this.registerBehavior(message);
                break;
            }
            case EVENTS.BEHAVIORS.UNREGISTER.BEHAVIOR: {
                this.unregisterBehavior(message);
                break;
            }
            case EVENTS.BEHAVIORS.UPDATE.BEHAVIOR: {
                this.updateBehavior(message);
                break;
            }
            case EVENTS.BEHAVIORS.REGISTER.SCRIPT: {
                this.registerScript(message);
                break;
            }
            case EVENTS.BEHAVIORS.UNREGISTER.SCRIPT: {
                this.unregisterScript(message);
                break;
            }
            case EVENTS.BEHAVIORS.UPDATE.SCRIPT: {
                this.updateScript(message);
                break;
            }
            case EVENTS.LAMBDAS.REGISTER: {
                this.registerLambda(message);
                break;
            }
            case EVENTS.LAMBDAS.UNREGISTER: {
                this.unregisterLambda(message);
                break;
            }
            case EVENTS.LAMBDAS.UPDATE: {
                this.updateLambda(message);
                break;
            }

            default:
                this.onMessage(client, messageType, message);
        }
    }

    private handleSnapshotRequest(client: Client): void {
        // Convert current snapshot to array for sending
        const snapshotData: any[] = [];
        for (const [uuid, object] of this.room.state.snapshot.entries()) {
            snapshotData.push({
                uuid: uuid,
                object: object,
            });
        }

        client.send(EVENTS.SNAPSHOT.RESPONSE, snapshotData);
    }

    private addObjectToSnapshot(uuid: string, object: any): void {
        const obj = jsonStringifySafe(object);
        this.room.state.snapshot.set(uuid, obj);
    }

    private updateObjectInSnapshot(uuid: string, object: any): void {
        const obj = jsonStringifySafe(object);
        this.room.state.snapshot.set(uuid, obj);
    }

    private updateObjectUserData(uuid: string, userData: any): void {
        const snapshotObj = this.room.state.snapshot.get(uuid);
        if (!snapshotObj) return;
        const object = JSON.parse(snapshotObj);
        object.userData = { ...object.userData, ...userData };
        this.updateObjectInSnapshot(uuid, object);
    }

    private updateSceneChildrenInSnapshot(uuid: string, children: SceneChild[]): void {
        const snapshotObj = this.room.state.snapshot.get(uuid);
        if (!snapshotObj) return;
        const object = JSON.parse(snapshotObj);
        object.userData.children = children;
        this.updateObjectInSnapshot(uuid, object);
    }

    private removeObjectFromSnapshot(uuid: string): void {
        this.room.state.snapshot.delete(uuid);
    }

    // Asset events
    // Note that we don't store any state about assets in the room because
    // assets are stored in the database. Instead, we just broadcast when assets
    // are added, removed, or updated. Then, the client can fetch the assets
    // from the database.
    private addAsset(message: unknown): void {
        this.room.broadcast(EVENTS.ASSETS.ADD, message);
    }

    private removeAsset(message: unknown): void {
        this.room.broadcast(EVENTS.ASSETS.REMOVE, message);
    }

    private updateAsset(message: unknown): void {
        this.room.broadcast(EVENTS.ASSETS.UPDATE, message);
    }

    private registerLambda(message: unknown): void {
        this.room.broadcast(EVENTS.LAMBDAS.REGISTER, message);
    }

    private unregisterLambda(message: unknown): void {
        this.room.broadcast(EVENTS.LAMBDAS.UNREGISTER, message);
    }

    private updateLambda(message: unknown): void {
        this.room.broadcast(EVENTS.LAMBDAS.UPDATE, message);
    }

    private registerBehavior(message: any): void {
        const behavior = new Behavior(message.id, message.config, message.userId);
        this.room.state.behaviors.set(message.id, behavior);
    }

    private unregisterBehavior(message: any): void {
        this.room.state.behaviors.delete(message.id);
    }

    private updateBehavior(message: any): void {
        const behavior = new Behavior(message.id, message.config, message.userId);
        this.room.state.behaviors.set(behavior.id, behavior);
    }

    private registerScript(message: any): void {
        const script = new Script(message.name, message.script, message.userId);
        this.room.state.scripts.set(script.name, script);
    }

    private unregisterScript(message: any): void {
        this.room.state.scripts.delete(message.name);
    }

    private updateScript(message: any): void {
        const script = new Script(message.name, message.script, message.userId);
        this.room.state.scripts.set(script.name, script);
    }

    clearClientSelection(userId: string): void {
        // Create array of updates to avoid modifying during iteration
        const updates: Array<[string, any]> = [];

        this.room.state.snapshot.forEach((value: string, key: string) => {
            try {
                const object = JSON.parse(value);
                if (object.userData?.selectedBy?.includes(userId)) {
                    delete object.userData.selectedBy;
                    updates.push([key, object]);
                    console.log("clearing selection for object:", key);
                }
            } catch (error) {
                console.error(`Error parsing snapshot object ${key}:`, error);
            }
        });

        // Apply updates after iteration
        updates.forEach(([key, object]) => {
            this.updateObjectInSnapshot(key, object);
        });
    }

    clearAllSelections(): void {
        const updates: Array<[string, any]> = [];

        this.room.state.snapshot.forEach((value: string, key: string) => {
            try {
                const object = JSON.parse(value);
                if (object.userData?.selectedBy) {
                    delete object.userData.selectedBy;
                    updates.push([key, object]);
                }
            } catch (error) {
                console.error(`Error parsing snapshot object ${key}:`, error);
            }
        });

        updates.forEach(([key, object]) => {
            this.updateObjectInSnapshot(key, object);
        });
    }

    mergePhysicsDataToSnapshot(): void {
        this.room.state.snapshot.forEach((value: string, key: string) => {
            const object = JSON.parse(value);
            const gameObject = this.room.state.objects.get(key);
            if (gameObject) {
                object.position = {
                    x: gameObject.position.x,
                    y: gameObject.position.y,
                    z: gameObject.position.z,
                };
                object.quaternion = {
                    x: gameObject.quaternion.x,
                    y: gameObject.quaternion.y,
                    z: gameObject.quaternion.z,
                    w: gameObject.quaternion.w,
                };
                this.updateObjectInSnapshot(key, object);
            }
        });
    }

    async updateSceneCollection(): Promise<void> {
        // Debounce - prevent multiple simultaneous updates
        if (this.pendingUpdate) {
            console.log("Update already pending, skipping...");
            return;
        }

        if (this.preventAutoSave) {
            return;
        }

        this.pendingUpdate = true;

        try {
            if (this.isAssetBacked) {
                await this.saveAssetBackedScene();
            } else {
                await this.saveLegacyScene();
            }
        } catch (error) {
            console.error("Error in updateSceneCollection:", error);
        } finally {
            this.pendingUpdate = false;
        }
    }

    private async saveAssetBackedScene(): Promise<void> {
        const sceneId = this.room.roomName;
        const ownerId = (this.room.metadata as any)?.ownerId;
        if (!ownerId) {
            console.warn("saveAssetBackedScene: no ownerId in room metadata");
            return;
        }

        const customToken = await firebaseService.createCustomToken(ownerId);
        if (!customToken) {
            console.error("saveAssetBackedScene: failed to create auth token");
            return;
        }
        const token = await firebaseService.signInWithCustomToken(customToken);
        if (!token) {
            console.error("saveAssetBackedScene: failed to exchange custom token for ID token");
            return;
        }

        // Fetch fresh non-uuid objects (scene metadata, settings, etc.) so we
        // don't overwrite changes made by a client save while the room was active.
        const freshScene = await GameApi.loadGame(sceneId);
        const freshNonSnapshotObjects = (freshScene.data as any[]).filter((n: any) => !n.uuid);

        const payload: any[] = [...freshNonSnapshotObjects];
        this.room.state.snapshot.forEach((value: string, _uuid: string) => {
            try {
                const obj = typeof value === "string" ? JSON.parse(value) : value;
                if (obj.userData) {
                    delete obj.userData.selectedBy;
                }
                payload.push(obj);
            } catch (error) {
                console.error(`Error parsing snapshot object ${_uuid}:`, error);
            }
        });

        const serializedPayload = JSON.stringify(payload);

        // Upload payload and create revision
        const { uploadId, uploadUrl } = await GameApi.createUpload(token);
        await GameApi.uploadData(uploadUrl, serializedPayload);

        try {
            await GameApi.createRevision(token, sceneId, uploadId);
            console.log(`Saved asset-backed scene revision: ${sceneId} (${payload.length} objects)`);
        } catch (err: any) {
            if (err?.response?.status === 400 && err?.response?.data?.msg === "No changes.") {
                console.log(`No changes detected for scene ${sceneId}, skipping revision.`);
                return;
            }
            throw err;
        }
    }

    private async saveLegacyScene(): Promise<void> {
        const scene = await Scene.findOne({ ID: new Types.ObjectId(this.room.roomName) }).lean();

        if (!scene) {
            console.warn("saveLegacyScene: no scene found for room", this.room.roomId);
            return;
        }

        const collectionName = scene.CollectionName;
        const db = mongoose.connection;
        const collection = db.collection(collectionName);

        const dbDocs = await collection.find({ uuid: { $exists: true } }).toArray();
        const dbUuids = new Set(dbDocs.map((doc) => doc.uuid));

        const snapshot = this.room.state.snapshot;
        const snapshotUuids = new Set<string>();

        snapshot.forEach((_value: string, uuid: string) => {
            snapshotUuids.add(uuid);
        });

        const bulkOps: any[] = [];

        for (const uuid of snapshotUuids) {
            const json = snapshot.get(uuid);
            if (!json) continue;

            try {
                const object = typeof json === "string" ? JSON.parse(json) : json;
                delete object._id;
                if (object.userData) {
                    delete object.userData.selectedBy;
                }
                bulkOps.push({
                    updateOne: {
                        filter: { uuid },
                        update: { $set: object },
                        upsert: true,
                    },
                });
            } catch (error) {
                console.error(`Error processing object ${uuid}:`, error);
            }
        }

        for (const dbUuid of dbUuids) {
            if (!snapshotUuids.has(dbUuid)) {
                bulkOps.push({
                    deleteOne: { filter: { uuid: dbUuid } },
                });
            }
        }

        if (bulkOps.length > 0) {
            await collection.bulkWrite(bulkOps, { ordered: false });
            console.log(`Updated legacy scene collection: ${bulkOps.length} operations`);
        }
    }
}
