import {GameAction} from "@stem/network/api/npc";
import {IN_GAME_EVENTS} from "../../event/EventBus";

export const EVENTS_TO_LISTEN = [
    IN_GAME_EVENTS.GAME_LIVES_DEC,
    IN_GAME_EVENTS.GAME_HEALTH_DEC,
    IN_GAME_EVENTS.GAME_SCORE_INC,
    IN_GAME_EVENTS.ENEMY_SPAWNED,
    IN_GAME_EVENTS.ENEMY_DIED,
    IN_GAME_EVENTS.ENEMY_GOT_HIT,
    IN_GAME_EVENTS.CHARACTER_ACTION_DEAD,
    IN_GAME_EVENTS.CHARACTER_MOTION_WALK_START,
    IN_GAME_EVENTS.CHARACTER_MOTION_RUN_START,
    IN_GAME_EVENTS.CHARACTER_ACTION_JUMP_START,
    IN_GAME_EVENTS.CONSUMABLE_COLLECTED,
    IN_GAME_EVENTS.JUMPPAD_ACTIVATED,
    IN_GAME_EVENTS.PLATFORM_ACTIVATED,
    IN_GAME_EVENTS.VOLUME_ACTIVATED,
    IN_GAME_EVENTS.RANDOMIZED_SPAWNER_ACTIVATED,
    IN_GAME_EVENTS.SPAWN_ACTIVATED,
    IN_GAME_EVENTS.TELEPORT_ACTIVATED,
];

export const AVAILABLE_ACTIONS: GameAction[] = [
    {
        name: "rotate_to_face_object",
        description: "Rotate to face a specific object in the scene.",
        parameters: {
            objectId: "UUID of the target object",
        },
    },
    {
        name: "go_to_object",
        description: "Navigate to a specific object in the scene. Use this before interacting with distant objects.",
        parameters: {
            objectId: "UUID of the target object",
        },
    },
    {
        name: "go_to_position",
        description:
            "Navigate to a specific 3D position. Use this to move to a location or return to original position.",
        parameters: {
            x: "X coordinate",
            y: "Y coordinate",
            z: "Z coordinate",
        },
    },
    {
        name: "pick_up_object",
        description:
            "Pick up an object and hold it. Must be close to the object (use go_to_object first if object is more than 0.5m away).",
        parameters: {
            objectId: "UUID of the object to pick up",
        },
    },
    {
        name: "put_down_object",
        description: "Put down a held object at the NPC's current position. Must be holding an object to put it down.",
    },
    {
        name: "wave_gesture",
        description: "Perform a friendly wave gesture.",
        parameters: {
            objectId: "UUID of the target object or entity to wave at",
        },
    },
    {
        name: "point_at",
        description: "Point at a specific object or entity.",
        parameters: {
            targetId: "UUID of the target to point at",
        },
    },
];
