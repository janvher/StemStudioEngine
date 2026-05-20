import * as THREE from "three";

export const EDITOR_TOP_NAV_HEIGHT = "48px";
export const EDITOR_TOP_NAV_HALF_HEIGHT = 48 / 2 + "px";
export const PANEL_FULL_HEIGHT = `calc(100svh - 24px - ${EDITOR_TOP_NAV_HEIGHT})`; // 100svh - padding 2x12px - nav height

export enum GAME_STATE {
    NOT_STARTED = 0,
    STARTED,
    FINISHED, //automatically switches to NOT_STARTED
    PAUSED,
}

export const BEHAVIOR_UI_CONTAINER_ID = "behavior-ui-container";

export enum OBJECT_INTERACTION_OPTIONS {
    PICKUP_DROP = "Pickup and Drop",
    PUSH_PULL = "Push and Pull",
}

export enum NPC_MOVEMENT_TYPES {
    STANDING = "Standing",
    ROAM = "Roam",
}

export enum NPC_TYPES {
    WAITER = "Waiter",
    FIREMAN = "Fireman",
    DOCTOR = "Doctor",
    SOLDIER = "Soldier",
    BAKER = "Baker",
    POLICEMAN = "Policeman",
    FARMER = "Farmer",
    SCIENTIST = "Scientist",
    TEACHER = "Teacher",
    ARTIST = "Artist",
    ENGINEER = "Engineer",
    NURSE = "Nurse",
    DRIVER = "Driver",
    SOLDIER_ELITE = "Elite Soldier",
    JOCK = "Jock",
    MERCHANT = "Merchant",
    GUARD = "Guard",
    COOK = "Cook",
    STUDENT = "Student",
    PAINTER = "Painter",
}

export enum SPRITE_TYPES {
    TWO_D = "2D",
    THREE_D = "3D",
    ANIMATED = "ANIMATED", // Example additional type
}

export enum ANIMATION_TYPES {
    REPEAT = "Repeat",
    LOOP = "Loop",
    PLAY_ONCE = "Play Once",
}
export enum PROP_ANIMATION_TYPES {
    LOOP = "Loop",
    PLAY_ONCE = "Play Once",
}

export enum EASE_TYPES {
    LINEAR = "linear",
    QUAD_IN = "quadIn",
    QUAD_OUT = "quadOut",
    QUAD_IN_OUT = "quadInOut",
    CUBIC_IN = "cubicIn",
    CUBIC_OUT = "cubicOut",
    CUBIC_IN_OUT = "cubicInOut",
    QUART_IN = "quartIn",
    QUART_OUT = "quartOut",
    QUART_IN_OUT = "quartInOut",
    QUINT_IN = "quintIn",
    QUINT_OUT = "quintOut",
    QUINT_IN_OUT = "quintInOut",
    SINE_IN = "sineIn",
    SINE_OUT = "sineOut",
    SINE_IN_OUT = "sineInOut",
    BACK_IN = "backIn",
    BACK_OUT = "backOut",
    BACK_IN_OUT = "backInOut",
    CIRC_IN = "circIn",
    CIRC_OUT = "circOut",
    CIRC_IN_OUT = "circInOut",
    BOUNCE_IN = "bounceIn",
    BOUNCE_OUT = "bounceOut",
    BOUNCE_IN_OUT = "bounceInOut",
    ELASTIC_IN = "elasticIn",
    ELASTIC_OUT = "elasticOut",
    ELASTIC_IN_OUT = "elasticInOut",
}

export enum CUSTOM_BLOCK_VOLUME_TYPES {
    BLOCK_ENEMIES = "Block Enemies",
    BLOCK_THROWABLE = "Block Throwables",
    BLOCK_CHARACTERS = "Block Characters",
}

export enum ENEMY_TYPES {
    AGGRESIVE = "Aggressive",
    DEFENSIVE = "Defensive",
    PATROLS = "Patrols",
    CUSTOM = "Custom",
}

export enum PLATFORM_RESPAWN_TYPES {
    LOOP = "Loop",
    REPEAT = "Respawn",
    PLAY_ONCE = "Play Once",
}

export enum SPAWNPOINT_TYPES {
    CLONE = "Clone",
    MOVE = "Move",
}

export enum RANDOMIZED_SPAWNER_TYPES {
    CLONE = "Clone",
    MOVE = "Move",
}

export enum WEAPON_TYPES {
    MACHINE_GUN = "Machine Gun",
    SUB_MACHINE_GUN = "Sub Machine Gun",
    RIFLE = "Rifle",
    SNIPER_RIFLE = "Sniper Rifle",
    SCIFI_SNIPER_RIFLE = "SciFi Sniper Rifle",
    SHOT_GUN = "Shot Gun",
    PISTOL = "Pistol",
    BOW = "Bow",
    HANDS = "Hands",
    SWORD = "Sword",
    KNIFE = "Knife",
    STAFF = "Staff",
    GRENADE = "Grenade",
    BUTTON_PRESS = "Button Press",
}

export enum INVENTORY_TYPES {
    PRIMARY = "Primary",
    SECONDARY = "Secondary",
    MELEE = "Melee",
    THROWABLE = "Throwable",
    CONSUMABLE = "Consumable",
    WEAPON = "Weapon",
    WEAPON_AMMO = "Weapon Ammo",
}

export interface BehaviorInterface {
    enabled: boolean;
    id: string;
    // type: OBJECT_TYPES;
    customName?: string;
}

export interface CharacterOptionsInterface {
    playerGravity: number;
    sceneModels: any;
    selectedModelUUID: string;
    selectedModel: any;
    animationNames: any;
    walkAnimation: string;
    runAnimation: string;
    jumpAnimation: string;
    idleAnimation: string;
    fallAnimation: string;
    crouchAnimation: string;
    dieAnimation: string;
    climbAnimation: string;
    invertForwardDirection: boolean;
    groundDeceleration: number;
    groundAcceleration: number;
    airDeceleration: number;
    airAcceleration: number;
    walkSpeed: number;
    runSpeed: number;
    jumpHeight: number;
    stepHeight: number;
    pushObjects: boolean;
    pushImpulse: number;
    pushVerticalScale: number;
    kickObjects: boolean;
    kickImpulse: number;
    kickAnimation: string;
    climbSpeed: number;
    canClimb?: boolean;
    cameraDefaultDistance: number;
    cameraMinDistance: number;
    cameraMaxDistance: number;
    cameraFov: number;
    health: number;
    lookSpeed: number;
    useAutoForward: boolean;
    maxSlope: number;
    shield: number;
    jumpStrength: number;
}

export interface SoundPropInterface {
    id: string;
    name: string;
    url: string;
}

export interface ModelPropInterface {
    id: string;
    name: string;
    url: string;
}

export enum INVENTORY_UI_CONTAINERS {
    MAIN = "main-game-ui-container",
    MAIN_ACTIVE = "selected-object-container",
    ICONS = "inventory-container",
    ACTIVE_OBJECT = "active-object-container",
    AMMO = "ammo-container-2",
    SECTION_PREFIX = "inv-cat-",
    IMAGE_PREFIX = "inv-img-container-",
    ICON_PREFIX = "inv-icon-",
    AMMO_COUNT = "weapon-ammo-count",
}

export enum RESPAWN_TYPES {
    ONCE = "Once",
    CAN_RESPAWN = "Can Respawn",
}

export enum HARVEST_TYPES {
    HIT = "Hit",
    PRESS_E_KEY = "Press E Key",
}

export enum PROCEDURAL_PLANT_TYPES {
    GRASS = "Grass",
    FLOWER = "Flower",
    CAT_TAIL = "Cat Tail",
    SHRUB = "Shrub",
    TREE = "Tree",
    MOSS = "Moss",
}

export enum PROCEDURAL_TERRAIN_TYPES {
    //TODO think about how we can add logic for scaling of the
    MOUNTAINS = "Mountains", //height maps to generate example CANYON or MOUNTAINS with AI
    VALLEY = "Valleys",
    PLAIN = "Plains",
    HILLS = "Hills",
    DESERT = "Desert",
    SWAMP = "Swamp",
    COASTLINE = "Coastline",
    FOREST = "Forest",
    JUNGLE = "Jungle",
    TUNDRA = "Tundra",
    SAVANNAH = "Savannah",
    CANYON = "Canyon",
    PLATEAU = "Plateau",
    WETLANDS = "Wetlands",
    GLACIER = "Glacier",
    MEADOW = "Meadow",
    STEPPE = "Steppe",
    BADLANDS = "Badlands",
    ARCHIPELAGO = "Archipelago",
}

export type HarvestInitiatorType = HARVEST_TYPES.HIT | HARVEST_TYPES.PRESS_E_KEY;
export type RespawnType = RESPAWN_TYPES.ONCE | RESPAWN_TYPES.CAN_RESPAWN;

export enum CAMERA_OBJECT_INTERACTION {
    TRANSPARENT = "Transparent",
    ZOOM = "Zoom",
}

export interface CameraData {
    type: "Camera";
    cameraType: CAMERA_TYPES; // Possible values here: "First Person", "3rd Person", "Top Down", "Side Scroller"
    cameraEffect: CAMERA_EFFECTS; // Possible values here: Pixel, Bokeh, RGB, None
    cameraHeadHeight?: number; // this option can only be valid if cameraType is set to "First Person"
    playerCollisionBox?: number; // this option can only be valid if cameraType is set to "First Person"
    cameraDefaultDistance?: number; // this option can only be valid if cameraType is set to "3rd Person" or "Top Down"
    cameraMinDistance?: number; // this option can only be valid if cameraType is set to "3rd Person" or "Top Down"
    cameraMaxDistance?: number; // this option can only be valid if cameraType is set to "3rd Person" or "Top Down"
    cameraFOV: number;
    cameraNear?: number;
    cameraFar?: number;
    usePointerLock: boolean;
    cameraAngle?: number; // this option can only be valid if cameraType is set to "3rd Person" or "Top Down"
    cameraAxis?: number; // this option can only be valid if cameraType is set to "Side Scroller"
    objectInteraction: CAMERA_OBJECT_INTERACTION; // Possible values here: "Transparent" or "Zoom"
    // Camera follow behavior settings
    enableCameraFollowBehavior?: boolean; // enable/disable camera follow behavior (default: false)
    cameraBackViewTolerance?: number; // degrees of Y-axis tolerance before returning to back view (default: 90)
    cameraBackViewReturnSpeed?: number; // seconds to return to back view (default: 0.5)
    cameraFrontViewFlipSpeed?: number; // seconds for quick turn detection (default: 0.3)
    cameraFrontViewFlipAngle?: number; // degrees for front view flip threshold (default: 90)
    cameraFrontViewFlipTransitionSpeed?: number; // seconds to transition between front/back view (default: 0.3)
    occlusionType?: OCCLUSION_TYPES; // type of occlusion behavior (default: Distance)
}

export interface ProceduralPlantBehaviorInterface {
    // type: OBJECT_TYPES.PROCEDURAL_PLANT;
    plantType: PROCEDURAL_PLANT_TYPES.GRASS;
    id: string;
    enabled: boolean;
    numberOfPlants: number;
    windDirectionX: number;
    windDirectionY: number;
    windDirectionZ: number;
    windStrength: number;
    windSpeed: number;
    alphaImage: string;
    diffuseImage: string;
    plantWidth: number;
    plantHeight: number;
    horizontalSegments: number;
    verticalSegments: number;
    isAnimated: boolean;
}

export interface ProceduralTerrainBehaviorInterface {
    // type: OBJECT_TYPES.PROCEDURAL_TERRAIN;
    terrainType: PROCEDURAL_TERRAIN_TYPES.MOUNTAINS;
    id: string;
    enabled: boolean;
    perlinNoiseScale: number;
    perlinNoiseImage: string;
    terrainWidth: number;
    terrainLength: number;
    terrainSegments: number;
}

export interface PropAnimationBehaviorInterface extends BehaviorInterface {
    // type: OBJECT_TYPES.PROP_ANIMATION; // value here is a string "Prop Animation"
    animationType: PROP_ANIMATION_TYPES; // possible options here: "Loop", "Play Once"
    propAnimation: string; // name of the animation
    animationSpeed: number; // animation speed
    startOnTrigger: boolean; // start animation on trigger
}

export interface IfConditionInterface {
    id: string;
    player_touches: boolean;
    object_touches: boolean;
    pressE: boolean;
    objectUUID?: string; // only set when object_touches is selected
}

export interface TriggerBehaviorInterface extends BehaviorInterface {
    // type: OBJECT_TYPES.TRIGGER; // value here is a string "Trigger"
    if_condition: IfConditionInterface[]; // array of conditions that must be met to trigger this behavior
    if_operator?: "and" | "or";
    else_condition: boolean;
    then_activate: boolean;
    else_activate: boolean;
    then_object: string;
    else_object: string;
    delay: number; // delay in seconds
    then_behaviors_on_trigger: Array<{key: any; value: boolean}>; // for example ["Animation": true] - true means it is waiting for the trigger to start/stop, false means this trigger has no effect on it
    else_behaviors_on_trigger: Array<{key: any; value: boolean}>; // for example ["Animation": true] - true means it is waiting for the trigger to start/stop, false means this trigger has no effect on it
}

export enum SCENE_LAYERS {
    TERRAIN_OBJECTS_LAYER = 101,
}

export enum TRIGGER_ACTIVATION_TYPES {
    PLAYER_TOUCHES = "player_touches",
    OBJECT_TOUCHES = "object_touches",
    PRESS_E = "pressE",
    PRESS_F = "pressF",
    ON_ENTER = "on_enter",
    ON_EXIT = "on_exit",
    WHILE_INSIDE = "while_inside",
    KEY_BUTTON_PRESSED = "key_button_pressed",
    TIMER_ELAPSED = "timer_elapsed",
    DISTANCE_COMPARE = "distance_compare",
    HAS_TAG_TEAM_FACTION = "has_tag_team_faction",
    VARIABLE_COMPARE = "variable_compare",
    BEHAVIOR_STATE = "behavior_state",
    ANIMATION_EVENT_REACHED = "animation_event_reached",
    LINE_OF_SIGHT = "line_of_sight",
    RANDOM_CHANCE = "random_chance",
    COOLDOWN_READY = "cooldown_ready",
    ON_INTERACT = "on_interact",
    OBJECT_STATE_COMPARE = "object_state_compare",
    TIME_WINDOW = "time_window",
    MULTIPLAYER_ROLE = "multiplayer_role",
    PHYSICS_COLLISION_EVENT = "physics_collision_event",
    AI_PROXIMITY = "ai_proximity",
}

export enum CONSUMABLE_TYPES {
    INSTANT = "INSTANT",
    PRESS_E = "PRESS E",
    BUTTON_PRESS = "Button Press",
}
export enum DEVICE_TYPES {
    MOBILE = "Mobile",
    DESKTOP = "Desktop",
}

export enum OPERATING_SYSTEM_TYPES {
    MAC_OS = "macOS",
    WINDOWS_OS = "Windows",
    ANDROID_OS = "Android",
    I_OS = "iOS",
    LINUX_OS = "Linux",
}

//TODO consolidate the below movements
const JOYSTICK_MOVEMENT_STATES = {
    FORWARD: "Forward",
    STRAIGHT_FORWARD: "Straight Forward",
    BACKWARD: "Backward",
    STRAIGHT_BACKWARD: "Straight Backward",
    STOPPED: "Stopped",
} as const;

const JOYSTICK_DIRECTION_STATES = {
    LEFT: "Left",
    RIGHT: "Right",
} as const;

export enum MOVEMENT_STATES {
    FORWARD = "Forward",
    STRAIGHT_FORWARD = "Straight Forward",
    BACKWARD = "Backward",
    STRAIGHT_BACKWARD = "Straight Backward",
    STOPPED = "Stopped",
    RIGHT = "Right",
    LEFT = "Left",
    FORWARD_LEFT = "Forward Left",
    FORWARD_RIGHT = "Forward Right",
    BACKWARD_LEFT = "Backward Left",
    BACKWARD_RIGHT = "BackWwrd Right",
    JUMP_RIGHT = "Jump Right",
    JUMP_LEFT = "Jump Left",
}

const BUTTON_ACTION_STATES = {
    JUMP: "Jump",
    INTERACT: "Interact",
    THIRE_PERSON_TOUCH_CAMERA: "3rd Person Touch Camera",
    FIRST_PERSON_TOUCH_CAMERA: "First Person Touch Camera",
    FORTNITE_TOUCH_CAMERA: "Fortnite Touch Camera",
} as const;

export const MOBILE_JOYSTICK_MOVEMENT_STATE = {
    FORWARD: JOYSTICK_MOVEMENT_STATES.FORWARD,
    BACKWARD: JOYSTICK_MOVEMENT_STATES.BACKWARD,
    STRAIGHT_FORWARD: JOYSTICK_MOVEMENT_STATES.STRAIGHT_FORWARD,
    STRAIGHT_BACKWARD: JOYSTICK_MOVEMENT_STATES.STRAIGHT_BACKWARD,
    TOUCH_STOPPED: JOYSTICK_MOVEMENT_STATES.STOPPED,
} as const;

export const MOBILE_JOYSTICK_DIRECTION_STATE = {
    LEFT: JOYSTICK_DIRECTION_STATES.LEFT,
    RIGHT: JOYSTICK_DIRECTION_STATES.RIGHT,
} as const;

export const GAMEPAD_JOYSTICK_MOVEMENT_STATE = {
    FORWARD: JOYSTICK_MOVEMENT_STATES.FORWARD,
    BACKWARD: JOYSTICK_MOVEMENT_STATES.BACKWARD,
    STRAIGHT_FORWARD: JOYSTICK_MOVEMENT_STATES.STRAIGHT_FORWARD,
    STRAIGHT_BACKWARD: JOYSTICK_MOVEMENT_STATES.STRAIGHT_BACKWARD,
    STOPPED: JOYSTICK_MOVEMENT_STATES.STOPPED,
} as const;

export const GAMEPAD_JOYSTICK_DIRECTION_STATE = {
    LEFT: JOYSTICK_DIRECTION_STATES.LEFT,
    RIGHT: JOYSTICK_DIRECTION_STATES.RIGHT,
} as const;

export const MOBILE_BUTTON_ACTION_STATES = {
    JUMP: BUTTON_ACTION_STATES.JUMP,
    INTERACT: BUTTON_ACTION_STATES.INTERACT,
} as const;

export const GAMEPAD_JOYSTICK_ACTION_STATES = {
    JUMP: BUTTON_ACTION_STATES.JUMP,
    INTERACT: BUTTON_ACTION_STATES.INTERACT,
} as const;

export enum MOBILE_BUTTON_ACTION_UI_STATES {
    SHOW = "Show",
    HIDE = "Hide",
    MOBILE_BUTTON_ACTION_CONTAINER_CLASS_NAME = ".character-state-control-button",
}

export enum MOBILE_JOYSTICK_CONTROL_UI {
    MOBILE_JOYSTICK_CONTROL_NAME = "character-joystick-control",
}

export enum PHYSICS_PROXY_UI {
    PHYSICS_MESSAGE_ELEMENT = "physics-loading-message",
}

//TODO: move to types.ts
export enum COLLISION_TYPE {
    UNKNOWN = -1,
    WITH_PLAYER,
    WITH_COLLIDABLE_OBJECTS,
    WITH_ENEMY,
}

export interface ICollisionSettings {
    disposable: boolean;
    playerCollision: boolean;
    enemyCollision: boolean;
    throwableCollision: boolean;
    canReappear: boolean;
}

export interface ITransformValue {
    x: number;
    y: number;
    z: number;
}

export enum TRANSFORMATION_OPTIONS {
    POSITION,
    ROTATION,
    SCALE,
    SIZE,
}

export enum TRANSFORM_CONTROLS_MODE {
    TRANSLATE = "translate",
    ROTATE = "rotate",
    SCALE = "scale",
}

export enum WEAPON_AIMERS {
    AIMER_SCREEN_ZINDEX = 998,
}

export interface WeaponBehaviorInterface extends BehaviorInterface {
    // type: OBJECT_TYPES.WEAPON; // Value is a string "Weapon"
    inventoryType: INVENTORY_TYPES;
    weaponName: string;
    ui_tag: string;
    weaponStarting: boolean;
    uiImage: string;
    weaponType: WEAPON_TYPES;
    weaponDamage: number;
    weaponAimerZindex: number;
    weaponClipAmount: number;
    weaponFireSpeed: number;
    weaponReloadSpeed: number;
    weaponScopeZoom: number;
    aimerUIImage: string;
    aimerUIImageName: string;
    weaponShowHUDAimerInGame: boolean;
    weaponPreviewHUDAimer: boolean;
    weaponHUDAimerSize: number;
    VFXSmallEffect: boolean;
    VFXMediumEffect: boolean;
    VFXBigEffect: boolean;
    VFXLaserEffect: boolean;
    VFXCartoonyEffect: boolean;
    weaponAutoReload: boolean;
    position_x: number;
    position_y: number;
    position_z: number;
    rotation_x: number;
    rotation_y: number;
    rotation_z: number;
    selectedWeaponAmmoName: string;
    weaponAmmoVisible: boolean;
    weaponSelectedCharacterBone: string;
    weaponScale: number;
    weaponMuzzleFlashBrightness: number;
    weaponMuzzleSmokeDensity: number;
    weaponMuzzleSmokeSize: number;
    weaponMuzzleSmokeLife: number;
    weaponMuzzleSmokeOpacity: number;
}

export interface AiNPCBehaviorInterface extends BehaviorInterface {
    // type: OBJECT_TYPES.AI_NPC; // Value is a string "AI NPC"
    name: string;
    voice_id: string;
    range: number;
    active_in_voice_chat: boolean;
    show_text_chat: boolean;
    bio: string;
    lore: string;
    adjectives: string[];
    social_media_posts: string;
    interests: string[];
    response_style: string;
    miscellaneous: string;
    roamDistance: number;
}

export interface BillboardBehaviorInterface {
    id: string;
    // type: OBJECT_TYPES.BILLBOARD; // Value is a string "Billboard"
    billboardMode: BILLBOARD_TYPES; // type of the billboard: video or file, values: "Webpage", "Image" or "YouTube Video"
    loop?: boolean;
    twoSided?: boolean;
    transparent?: boolean;
    faceCamera?: boolean;
    assetFile?: string; // uploaded asset url
    urlLink?: string; // video or webpage url
}

export enum CUSTOM_VOLUME_TYPES {
    LEVEL_CHANGER = "Level Changer",
    CUSTOM = "Custom",
}

export enum BILLBOARD_TYPES {
    WEB = "Webpage",
    YT_VIDEO = "YouTube Video",
    IMAGE = "Image",
}

export enum SHADER_EFFECTS {
    BOKEH = "Bokeh Effect",
    PIXEL = "Pixel Effect",
    RGB = "RGB",
    NONE = "None",
}

export enum CAMERA_EFFECTS {
    BOKEH = "Bokeh",
    PIXEL = "Pixel",
    RGB = "RGB",
    NONE = "None",
}

export enum OCCLUSION_TYPES {
    DISTANCE = "Distance",
    TRANSPARENCY = "Transparency",
}

//Disable some cameras while continuing re-factor
export enum CAMERA_TYPES {
    FIRST_PERSON = "First Person",
    THIRD_PERSON = "Third Person",
    FORTNITE = "FortNite",
    TOP_DOWN = "Top Down",
    SIDE_SCROLLER = "Side Scroller",
    VEHICLE = "Vehicle",
    SPECTATOR = "Spectator",
    FIXED = "Fixed",
    NONE = "NONE",
}

export enum CAMERA_TYPES_NEW {
    THIRD_PERSON = "Third Person",
    FIRST_PERSON = "First Person",
    TOP_DOWN = "Top Down",
    SIDE_SCROLLER = "Side Scroller",
}

export enum WEAPON_EFFECTS {
    GUN_MUZZLE_FLASH_PLANE_NAME = "gun_muzzle_flash_plane",
    WEAPON_HUD_AIMER_IMG_NAME = "weapon-hud-aimer-",
}

export enum MATERIAL_TYPES {
    SPECULAR = "specular",
    METALLIC = "metallic",
    PBR = "PBR",
}

export enum SHADER_EFFECTS_PROPS {
    BOKEH = "bokeh",
    PIXEL = "pixel",
    RGB = "rgbShift",
    NONE = "none",
}

//physics

export enum COLLISION_MATERIAL_TYPE {
    CUSTOM = "Custom",
    METAL = "Metal",
    DIRT = "Dirt",
    GROUND = "Ground",
    PLASTIC = "Plastic",
    SNOW = "Snow",
    WOOD = "Wood",
    CONCRETE = "Concrete",
    MUD = "Mud",
    ICE = "Ice",
    SLIME = "Slime",
    WATER = "Water",
    SLIPPERY_GROUND = "Slippery ground",
    RUBBER = "Rubber",
    SAND = "Sand",
}

export interface ILightState {
    label?: string;
    show: boolean;
    showColor?: boolean;
    color?: string;
    showIntensity?: boolean;
    intensity?: number;
    showDistance?: boolean;
    showDecay?: boolean;
    distance?: number;
    decay?: number;
    showAngle?: boolean;
    showPenumbra?: boolean;
    angle?: number;
    penumbra?: number;
    showSkyColor?: boolean;
    showGroundColor?: boolean;
    skyColor?: string;
    groundColor?: string;
    showWidth?: boolean;
    showHeight?: boolean;
    showCastShadow?: boolean;
    castShadow?: boolean;
    width?: number;
    height?: number;
    startOnTrigger?: boolean;
    showTarget?: boolean;
    target?: THREE.Object3D<THREE.Object3DEventMap>;
    showShadowParams?: boolean;
    shadowMapSize?: number;
    shadowCameraNear?: number;
    shadowCameraFar?: number;
    shadowBias?: number;
    shadowNormalBias?: number;
    shadowFocus?: number;
    shadowCameraWidth?: number;
    shadowCameraHeight?: number;
    shadowRadius?: number;
    shadowBlurSamples?: number;
    isUnityStyle?: boolean;
    showUnityStyle?: boolean;
}

// messages
export interface ITransformMessageData {
    x: number;
    y: number;
    z: number;
}

export interface ISoundSettings {
    id: string;
    url: string;
    loop: boolean;
    volume: number;
    soundType: "play-now" | "menu-background" | "" | "play-preview";
}

export enum IFRAME_MESSAGES {
    GAME_STARTED = "gameStarted",
    GAME_RESUMED = "gameResumed",
    GAME_PAUSED = "gamePaused",
    GAME_ENDED = "gameEnded",
    GAME_CLOSED = "gameClosed",
    GAME_CLOSE_AND_SAVE = "gameCloseAndSave",
    GAME_CREATED = "gameCreated",
    GAME_PLAYER_ERROR = "gamePlayerError",
    GAME_ERROR = "gameError",
    GAME_MULTIPLAYER_ERROR = "gameMultiplayerError",
    PLAYER_ADDED_LISTENER = "playerAddedListener",
    HEALTH_UPDATE = "healthUpdate",
}

export type RigidBodyType = "rigidBody";

export interface BehaviorThrottlingConfig {
    /** Distance squared beyond which behaviors are considered "far" and get throttled (default: 50*50 = 2500) */
    farDistanceSq?: number;

    /** Distance squared beyond which behaviors are considered "very far" and get heavily throttled (default: 100*100 = 10000) */
    veryFarDistanceSq?: number;

    /** Throttling factor for far objects - update every Nth frame (default: 3) */
    farThrottleFactor?: number;

    /** Throttling factor for very far objects - update every Nth frame (default: 10) */
    veryFarThrottleFactor?: number;

    /** Whether to enable frustum culling for behaviors (default: true) */
    enableFrustumCulling?: boolean;

    /** Whether to enable distance-based throttling (default: true) */
    enableDistanceThrottling?: boolean;

    /** Whether to enable performance monitoring and reporting (default: false) */
    enablePerformanceReporting?: boolean;

    /** Whether to enable behavior throttling globally - when false, ALL behaviors update every frame (default: true) */
    throttlingEnabled?: boolean;
}
