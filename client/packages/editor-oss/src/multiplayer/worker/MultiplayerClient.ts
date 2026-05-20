import * as Colyseus from "colyseus.js";
import {Room} from "colyseus.js";
import {QuaternionLike, Vector3Like} from "three";

// colyseus.js bundles @colyseus/schema v2 internally; the top-level @colyseus/schema is v4
// which removed onAdd/onRemove/listen from MapSchema/Schema. These interfaces type the v2
// callbacks that are present at runtime via the colyseus.js decoder.
interface ColyseusMapV2<V> {
    onAdd(callback: (item: V, key: string) => void, triggerAll?: boolean): () => boolean;
    onRemove(callback: (item: V, key: string) => void): () => boolean;
    onChange(callback: (item: V, key: string) => void): () => boolean;
    forEach(callbackfn: (value: V, key: string) => void): void;
    get(key: string): V | undefined;
    size: number;
}
interface ColyseusSchemaV2 {
    listen<K extends string>(
        prop: K,
        callback: (value: never, previousValue: never) => void,
        immediate?: boolean,
    ): () => boolean;
}
interface ColyseusSchemaOnChange {
    onChange(callback: () => void): () => boolean;
}

import {ObjectData} from "../BehaviorDataStorage";
import {CollaborationWorker} from "./CollaborationWorker";
import {MULTIPLAYER_EVENTS} from "./MultiplayerEvents";
import {ObjectState} from "./SimpleMultiplayerClient";
import {ASSET_EVENTS, BEHAVIOR_EVENTS, LAMBDA_EVENTS, SIMPLE_EVENTS, SNAPSHOT_EVENTS} from "@stem/editor-oss/physics/common/events";
import {IUser} from "../../userManagement/types";
import Ajax from "@stem/editor-oss/utils/Ajax";
import {
    Behavior,
    GameObject,
    GameRoomState,
    getObjectState,
    getPlayerState,
    Material,
    Player,
    Script,
} from "../GameRoomState";

type RoomCreateOptions = {
    name: string;
    simple: boolean;
    maxClients: number;
    user: IUser;
    token: string;
    isCollaborative: boolean;
    isAuthRequired: boolean;
    isPrivate: boolean;
    ownerId?: string;
};

class MultiplayerClient {
    client?: Colyseus.Client;
    private sceneId: string = "";
    private maxClientsPerRoom: number = 4;
    private user?: IUser;
    private userId: string = "impl-me";
    private isAuthRequired: boolean = false;
    private authToken: string = "";
    private isCollaborative: boolean = false;
    private collaborationWorker?: CollaborationWorker;
    private ownerId?: string;

    room?: Colyseus.Room<GameRoomState>;

    private isReady: boolean = false;
    private connectionError: Error | null = null;

    public static mpApiServer = process.env.REACT_APP_MULTIPLAYER_API_SERVER;

    async start(
        webSocketUrl: string,
        maxClients: number,
        sceneId: string,
        user: IUser,
        userId: string,
        isAuthRequired: boolean,
        authToken: string,
        isCollaborative: boolean,
        inviteCode?: string,
        apiUrl?: string,
        ownerId?: string,
    ): Promise<Player> {
        console.log("MP: Colyseus server: " + webSocketUrl);
        this.client = new Colyseus.Client(webSocketUrl, { urlBuilder: (url: URL): string => {
                //replace public host in case of Discord
                const baseUrl = URL.parse(webSocketUrl);
                const resUrl = `${url.protocol}//${baseUrl?.host}${baseUrl?.pathname}${url.pathname}${url.search}`;
                console.log(`MP: Colyseus urlBuilder: ${url.toString()} + ${apiUrl} => ${resUrl} `);
                return resUrl;
            },
        });
        this.maxClientsPerRoom = maxClients;
        this.sceneId = sceneId;
        this.user = user;
        this.userId = userId;
        this.isAuthRequired = isAuthRequired;
        this.authToken = authToken;
        this.isCollaborative = isCollaborative;
        this.ownerId = ownerId;
        this.room = await this.joinOrCreateRoom(apiUrl, inviteCode);
        //wait for the player
        return new Promise<Player>((resolve, reject) => {
            //wait for the player to be added into the state
            const deadline = Date.now() + 60000;
            const timerId = setInterval(() => {
               const player = this.getPlayer();
               if (player) {
                   resolve(player);
                   clearInterval(timerId);
               } else if (Date.now() > deadline) {
                   reject(new Error(`Unable to get player`));
                   clearInterval(timerId);
               }
            }, 500);
        });
    }

    stop() {
        this.room?.leave().then(num => {
            console.log("MP: client left the room: " + num);
        });
        this.room = undefined;
    }

    heartbeat() {
        //detect paused hosts and disconnected clients
        this.room?.send(SIMPLE_EVENTS.HEARTBEAT);
    }

    private getPlayer() {
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        return this.room?.state.players.get(this.room?.sessionId)!;
    }

    getHostSessionId(): string | undefined {
        return this.room?.state.hostSessionId;
    }

    public setCurrentAnimation(objectUuid: string, animation: string): void {
        const object = this.room?.state.objects.get(objectUuid);

        if (!object) return;

        this.room?.send(SIMPLE_EVENTS.UPDATE.OBJECT, {
            uuid: objectUuid,
            data: {
                position: {
                    x: object.position.x,
                    y: object.position.y,
                    z: object.position.z,
                },
                quaternion: {
                    x: object.quaternion.x,
                    y: object.quaternion.y,
                    z: object.quaternion.z,
                    w: object.quaternion.w,
                },
                scale: {
                    x: object.scale.x,
                    y: object.scale.y,
                    z: object.scale.z,
                },
                animation,
            },
        });
    }

    public updateObject(uuid: string, objectState: ObjectState): void {
        this.room?.send(SIMPLE_EVENTS.UPDATE.OBJECT, {...objectState});
    }

    public addObject(uuid: string, objectState: ObjectState): void {
        this.room?.send(SIMPLE_EVENTS.ADD.OBJECT, {...objectState});
    }

    public removeObject(uuid: string): void {
        this.room?.send(SIMPLE_EVENTS.REMOVE.OBJECT, {uuid});
    }

    public setPlayerObject(uuid: string) {
        const player = this.room?.state.players.get(this.room?.sessionId);
        if (player) {
            this.room?.send(SIMPLE_EVENTS.SET.PLAYER.OBJECT, {uuid});
        } else {
            console.error("MP: setPlayerObject: player not found: " + uuid);
        }
    }

    public setPlayerData(key: string, value: string): void {
        this.room?.send(SIMPLE_EVENTS.SET.PLAYER.DATA, {key, value});
    }

    public setBehaviorData(uuid: string, behaviorId: string, key: string, value: string): void {
        this.room?.send(
            value !== undefined && value !== null
                ? SIMPLE_EVENTS.SET.BEHAVIOR_DATA
                : SIMPLE_EVENTS.REMOVE.BEHAVIOR_DATA,
            {
                uuid: uuid,
                data: {
                    behaviorId,
                    key,
                    value,
                },
            },
        );
    }

    public setCollisionBehavior(uuid: string, behavior: string) {
        this.room?.send(SIMPLE_EVENTS.SET.COLLISION_BEHAVIOR, {uuid, behavior});
    }

    public addChild(uuid: string, child: ObjectState) {
        this.room?.send(SIMPLE_EVENTS.ADD.CHILD, {uuid, child});
    }

    public removeChild(uuid: string, child: string) {
        this.room?.send(SIMPLE_EVENTS.REMOVE.CHILD, {uuid, child});
    }

    public sendChatMessage(message: string): void {
        this.room?.send(SIMPLE_EVENTS.CHAT.MESSAGE, {message});
    }

    public disconnectClients(): void {
        this.room?.send(SIMPLE_EVENTS.DISCONNECT_CLIENTS);
    }

    //////// private stuff /////////
    public addSnapshotObject(object: any): void {
        this.room?.send(SNAPSHOT_EVENTS.ADD.OBJECT, {
            uuid: object.uuid,
            object,
        });
    }

    public removeSnapshotObject(uuid: string): void {
        this.room?.send(SNAPSHOT_EVENTS.REMOVE.OBJECT, {
            uuid,
        });
    }

    public updateSnapshotObject(object: any): void {
        this.room?.send(SNAPSHOT_EVENTS.UPDATE.OBJECT, {
            uuid: object.uuid,
            object,
        });
    }

    public updateSnapshotObjectUserData(uuid: string, userData: any): void {
        this.room?.send(SNAPSHOT_EVENTS.UPDATE.OBJECT_USER_DATA, {uuid, userData});
    }

    public updateSnapshotSceneChildren(uuid: string, children: any[]): void {
        this.room?.send(SNAPSHOT_EVENTS.UPDATE.SCENE_CHILDREN, {uuid, children});
    }

    // --- Asset Events ---
    public addAsset(assetId: string): void {
        this.room?.send(ASSET_EVENTS.ADD, {assetId});
    }

    public removeAsset(assetId: string): void {
        this.room?.send(ASSET_EVENTS.REMOVE, {assetId});
    }

    public updateAsset(assetId: string): void {
        this.room?.send(ASSET_EVENTS.UPDATE, {assetId});
    }

    // --- Behavior Events ---
    public registerBehavior(behavior: Behavior): void {
        this.room?.send(BEHAVIOR_EVENTS.REGISTER.BEHAVIOR, behavior);
    }
    public unregisterBehavior(behavior: Behavior): void {
        this.room?.send(BEHAVIOR_EVENTS.UNREGISTER.BEHAVIOR, behavior);
    }
    public updateBehavior(behavior: Behavior): void {
        this.room?.send(BEHAVIOR_EVENTS.UPDATE.BEHAVIOR, behavior);
    }

    // --- Script Events ---
    public registerScript(script: Script): void {
        this.room?.send(BEHAVIOR_EVENTS.REGISTER.SCRIPT, script);
    }

    public unregisterScript(script: Script): void {
        this.room?.send(BEHAVIOR_EVENTS.UNREGISTER.SCRIPT, script);
    }

    public updateScript(script: Script): void {
        this.room?.send(BEHAVIOR_EVENTS.UPDATE.SCRIPT, script);
    }

    // --- Lambda Events ---
    public registerLambda(lambda: {id: string; config: any; userId: string}): void {
        this.room?.send(LAMBDA_EVENTS.REGISTER, lambda);
    }

    public unregisterLambda(lambda: {id: string; userId: string}): void {
        this.room?.send(LAMBDA_EVENTS.UNREGISTER, lambda);
    }

    public updateLambda(lambda: {id: string; config: any; userId: string}): void {
        this.room?.send(LAMBDA_EVENTS.UPDATE, lambda);
    }

    public requestSyncCheckData(): void {
        this.collaborationWorker?.getSyncCheckData();
    }

    private joinOrCreateRoom(apiUrl?: string, inviteCode?: string): Promise<Room> {
        console.log(`MP: joinOrCreateRoom: api=${apiUrl} invite=${inviteCode}`);
        return this.serverSideMatchMaking(apiUrl, inviteCode);
    }

    private serverSideMatchMaking(apiUrl?: string, inviteCode?: string): Promise<Room> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise<Room>(async (resolve, reject) => {
            const url = `${apiUrl}/mp/api/match/scenes/${this.sceneId}`;
            console.log(`MP: serverSideMatchMaking: ${url}`);
            try {
                const response = await Ajax.post({
                    url: url,
                    data: JSON.stringify({code: inviteCode, options: this.getRoomCreateOptions()}),
                    msgBodyType: "json",
                    needAuthorization: false,
                });
                console.log("MP: serverSideMatchMaking: response=", response);
                if (response?.status === 200) {
                    const room = await this.joinRoom(response?.data.roomId);
                    resolve(room);
                }
            } catch {
                reject(inviteCode ? "Room doesn't exist or is full" : "Failed to join a room. Try again.");
            }
        });
    }

    private getRoomCreateOptions(): RoomCreateOptions {
        return {
            user: this.user,
            simple: true,
            maxClients: this.maxClientsPerRoom,
            token: this.authToken,
            isCollaborative: this.isCollaborative,
            isAuthRequired: this.isAuthRequired,
            isPrivate: false,
            ownerId: this.ownerId,
        } as RoomCreateOptions;
    }

    private joinRoom(roomId: string): Promise<Room<GameRoomState>> {
        if (!this.client) {
            return Promise.reject(new Error("Client not initialized"));
        }
        console.log("MP: joining room: ", roomId);
        return this.client.joinById<GameRoomState>(roomId, {
            user: this.user,
            id: this.userId,
            name: "stem-studio-player",
            token: this.authToken,
            isCollaborative: this.isCollaborative,
            isAuthRequired: this.isAuthRequired,
        });
    }

    private onChildObjectUpdated(
        uuid: string,
        childUuid: string,
        position?: Vector3Like,
        quaternion?: QuaternionLike,
        scale?: Vector3Like,
        visible?: boolean,
        material?: Material,
    ) {
        if (this.isObjectOwner(uuid)) return;
        postMessage({
            event: MULTIPLAYER_EVENTS.OBJECT.CHILD.UPDATED,
            uuid,
            childUuid: childUuid,
            position: position,
            quaternion: quaternion,
            scale: scale,
            visible: visible,
            material: material,
        });
    }

    private onObjectUpdated(
        uuid: string,
        position?: Vector3Like,
        quaternion?: QuaternionLike,
        scale?: Vector3Like,
        visible?: boolean,
    ) {
        if (this.isObjectOwner(uuid)) return;
        postMessage({
            event: MULTIPLAYER_EVENTS.OBJECT.UPDATED,
            uuid,
            position: position,
            quaternion: quaternion,
            scale: scale,
            visible: visible,
        });
    }

    private onChildAdded(uuid: string, child: GameObject) {
        postMessage({event: MULTIPLAYER_EVENTS.OBJECT.CHILD.ADDED, uuid, child: getObjectState(child)});
    }

    private onChildRemoved(uuid: string, child: GameObject) {
        postMessage({event: MULTIPLAYER_EVENTS.OBJECT.CHILD.REMOVED, uuid: uuid, childUuid: child.uuid});
    }

    private onObjectAnimationChanged(uuid: string, animation: string) {
        if (this.isObjectOwner(uuid)) return;
        postMessage({event: MULTIPLAYER_EVENTS.OBJECT.ANIMATION.CHANGED, uuid, animation});
    }

    private onHostChanged() {
        postMessage({event: MULTIPLAYER_EVENTS.HOST.CHANGED, hostSessionId: this.room?.state.hostSessionId});
    }

    private onBehaviorDataChanged(uuid: string, behaviorId: string, key: string, value: string | undefined) {
        postMessage({event: MULTIPLAYER_EVENTS.BEHAVIOR.DATA.CHANGED, uuid, behaviorId, key, value});
    }

    private onCollisionBehaviorChanged(uuid: string, behavior: string) {
        postMessage({event: MULTIPLAYER_EVENTS.OBJECT.COLLISION_BEHAVIOR.CHANGED, uuid, behavior});
    }

    private isObjectOwner(uuid: string): boolean {
        const object = this.room?.state.objects.get(uuid);
        return object?.sessionId === this.room?.sessionId;
    }

    private onObjectRemoved(uuid: string) {
        postMessage({event: MULTIPLAYER_EVENTS.OBJECT.REMOVED, uuid: uuid});
    }

    private onObjectAdded(objectState: GameObject) {
        postMessage({event: MULTIPLAYER_EVENTS.OBJECT.ADDED, objectState: getObjectState(objectState)});
    }

    private onRoomLeft(consented: boolean) {
        this.room = undefined;
        this.client = undefined;
        postMessage({event: MULTIPLAYER_EVENTS.DISCONNECTED, consented: consented});
    }

    setupRoom(): Promise<void> {
        if (this.isCollaborative) {
            this.collaborationWorker = new CollaborationWorker(this.room!);
            this.collaborationWorker.setupRoom();
        }

        this.room!.onMessage("*", (type, message) => {
            try {
                //console.log("MP: room.onMessage: "+type, message);
                switch (type) {
                    case SIMPLE_EVENTS.CHAT.MESSAGE: {
                        postMessage({event: MULTIPLAYER_EVENTS.CHAT.MESSAGE, ...message});
                        break;
                    }
                    default: {
                        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                        console.error("ERROR: unsupported room message: " + type, message);
                        break;
                    }
                }
            } catch (error) {
                console.error("MP: Error in room.onMessage callback:", type, error);
            }
        });

        this.room!.onLeave(code => {
            console.log("MP: left room: code=", code, this.room?.sessionId, this.room?.name);
            this.onRoomLeft(code === 1000 || code >= 4000);
        });

        //PLAYER UPDATES
        const playersMap = this.room!.state.players as unknown as ColyseusMapV2<Player>;
        playersMap.onAdd((player, sessionId) => {
            try {
                console.log("MP: player added: ", sessionId);
                (player as unknown as ColyseusSchemaV2).listen("uuid" as never, ((uuid: string) => {
                    console.log("MP: player UUID set: ", uuid);
                    if (uuid && uuid !== "") {
                        postMessage({event: MULTIPLAYER_EVENTS.PLAYER.ADDED, player: getPlayerState(player)});
                    } else {
                        console.warn("MP: player UUID is empty or invalid, waiting for valid UUID", sessionId);
                    }
                }));
                (player.data as unknown as ColyseusMapV2<string>).onChange((value: string, key: string) => {
                    // Only send if player has a valid UUID
                    if (player.uuid && player.uuid !== "") {
                        postMessage({event: MULTIPLAYER_EVENTS.PLAYER.DATA.CHANGED, playerObjectUuid: player.uuid, key, value});
                    } else {
                        console.warn("MP: player.data.onChange called but player.uuid is empty", {key, value});
                    }
                });
            } catch (error) {
                console.error("MP: Error in players.onAdd callback for player:", sessionId, error);
            }
        });

        playersMap.onRemove((player: Player, sessionId: string) => {
            console.log("MP: player removed: ", sessionId);
            postMessage({event: MULTIPLAYER_EVENTS.PLAYER.REMOVED, player: getPlayerState(player)});
        });

        //OBJECT UPDATES
        const objectsMap = this.room!.state.objects as unknown as ColyseusMapV2<GameObject>;
        objectsMap.onAdd((object: GameObject) => {
            try {
                if (this.isObjectOwner(object.uuid)) {
                    return;
                }

                if (!object.template) {
                    return;
                }

                this.onObjectAdded(object);

            //FIXME: switch to primitive types to avoid double update
            (object.position as unknown as ColyseusSchemaOnChange).onChange(() => {
                this.onObjectUpdated(object.uuid, object.position);
            });

            (object.quaternion as unknown as ColyseusSchemaOnChange).onChange(() => {
                this.onObjectUpdated(object.uuid, undefined, object.quaternion);
            });

            (object.scale as unknown as ColyseusSchemaOnChange).onChange(() => {
                this.onObjectUpdated(object.uuid, undefined, undefined, object.scale);
            });

            const objSchema = object as unknown as ColyseusSchemaV2;
            objSchema.listen("animation" as never, ((animation: string, _prevAnimation: string) => {
                this.onObjectAnimationChanged(object.uuid, animation);
            }));

            objSchema.listen("visible" as never, ((newVisible: boolean) => {
                this.onObjectUpdated(object.uuid, undefined, undefined, undefined, newVisible);
            }));

            objSchema.listen("collisionBehavior" as never, ((behavior: string) => {
                this.onCollisionBehaviorChanged(object.uuid, behavior);
            }));

            if (object.synchronizeChildren) {
                const childrenMap = object.children as unknown as ColyseusMapV2<GameObject>;
                childrenMap.onAdd((child: GameObject) => {
                    if (child.index < 0) {
                        //added object
                        this.onChildAdded(object.uuid, child);
                    }
                });

                childrenMap.onRemove((child: GameObject) => {
                    if (child.index < 0) {
                        //added object
                        this.onChildRemoved(object.uuid, child);
                    }
                });
            }

            // CHILDREN
            if (object.children && object.children.size > 0) {
                //set listeners
                object.children.forEach((child: GameObject) => {
                    this.onChildObjectUpdated(
                        object.uuid,
                        child.uuid,
                        child.position,
                        child.quaternion,
                        child.scale,
                        child.visible,
                        child.material,
                    );

                    (child.position as unknown as ColyseusSchemaOnChange).onChange(() => {
                        this.onChildObjectUpdated(object.uuid, child.uuid, child.position);
                    });

                    (child.quaternion as unknown as ColyseusSchemaOnChange).onChange(() => {
                        this.onChildObjectUpdated(object.uuid, child.uuid, undefined, child.quaternion);
                    });

                    (child.scale as unknown as ColyseusSchemaOnChange).onChange(() => {
                        this.onChildObjectUpdated(object.uuid, child.uuid, undefined, undefined, child.scale);
                    });

                    (child as unknown as ColyseusSchemaV2).listen("visible" as never, (() => {
                        this.onChildObjectUpdated(
                            object.uuid,
                            child.uuid,
                            undefined,
                            undefined,
                            undefined,
                            child.visible,
                        );
                    }));

                    if (child.material) {
                        (child.material as unknown as ColyseusSchemaOnChange).onChange(() => {
                            this.onChildObjectUpdated(
                                object.uuid,
                                child.uuid,
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                child.material,
                            );
                        });
                    }
                });
            }
            //console.log("MP: objects.onAdd done", object, clonedObj);
            } catch (error) {
                console.error("MP: Error in objects.onAdd callback for object:", object.uuid, error);
            }
        });

        objectsMap.onRemove((object: GameObject) => {
            try {
                this.onObjectRemoved(object.uuid);
            } catch (error) {
                console.error("MP: Error in objects.onRemove callback for object:", object.uuid, error);
            }
        });

        // END OBJECTS

        // BEHAVIOR DATA

        (this.room!.state.behaviorData as unknown as ColyseusMapV2<ObjectData>).onAdd((object: ObjectData, uuid: string) => {
            try {
                (object.behaviors as unknown as ColyseusMapV2<import("../BehaviorDataStorage").BehaviorData>).onAdd((behaviorData, behaviorId: string) => {
                    (behaviorData.data as unknown as ColyseusMapV2<string>).onChange((value: string, key: string) => {
                        this.onBehaviorDataChanged(uuid, behaviorId, key, value);
                    });
                    (behaviorData.data as unknown as ColyseusMapV2<string>).onAdd((value: string, key: string) => {
                        this.onBehaviorDataChanged(uuid, behaviorId, key, value);
                    });
                    (behaviorData.data as unknown as ColyseusMapV2<string>).onRemove((_value: string, key: string) => {
                        // key is the map key of the removed entry
                        this.onBehaviorDataChanged(uuid, behaviorId, key, undefined);
                    });
                });
            } catch (error) {
                console.error("MP: Error in behaviorData.onAdd callback for object:", uuid, error);
            }
        });

        // END BEHAVIOR DATA

        //HOST CHANGED
        const stateSchema = this.room!.state as unknown as ColyseusSchemaV2;
        stateSchema.listen("hostSessionId" as never, ((_oldHost: string, _newHost: string) => {
            console.log(`MP: on HOST changed: ${_oldHost} -> ${_newHost}`);
            this.onHostChanged();
        }));

        //READY FLAG
        return new Promise(resolve => {
            if (this.isReady) {
                console.log("MP: setupRoom ready flag is: " + this.room?.state.ready);
                this.isReady = true;
                resolve();
            } else {
                const readyStateSchema = this.room?.state as unknown as ColyseusSchemaV2 | undefined;
                readyStateSchema?.listen("ready" as never, ((val: boolean) => {
                    if (val) {
                        console.log("MP: setupRoom ready flag changed to: " + val);
                        this.isReady = true;
                        resolve();
                    }
                }));
            }
        });
    }
}

export default MultiplayerClient;
