import {Schema, MapSchema} from "@colyseus/schema";

import {ObjectData} from "./BehaviorDataStorage";
import {PhysicsShape} from "@stem/editor-oss/behaviors/state/IMultiplayerState";
import {CollisionBehavior} from "@stem/editor-oss/physics/common/types";
import {UserData} from "../userManagement/editorProfile/ApplicationAuthStore";

export class GameState extends Schema {
    constructor() {
        super();
        this.score = 0;
        this.ended = false;
    }
    score: number;
    ended: boolean;
}

export class Quaternion extends Schema {
    constructor() {
        super();
        [this.x, this.y, this.z, this.w] = [0, 0, 0, 1];
    }
    x: number;
    y: number;
    z: number;
    w: number;
}

export class Vector3 extends Schema {
    constructor() {
        super();
        [this.x, this.y, this.z] = [0, 0, 0];
    }
    x: number;
    y: number;
    z: number;
}

export class ObjectMotionStateSchema extends Schema {
    constructor() {
        super();
        this.onGround = false;
        this.linearVelocity = new Vector3();
    }
    onGround: boolean;
    linearVelocity: Vector3;
}

export class Player extends Schema {
    constructor(id: string, sessionId: string, name: string, user: UserData) {
        super();
        this.id = id;
        this.sessionId = sessionId;
        this.name = name;
        this.animation = "";
        this.user = user;
        this.data = new MapSchema();
    }
    id: string;
    sessionId: string = "";
    uuid: string = ""; //player's object uuid
    origin: string = ""; //object player was cloned from
    name: string;
    slot: number = 0;
    animation: string;
    user: UserData;
    data: MapSchema<string>;
}

export const getPlayerState = (player: Player) => {
    return {
        id: player.id,
        sessionId: player.id,
        uuid: player.uuid,
        origin: player.origin,
        name: player.name,
        slot: player.slot,
        animation: player.animation,
        user: player.user,
        data: mapSchemaToMap(player.data),
    };
};

const mapSchemaToMap = (mapSchema: MapSchema) => {
    const map = new Map<string, string>();
    mapSchema.forEach((value, key) => {
        map.set(key, value);
    });
    return map;
};

export class Material extends Schema {
    emissive: number = 0;
    color: number = 0;
    opacity: number = 0;
    map_wrapS: number = -1;
    map_wrapT: number = -1;
}

export class GameObject extends Schema {
    constructor(uuid: string, name = "") {
        super();
        this.uuid = uuid;
        this.template = "";
        this.templateType = "";
        this.name = name;
        this.shape = PhysicsShape.BOX;
        this.collisionBehavior = CollisionBehavior.Regular;
        this.position = new Vector3();
        this.scale = new Vector3();
        this.quaternion = new Quaternion();
        this.motionState = new ObjectMotionStateSchema();
        this.material = new Material();
        this.visible = true;
        this.children = new MapSchema<GameObject>();
    }

    uuid: string;
    template: string; //prefab uuid
    templateType: string;
    name: string;
    shape: string;
    collisionBehavior: string;

    /** Incremented by the server when the collision shape needs to be updated */
    shapeVersion: number = 0;

    animation: string = "";
    sessionId: string = "";
    position: Vector3;
    scale: Vector3;
    quaternion: Quaternion;
    motionState: ObjectMotionStateSchema;
    material: Material;
    visible: boolean;
    children: MapSchema<GameObject>;
    parent: string = "";
    index: number = 0;
    synchronizeChildren: boolean = false;
}

export class Behavior extends Schema {
    id: string = "";
    config: any = {};
    userId: string = "";
    constructor(id: string, config: any, userId: string) {
        super();
        this.id = id;
        this.config = config;
        this.userId = userId;
    }
}

export class Script extends Schema {
    name: string = "";
    script: string = "";
    userId: string = "";
    constructor(name: string, script: string, userId: string) {
        super();
        this.name = name;
        this.script = script;
        this.userId = userId;
    }
}

export const getObjectState = (object: GameObject) => {
    return {
        uuid: object.uuid,
        template: object.template,
        templateType: object.templateType,
        name: object.name,
        shape: object.shape,
        position: object.position,
        scale: object.scale,
        quaternion: object.quaternion,
        motionState: object.motionState,
        material: object.material,
        visible: object.visible,
        children: object.children && object.children.size > 0 ? gameObjectMapSchemaToMap(object.children) : undefined,
        parent: object.parent,
        index: object.index,
    };
};

const gameObjectMapSchemaToMap = (mapSchema: MapSchema<GameObject>): Map<string, any> => {
    const map = new Map<string, any>();
    mapSchema.forEach((value, key) => {
        map.set(key, getObjectState(value));
    });
    return map;
};

export class SerializedGameObject extends Schema {
    constructor() {
        super();
    }
    uuid: string = ""; //object uuid
    name: string = ""; //object name
    parentUuid: string = ""; //parent object uuid
    [key: string]: any; // for additional properties
}

export class GameRoomState extends Schema {
    ready: boolean = false;

    inviteCode: string = "";

    hostSessionId: string = "";

    players = new MapSchema<Player>();

    objects = new MapSchema<GameObject>();

    behaviorData = new MapSchema<ObjectData>();

    gameState = new GameState();

    snapshot = new MapSchema<string>();

    behaviors = new MapSchema<Behavior>();

    scripts = new MapSchema<Script>();
}
