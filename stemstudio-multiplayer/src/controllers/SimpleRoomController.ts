import type { Client, Room } from "@colyseus/core";
import { SIMPLE_EVENTS } from "../physics/common/events.js";
import { RoomCreateOptions } from "../rooms/GameRoom.js";
import { GameObject, GameRoomState, Material, Player, Quaternion, Vector3 } from "../rooms/schema/GameRoomState.js";
import IRoomController from "./IRoomController.js";
import { BehaviorDataStorage } from "../rooms/schema/BehaviorDataStorage.js";
import { Filter } from "bad-words";
import { Delayed } from "@colyseus/timer";

export enum TemplateType {
    UUID = 0,
    URL,
    PRIMITIVE,
}

export default class SimpleRoomController implements IRoomController {
    private static HOST_TIMEOUT_MS = 3000; //3 sec
    private static PLAYER_TIMEOUT_MS = 10*60*1000; //10 mins (allow some time for login)

    room: Room<GameRoomState>;
    options: RoomCreateOptions;

    behaviorData: BehaviorDataStorage;
    preventAutoSave: boolean = false;
    private chatMessageCounter: number = 0;
    private profanityFilter: Filter;
    private chatFilterQueue: Array<{ client: Client; message: string; originalChatMessage: any }> = [];

    private hostCheckHeartbeatTimer: Delayed | undefined = undefined;

    constructor(room: Room<GameRoomState>, options: RoomCreateOptions) {
        this.room = room;
        this.options = options;
        this.behaviorData = new BehaviorDataStorage(this.room.state.behaviorData);
        this.profanityFilter = new Filter();
        this.startChatFilterProcessor();
    }

    start() {
        console.log("Room controller started");
        this.hostCheckHeartbeatTimer = this.startHostHeartBeatCheck();
        this.room.state.ready = true;
    }

    dispose() {
        console.log("Room controller disposed");
        //dispose here
        this.hostCheckHeartbeatTimer?.clear();
    }

    onBaseMessage(client: Client, type: string, message: any) {
        this.onMessage(client, type, message);
    }

    onMessage(client: Client, messageType: string, message: any) {
        //console.log("onMessage: ", client.id, messageType, message);
        switch (messageType) {
            case SIMPLE_EVENTS.ADD.OBJECT: {
                //console.log("ADD.OBJECT: ", client.id, message);
                const { data } = message;
                this.addObject(
                    client.sessionId,
                    message.uuid,
                    message.template,
                    message.templateType,
                    message.name,
                    message.shape,
                    data.position,
                    data.quaternion as Quaternion,
                    data.scale,
                    data.animation,
                    data.visible,
                    message.children,
                    message.synchronizeChildren
                );
                break;
            }
            case SIMPLE_EVENTS.ADD.CHILD: {
                this.addChild(message.uuid, message.child);
                break;
            }
            case SIMPLE_EVENTS.REMOVE.CHILD: {
                this.removeChild(message.uuid, message.child);
                break;
            }
            case SIMPLE_EVENTS.UPDATE.OBJECT: {
                const { data } = message;
                this.updateObject(
                    message.uuid,
                    message.children,
                    data.position,
                    data.quaternion,
                    data.scale,
                    data.visible,
                    data.animation,
                    data.needsShapeUpdate
                );
                break;
            }
            case SIMPLE_EVENTS.REMOVE.OBJECT: {
                this.removeObject(message.uuid);
                break;
            }
            case SIMPLE_EVENTS.SET.BEHAVIOR_DATA: {
                const { data } = message;
               
                this.behaviorData.setData(message.uuid, data.behaviorId, data.key, data.value);
                break;
            }
            case SIMPLE_EVENTS.SET.COLLISION_BEHAVIOR: {
                this.setCollisionBehavior(message.uuid, message.behavior);
                break;
            }
            case SIMPLE_EVENTS.REMOVE.BEHAVIOR_DATA: {
                const { data } = message;
            
                this.behaviorData.removeData(message.uuid, data.behaviorId, data.key);
                break;
            }
            case SIMPLE_EVENTS.SET.PLAYER.OBJECT: {
                const player = this.room.state.players.get(client.sessionId);
                if (player) {
                    player.uuid = message.uuid;
                } else {
                    console.warn(`SET.PLAYER.OBJECT: player not found: ${client.sessionId}`);
                }
                break;
            }
            case SIMPLE_EVENTS.SET.PLAYER.DATA: {
                const { key, value } = message;
                const player = this.room.state.players.get(client.sessionId);
                if (player) {
                    player.data.set(key, value);
                } else {
                    console.warn(`SET.PLAYER.DATA: player not found: ${client.sessionId}`);
                }
                break;
            }
            case SIMPLE_EVENTS.CHAT.MESSAGE: {
                this.handleChatMessage(client, message.message);
                break;
            }
            case SIMPLE_EVENTS.DISCONNECT_CLIENTS: {
                this.disconnectAllClients();
                break;
            }
            case SIMPLE_EVENTS.HEARTBEAT: {
                const player = this.room.state.players.get(client.sessionId);
                if (player) {
                    player.lastHeartbeat = Date.now();
                }
                break;
            }
            default:
                console.warn("Unsupported room message: " + messageType);
        }
    }

    private startHostHeartBeatCheck(): any {
        return this.room.clock.setInterval(() => {
            this.checkHostHeartbeat();
        }, 1000);
    }

    private checkHostHeartbeat(): void {
        //check host
        const host = this.room.state.players.get(this.room.state.hostSessionId);
        if (!host || Date.now() - host.lastHeartbeat > SimpleRoomController.HOST_TIMEOUT_MS) {
            console.log(`SRC: paused host detected: ${this.room.state.hostSessionId} -> ${Date.now() - (host?.lastHeartbeat || 0) }`);
            this.assignNewHost();
        }
        //check for stale clients
        this.room.state.players.forEach((player) => {
            if (Date.now() - player.lastHeartbeat > SimpleRoomController.PLAYER_TIMEOUT_MS) {
                console.log(`SRC: stale client detected: ${player.sessionId} -> ${Date.now() - player.lastHeartbeat || 0 }`);
                //TODO: we can handle reconnect automatically by creating special code for this case
                this.room.clients.getById(player.sessionId)?.leave(4000, "Client disconnected");
            }
        });
    }

    private assignNewHost(): void {
        const currentHost = this.room.state.players.get(this.room.state.hostSessionId);
        const sortedPlayers = Array.from(this.room.state.players.values())
            .filter(p => !currentHost || p.id !== currentHost.id)
            .sort((a, b) => a.lastHeartbeat - b.lastHeartbeat);
        this.room.state.hostSessionId = sortedPlayers.length > 0 && Date.now() - sortedPlayers[0].lastHeartbeat <= SimpleRoomController.HOST_TIMEOUT_MS ?
            sortedPlayers[0].sessionId : this.room.state.hostSessionId;
    }

    onPlayerLeft(player: Player): void {
        console.log("RC.onPlayerLeft: " + player.sessionId);
        //set new host
        if (this.isHost(player.sessionId) && this.room.state.players.size > 0) {
            this.assignNewHost();
            console.log("RC.onPlayerLeft: new host" + this.room.state.hostSessionId);
        }
        // remove all object from the player left
        this.room.state.objects.forEach((obj) => {
            if (player.sessionId === obj.sessionId) {
                this.removeObject(obj.uuid);
                this.behaviorData.removeObject(obj.uuid);
                console.log("Removing Obj ", obj.uuid);
            }
        });
    }

    onPlayerJoined(player: Player): void {
        console.log(
            `RC.onPlayerJoined: ${player.sessionId} -> host: ${this.room.state.hostSessionId} -> id: ${player.id}`
        );
        this.assignSlot(player);
        if (!this.room.state.hostSessionId) {
            this.room.state.hostSessionId = player.sessionId;
        }
        console.log(
            `RC.onPlayerJoined: ${player.sessionId} -> host: ${this.room.state.hostSessionId} -> id: ${player.id}`
        );
    }

    private isHost(sessionId: string): boolean {
        return this.room.state.hostSessionId === sessionId;
    }

    private isObjectOwner(sessionId: string, objectUuid: string): boolean {
        const object = this.room.state.objects.get(objectUuid);
        return Boolean(object?.sessionId === sessionId);
    }

    private assignSlot(player: Player): void {
        const sequentialNumbers: number[] = Array.from({ length: this.room.maxClients }, (_, i) => i);
        const players = Array.from(this.room.state.players.values());
        const slot = sequentialNumbers.find((i) => players.find((p) => p.slot === i) === undefined);
        if (slot === undefined) {
            console.warn(
                `No available slot found for ${player.id}: ${this.room.maxClients} > ${this.room.state.players.size} ?`
            );
            return;
        }
        console.log(`Slot assigned: ${player.id} -> ${slot}`);
        player.slot = slot;
    }

    private addChild(uuid: string, child: any): void {
        const object = this.room.state.objects.get(uuid);
        if (!object) {
            console.warn(`Unable to addChild - object not found: ${uuid}`);
            return;
        }
        const parent = object.uuid === child.parent ? object : object.children.get(child.parent);
        if (!parent) {
            console.warn(`Unable to addChild - parent not found: ${uuid}/${object.name} -> ${child.parent}`);
            return;
        }
        const existingChildObject = object.children.get(child.uuid);
        if (existingChildObject) {
            console.warn(
                `Child is already added to the object: ${object.uuid}/${object.name} -> ${existingChildObject.uuid}/${existingChildObject.name}`
            );
            return;
        }
        const childObject = new GameObject(
            child.uuid,
            child.template,
            child.templateType,
            child.name,
            child.data.position,
            child.data.quaternion,
            child.data.scale,
            child.data.visible,
            child.data.animation
        );
        childObject.parent = child.parent;
        object.children.set(childObject.uuid, childObject);
    }

    private removeChild(uuid: string, childUuid: string): void {
        const object = this.room.state.objects.get(uuid);
        if (!object) {
            console.warn(`Unable to removeChild - object not found: ${uuid}`);
            return;
        }
        object.children.delete(childUuid);
    }

    private addObject(
        sessionId: string,
        uuid: string,
        template: string,
        templateType: string,
        name: string,
        shape?: string,
        position?: Vector3,
        quaternion?: Quaternion,
        scale?: Vector3,
        animation?: string,
        visible?: boolean,
        children?: Array<any>,
        synchronizeChildren?: boolean
    ): GameObject {
        const gameObject = new GameObject(
            uuid,
            template,
            templateType,
            name,
            position,
            quaternion ?? new Quaternion(),
            scale,
            visible,
            animation
        );
        gameObject.shape = shape ?? "";

        gameObject.sessionId = sessionId;
        gameObject.synchronizeChildren = synchronizeChildren ?? false;

        if (children) {
            for (const child of children) {
                const { data } = child;
                let material: Material | undefined = undefined;
                if (data.material) {
                    material = new Material(
                        data.material.color,
                        data.material.emissive,
                        data.material.opacity,
                        data.material.map_wrapS,
                        data.material.map_wrapT
                    );
                }
                const childGameObj = new GameObject(
                    child.uuid,
                    "",
                    "",
                    child.name,
                    data.position,
                    data.quaternion,
                    data.scale,
                    data.visible,
                    undefined,
                    material,
                    child.index
                );

                if (gameObject.children.has(child.uuid)) {
                    console.warn(
                        `Child has already been added: ${child.uuid}/${child.name}/${child.index} -> ${
                            gameObject.children.get(child.uuid)?.name
                        }`
                    );
                }
                gameObject.children.set(child.uuid, childGameObj);
            }
        }

        //this.setObjectAttributes(gameObject, position, quaternion, scale, animation);

        this.room.state.objects.set(uuid, gameObject);

        console.log("addObject: " + name + "->" + uuid, scale, this.room.state.objects.get(uuid)?.scale.x);

        return gameObject;
    }

    private updateObject(
        uuid: string,
        children?: any[],
        position?: Vector3,
        quaternion?: Quaternion,
        scale?: Vector3,
        visible?: boolean,
        animation?: string,
        needsShapeUpdate?: boolean
    ) {
        const object = this.room.state.objects.get(uuid);

        if (!object) {
            console.warn(`updateObject: no object found for ${uuid}`);
            return;
        }

        if (children) {
            for (const child of children) {
                const childObj = object.children.get(child.uuid);
                if (!childObj) {
                    console.warn(
                        `updateObject: updated child is missing in the root object: ${object.uuid}/${object.name} -> ${child.uuid}/${child.name}`
                    );
                    continue;
                }
                const { data } = child;
                this.setObjectAttributes(
                    childObj,
                    data.position,
                    data.quaternion,
                    data.scale,
                    data.visible,
                    undefined,
                    data.material
                );
            }
        }

        this.setObjectAttributes(
            object,
            position,
            quaternion,
            scale,
            visible,
            animation,
            undefined /* material */,
            needsShapeUpdate
        );
    }

    private removeObject(uuid: string) {
        this.room.state.objects.delete(uuid);
    }

    private setObjectAttributes(
        object: GameObject,
        position?: Vector3,
        quaternion?: Quaternion,
        scale?: Vector3,
        visible?: boolean,
        animation?: string,
        material?: Material,
        needsShapeUpdate?: boolean
    ): void {
        if (position) {
            object.position.x = position.x;
            object.position.y = position.y;
            object.position.z = position.z;
        }

        if (quaternion) {
            object.quaternion.x = quaternion.x;
            object.quaternion.y = quaternion.y;
            object.quaternion.z = quaternion.z;
            object.quaternion.w = quaternion.w;
        }

        if (scale) {
            object.scale.x = scale.x;
            object.scale.y = scale.y;
            object.scale.z = scale.z;
        }

        if (visible !== undefined) {
            object.visible = visible;
        }

        if (animation) {
            object.animation = animation;
        }

        if (material) {
            object.material.color = material.color;
            object.material.emissive = material.emissive;
            object.material.opacity = material.opacity;
            object.material.map_wrapS = material.map_wrapS;
            object.material.map_wrapT = material.map_wrapT;
        }

        if (needsShapeUpdate) {
            object.shapeVersion++;
        }
    }

    private setCollisionBehavior(uuid: string, behavior: string): void {
        const object = this.room.state.objects.get(uuid);
        if (!object) {
            console.warn(`setCollisionBehavior: no object found for ${uuid}`);
            return;
        }
        object.collisionBehavior = behavior;
    }

    private handleChatMessage(client: Client, message: string): void {
        if (!message || message.trim().length === 0) {
            console.warn(`Empty chat message from ${client.sessionId}`);
            return;
        }

        const trimmedMessage = message.trim();
        if (trimmedMessage.length > 140) {
            console.warn(`Chat message too long from ${client.sessionId}: ${trimmedMessage.length} characters`);
            return;
        }

        const player = this.room.state.players.get(client.sessionId);
        if (!player) {
            console.warn(`Chat message from unknown player: ${client.sessionId}`);
            return;
        }

        const chatMessage = {
            id: `${Date.now()}-${++this.chatMessageCounter}`,
            senderId: client.sessionId,
            message: trimmedMessage,
            filtered: false,
            timestamp: Date.now(),
        };

        // Immediately broadcast the message for real-time response
        this.room.broadcast(SIMPLE_EVENTS.CHAT.MESSAGE, chatMessage);
        console.log(`Chat message from ${player.user.name}: ${trimmedMessage}`);

        // Queue for low-priority profanity filtering
        this.chatFilterQueue.push({
            client,
            message: trimmedMessage,
            originalChatMessage: chatMessage,
        });
    }

    private startChatFilterProcessor(): void {
        // Process chat filtering queue with low priority (only when idle)
        const processQueue = () => {
            if (this.chatFilterQueue.length > 0) {
                const item = this.chatFilterQueue.shift();
                if (item) {
                    try {
                        const filteredMessage = this.profanityFilter.clean(item.message);

                        // Only send update if a message was actually filtered
                        if (filteredMessage !== item.message) {
                            const filteredChatMessage = {
                                ...item.originalChatMessage,
                                message: filteredMessage,
                                filtered: true,
                            };

                            const player = this.room.state.players.get(item.client.sessionId);
                            console.log(
                                `Profanity detected and filtered from ${player?.user.name}: ${item.message} -> ${filteredMessage}`
                            );

                            // Send a filtered version as separate event
                            this.room.broadcast(SIMPLE_EVENTS.CHAT.MESSAGE, filteredChatMessage);
                        }
                    } catch (error) {
                        console.error("Error filtering chat message:", error);
                    }
                }
            }

            // Schedule next processing with low priority
            setImmediate(processQueue);
        };

        // Start the processor
        setImmediate(processQueue);
    }

    private disconnectAllClients(): void {
        console.log(`Disconnecting all clients`);
        this.preventAutoSave = true;
        // Disconnect all clients
        this.room.clients.forEach((client) => {
            try {
                client.leave(3000, "Disconnected by client request");
                console.log(`Disconnected client: ${client.sessionId}`);
            } catch (error) {
                console.error(`Error disconnecting client ${client.sessionId}:`, error);
            }
        });
    }
}
