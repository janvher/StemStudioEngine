import * as Colyseus from "colyseus.js";
import {Room, RoomAvailable} from "colyseus.js";
import {
    AnimationAction,
    AnimationClip,
    AnimationMixer,
    Camera,
    Clock,
    MathUtils,
    Object3D,
    Quaternion,
    Scene,
    Vector3,
} from "three";

import {GameObject, GameRoomState, ObjectMotionStateSchema, Player} from "./GameRoomState";
import EventBus, { IN_GAME_EVENTS } from "@stem/editor-oss/behaviors/event/EventBus";
import {
    AvatarBudgetPolicy,
    configureAvatarBudgetPolicyFromEngine,
    markLocalPlayerAvatar,
    markRemotePlayerAvatar,
} from "@stem/editor-oss/core/budget/AvatarBudgetPolicy";
import global from "@stem/editor-oss/global";
import {REACT_APP_MULTIPLAYER_SERVER_URL} from "./Constants";
import {PHYSICS_EVENTS} from "@stem/editor-oss/physics/common/events";
import {
    BoxData,
    CapsuleData,
    COLLISION_MAP,
    CollisionFlag,
    ConcaveHullData,
    ConvexHullData,
    IDispatcher,
    IPhysics,
    IPlayerOptions,
    ModelData,
    SphereData,
    VehicleInput,
    VehicleOptions,
    VehicleSpec,
} from "@stem/editor-oss/physics/common/types";
import {normalizeCType} from "@stem/editor-oss/physics/common/physicsConfig";
import PhysicsBase from "@stem/editor-oss/physics/PhysicsBase";
import {PhysicsUtil} from "@stem/editor-oss/physics/PhysicsUtil";
import {MultiplayerUtils} from "@stem/editor-oss/physics/simple/MultiplayerUtils";
import PlayerQueueView from "@web-shared/player/component/PlayerQueueView";
import {IFRAME_MESSAGES} from "@stem/editor-oss/types/editor";

type Vec3 = { x: number; y: number; z: number };
type Vec4 = { x: number; y: number; z: number; w: number };

type UpdateData = {
    uuid: string;
    position: Vec3;
    rotation: Vec4;
    scale: Vec3;
    motionState: ObjectMotionStateSchema;
};

/** Colyseus v0.15 client-side Schema has `listen`/`onChange` but the server-side @colyseus/schema v4 types do not. */
type SchemaWithListen<T> = T & {
    listen<K extends keyof T>(prop: K, callback: (value: T[K], previousValue: T[K]) => void, immediate?: boolean): () => boolean;
    onChange(callback: (changes: unknown[]) => void): () => void;
};

/** Colyseus v0.15 client-side MapSchema has `onAdd`/`onRemove` but the server-side @colyseus/schema v4 types do not. */
type MapSchemaWithCallbacks<V> = {
    onAdd(callback: (item: V, key: string) => void, triggerAll?: boolean): () => boolean;
    onRemove(callback: (item: V, key: string) => void): () => boolean;
};

export default
class MultiplayerProxy extends PhysicsBase implements IPhysics {
    /** The debounce threshold for an origin update */
    originDebouceThreshold = 0.01;

    /** The debounce threshold for a rotation update (in degrees) */
    rotationDebounceThreshold = 0.5;

    /** The debounce threshold for a scale update */
    scaleDebounceThreshold = 0.01;

    id: string = MathUtils.generateUUID();
    sceneId: string;
    scene: Scene;
    gravity: number;
    client?: Colyseus.Client;
    room?: Colyseus.Room<GameRoomState>;
    dispatcher: IDispatcher;
    isReady = false;
    objectUpdates: Map<string, UpdateData> = new Map<string, UpdateData>();
    playerObjects = new Map<string, Object3D>();
    queueView: PlayerQueueView | null = null;

    // Used to debounce transform updates, especially for kinematic objects
    // which may update on a per frame basis.
    private originCache = new Map<string, { x: number; y: number; z: number }>();
    private rotationCache = new Map<string, Quaternion>();
    private scaleCache = new Map<string, { x: number; y: number; z: number }>();

    //animations
    playerAnimations = new Map<string, Map<string, AnimationAction>>();
    playerMixers = new Map<string, AnimationMixer>();
    private readonly avatarBudgetPolicy = new AvatarBudgetPolicy();

    clock = new Clock();

    constructor(sceneId: string, scene: Scene, dispatcher: IDispatcher, gravity: number) {
        super(true, false, false);
        this.sceneId = sceneId;
        this.scene = scene;
        this.gravity = gravity;
        this.dispatcher = dispatcher;
        this.queueView = new PlayerQueueView(global.app);
    }

    start(): Promise<void> {
        this.clock.start();
        console.log("MP: Colyseus server: " + REACT_APP_MULTIPLAYER_SERVER_URL);

        // DOT-7545 Gap #3: read-only inspectors must not join a live room.
        // They only observe the persisted head revision locally. Joining
        // would desync their view and leak their presence into the room.
        if (global?.app?.editor?.isReadOnly) {
            console.log("MP: skipping room join — editor is in read-only inspection mode");
            return Promise.resolve();
        }

        this.client = new Colyseus.Client(REACT_APP_MULTIPLAYER_SERVER_URL); //FIXME: read from config
        return new Promise<void>((resolve, reject) => {
            this.client
                ?.getAvailableRooms(this.sceneId)
                .then((rooms: RoomAvailable[]) => {
                    console.log("MP: rooms available: ", rooms);

                    const hasRoom = rooms.length > 0;
                    const roomWithSpace = rooms.find(room => room.clients < room.maxClients);

                    if (!hasRoom) {
                        console.log("MP: No rooms available. Creating a new room.");
                        this.createRoom(this.gravity, resolve, reject);
                    } else if (!roomWithSpace) {
                        console.log("MP: All rooms are full. Adding to waiting list.");
                        this.addToWaitingList();
                    } else if (roomWithSpace) {
                        console.log("MP: Joining room with space.");
                        this.joinRoom(roomWithSpace.roomId, resolve, reject);
                    }
                })
                .catch(err => {
                    console.error("MP: ERROR", err);
                    window.parent.postMessage(IFRAME_MESSAGES.GAME_MULTIPLAYER_ERROR, "*");
                    reject(new Error("Connection to multiplayer server failed: " + err));
                });
        });
    }

    private createRoom(gravity: number, resolve: () => void, reject: (reason?: any) => void) {
        this.client
            ?.create<GameRoomState>(this.sceneId, {
                id: this.id,
                name: "stem-studio-player",
                gravity: gravity,
            })
            .then(async (room) => {
                this.setupRoom(room, resolve);
                this.queueView?.dispose();
                if (room.state.ready) {
                    await this.addPhysicsObjectsToServer();
                } else {
                    (room.state as SchemaWithListen<GameRoomState>).listen("ready", async (val) => {
                        if (val) {
                            await this.addPhysicsObjectsToServer();
                        }
                    });
                }
                // if (global?.app?.editor) {
                //     await createLiveKitRoom(room.roomId, global.app.editor.username);
                //     global.app.editor.roomId = room.roomId;
                // }
            })
            .catch(e => {
                console.log("MP: CREATE ERROR", e);
                reject(e);
            });
    }

    private joinRoom(
        roomId: string,
        resolve: () => void,
        reject: (reason?: any) => void,
    ) {
        this.client
            ?.joinById<GameRoomState>(roomId, {
                id: this.id,
                name: "stem-studio-player",
            })
            .then(room => {
                this.setupRoom(room, resolve);
                //FIXME: review MP voice flow
                // if (global?.app?.editor) {
                //     global.app.editor.roomId = roomId;
                // }
            })
            .catch(e => {
                console.log("MP: JOIN ERROR", e);
                reject(e);
            });
    }

    private async addPhysicsObjectsToServer() {
        this.scene.traverse(async obj => {
            if (!obj.userData.isStemObject || 
                !obj.userData.physics ||
                 obj.userData.physics.enabled === false || 
                 obj.userData.player
            ) {
                return;
            }

            await PhysicsUtil.addObjectShapeToPhysics(obj, this);
        });
    }

    private setupRoom(
        room: Room<GameRoomState>,
        resolve: () => void,
    ) {
        console.log("MP: joined room: ", room.sessionId, room.name);

        //OBJECT UPDATES
        (room.state.objects as unknown as MapSchemaWithCallbacks<GameObject>).onAdd((object) => {
            //instantiate object from template if needed
            if (object.template) {
                this.cloneObject(object);
            }
            //FIXME: switch to primitive types to avoid double update
            (object.position as unknown as SchemaWithListen<typeof object.position>).onChange(() => {
                this.addUpdateData(object.uuid, object.position, object.quaternion, object.scale, object.motionState);
            });
            (object.quaternion as unknown as SchemaWithListen<typeof object.quaternion>).onChange(() => {
                this.addUpdateData(object.uuid, object.position, object.quaternion, object.scale, object.motionState);
            });
            (object.scale as unknown as SchemaWithListen<typeof object.scale>).onChange(() => {
                this.addUpdateData(object.uuid, object.position, object.quaternion, object.scale, object.motionState);
            });
            if (object.motionState) {
                (object.motionState as unknown as SchemaWithListen<typeof object.motionState>).onChange(() => {
                    this.addUpdateData(object.uuid, object.position, object.quaternion, object.scale, object.motionState);
                });
            }
        });
        (room.state.objects as unknown as MapSchemaWithCallbacks<GameObject>).onRemove((object) => {
            //FIXME: optimize object lookup
            console.log("MP.start.objects.onRemove: " + object.uuid);
            let sceneObject = this.scene.getObjectByProperty("uuid", object.uuid);
            if (sceneObject) {
                console.log("this.scene.remove(sceneObject)", sceneObject);
                this.scene.remove(sceneObject);
            } else {
                console.warn("MP.start.objects.onRemove: object not found in the scene: " + object.uuid, this.scene);
            }
        });

        //PLAYER UPDATES
        (room.state.players as unknown as MapSchemaWithCallbacks<Player>).onAdd((player) => {
            console.log("MP: players.onAdd", player);
            if (!player) return;
            if (player.uuid) {
                this.addPlayer(player);
            } else {
                //wait for uuid to be assigned
                (player as SchemaWithListen<Player>).listen("uuid", () => {
                    console.log("MP: players.onAdd.listenUuid", player);
                    this.addPlayer(player);
                });
            }
            //listen for animation changes
            (player as SchemaWithListen<Player>).listen("animation", (val, prevVal) => {
                console.log("MP: players.onAdd.listenAnimation: " + val + " <= " + prevVal);
                this.onAnimationChanged(val, prevVal, player);
            });
        });

        (room.state.players as unknown as MapSchemaWithCallbacks<Player>).onRemove((player) => {
            console.log("MP: players.onRemove: " + player.uuid);
            //scene object is removed in objects.onRemove
            this.playerObjects.delete(player.uuid);
            this.playerAnimations.delete(player.uuid);
            this.playerMixers.delete(player.uuid);
        });

        (room.state.gameState as SchemaWithListen<typeof room.state.gameState>).listen("score", (val, prevVal) => {
            EventBus.instance.send(IN_GAME_EVENTS.GAME_SCORE_INC, val - prevVal);
        });

        //READY FLAG
        (room.state as SchemaWithListen<GameRoomState>).listen("ready", (val) => {
            if (val) {
                this.isReady = true;
                this.dispatcher.onReady();
                resolve();
            }
        });
        this.room = room;
    }

    private addToWaitingList() {
        console.log("Client added to waiting list.");
        this.queueView?.show();
    }

    private addUpdateData(uuid: string, position: Vec3, rotation: Vec4, scale: Vec3, motionState: ObjectMotionStateSchema) {
        const updateData = {
            uuid: uuid,
            position: {
                x: position.x,
                y: position.y,
                z: position.z,
            },
            rotation: {
                x: rotation.x,
                y: rotation.y,
                z: rotation.z,
                w: rotation.w,
            },
            scale: {
                x: scale.x,
                y: scale.y,
                z: scale.z,
            },
            motionState: motionState,
        };

        this.objectUpdates.set(uuid, updateData);
    }

    private initializeAnimations(playerObject: Object3D) {
        let animations = (
            (playerObject as any)._obj && (playerObject as any)._obj.animations ? (playerObject as any)._obj.animations : []
        ) as AnimationClip[];
        if (!animations.length) return;

        let mixer = new AnimationMixer(playerObject);
        this.playerMixers.set(playerObject.uuid, mixer);

        const actions = new Map<string, AnimationAction>();
        for (let animation of animations) {
            actions.set(animation.name, mixer.clipAction(animation));
        }
        this.playerAnimations.set(playerObject.uuid, actions);
    }

    private onAnimationChanged(currentAnimation: string, previousAnimation: string, player: Player) {
        if (!player || player.id === this.id) return; //local player
        let playerAnimations = this.playerAnimations.get(player.uuid);
        if (!playerAnimations) {
            console.log("onAnimationChanged: no animations", player);
            return;
        }
        let currentAction = playerAnimations.get(currentAnimation);
        let previousAction = playerAnimations.get(previousAnimation);
        if (previousAction) {
            previousAction.fadeOut(0.5); //TODO add to props
            if (currentAction) {
                currentAction.reset().fadeIn(0.5).play(); //TODO add to props
            }
        } else if (currentAction) {
            currentAction.play();
        } else {
            console.log("No action for current animation: " + currentAnimation);
        }
    }

    private cloneObject(objectState: GameObject) {
        //check if object is already added to the scene
        if (this.scene.getObjectByProperty("uuid", objectState.uuid)) {
            return;
        }

        //create object from template and add it to the scene
        const templateObject = this.scene.getObjectByProperty("uuid", objectState.template);
        if (!templateObject) {
            console.warn("Template object not found on the scene", objectState);
            return;
        }

        const physicsConfig = PhysicsUtil.getPhysicsConfig(templateObject);
        if (!physicsConfig) {
            console.warn("Template object has no physics config", objectState);
            return;
        }

        const object = templateObject.clone(true);
        object.uuid = objectState.uuid;
        object.position.set(objectState.position.x, objectState.position.y, objectState.position.z);
        object.quaternion.set(
            objectState.quaternion.x,
            objectState.quaternion.y,
            objectState.quaternion.z,
            objectState.quaternion.w,
        );
        this.scene.add(object);

        //add object to the update cache
        this.addObject(object.uuid, physicsConfig.mass, COLLISION_MAP.get(normalizeCType(physicsConfig.ctype) ?? physicsConfig.ctype)!, object);
    }

    async addPlayer(player: Player) {
        console.log(
            "MP.addPlayer: processing player state change: self=" +
                (player.id === this.id) +
                " uuid=" +
                player.uuid +
                " origin=" +
                player.origin,
        );
        
        if (!player || player.id === this.id) {
            return; //local player
        }

        if (player.origin) {
            const sceneObject = this.scene.getObjectByProperty("uuid", player.uuid);
            if (sceneObject) {
                console.warn("MP.addPlayer: player object is already added to the scene: " + player.uuid);
                return;
            }
            //clone player object
            const playerObject = await MultiplayerUtils.clonePlayerObject(this, player.origin, this.scene, player.uuid);
            if (!playerObject) {
                console.error("Failed to clone player object", player);
                return;
            }
            markRemotePlayerAvatar(playerObject, {
                playerId: player.id,
                sessionId: player.sessionId,
                playerName: player.name,
                sourceObjectUuid: player.origin,
                usesProfileAvatar: this.isGameUsingProfileAvatar(),
                avatarSource: "multiplayer-template",
            });
            this.playerObjects.set(playerObject.uuid, playerObject);
            playerObject.name = playerObject.name + "-mp-" + player.name;
            //TODO: use spawn points to set the position
            this.initializeAnimations(playerObject);
        }
    }

    //iPhysics impl
    simulate(): void {
        const delta = this.clock.getDelta();

        this.dispatchUpdateData(delta);
        configureAvatarBudgetPolicyFromEngine(this.avatarBudgetPolicy, global.app);

        const camera = this.getBudgetCamera();
        for (const [uuid, mixer] of this.playerMixers) {
            const playerObject = this.playerObjects.get(uuid);
            if (camera && playerObject) {
                const decision = this.avatarBudgetPolicy.decide(playerObject, camera);
                this.avatarBudgetPolicy.applyVisibilityState(playerObject, decision);
                if (!this.avatarBudgetPolicy.shouldRunAnimationUpdate(playerObject, decision, delta)) continue;
            }
            mixer.update(delta);
        }
    }

    private getBudgetCamera(): Camera | null {
        const app = global.app as {game?: {camera?: Camera}; camera?: Camera} | null | undefined;
        return app?.game?.camera ?? app?.camera ?? null;
    }

    private dispatchUpdateData(delta: number) {
        this.objectUpdates.forEach((data, uuid) => {
            this.dispatcher.onBodyUpdate(
                uuid,
                {
                    x: data.position.x,
                    y: data.position.y,
                    z: data.position.z,
                },
                {
                    x: data.rotation.x,
                    y: data.rotation.y,
                    z: data.rotation.z,
                    w: data.rotation.w,
                },
                {
                    x: data.scale.x,
                    y: data.scale.y,
                    z: data.scale.z,
                },
                delta,
                data.motionState,
            );
        });
        this.objectUpdates.clear();
    }

    setCurrentAnimation(uuid: string, animation: string): void {
        this.room?.send(PHYSICS_EVENTS.ANIMATION.SET, {
            uuid: uuid,
            animation: animation,
        });
    }

    terminate(): void {
        //client can't be disconnected
        void this.room?.leave().then(num => {
            console.log("MP: client left the room: " + num);
        });
        this.clock.stop();

        this.originCache.clear();
        this.rotationCache.clear();
        this.scaleCache.clear();
    }

    getGravity(): number {
        return this.gravity;
    }

    addShape(/*uuid: string, collisionShape: CollisionShape*/): void {
        // TODO: not implemented
    }

    removeShape(/*uuid: string*/): void {
        // TODO: not implemented
    }

    hasShape(/*uuid: string*/): boolean {
        return false;
    }

    addBody(/*object: Object3D, shapeUuuid: string, data: CommonData*/): void {
        // TODO: not implemented
    }

    addBox(object: Object3D, data: BoxData): void {
        this.room?.send(PHYSICS_EVENTS.ADD.BOX, {
            uuid: object.uuid,
            data: data,
        });
        const { collision_flag = CollisionFlag.DYNAMIC } = data;
        super.addObject(object.uuid, data.mass, collision_flag, object);
    }

    addConcaveHull(object: Object3D, data: ConcaveHullData): void {
        this.room?.send(PHYSICS_EVENTS.ADD.CONCAVEHULL, {
            uuid: object.uuid,
            data: data,
        });
        const { collision_flag = CollisionFlag.DYNAMIC } = data;
        super.addObject(object.uuid, data.mass, collision_flag, object);
    }

    addConvexHull(object: Object3D, data: ConvexHullData): void {
        this.room?.send(PHYSICS_EVENTS.ADD.CONVEXHULL, {
            uuid: object.uuid,
            data: data,
        });
        const { collision_flag = CollisionFlag.DYNAMIC } = data;
        super.addObject(object.uuid, data.mass, collision_flag, object);
    }

    addModel(object: Object3D, data: ModelData): void {
        //TODO: send event to the room
        const { collision_flag = CollisionFlag.DYNAMIC } = data;
        super.addObject(object.uuid, data.mass, collision_flag, object);
    }

    addSphere(object: Object3D, data: SphereData): void {
        this.room?.send(PHYSICS_EVENTS.ADD.SPHERE, {
            uuid: object.uuid,
            data: data,
        });
        const { collision_flag = CollisionFlag.DYNAMIC } = data;
        super.addObject(object.uuid, data.mass, collision_flag, object);
    }

    addCapsuleShape(object: Object3D, data: CapsuleData): void {
        this.room?.send(PHYSICS_EVENTS.ADD.CAPSULE, {
            uuid: object.uuid,
            data: data,
        });
        const { collision_flag = CollisionFlag.DYNAMIC } = data;
        super.addObject(object.uuid, data.mass, collision_flag, object);
    }

    setOrigin(uuid: string, position: Vector3): void {
        let prevOrigin = this.originCache.get(uuid);
        if (prevOrigin) {
            // Check if position has changed sufficiently
            const delta = new Vector3().subVectors(position, prevOrigin);
            if (delta.length() < this.originDebouceThreshold) {
                return;
            }
        } else {
            // Add a new entry
            prevOrigin = {x: 0, y: 0, z: 0};
            this.originCache.set(uuid, prevOrigin);
        }

        this.room?.send(PHYSICS_EVENTS.SET.ORIGIN, {
            uuid: uuid,
            position: {x: position.x, y: position.y, z: position.z},
        });

        // Update position cache
        prevOrigin.x = position.x;
        prevOrigin.y = position.y;
        prevOrigin.z = position.z;
    }

    setRotation(uuid: string, quaternion: Quaternion): void {
        let prevQuaternion = this.rotationCache.get(uuid);
        if (prevQuaternion) {
            // Check if position has changed sufficiently
            const deltaAngle = 180 / Math.PI * quaternion.angleTo(prevQuaternion);
            if (deltaAngle < this.rotationDebounceThreshold) {
                return;
            }
        } else {
            // Add a new entry
            prevQuaternion = new Quaternion();
            this.rotationCache.set(uuid, prevQuaternion);
        }

        this.room?.send(PHYSICS_EVENTS.SET.ROTATION, {
            uuid: uuid,
            rotation: {
                x: quaternion.x,
                y: quaternion.y,
                z: quaternion.z,
                w: quaternion.w,
            },
        });

        // Update rotation cache
        prevQuaternion.copy(quaternion);
    }

    setScale(uuid: string, scale: Vector3): void {
        let prevScale = this.originCache.get(uuid);
        if (prevScale) {
            // Check if position has changed sufficiently
            const delta = new Vector3().subVectors(scale, prevScale);
            if (delta.length() < this.scaleDebounceThreshold) {
                return;
            }
        } else {
            // Add a new entry
            prevScale = {x: 1, y: 1, z: 1};
            this.originCache.set(uuid, prevScale);
        }

        this.room?.send(PHYSICS_EVENTS.SET.SCALE, {
            uuid: uuid,
            scale: {
                x: scale.x,
                y: scale.y,
                z: scale.z,
            },
        });

        // Update scale cache
        prevScale.x = scale.x;
        prevScale.y = scale.y;
        prevScale.z = scale.z;
    }

    async addPlayerObject(modelUuid: string, useController: boolean, options?: IPlayerOptions): Promise<Object3D | null> {
        const player = await MultiplayerUtils.clonePlayerObject(this, modelUuid, this.scene);
        if (!player) {
            throw new Error("Failed to clone player object");
        }
        const usesProfileAvatar = this.isGameUsingProfileAvatar();
        markLocalPlayerAvatar(player, {
            playerId: this.id,
            sourceObjectUuid: modelUuid,
            usesProfileAvatar,
            avatarSource: usesProfileAvatar ? "profile-avatar" : "multiplayer-template",
        });

        this.room?.send(PHYSICS_EVENTS.PLAYER.ADD, {
            uuid: player.uuid,
            controller: useController,
            origin: modelUuid,
            options: options,
        });

        return player;
    }

    removePlayerObject(uuid: string): void {
        this.room?.send(PHYSICS_EVENTS.PLAYER.REMOVE, {uuid: uuid});
    }

    private isGameUsingProfileAvatar(): boolean {
        const app = global.app as {game?: {useAvatar?: () => boolean | undefined}} | null | undefined;
        return app?.game?.useAvatar?.() === true;
    }

    movePlayerObject(uuid: string, walkDirection: Vector3, jump: boolean): void {
        this.room?.send(PHYSICS_EVENTS.PLAYER.MOVE, {
            uuid: uuid,
            direction: walkDirection,
            jump: jump,
        });
    }

    setPlayerGravity(uuid: string, acceleration: Vector3): void {
        this.room?.send(PHYSICS_EVENTS.PLAYER.SET_GRAVITY, {
            uuid,
            data: acceleration,
        });
    }

    setPlayerPosition(uuid: string, position: Vector3): void {
        this.room?.send(PHYSICS_EVENTS.PLAYER.SET_POSITION, {
            uuid: uuid,
            position: position,
        });
    }
    
    setPlayerSpeedAdjustment(): void {
        console.warn("MP.setPlayerSpeedAdjustment: not implemented");
    }

    addVehicleObject(vehicleUuid: string, spec: VehicleSpec, options: VehicleOptions): Promise<void> {
        this.room?.send(PHYSICS_EVENTS.VEHICLE.ADD, {
            uuid: vehicleUuid,
            spec,
            options,
        });
        return Promise.resolve();
    }

    removeVehicleObject(vehicleUuid: string): void {
        this.room?.send(PHYSICS_EVENTS.VEHICLE.REMOVE, {uuid: vehicleUuid});
    }

    moveVehicleObject(vehicleUuid: string, input: VehicleInput): void {
        this.room?.send(PHYSICS_EVENTS.VEHICLE.MOVE, {
            uuid: vehicleUuid,
            input,
        });
    }

    remove(uuid: string): void {
        this.room?.send(PHYSICS_EVENTS.REMOVE.RIGID_BODY, {
            uuid: uuid,
            physics_only: false,
        });

        this.removeObject(uuid);
        this.originCache.delete(uuid);
        this.rotationCache.delete(uuid);
        this.scaleCache.delete(uuid);
    }

    removePrefab(uuid: string) {
        this.room?.send(PHYSICS_EVENTS.REMOVE.RIGID_BODY, {
            uuid: uuid,
            physics_only: true,
        });

        this.removeObject(uuid);
        this.originCache.delete(uuid);
        this.rotationCache.delete(uuid);
        this.scaleCache.delete(uuid);
    }

    setAngularVelocity(uuid: string, velocity: Vector3) {
        this.room?.send(PHYSICS_EVENTS.SET.ANGULAR_VELOCITY, {
            uuid: uuid,
            velocity: {x: velocity.x, y: velocity.y, z: velocity.z},
        });
    }

    setLinearVelocity(uuid: string, velocity: Vector3): void {
        this.room?.send(PHYSICS_EVENTS.SET.LINEAR_VELOCITY, {
            uuid: uuid,
            velocity: {x: velocity.x, y: velocity.y, z: velocity.z},
        });
    }

    getLinearVelocity(_uuid: string): { x: number; y: number; z: number } | null {
        return null; // Not available in multiplayer proxy
    }

    getAngularVelocity(_uuid: string): { x: number; y: number; z: number } | null {
        return null; // Not available in multiplayer proxy
    }

    setLinearDamping(_uuid: string, _damping: number): void {
        // Not implemented for multiplayer
    }

    setAngularDamping(_uuid: string, _damping: number): void {
        // Not implemented for multiplayer
    }

    setRigidBodyShape(/* uuid: string, newShapeUuid: string */): void {
        console.warn("MP.setRigidBodyShape: not implemented");
    }

    applyImpulseToRigidBody(/* uuid: string, impulse: Vector3, relativePosition: Vector3 */): void {
        console.warn("MP.applyImpulseToRigidBody: not implemented");
    }

    addFixedJoint(/* collisionEnabled: boolean, uuidA: string, uuidB: string, vec3PivotB: Vector3, vec4RotationB: Quaternion */): void {
        console.warn("MP.addFixedJoint: not implemented");
    }

    addHingeJoint(/* collisionEnabled: boolean, uuidA: string, uuidB: string,
                    hingeAxis: Vector3, relPos: Vector3, relRotation: Quaternion,
                    angularLimitEnabled: boolean, angularLimit: Vector3,
                    motorEnabled: boolean, motorSpeed: number, motorTorque: number */): void {
        console.warn("MP.addHingeJoint: not implemented");
    }

    addPoint2PointJoint(/* collisionEnabled: boolean, uuidA: string, vec3PivotA: Vector3, uuidB: string, vec3PivotB: Vector3 */): void {
        console.warn("MP.addPoint2PointJoint: not implemented");
    }

    removeJoint(/* uuidA: string, uuidB: string */): void {
        console.warn("MP.removeJoint: not implemented");
    }

    //the rest is not needed

    addCollidableObject(/* uuid: string */): void {}

    addTerrain(/* object: Object3D, data: TerrainData */): void {}

    applyCentralImpulse(/* uuid: string, impulse: Vector3 */): void {}

    detectCollisionsForObject(/* uuid: string, registration: CollisionRegistration, enable: boolean */): void {}

    setCollisionBehavior(/* uuid: string, behavior: CollisionBehavior */): void {}

    initDebug(): Object3D | null {
        return null;
    }

    removeCollidableObject(/* uuid: string */): void {}

    applyImpulseToPlayer(/* uuid: string, impulse: Vector3 */): void {}

    addOtsShiftVector(/* otsShiftVector: Vector3 */): void {}

    //TODO: implement
    pause(): void {
    }

    resume(): void {
    }

    ping(): Promise<void> {
        return Promise.resolve();
    }
}
