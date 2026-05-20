import { MapSchema, Schema, type } from "@colyseus/schema";
import { ObjectData } from "./BehaviorDataStorage.js";
import { Quaternion as QuaternionLike, Vector3 as Vector3Like } from "../../physics/common/types.js";

export class GameState extends Schema {
    @type("number") score = 0;
    @type("boolean") ended = false;
}

export class Quaternion extends Schema {
    @type("number") x: number;
    @type("number") y: number;
    @type("number") z: number;
    @type("number") w: number;

    constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
        super();
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }
}

export class Vector3 extends Schema {
    @type("number") x: number;
    @type("number") y: number;
    @type("number") z: number;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        super();
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

export class ObjectMotionStateSchema extends Schema {
    @type("boolean") onGround: boolean = false;
    @type(Vector3) linearVelocity: Vector3 = new Vector3();
}

export class SpawnPoint extends Schema {
    @type(Vector3) position: Vector3;
    @type(Quaternion) quaternion: Quaternion;

    constructor(position: { x: number, y: number, z: number }, quaternion: {
        x: number,
        y: number,
        z: number,
        w: number
    }) {
        super();
        this.position = new Vector3(position.x, position.y, position.z);
        this.quaternion = new Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    }
}

export class UserData extends Schema {
    constructor(avatar: string, email: string, username: string, name: string, id: string) {
        super();
        this.avatar = avatar;
        this.email = email;
        this.username = username;
        this.name = name;
        this.id = id;
    }

    @type("string") avatar: string;
    @type("string") email: string;
    @type("string") username: string;
    @type("string") name: string;
    @type("string") id: string;
}

export class Player extends Schema {
    constructor(id: string, sessionId: string, name: string, user: UserData) {
        super();
        this.id = id;
        this.sessionId = sessionId;
        this.name = name;
        this.user = user;
        this.slot = -1;
        this.data = new MapSchema();
    }

    @type("string") id: string;
    @type("string") sessionId: string;
    @type("string") uuid: string = ""; //player's object uuid
    @type("string") origin: string = ""; //object player was cloned from
    @type("string") name: string;
    @type("string") userId: string = "";
    @type("number") slot: number;
    @type(UserData) user: UserData;
    @type("string") animation: string = "";
    @type({ map: "string" }) data: MapSchema<string>;

    //local data
    //FIXME: reduce garce period to 30 sec
    lastHeartbeat: number = Date.now() + 1 * 60 * 60 * 1000; //1 hour for backward compatibility
}

export class Material extends Schema {
    constructor(color: number, emissive: number, opacity: number, map_wrapS: number, map_wrapT: number) {
        super();
        this.color = color;
        this.emissive = emissive;
        this.opacity = opacity;
        this.map_wrapS = map_wrapS;
        this.map_wrapT = map_wrapT;
    }

    @type("number") emissive: number;
    @type("number") color: number;
    @type("number") opacity: number;
    @type("number") map_wrapS: number;
    @type("number") map_wrapT: number;
}

export class GameObject extends Schema {
    constructor(uuid: string, template: string, templateType: string, name: string,
                position: Vector3Like, quaternion: QuaternionLike, scale: Vector3Like = undefined, visible: boolean = true,
                animation: string = undefined, material: Material = undefined, index: number = -1,
    ) {
        super();
        this.uuid = uuid;
        this.template = template;
        this.templateType = templateType;
        this.name = name;
        this.collisionBehavior = "regular";
        this.position = position ? new Vector3(position.x, position.y, position.z): new Vector3();
        this.scale = new Vector3(scale?.x ?? 1, scale?.y ?? 1, scale?.z ?? 1);
        this.quaternion = quaternion ? new Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w) : new Quaternion();
        this.visible = visible;
        this.animation = animation ?? "";
        this.children = new MapSchema<GameObject>();
        this.material = material ?? new Material(0, 0, 1, 0, 0);
        this.index = index;
    }

    @type("string") uuid: string;
    @type("string") template: string;
    @type("string") templateType: string;
    @type("string") name: string;
    @type("string") shape: string  = "";
    @type("number") shapeVersion: number = 0;
    @type("string") collisionBehavior: string;
    @type("string") animation: string = "";
    @type("string") sessionId: string = "";
    @type(Vector3) position: Vector3;
    @type(Vector3) scale: Vector3;
    @type(Quaternion) quaternion: Quaternion;
    @type(ObjectMotionStateSchema) motionState: ObjectMotionStateSchema = new ObjectMotionStateSchema();
    @type("boolean") deleted: boolean = false;
    @type(Material) material: Material;
    @type("boolean") visible: boolean;
    //children
    @type("string") parent: string = "";
    @type({ map: GameObject }) children: MapSchema<GameObject>;
    @type("number") index: number = 0;
    @type("boolean") synchronizeChildren?: boolean;

    //transient data
    prevPosition: Vector3 = new Vector3();
    prevQuaternion: Quaternion = new Quaternion();
}

export class Behavior extends Schema {
    @type("string") id: string = "";
    @type("string") config: string = "";
    @type("string") userId: string = "";

    constructor(id: string, config: unknown, userId: string) {
        super();
        this.id = id;
        this.config = JSON.stringify(config);
        this.userId = userId;
    }
}

export class Script extends Schema {
    @type("string") name: string = "";
    @type("string") script: string = "";
    @type("string") userId: string = "";

    constructor(name: string, script: string, userId: string) {
        super();
        this.name = name;
        this.script = script;
        this.userId = userId;
    }
}

/**
 * Waiting List Player Schema for Private Rooms
 *
 * Represents a player in the waiting list for a private room. Used to track
 * players who want to join but the room is at capacity. Includes position
 * tracking, status management, and timestamp information for queue ordering.
 */
export class WaitingPlayer extends Schema {
    @type("string") userId: string;
    @type("string") displayName: string;
    @type("number") position: number;
    @type("string") status: string; // waiting, invited, declined
    @type("number") joinedAt: number; // timestamp

    constructor(userId: string, displayName: string, position: number = 0, status: string = 'waiting') {
        super();
        this.userId = userId;
        this.displayName = displayName;
        this.position = position;
        this.status = status;
        this.joinedAt = Date.now();
    }
}

/**
 * Private Room Information Schema
 *
 * Extends the standard GameRoomState with private room-specific data including
 * invite codes, capacity settings, and real-time waiting list state. This schema
 * is synchronized to all clients in the room to provide live updates on room
 * status, waiting list changes, and capacity management.
 *
 * Real-time Features:
 * - Live waiting list updates with position tracking
 * - Room capacity and settings synchronization
 * - Owner identification for permission checks
 * - Invite code display for easy sharing
 */
export class PrivateRoomInfo extends Schema {
    @type("string") inviteCode: string;
    @type("string") ownerId: string;
    @type("number") maxPlayers: number;
    @type("boolean") isPrivate: boolean;
    @type("boolean") allowWaitingList: boolean;
    @type("boolean") autoStart: boolean;
    @type({ map: WaitingPlayer }) waitingList = new MapSchema<WaitingPlayer>();

    constructor(inviteCode: string, ownerId: string, maxPlayers: number) {
        super();
        this.inviteCode = inviteCode;
        this.ownerId = ownerId;
        this.maxPlayers = maxPlayers;
        this.isPrivate = true;
        this.allowWaitingList = true;
        this.autoStart = false;
    }
}

export class GameRoomState extends Schema {
    @type("boolean") ready: boolean = false;
    @type("string") inviteCode: string = "";
    @type("string") hostSessionId: string = ""; //should always be set to session ID of the connected client
    @type({ map: Player }) players = new MapSchema<Player>();
    @type({ map: GameObject }) objects = new MapSchema<GameObject>();
    @type({ map: SpawnPoint }) spawnPoints = new MapSchema<SpawnPoint>();
    @type({ map: ObjectData }) behaviorData = new MapSchema<ObjectData>();
    @type(GameState) gameState: GameState = new GameState();
    @type({ map: "string" }) snapshot = new MapSchema<string>();
    @type({ map: Behavior }) behaviors = new MapSchema<Behavior>();
    @type({ map: Script }) scripts = new MapSchema<Script>();

    @type(PrivateRoomInfo) privateRoomInfo?: PrivateRoomInfo;
}
