import type { IPhysics } from "../physics/common/types.js";
import type CollisionDetector from "../collisions/CollisionDetector.js";
import type { GameRoomState } from "../rooms/schema/GameRoomState.js";

export interface IBehavior<T> {
    init(target: string, config: T, state: GameRoomState, physics: IPhysics, collisionDetector: CollisionDetector): void;
}

export enum OBJECT_TYPES {
    VOLUME = "Volume",
    CONSUMABLE = "Consumable",
    ENEMY = "Enemy",
    CHARACTER = "Character",
    CAMERA = "Camera",
    PLATFORM = "Platform",
    SPAWNPOINT = "SpawnPoint",
    JUMPPAD = "JumpPad",
    TELEPORT = "Teleport",
    ANIMATION = "Animation",
    PROP_ANIMATION = "Prop Animation",
    FOLLOW = "Follow",
    WEAPON = "Weapon",
    WEAPON_AMMO = "Weapon Ammo",
    THROWABLE = "Throwable",
    INVENTORY = "Inventory",
    GENERIC_SOUND = "Generic Sound",
    CHARACTER_SOUNDS = "Character Sounds",
    SCRIPT = "Script",
    TRIGGER = "Trigger",
    OBJECT_INTERACTIONS = "Object Interactions",
    AI_NPC = "AI Agent",
    PROCEDURAL_PLANT = "Plant",
    PROCEDURAL_TERRAIN = "Terrain",
    NPC = "NPC",
    NPC_RECEIVER = "NPC Receiver",
    SPRITE = "Sprite",
    MOBILE_TOUCH_CONTROL = "Mobile Touch Control",
    HARVEST = "Harvest",
    CONTROLS = "Controls",
    MAKE_CHILD = "MakeChild",
    OTHER = "Other",
    LIGHTS = "Lights",
    MATH_FUNCTIONS = "Math Functions",
    PARTICLE_EFFECTS = "Particle Effects",
    SWITCH = "Switch",
    CHECK_POINT = "Check Point", // not available in behaviors list, added in a different way, from left panel assets
    SPAWN_POINT = "Spawn Point", // not available in behaviors list, added in a different way, from left panel assets
    BILLBOARD = "Billboard", // not available in behaviors list, added in a different way, from left panel assets
    TIMER = "Timer",
    GAME_OVER = "Game Over",
    COUNTER = "Counter",
    TEXT_PROMPT = "Text Prompt",
    CONDITIONS = "Conditions",
    PANNING_TEXTURE = "Panning Texture",
    ON_CLICK = "On Click",
    VEHICLE_SOUND = "Vehicle Sound",
    PROGRESSION = "Progression",
    RANDOMIZE_SPAWNER = "Randomize Spawner",
}

export enum INVENTORY_TYPES {
    CONSUMABLE = OBJECT_TYPES.CONSUMABLE,
    THROWABLE = OBJECT_TYPES.THROWABLE,
    WEAPON = OBJECT_TYPES.WEAPON,
    WEAPON_AMMO = OBJECT_TYPES.WEAPON_AMMO,
}

export interface BehaviorInterface {
    enabled: boolean;
    id: string;
    type: OBJECT_TYPES;
    customName?: string;
}

export enum CONSUMABLE_TYPES {
    INSTANT = "Instant",
    BUTTON_PRESS = "Button Press",
}
export type ConsumableType = CONSUMABLE_TYPES.INSTANT | CONSUMABLE_TYPES.BUTTON_PRESS;

export interface ConsumableBehaviorInterface extends BehaviorInterface {
    type: OBJECT_TYPES.CONSUMABLE;
    inventoryType: INVENTORY_TYPES;
    pointAmount: number;
    timeAmount: number;
    healthAmount: number;
    ammoAmount: number;
    shieldAmount: number;
    moneyAmount: number;
    scaleAmount: number;
    speedAmount: number;
    jumpAmount: number;
    timeForEffect_jump: number;
    timeForEffect_speed: number;
    collisionSettings: {
        disposable: boolean;
        playerCollision: boolean;
        enemyCollision: boolean;
        throwableCollision: boolean;
        canReappear: boolean;
    };
    timeToShowAgain?: number;
    useBoundingBoxes?: boolean;
    consumableType: ConsumableType; // Possible values are: "Instant", "Button Press"
    uiImage?: string;
}
